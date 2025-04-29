import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

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

// Test database connection
async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API Routes
app.get('/api/events', async (req, res) => {
  try {
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    const [rows] = await pool.query('SELECT * FROM events');
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
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    const { title, description, date, location } = req.body;
    console.log('Creating event with data:', { title, description, date, location });
    const [result] = await pool.query(
      'INSERT INTO events (title, description, date, location) VALUES (?, ?, ?, ?)',
      [title, description, date, location]
    );
    console.log('Event created:', result);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating event:', error);
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

// Initialize database tables
async function initializeDatabase() {
  try {
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
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