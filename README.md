# RSVP Manager

A modern event RSVP management system with a dark theme interface.

## Features

- User-friendly RSVP interface
- Event management
- Guest tracking
- Dark theme UI
- Containerized deployment

## Tech Stack

- Frontend: React with TypeScript
- Backend: Node.js/Express with TypeScript
- Database: MySQL
- Containerization: Docker

## Getting Started

### Prerequisites

- Docker
- Docker Compose
- Node.js (for local development)

### Installation

1. Clone the repository
2. Run `docker-compose up` to start the application
3. Access the application at `http://localhost:3000`

## Development

### Local Development Setup

1. Install dependencies:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

2. Start the development servers:
   ```bash
   # Start backend server
   cd backend
   npm run dev

   # Start frontend server
   cd ../frontend
   npm start
   ```

## License

MIT 