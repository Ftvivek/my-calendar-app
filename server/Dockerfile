# server/Dockerfile (MODIFIED FOR ROOT CONTEXT)

# Stage 1: Use an official Node.js runtime as a parent image
FROM node:18-alpine AS base

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json from the server directory
COPY server/package*.json ./

# Install only production dependencies
RUN npm install --production --ignore-scripts --prefer-offline

# Copy the rest of the backend source code from the server directory
COPY server/. .

# Copy the BUILT frontend code from the root project's 'build' directory
# into the 'frontend_build' directory inside the container.
COPY build ./frontend_build

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Define the command to run your app using NodeJS
CMD [ "node", "server.js" ]
#CMD ["sh", "-c", "echo '>>> SIMPLE DOCKER CMD ECHO - TEST v1.9 <<<' && while true; do echo 'Container alive...' && sleep 60; done"]