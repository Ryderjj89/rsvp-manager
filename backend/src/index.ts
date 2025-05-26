import express, { Request, Response } from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { sendRSVPEmail, sendRSVPEditLinkEmail, sendEventConclusionEmail, generateICSContent } from './email'; // Import the new email function and ICS generator
import cron from 'node-cron'; // Import node-cron for scheduling

dotenv.config();

// Function to generate a random alphanumeric string
function generateAlphanumericId(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

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

interface RSVP {
  id: number;
  event_id: number;
  name: string;
  attending: string;
  bringing_guests: string;
  guest_count: number;
  guest_names: string | null;
  items_bringing: string | null;
  other_items: string | null;
  edit_id: string;
  send_event_conclusion_email: boolean; // Added field for event conclusion email opt-in
  attendee_email: string | null; // Added field for attendee email
  created_at?: string;
}

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

    // Add the full path to wallpapers and parse JSON fields
    const events = rows.map((event: any) => ({
      ...event,
      wallpaper: event.wallpaper ? `/uploads/wallpapers/${event.wallpaper}` : null,
      needed_items: event.needed_items ? JSON.parse(event.needed_items) : [],
      email_notifications_enabled: Boolean(event.email_notifications_enabled),
      event_conclusion_email_enabled: Boolean(event.event_conclusion_email_enabled),
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

    // Parse needed_items from JSON string to array and boolean fields
    const event = rows[0];
    console.log('Raw event_conclusion_message from DB:', event.event_conclusion_message); // Keep this line for now, it's helpful for debugging
    try {
      event.needed_items = event.needed_items ? JSON.parse(event.needed_items) : [];
      event.email_notifications_enabled = Boolean(event.email_notifications_enabled);
      event.event_conclusion_email_enabled = Boolean(event.event_conclusion_email_enabled);
    } catch (e) {
      console.error('Error parsing event JSON/boolean fields:', e);
      event.needed_items = [];
      event.email_notifications_enabled = false;
      event.event_conclusion_email_enabled = false;
    }

    // Add the full path to the wallpaper
    if (event.wallpaper) {
      event.wallpaper = `/uploads/wallpapers/${event.wallpaper}`;
    }

    // Explicitly ensure event_conclusion_message is a string or null before sending
    event.event_conclusion_message = typeof event.event_conclusion_message === 'string' ? event.event_conclusion_message : null;

    res.json(event);

  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events', upload.single('wallpaper'), async (req: MulterRequest, res: Response) => {
  try {
    const {
      title,
      description,
      date,
      location,
      needed_items,
      rsvp_cutoff_date,
      max_guests_per_rsvp,
      email_notifications_enabled,
      email_recipients,
      event_conclusion_email_enabled, // Receive new field
      event_conclusion_message // Receive new field
    } = req.body;
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

    // Parse max_guests_per_rsvp to ensure it's a number
    const maxGuests = parseInt(max_guests_per_rsvp as string) || 0;

    // Parse boolean fields
    const emailNotificationsEnabled = email_notifications_enabled === 'true' || email_notifications_enabled === true;
    const eventConclusionEmailEnabled = event_conclusion_email_enabled === 'true' || event_conclusion_email_enabled === true;


    const result = await db.run(
      'INSERT INTO events (title, description, date, location, slug, needed_items, wallpaper, rsvp_cutoff_date, max_guests_per_rsvp, email_notifications_enabled, email_recipients, event_conclusion_email_enabled, event_conclusion_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        title,
        description,
        date,
        location,
        slug,
        JSON.stringify(parsedNeededItems),
        wallpaperPath,
        rsvp_cutoff_date,
        maxGuests,
        emailNotificationsEnabled ? 1 : 0,
        email_recipients || '',
        eventConclusionEmailEnabled ? 1 : 0, // Save new field
    event_conclusion_message === undefined ? null : event_conclusion_message // Save new field
      ]
    );

    res.status(201).json({
      ...result,
      slug,
      wallpaper: wallpaperPath ? `/uploads/wallpapers/${wallpaperPath}` : null,
      needed_items: parsedNeededItems,
      rsvp_cutoff_date,
      max_guests_per_rsvp: maxGuests,
      email_notifications_enabled: emailNotificationsEnabled,
      email_recipients: email_recipients || '',
      event_conclusion_email_enabled: eventConclusionEmailEnabled, // Include in response
      event_conclusion_message: event_conclusion_message || '' // Include in response
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

    // Parse JSON arrays and boolean fields in each RSVP
    const parsedRows = rows.map((rsvp: RSVP) => {
      try {
        return {
          ...rsvp,
          items_bringing: rsvp.items_bringing ? JSON.parse(rsvp.items_bringing) : [],
          guest_names: rsvp.guest_names ? JSON.parse(rsvp.guest_names) : [],
          send_event_conclusion_email: Boolean(rsvp.send_event_conclusion_email), // Parse new field
        };
      } catch (e) {
        console.error('Error parsing RSVP JSON/boolean fields:', e);
        return {
          ...rsvp,
          items_bringing: [],
          guest_names: [],
          send_event_conclusion_email: false, // Default value on error
        };
      }
    });

    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events/:slug/rsvp', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const {
      name,
      attending,
      bringing_guests,
      guest_count,
      guest_names,
      items_bringing,
      other_items,
      send_email_confirmation, // Existing field for RSVP confirmation email opt-in
      email_address, // Existing field for recipient email
      send_event_conclusion_email // Receive new field for conclusion email opt-in
    } = req.body;

    // Get the event with email notification settings
    const eventRows = await db.all('SELECT id, title, slug, email_notifications_enabled, email_recipients FROM events WHERE slug = ?', [slug]);

    if (eventRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventRows[0];
    const eventId = event.id;
    const eventTitle = event.title;
    const eventSlug = event.slug;
    const emailNotificationsEnabled = Boolean(event.email_notifications_enabled);
    const eventEmailRecipients = event.email_recipients;

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

    // Parse guest_names if it's a string
    let parsedGuestNames: string[] = [];
    try {
      if (typeof guest_names === 'string' && guest_names.includes('[')) {
        // If it's a JSON string array
        parsedGuestNames = JSON.parse(guest_names);
      } else if (typeof guest_names === 'string') {
        // If it's a comma-separated string
        parsedGuestNames = guest_names.split(',').map(name => name.trim()).filter(name => name);
      } else if (Array.isArray(guest_names)) {
        // If it's already an array
        parsedGuestNames = guest_names.filter(name => name && name.trim());
      }
    } catch (e) {
      console.error('Error parsing guest_names:', e);
      parsedGuestNames = [];
    }

    // Parse new boolean field
    const sendEventConclusionEmailBool = send_event_conclusion_email === 'true' || send_event_conclusion_email === true;
    const attendeeEmail = email_address?.trim() || null; // Store attendee email


    // Generate a unique edit ID
    let editId = '';
    let isUnique = false;
    while (!isUnique) {
      editId = generateAlphanumericId(16);
      const existingRsvp = await db.get('SELECT id FROM rsvps WHERE edit_id = ?', [editId]);
      if (!existingRsvp) {
        isUnique = true;
      }
    }

    const result = await db.run(
      'INSERT INTO rsvps (event_id, name, attending, bringing_guests, guest_count, guest_names, items_bringing, other_items, edit_id, send_event_conclusion_email, attendee_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        eventId,
        name,
        attending,
        bringing_guests,
        guest_count,
        JSON.stringify(parsedGuestNames),
        JSON.stringify(parsedItemsBringing),
        other_items || '',
        editId,
        sendEventConclusionEmailBool ? 1 : 0, // Save new field
        attendeeEmail // Save new field
      ]
    );

    // Send email notifications to event recipients if enabled for this event
    if (emailNotificationsEnabled) {
      // Get recipients from event settings
      let recipients: string[] = [];

      // Use the event's email recipients
      if (eventEmailRecipients) {
        recipients = eventEmailRecipients.split(',').map((addr: string) => addr.trim()).filter(Boolean);
      }

      // If no recipients are set for the event, use the sender email as a fallback
      if (recipients.length === 0 && process.env.EMAIL_USER) {
        recipients = [process.env.EMAIL_USER];
      }

      if (recipients.length > 0) {
        try {
          for (const to of recipients) {
            await sendRSVPEmail({
              eventTitle,
              eventSlug,
              name,
              attending,
              bringingGuests: bringing_guests,
              guestCount: guest_count,
              guestNames: parsedGuestNames,
              itemsBringing: parsedItemsBringing,
              otherItems: other_items || '',
              to,
            });
          }
        } catch (emailErr) {
          console.error('Error sending RSVP email to event recipients:', emailErr);
        }
      } else {
        console.warn('No event email recipients set. Skipping RSVP email notification to event recipients.');
      }
    } else {
      console.log('Email notifications disabled for this event. Skipping RSVP email notification to event recipients.');
    }

    // Send email confirmation with edit link to the submitter if requested
    const sendEmailConfirmationBool = send_email_confirmation === 'true' || send_email_confirmation === true;

    if (sendEmailConfirmationBool && attendeeEmail && process.env.EMAIL_USER) {
      try {
        const editLink = `${process.env.FRONTEND_BASE_URL}/events/${eventSlug}/rsvp/edit/${editId}`;
        await sendRSVPEditLinkEmail({
          eventTitle,
          eventSlug,
          name,
          to: attendeeEmail,
          editLink,
        });
        console.log(`Sent RSVP edit link email to ${attendeeEmail}`);
      } catch (emailErr) {
        console.error('Error sending RSVP edit link email:', emailErr);
      }
    } else if (sendEmailConfirmationBool && !attendeeEmail) {
      console.warn('Email confirmation requested but no email address provided. Skipping edit link email.');
    } else if (sendEmailConfirmationBool && !process.env.EMAIL_USER) {
       console.warn('Email confirmation requested but EMAIL_USER environment variable is not set. Cannot send edit link email.');
    } else {
      console.log('Email confirmation not requested. Skipping edit link email.');
    }


    // Return the complete RSVP data including the parsed arrays and edit_id
    res.status(201).json({
      id: result.lastID,
      event_id: eventId,
      name,
      attending,
      bringing_guests,
      guest_count,
      guest_names: parsedGuestNames,
      items_bringing: parsedItemsBringing,
      other_items: other_items || '',
      edit_id: editId,
      send_event_conclusion_email: sendEventConclusionEmailBool, // Include in response
      attendee_email: attendeeEmail, // Include in response
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating RSVP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get RSVP by edit ID
app.get('/api/rsvps/edit/:editId', async (req: Request, res: Response) => {
  try {
    const { editId } = req.params;
    const rsvp = await db.get('SELECT * FROM rsvps WHERE edit_id = ?', [editId]);

    if (!rsvp) {
      return res.status(404).json({ error: 'RSVP not found' });
    }

    // Parse arrays and boolean fields for response
    try {
      rsvp.items_bringing = rsvp.items_bringing ? JSON.parse(rsvp.items_bringing) : [];
      rsvp.guest_names = rsvp.guest_names ? JSON.parse(rsvp.guest_names) : [];
      rsvp.send_event_conclusion_email = Boolean(rsvp.send_event_conclusion_email); // Parse new field
    } catch (e) {
      console.error('Error parsing RSVP JSON/boolean fields in response:', e);
      rsvp.items_bringing = [];
      rsvp.guest_names = [];
      rsvp.send_event_conclusion_email = false; // Default value on error
    }

    res.json(rsvp);
  } catch (error) {
    console.error('Error fetching RSVP by edit ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend RSVP edit link email
app.post('/api/rsvps/resend-email/:editId', async (req: Request, res: Response) => {
  try {
    const { editId } = req.params;
    
    // Get RSVP and event details
    const rsvp = await db.get(`
      SELECT r.*, e.title, e.slug 
      FROM rsvps r 
      JOIN events e ON r.event_id = e.id 
      WHERE r.edit_id = ?
    `, [editId]);

    if (!rsvp) {
      return res.status(404).json({ error: 'RSVP not found' });
    }

    if (!rsvp.attendee_email) {
      return res.status(400).json({ error: 'No email address associated with this RSVP' });
    }

    if (!process.env.EMAIL_USER) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Send the edit link email
    const editLink = `${process.env.FRONTEND_BASE_URL}/events/${rsvp.slug}/rsvp/edit/${editId}`;
    await sendRSVPEditLinkEmail({
      eventTitle: rsvp.title,
      eventSlug: rsvp.slug,
      name: rsvp.name,
      to: rsvp.attendee_email,
      editLink,
    });

    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error resending RSVP edit link email:', error);
    res.status(500).json({ error: 'Failed to send email' });
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

// Update RSVP by edit ID
app.put('/api/rsvps/edit/:editId', async (req: Request, res: Response) => {
  try {
    const { editId } = req.params;
    const { name, email_address, attending, bringing_guests, guest_count, guest_names, items_bringing, other_items, send_event_conclusion_email } = req.body; // Updated to use email_address

    // Find the RSVP by edit_id and get current email
    const rsvp = await db.get('SELECT id, event_id, attendee_email, name FROM rsvps WHERE edit_id = ?', [editId]);

    if (!rsvp) {
      return res.status(404).json({ error: 'RSVP not found' });
    }

    const rsvpId = rsvp.id;
    const eventId = rsvp.event_id;
    const currentEmail = rsvp.attendee_email;
    const newEmail = email_address?.trim() || null;

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

    // Parse guest_names if it's a string
    let parsedGuestNames: string[] = [];
    try {
      if (typeof guest_names === 'string' && guest_names.includes('[')) {
        // If it's a JSON string array
        parsedGuestNames = JSON.parse(guest_names);
      } else if (typeof guest_names === 'string') {
        // If it's a comma-separated string
        parsedGuestNames = guest_names.split(',').map(name => name.trim()).filter(name => name);
      } else if (Array.isArray(guest_names)) {
        // If it's already an array
        parsedGuestNames = guest_names.filter(name => name && name.trim());
      }
    } catch (e) {
      console.error('Error parsing guest_names:', e);
      parsedGuestNames = [];
    }

    // Parse new boolean field
    const sendEventConclusionEmailBool = send_event_conclusion_email !== undefined ?
      (send_event_conclusion_email === 'true' || send_event_conclusion_email === true) :
      Boolean(rsvp.send_event_conclusion_email); // Use existing value if not provided

    const attendeeEmailToSave = newEmail;

    // Check if email address changed and send new confirmation if needed
    const emailChanged = currentEmail !== newEmail && newEmail && process.env.EMAIL_USER;
    
    if (emailChanged) {
      try {
        // Get event details for the email
        const event = await db.get('SELECT title, slug FROM events WHERE id = ?', [eventId]);
        if (event) {
          const editLink = `${process.env.FRONTEND_BASE_URL}/events/${event.slug}/rsvp/edit/${editId}`;
          await sendRSVPEditLinkEmail({
            eventTitle: event.title,
            eventSlug: event.slug,
            name: name ?? rsvp.name,
            to: newEmail,
            editLink,
          });
          console.log(`Sent new RSVP edit link email to updated address: ${newEmail}`);
        }
      } catch (emailErr) {
        console.error('Error sending RSVP edit link email to new address:', emailErr);
      }
    }

    // Update the RSVP
    await db.run(
      'UPDATE rsvps SET name = ?, attending = ?, bringing_guests = ?, guest_count = ?, guest_names = ?, items_bringing = ?, other_items = ?, send_event_conclusion_email = ?, attendee_email = ? WHERE id = ?',
      [
        name ?? rsvp.name,
        attending ?? rsvp.attending,
        bringing_guests ?? rsvp.bringing_guests,
        guest_count !== undefined ? guest_count : rsvp.guest_count,
        JSON.stringify(parsedGuestNames),
        JSON.stringify(parsedItemsBringing),
        other_items === undefined ? rsvp.other_items : other_items || '',
        sendEventConclusionEmailBool ? 1 : 0, // Update new field
        attendeeEmailToSave, // Update new field
        rsvpId
      ]
    );

    // Get the updated RSVP to verify and return
    const updatedRsvp = await db.get('SELECT * FROM rsvps WHERE id = ?', [rsvpId]);

    if (!updatedRsvp) {
      return res.status(404).json({ error: 'RSVP not found after update' });
    }

    // Parse arrays and boolean fields for response
    try {
      updatedRsvp.items_bringing = updatedRsvp.items_bringing ? JSON.parse(updatedRsvp.items_bringing) : [];
      updatedRsvp.guest_names = updatedRsvp.guest_names ? JSON.parse(updatedRsvp.guest_names) : [];
      updatedRsvp.send_event_conclusion_email = Boolean(updatedRsvp.send_event_conclusion_email); // Parse new field
    } catch (e) {
      console.error('Error parsing arrays in response:', e);
      updatedRsvp.items_bringing = [];
      updatedRsvp.guest_names = [];
      updatedRsvp.send_event_conclusion_email = false; // Default value on error
    }

    res.json(updatedRsvp);
  } catch (error) {
    console.error('Error updating RSVP by edit ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Update RSVP
app.put('/api/events/:slug/rsvps/:id', async (req: Request, res: Response) => {
  try {
    const { slug, id } = req.params;
    const { name, attending, bringing_guests, guest_count, guest_names, items_bringing, other_items, send_event_conclusion_email, attendee_email } = req.body; // Receive new fields

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

    // Parse guest_names if it's a string
    let parsedGuestNames: string[] = [];
    try {
      if (typeof guest_names === 'string' && guest_names.includes('[')) {
        // If it's a JSON string array
        parsedGuestNames = JSON.parse(guest_names);
      } else if (typeof guest_names === 'string') {
        // If it's a comma-separated string
        parsedGuestNames = guest_names.split(',').map(name => name.trim()).filter(name => name);
      } else if (Array.isArray(guest_names)) {
        // If it's already an array
        parsedGuestNames = guest_names.filter(name => name && name.trim());
      }
    } catch (e) {
      console.error('Error parsing guest_names:', e);
      parsedGuestNames = [];
    }

    // Get existing RSVP to check current values
    const existingRsvp = await db.get('SELECT send_event_conclusion_email, attendee_email FROM rsvps WHERE id = ? AND event_id = ?', [id, eventId]);
     if (!existingRsvp) {
      return res.status(404).json({ error: 'RSVP not found for this event' });
    }

    // Parse new boolean field
    const sendEventConclusionEmailBool = send_event_conclusion_email !== undefined ?
      (send_event_conclusion_email === 'true' || send_event_conclusion_email === true) :
      Boolean(existingRsvp.send_event_conclusion_email); // Use existing value if not provided

    const attendeeEmailToSave = attendee_email !== undefined ? attendee_email?.trim() || null : existingRsvp.attendee_email;


    // Update the RSVP
    await db.run(
      'UPDATE rsvps SET name = ?, attending = ?, bringing_guests = ?, guest_count = ?, guest_names = ?, items_bringing = ?, other_items = ?, send_event_conclusion_email = ?, attendee_email = ? WHERE id = ? AND event_id = ?',
      [
        name ?? existingRsvp.name, // Use existing value if not provided
        attending ?? existingRsvp.attending, // Use existing value if not provided
        bringing_guests ?? existingRsvp.bringing_guests, // Use existing value if not provided
        guest_count !== undefined ? guest_count : existingRsvp.guest_count, // Use existing value if not provided
        JSON.stringify(parsedGuestNames),
        JSON.stringify(parsedItemsBringing),
        other_items === undefined ? existingRsvp.other_items : other_items || '',
        sendEventConclusionEmailBool ? 1 : 0, // Update new field
        attendeeEmailToSave, // Update new field
        id,
        eventId
      ]
    );

    // Get the updated RSVP to verify and return
    const updatedRsvp = await db.get('SELECT * FROM rsvps WHERE id = ? AND event_id = ?', [id, eventId]);

    if (!updatedRsvp) {
      return res.status(404).json({ error: 'RSVP not found after update' });
    }

    // Parse arrays and boolean fields for response
    try {
      updatedRsvp.items_bringing = updatedRsvp.items_bringing ? JSON.parse(updatedRsvp.items_bringing) : [];
      updatedRsvp.guest_names = updatedRsvp.guest_names ? JSON.parse(updatedRsvp.guest_names) : [];
      updatedRsvp.send_event_conclusion_email = Boolean(updatedRsvp.send_event_conclusion_email); // Parse new field
    } catch (e) {
      console.error('Error parsing arrays in response:', e);
      updatedRsvp.items_bringing = [];
      updatedRsvp.guest_names = [];
      updatedRsvp.send_event_conclusion_email = false; // Default value on error
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
    const {
      title,
      description,
      date,
      location,
      needed_items,
      rsvp_cutoff_date,
      max_guests_per_rsvp,
      email_notifications_enabled,
      email_recipients,
      event_conclusion_email_enabled, // Receive new field
      event_conclusion_message // Receive new field
    } = req.body;

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

    // Parse max_guests_per_rsvp to ensure it's a number
    const maxGuests = max_guests_per_rsvp !== undefined ?
      (parseInt(max_guests_per_rsvp as string) || 0) :
      eventRows[0].max_guests_per_rsvp || 0;

    // Parse boolean fields
    const emailNotificationsEnabled = email_notifications_enabled !== undefined ?
      (email_notifications_enabled === 'true' || email_notifications_enabled === true) :
      Boolean(eventRows[0].email_notifications_enabled);

    const eventConclusionEmailEnabled = event_conclusion_email_enabled !== undefined ?
      (event_conclusion_email_enabled === 'true' || event_conclusion_email_enabled === true) :
      Boolean(eventRows[0].event_conclusion_email_enabled); // Use existing value if not provided

    // Get email recipients and conclusion message
    const emailRecipients = email_recipients !== undefined ?
      email_recipients :
      eventRows[0].email_recipients || '';

    const eventConclusionMessage = event_conclusion_message !== undefined ?
      event_conclusion_message :
      eventRows[0].event_conclusion_message || ''; // Use existing value if not provided


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
      'UPDATE events SET title = ?, description = ?, date = ?, location = ?, needed_items = ?, rsvp_cutoff_date = ?, wallpaper = ?, max_guests_per_rsvp = ?, email_notifications_enabled = ?, email_recipients = ?, event_conclusion_email_enabled = ?, event_conclusion_message = ? WHERE slug = ?',
      [
        title ?? eventRows[0].title,
        description === undefined ? eventRows[0].description : description,
        date ?? eventRows[0].date,
        location ?? eventRows[0].location,
        JSON.stringify(parsedNeededItems),
        rsvp_cutoff_date !== undefined ? rsvp_cutoff_date : eventRows[0].rsvp_cutoff_date,
        wallpaperPath,
        maxGuests,
        emailNotificationsEnabled ? 1 : 0,
        emailRecipients,
        eventConclusionEmailEnabled ? 1 : 0, // Update new field
        eventConclusionMessage, // Update new field
        slug
      ]
    );

    // Get the updated event
    const updatedEvent = await db.get('SELECT * FROM events WHERE slug = ?', [slug]);

    // Add the full path to the wallpaper and parse JSON/boolean fields
    if (updatedEvent.wallpaper) {
      updatedEvent.wallpaper = `/uploads/wallpapers/${updatedEvent.wallpaper}`;
    }

    try {
      updatedEvent.needed_items = updatedEvent.needed_items ? JSON.parse(updatedEvent.needed_items) : [];
      updatedEvent.email_notifications_enabled = Boolean(updatedEvent.email_notifications_enabled);
      updatedEvent.event_conclusion_email_enabled = Boolean(updatedEvent.event_conclusion_email_enabled);
    } catch (e) {
      console.error('Error parsing updated event JSON/boolean fields:', e);
      updatedEvent.needed_items = [];
      updatedEvent.email_notifications_enabled = false;
      updatedEvent.event_conclusion_email_enabled = false;
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
        max_guests_per_rsvp INTEGER DEFAULT 0,
        email_notifications_enabled BOOLEAN DEFAULT 0,
        email_recipients TEXT,
        event_conclusion_email_enabled BOOLEAN DEFAULT 0, -- Added event conclusion email toggle
        event_conclusion_message TEXT, -- Added event conclusion message field
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
        other_items TEXT,
        edit_id TEXT UNIQUE, -- Add a column for the unique edit ID
        send_event_conclusion_email BOOLEAN DEFAULT 0, -- Added field for event conclusion email opt-in
        attendee_email TEXT, -- Added field for attendee email
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

// Function to send event conclusion emails
async function sendConclusionEmails() {
  console.log('Running scheduled task to send event conclusion emails...');
  try {
    // Calculate yesterday's date in the format stored in the database (assuming YYYY-MM-DD)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    // Find events that ended yesterday and have conclusion emails enabled
    const events = await db.all(
      'SELECT id, title, event_conclusion_message FROM events WHERE date LIKE ? AND event_conclusion_email_enabled = 1',
      [`${yesterdayString}%`] // Match any time on yesterday's date
    );

    for (const event of events) {
      console.log(`Processing event "${event.title}" for conclusion email.`);
      // Find RSVPs for this event where conclusion email is opted in and email is provided
      const rsvps = await db.all(
        'SELECT name, attendee_email FROM rsvps WHERE event_id = ? AND send_event_conclusion_email = 1 AND attendee_email IS NOT NULL AND attendee_email != ""',
        [event.id]
      );

      if (rsvps.length > 0) {
        console.log(`Found ${rsvps.length} attendees opted in for conclusion email for event "${event.title}".`);
        for (const rsvp of rsvps) {
          try {
            await sendEventConclusionEmail({
              eventTitle: event.title,
              attendeeName: rsvp.name,
              message: event.event_conclusion_message,
              to: rsvp.attendee_email,
            });
            console.log(`Sent conclusion email to ${rsvp.attendee_email} for event "${event.title}".`);
          } catch (emailErr) {
            console.error(`Error sending conclusion email to ${rsvp.attendee_email} for event "${event.title}":`, emailErr);
          }
        }
      } else {
        console.log(`No attendees opted in for conclusion email for event "${event.title}".`);
      }
    }
    console.log('Finished running scheduled task.');
  } catch (error) {
    console.error('Error in scheduled task to send event conclusion emails:', error);
  }
}


// Schedule the task to run daily (e.g., at 8:00 AM)
const scheduledTask = cron.schedule('0 8 * * *', () => {
  sendConclusionEmails();
}, {
  scheduled: true,
  timezone: process.env.TZ || 'UTC' // Use TZ environment variable, default to UTC
});

console.log(`Event conclusion email scheduled task scheduled for timezone ${process.env.TZ || 'UTC'} at 8:00 AM.`);


// ICS Calendar file endpoint
app.get('/api/events/:slug/calendar.ics', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const event = await db.get('SELECT * FROM events WHERE slug = ?', [slug]);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Generate ICS content
    const icsContent = generateICSContent({
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      date: event.date,
      slug: event.slug
    });

    // Set appropriate headers for ICS file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${event.slug}-calendar.ics"`);
    res.send(icsContent);
  } catch (error) {
    console.error('Error generating ICS file:', error);
    res.status(500).json({ error: 'Failed to generate calendar file' });
  }
});

// Handle client-side routing
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Start server
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await connectToDatabase();
  // Optionally run the task on startup for testing
  // sendConclusionEmails();
});
