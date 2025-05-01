# RSVP Manager

A modern event RSVP management system with customizable backgrounds and item coordination.

## Features

- User-friendly RSVP interface
- Comprehensive event management
  - Create and manage events
  - Track RSVPs and guest counts
  - Set RSVP cut-off dates to automatically close registrations
  - Coordinate needed items and track who's bringing what
  - Customizable event backgrounds/wallpapers
- Real-time item status tracking
  - See what items are still needed
  - Track claimed items
  - Prevent duplicate item claims
- Guest management
  - Track guest attendance
  - Support for bringing additional guests
  - Guest names tracking
- Modern, responsive UI
- Containerized deployment

## Tech Stack

- Frontend: React with TypeScript and Material-UI
- Backend: Node.js/Express with TypeScript
- Database: SQLite
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

### Key Features Explained

#### Event Creation and Management
- Create events with title, description, date, time, and location
- Set optional RSVP cut-off dates to automatically close registrations
- Upload custom wallpapers to personalize event pages
- Manage RSVPs and track attendance

#### Item Coordination
- Create a list of needed items for the event
- Attendees can claim items they'll bring
- Real-time tracking of claimed vs needed items
- Prevent duplicate item claims
- Remove items that are no longer needed

#### RSVP Management
- Track who's attending
- Support for bringing additional guests
- Keep track of guest names
- Manage what items each person is bringing

## License

MIT 