import express, { Request, Response } from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'rsvp_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Routes
app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/events/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const [rows] = await pool.query('SELECT * FROM events WHERE slug = ?', [slug]);
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
    
    const [result] = await pool.query(
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
    const [eventRows] = await pool.query('SELECT id FROM events WHERE slug = ?', [slug]);
    
    if (eventRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventId = eventRows[0].id;
    const [rows] = await pool.query('SELECT * FROM rsvps WHERE event_id = ?', [eventId]);
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
    
    const [eventRows] = await pool.query('SELECT id FROM events WHERE slug = ?', [slug]);
    
    if (eventRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventId = eventRows[0].id;
    const [result] = await pool.query(
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
    const [eventRows] = await pool.query('SELECT id FROM events WHERE slug = ?', [slug]);
    
    if (eventRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventId = eventRows[0].id;
    await pool.query('DELETE FROM rsvps WHERE id = ? AND event_id = ?', [id, eventId]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting RSVP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database tables
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date DATETIME NOT NULL,
        location VARCHAR(255),
        slug VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rsvps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        attending VARCHAR(10) NOT NULL,
        bringing_guests VARCHAR(10) NOT NULL,
        guest_count INT DEFAULT 0,
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
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  initializeDatabase();
}); 