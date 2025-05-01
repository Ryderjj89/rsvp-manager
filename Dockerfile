# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install
RUN cd frontend && npm install --save-dev @types/react @types/react-dom @types/react-router-dom @types/axios
RUN cd backend && npm install && npm install --save-dev @types/node @types/express @types/multer @types/cors @types/sqlite3

# Copy source files
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Build backend
RUN cd backend && npm run build

# Create database file
RUN touch database.sqlite

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy built files from builder stage
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/frontend/build ./frontend/build
COPY --from=builder /app/database.sqlite ./database.sqlite

# Create uploads directory
RUN mkdir -p uploads/wallpapers

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 