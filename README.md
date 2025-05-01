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

## Authentication with Authentik

This application is compatible with Authentik using a proxy provider (single application). To protect the admin routes, add the following configuration to your nginx config:

```nginx
# Protected routes
location ~ (/create|/admin) {
    proxy_pass	$forward_scheme://$server:$port;
    auth_request /outpost.goauthentik.io/auth/nginx;
    error_page 401 = @goauthentik_proxy_signin;
    auth_request_set $auth_cookie $upstream_http_set_cookie;
    add_header Set-Cookie $auth_cookie;
    auth_request_set $authentik_username $upstream_http_x_authentik_username;
    auth_request_set $authentik_groups $upstream_http_x_authentik_groups;
    auth_request_set $authentik_email $upstream_http_x_authentik_email;
    auth_request_set $authentik_name $upstream_http_x_authentik_name;
    auth_request_set $authentik_uid $upstream_http_x_authentik_uid;
    auth_request_set $authentik_authorization $upstream_http_authorization;
    proxy_set_header X-authentik-username $authentik_username;
    proxy_set_header X-authentik-groups $authentik_groups;
    proxy_set_header X-authentik-email $authentik_email;
    proxy_set_header X-authentik-name $authentik_name;
    proxy_set_header X-authentik-uid $authentik_uid;
    proxy_set_header Authorization $authentik_authorization;
}

# Authentik outpost configuration
location /outpost.goauthentik.io {
    proxy_pass	http://<YOUR_AUTHENTIK_URL>/outpost.goauthentik.io;
    proxy_set_header        Host $host;
    proxy_set_header        X-Original-URL $scheme://$http_host$request_uri;
    add_header              Set-Cookie $auth_cookie;
    auth_request_set        $auth_cookie $upstream_http_set_cookie;
    proxy_pass_request_body off;
    proxy_set_header        Content-Length "";
}

# Authentik signin redirect
location @goauthentik_proxy_signin {
    internal;
    add_header Set-Cookie $auth_cookie;
    return 302 /outpost.goauthentik.io/start?rd=$request_uri;
}
```

This configuration will:
- Protect the `/create` and `/admin` routes with Authentik authentication
- Redirect unauthenticated users to the Authentik login page
- Pass through Authentik user information in headers after successful authentication
- Handle the authentication flow through the Authentik outpost
- Properly manage cookies and headers for the authentication process

Note: Replace `<YOUR_AUTHENTIK_URL>` with your actual Authentik instance URL.

## License

MIT 