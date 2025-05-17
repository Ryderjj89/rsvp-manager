# RSVP Manager

A modern event RSVP management system with customizable backgrounds and item coordination.

This project was created completely by the [Cursor AI Code Editor](https://www.cursor.com/) & Visual Studio Code with [Cline](https://cline.bot/)!

## Features

- Event Creation and Management
  - Create and manage events with title, description, date, time, and location
  - Set optional RSVP cut-off dates to automatically close registrations
  - Upload custom wallpapers to personalize event pages
  - Track RSVPs and guest counts
  - Comprehensive admin interface for event management
  - Email notifications for submitted RSVPs
  - Individual submission links so users can edit their submissions

- Item Coordination
  - Create and manage lists of needed items for events
  - Real-time tracking of claimed vs needed items
  - Prevent duplicate item claims
  - Allow attendees to bring additional items not on the list
  - Remove items that are no longer needed

- Guest Management
  - Track attendance status (yes/no)
  - Support for bringing additional guests
  - Keep track of guest names
  - View all RSVPs and items being brought

- Modern, Responsive UI
  - Clean, intuitive interface
  - Mobile-friendly design
  - Real-time updates
  - Customizable event backgrounds

- Containerized Deployment
  - Docker support
  - Easy deployment and scaling
  - Consistent environment across installations

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

#### Branch Selection

There are 2 branches, latest & dev.

| Branch | Description |
| ------------- | ------------- |
| Latest | The most recent stable build. Use this if you don't like to get changes early. |
| Dev | Use this if you want to be on the cutting edge. This can be unstable or even broken. |

#### Environment Variables

These variables below are all for the email notifications. If you want to be able to send email notifications, each of these needs to be provided and filled out.

| Variable | Description |
| ------------- | ------------- |
| EMAIL_HOST | Your email provider's host name |
| EMAIL_PORT | Your email provider's SMTP port |
| EMAIL_USER | Login username for your email provider |
| EMAIL_PASS | Login password for your email provider |
| EMAIL_FROM_NAME | Name displayed in the "from" on email notifications |
| EMAIL_FROM_ADDRESS | Email displayed in the "from" on email notifications |
| FRONTEND_BASE_URL | The main URL for your instance. This will be used in the links that are sent in the email notificiations, eg. https://rsvp.example.com |

#### Docker Compose

1. Clone the repository.
2. Edit the `docker-compose.yml` for the tag you'd like to use & environment variables (described above), then save it.
3. Run `docker compose up -d` to start the application.
4. Access the application at `http://localhost:3000`.

#### Docker Run

1. Run these commands:
```
docker volume create rsvp-manager_data
docker volume create rsvp-manager_uploads
docker run -d --name rsvp-manager \
  -p 3000:3000 \
  -v rsvp-manager_data:/app \
  -v rsvp-manager_uploads:/app/uploads \
  -e NODE_ENV=production \
  -e EMAIL_HOST=smtp.host.com \
  -e EMAIL_PORT=### \
  -e EMAIL_USER=username \
  -e EMAIL_PASS=password \
  -e EMAIL_FROM_NAME=name \
  -e EMAIL_FROM_ADDRESS=name@example.com \
  -e EMAIL_SECURE=true or false \
  -e FRONTEND_BASE_URL=https://rsvp.example.com \
  --restart unless-stopped \
  ryderjj89/rsvp-manager:<CHANGE THIS TAG!>
```
2. Access the application at `http://localhost:3000`

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

## Email Notifications (Currently in dev branch!)

By setting up the environment variables in the `docker-compose.yml`, you can have notifications sent to the recipients of your choice when someone submits an RSVP to an event. The notification will include the details of their submission and links to view or manage the RSVPs for that event.

## Authentication with Authentik

This application is compatible with Authentik. Make sure to create a Proxy Provider for Forward auth (single application). To protect the admin & create routes, add the following configuration to your Nginx Proxy Manager config in the Advanced section. For other web server applications, see the Setup area in Authentik on the Provider page for this app and setup the routes accordingly.

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
