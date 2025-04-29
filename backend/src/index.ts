import express, { Request, Response } from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
let db: any;

async function connectToDatabase() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
}

// Routes
app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const rows = await db.all('SELECT * FROM events');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/events/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const rows = await db.all('SELECT * FROM events WHERE slug = ?', [slug]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events', async (req: Request, res: Response) => {
  try {
    const { title, description, date, location } = req.body;
    // Generate a slug from the title
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const result = await db.run(
      'INSERT INTO events (title, description, date, location, slug) VALUES (?, ?, ?, ?, ?)',
      [title, description, date, location, slug]
    );
    res.status(201).json({ ...result, slug });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// RSVP routes
app.get('/api/events/:slug/rsvps', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const eventRows = await db.all('SELECT id FROM events WHERE slug = ?', [slug]);
    
    if (eventRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventId = eventRows[0].id;
    const rows = await db.all('SELECT * FROM rsvps WHERE event_id = ?', [eventId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events/:slug/rsvp', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { name, attending, bringing_guests, guest_count, guest_names, items_bringing } = req.body;
    
    const eventRows = await db.all('SELECT id FROM events WHERE slug = ?', [slug]);
    
    if (eventRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventId = eventRows[0].id;
    const result = await db.run(
      'INSERT INTO rsvps (event_id, name, attending, bringing_guests, guest_count, guest_names, items_bringing) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [eventId, name, attending, bringing_guests, guest_count, guest_names, items_bringing]
    );
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating RSVP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/events/:slug/rsvps/:id', async (req: Request, res: Response) => {
  try {
    const { slug, id } = req.params;
    
    // Verify the RSVP belongs to the correct event
    const eventRows = await db.all('SELECT id FROM events WHERE slug = ?', [slug]);
    
    if (eventRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventId = eventRows[0].id;
    await db.run('DELETE FROM rsvps WHERE id = ? AND event_id = ?', [id, eventId]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting RSVP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database tables
async function initializeDatabase() {
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        location TEXT,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS rsvps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        attending TEXT NOT NULL,
        bringing_guests TEXT NOT NULL,
        guest_count INTEGER DEFAULT 0,
        guest_names TEXT,
        items_bringing TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Start server
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await connectToDatabase();
  await initializeDatabase();
}); 