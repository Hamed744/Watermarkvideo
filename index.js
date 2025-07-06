const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // برای دریافت JSON از body درخواست

// ایجاد پوشه‌ها اگر وجود ندارند
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// اندپوینت اصلی برای پردازش ویدیو
app.post('/process-video', async (req, res) => {
    const { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ success: false, message: 'آدرس ویدیو ارائه نشده است.' });
    }

    const uniqueId = Date.now();
    const inputPath = path.join(tempDir, `${uniqueId}_input.mp4`);
    const outputPath = path.join(tempDir, `${uniqueId}_output.mp4`);
    const uploadUrl = 'https://www.aisada.ir/hamed/upload.php'; // آدرس سرور آپلود شما

    try {
        // قدم ۱: دانلود ویدیوی اصلی
        console.log(`Downloading video from: ${videoUrl}`);
        const response = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
        });
        const writer = fs.createWriteStream(inputPath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        console.log('Video downloaded successfully.');

        // قدم ۲: اعمال واترمارک و تبدیل به MP4 با FFmpeg
        console.log('Applying watermark and converting to MP4...');
        const ffmpegCommand = `ffmpeg -i "${inputPath}" -vf "drawtext=text='هوش مصنوعی آلفا دانلود از گوگل پلی':x=w-text_w-10:y=h-text_h-10:fontcolor=black:box=1:boxcolor=white:boxborderw=5:fontsize=30" -c:v libx264 -preset veryfast -c:a aac -movflags +faststart "${outputPath}"`;
        
        await new Promise((resolve, reject) => {
            exec(ffmpegCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('FFmpeg error:', stderr);
                    return reject(new Error('خطا در پردازش ویدیو با FFmpeg.'));
                }
                resolve();
            });
        });
        console.log('Video processed successfully.');

        // قدم ۳: آپلود فایل نهایی به سرور شما
        console.log(`Uploading final MP4 to: ${uploadUrl}`);
        const form = new FormData();
        form.append('video', fs.createReadStream(outputPath), 'final_video.mp4');
        
        const uploadResponse = await axios.post(uploadUrl, form, {
            headers: form.getHeaders(),
        });

        if (!uploadResponse.data || !uploadResponse.data.success) {
            throw new Error('خطا در آپلود فایل به سرور نهایی.');
        }
        console.log('Upload to final server successful.');
        
        const finalUrl = uploadResponse.data.url;

        // قدم ۴: ارسال لینک نهایی به کاربر
        res.json({ success: true, url: finalUrl });

    } catch (error) {
        console.error('Full process error:', error.message);
        res.status(500).json({ success: false, message: error.message || 'یک خطای ناشناخته در سرور رخ داد.' });
    } finally {
        // قدم ۵: پاک کردن فایل‌های موقت
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        console.log('Temporary files cleaned up.');
    }
});

app.listen(port, () => {
    console.log(`Video processing server is running on port ${port}`);
});
