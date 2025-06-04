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

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create necessary directories and set permissions
RUN mkdir -p /app/uploads/wallpapers /app/database && \
    touch /app/database/database.sqlite && \
    chown -R node:node /app && \
    chmod 755 /app/uploads && \
    chmod 755 /app/database && \
    chmod 644 /app/database/database.sqlite

# Copy backend package files and install dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy built files from builder stage
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/frontend/build ./frontend/build

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
