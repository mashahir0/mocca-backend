# Step 1: Use the Node.js base image compatible with Apple chip
FROM node:18-alpine

# Step 2: Set working directory in the container
WORKDIR /usr/src/app

# Step 3: Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Step 4: Install Node.js dependencies
RUN npm install

# Step 5: Copy all app files to the container (excluding files in .dockerignore)
COPY . .

# Step 6: Expose the app port (e.g., 3000)
EXPOSE 3000

# Step 7: Command to run your app
CMD ["npm", "start"]
