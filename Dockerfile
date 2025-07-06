# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Install fontconfig and copy custom font
# fontconfig helps FFmpeg find fonts more reliably
RUN apt-get update && apt-get install -y fontconfig
COPY Vazirmatn-Regular.ttf /usr/local/share/fonts/
RUN fc-cache -fv # Rebuild font cache

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD [ "npm", "start" ]
