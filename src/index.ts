import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
let db: Database<sqlite3.Database, sqlite3.Statement>;
async function initializeDatabase() {
  try {
    db = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        location TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        slug TEXT UNIQUE
      );

      CREATE TABLE IF NOT EXISTS rsvps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER,
        name TEXT NOT NULL,
        attending BOOLEAN NOT NULL,
        bringing_guests BOOLEAN,
        guest_count INTEGER,
        guest_names TEXT,
        items_bringing TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id)
      )
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Helper function to create slug from title
function createSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API Routes
app.get('/api/events', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM events');
    console.log('Fetched events:', rows);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { title, description, date, location } = req.body;
    const slug = createSlug(title);
    console.log('Creating event with data:', { title, description, date, location, slug });
    const result = await db.run(
      'INSERT INTO events (title, description, date, location, slug) VALUES (?, ?, ?, ?, ?)',
      [title, description, date, location, slug]
    );
    console.log('Event created:', result);
    res.status(201).json({ ...result, slug });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/events/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const event = await db.get('SELECT * FROM events WHERE slug = ?', slug);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/events/:slug/rsvp', async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, attending, bringing_guests, guest_count, guest_names, items_bringing } = req.body;
    
    const event = await db.get('SELECT id FROM events WHERE slug = ?', slug);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Create a new RSVP with the submitted data
    const result = await db.run(
      'INSERT INTO rsvps (event_id, name, attending, bringing_guests, guest_count, guest_names, items_bringing) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [event.id, name, attending, bringing_guests, guest_count, guest_names, JSON.stringify(items_bringing || [])]
    );
    
    // Return a complete response with the original items_bringing array
    res.status(201).json({
      id: result.lastID,
      event_id: event.id,
      name,
      attending,
      bringing_guests,
      guest_count,
      guest_names,
      items_bringing: items_bringing || [],
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating RSVP:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  initializeDatabase();
}); 