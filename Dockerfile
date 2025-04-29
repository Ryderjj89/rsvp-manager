FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install
RUN cd frontend && npm install

# Copy source files
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 