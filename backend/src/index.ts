import express from 'express';
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
app.get('/api/events', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/events/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [slug]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { title, description, date, location } = req.body;
    const [result] = await pool.query(
      'INSERT INTO events (title, description, date, location) VALUES (?, ?, ?, ?)',
      [title, description, date, location]
    );
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// RSVP routes
app.get('/api/events/:slug/rsvps', async (req, res) => {
  try {
    const { slug } = req.params;
    const [rows] = await pool.query('SELECT * FROM rsvps WHERE event_id = ?', [slug]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events/:slug/rsvp', async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, attending, bringing_guests, guest_count, guest_names, items_bringing } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO rsvps (event_id, name, attending, bringing_guests, guest_count, guest_names, items_bringing) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [slug, name, attending, bringing_guests, guest_count, guest_names, items_bringing]
    );
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating RSVP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/events/:slug/rsvps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM rsvps WHERE id = ?', [id]);
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