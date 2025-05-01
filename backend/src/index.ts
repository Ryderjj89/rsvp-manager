import express, { Request, Response } from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database connection
let db: any;

async function connectToDatabase() {
  try {
    // Database file will be in the app directory
    const dbPath = path.join(__dirname, '../database.sqlite');
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Initialize tables immediately after connection
    await initializeDatabase();
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1); // Exit if we can't connect to the database
  }
}

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../uploads/wallpapers');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Define multer request interface
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const storage = multer.diskStorage({
  destination: function (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    cb(null, uploadDir);
  },
  filename: function (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
});

// Routes
app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const rows = await db.all('SELECT * FROM events');
    
    // Add the full path to wallpapers
    const events = rows.map((event: { 
      id: number;
      title: string;
      description: string;
      date: string;
      location: string;
      slug: string;
      needed_items: string | null;
      wallpaper: string | null;
      created_at: string;
    }) => ({
      ...event,
      wallpaper: event.wallpaper ? `/uploads/wallpapers/${event.wallpaper}` : null,
      needed_items: event.needed_items ? JSON.parse(event.needed_items) : []
    }));
    
    res.json(events);
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

    // Parse needed_items from JSON string to array
    const event = rows[0];
    try {
      event.needed_items = event.needed_items ? JSON.parse(event.needed_items) : [];
    } catch (e) {
      console.error('Error parsing needed_items:', e);
      event.needed_items = [];
    }

    // Add the full path to the wallpaper
    if (event.wallpaper) {
      event.wallpaper = `/uploads/wallpapers/${event.wallpaper}`;
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events', upload.single('wallpaper'), async (req: MulterRequest, res: Response) => {
  try {
    const { title, description, date, location, needed_items, rsvp_cutoff_date } = req.body;
    const wallpaperPath = req.file ? `${req.file.filename}` : null;
    
    // Generate a slug from the title
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Ensure needed_items is properly formatted
    let parsedNeededItems: string[] = [];
    try {
      if (typeof needed_items === 'string') {
        parsedNeededItems = JSON.parse(needed_items);
      } else if (Array.isArray(needed_items)) {
        parsedNeededItems = needed_items;
      }
    } catch (e) {
      console.error('Error parsing needed_items:', e);
    }
    
    const result = await db.run(
      'INSERT INTO events (title, description, date, location, slug, needed_items, wallpaper, rsvp_cutoff_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, date, location, slug, JSON.stringify(parsedNeededItems), wallpaperPath, rsvp_cutoff_date]
    );
    
    res.status(201).json({ 
      ...result, 
      slug,
      wallpaper: wallpaperPath ? `/uploads/wallpapers/${wallpaperPath}` : null,
      needed_items: parsedNeededItems,
      rsvp_cutoff_date
    });
  } catch (error) {
    console.error('Error creating event:', error);
    if (req.file) {
      // Clean up uploaded file if there was an error
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/events/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    // First check if the event exists
    const eventRows = await db.all('SELECT id FROM events WHERE slug = ?', [slug]);
    
    if (eventRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Delete the event (RSVPs will be automatically deleted due to ON DELETE CASCADE)
    await db.run('DELETE FROM events WHERE slug = ?', [slug]);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
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
    
    // Ensure items_bringing is properly formatted
    let parsedItemsBringing: string[] = [];
    try {
      if (typeof items_bringing === 'string') {
        parsedItemsBringing = JSON.parse(items_bringing);
      } else if (Array.isArray(items_bringing)) {
        parsedItemsBringing = items_bringing;
      }
    } catch (e) {
      console.error('Error parsing items_bringing:', e);
    }
    
    const result = await db.run(
      'INSERT INTO rsvps (event_id, name, attending, bringing_guests, guest_count, guest_names, items_bringing) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [eventId, name, attending, bringing_guests, guest_count, guest_names, JSON.stringify(parsedItemsBringing)]
    );

    // Return the complete RSVP data including the parsed items_bringing
    res.status(201).json({
      id: result.lastID,
      event_id: eventId,
      name,
      attending,
      bringing_guests,
      guest_count,
      guest_names,
      items_bringing: parsedItemsBringing
    });
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

// Update RSVP
app.put('/api/events/:slug/rsvps/:id', async (req: Request, res: Response) => {
  try {
    const { slug, id } = req.params;
    const { name, attending, bringing_guests, guest_count, guest_names, items_bringing } = req.body;
    
    // Verify the RSVP belongs to the correct event
    const eventRows = await db.all('SELECT id FROM events WHERE slug = ?', [slug]);
    
    if (eventRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventId = eventRows[0].id;
    
    // Parse items_bringing if it's a string
    let parsedItemsBringing: string[] = [];
    try {
      if (typeof items_bringing === 'string') {
        parsedItemsBringing = JSON.parse(items_bringing);
      } else if (Array.isArray(items_bringing)) {
        parsedItemsBringing = items_bringing;
      }
    } catch (e) {
      console.error('Error parsing items_bringing:', e);
    }

    // Update the RSVP
    await db.run(
      'UPDATE rsvps SET name = ?, attending = ?, bringing_guests = ?, guest_count = ?, guest_names = ?, items_bringing = ? WHERE id = ? AND event_id = ?',
      [name, attending, bringing_guests, guest_count, guest_names, JSON.stringify(parsedItemsBringing), id, eventId]
    );

    // Get the updated RSVP to verify and return
    const updatedRsvp = await db.get('SELECT * FROM rsvps WHERE id = ? AND event_id = ?', [id, eventId]);
    
    if (!updatedRsvp) {
      return res.status(404).json({ error: 'RSVP not found after update' });
    }

    // Parse items_bringing for response
    try {
      updatedRsvp.items_bringing = updatedRsvp.items_bringing ? JSON.parse(updatedRsvp.items_bringing) : [];
    } catch (e) {
      console.error('Error parsing items_bringing in response:', e);
      updatedRsvp.items_bringing = [];
    }

    res.json(updatedRsvp);
  } catch (error) {
    console.error('Error updating RSVP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update event
app.put('/api/events/:slug', upload.single('wallpaper'), async (req: MulterRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const { title, description, date, location, needed_items, rsvp_cutoff_date } = req.body;
    
    // Verify the event exists
    const eventRows = await db.all('SELECT * FROM events WHERE slug = ?', [slug]);
    
    if (eventRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Ensure needed_items is properly formatted
    let parsedNeededItems: string[] = [];
    try {
      if (typeof needed_items === 'string') {
        parsedNeededItems = JSON.parse(needed_items);
      } else if (Array.isArray(needed_items)) {
        parsedNeededItems = needed_items;
      }
    } catch (e) {
      console.error('Error parsing needed_items:', e);
    }

    // Handle wallpaper update
    let wallpaperPath = eventRows[0].wallpaper;
    if (req.file) {
      // If there's an existing wallpaper, delete it
      if (eventRows[0].wallpaper) {
        const oldWallpaperPath = path.join(uploadDir, eventRows[0].wallpaper);
        try {
          await fs.promises.unlink(oldWallpaperPath);
        } catch (e) {
          console.error('Error deleting old wallpaper:', e);
        }
      }
      wallpaperPath = req.file.filename;
    }
    
    // Update the event
    await db.run(
      'UPDATE events SET title = ?, description = ?, date = ?, location = ?, needed_items = ?, rsvp_cutoff_date = ?, wallpaper = ? WHERE slug = ?',
      [
        title ?? eventRows[0].title,
        description === undefined ? eventRows[0].description : description,
        date ?? eventRows[0].date,
        location ?? eventRows[0].location,
        JSON.stringify(parsedNeededItems),
        rsvp_cutoff_date !== undefined ? rsvp_cutoff_date : eventRows[0].rsvp_cutoff_date,
        wallpaperPath,
        slug
      ]
    );

    // Get the updated event
    const updatedEvent = await db.get('SELECT * FROM events WHERE slug = ?', [slug]);
    
    // Add the full path to the wallpaper
    if (updatedEvent.wallpaper) {
      updatedEvent.wallpaper = `/uploads/wallpapers/${updatedEvent.wallpaper}`;
    }
    
    // Parse needed_items for response
    try {
      updatedEvent.needed_items = updatedEvent.needed_items ? JSON.parse(updatedEvent.needed_items) : [];
    } catch (e) {
      console.error('Error parsing needed_items in response:', e);
      updatedEvent.needed_items = [];
    }
    
    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    // Clean up uploaded file if there was an error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create events table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        location TEXT,
        slug TEXT NOT NULL UNIQUE,
        needed_items TEXT,
        wallpaper TEXT,
        rsvp_cutoff_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create RSVPs table
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
    throw error; // Re-throw to handle in the connection function
  }
}

// Handle client-side routing
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Start server
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await connectToDatabase();
}); 