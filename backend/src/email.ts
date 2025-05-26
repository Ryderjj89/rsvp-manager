import nodemailer from 'nodemailer';

// Function to generate ICS calendar content
export function generateICSContent(eventData: {
  title: string;
  description: string;
  location: string;
  date: string; // ISO date string
  slug: string;
}): string {
  const { title, description, location, date, slug } = eventData;
  
  // Convert date to ICS format (YYYYMMDDTHHMMSSZ)
  const eventDate = new Date(date);
  const startDate = eventDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  // Set end time to 2 hours after start time (default duration)
  const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
  const endDateFormatted = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  // Generate unique ID for the event
  const uid = `${slug}-${Date.now()}@rsvp-manager`;
  
  // Current timestamp for DTSTAMP
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  // Clean description for ICS format (remove HTML, escape special chars)
  const cleanDescription = description
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/,/g, '\\,') // Escape commas
    .replace(/;/g, '\\;') // Escape semicolons
    .replace(/\\/g, '\\\\'); // Escape backslashes
  
  // Clean location for ICS format
  const cleanLocation = location
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\\/g, '\\\\');
  
  // Clean title for ICS format
  const cleanTitle = title
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\\/g, '\\\\');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RSVP Manager//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDateFormatted}`,
    `SUMMARY:${cleanTitle}`,
    `DESCRIPTION:${cleanDescription}`,
    `LOCATION:${cleanLocation}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

export interface RSVPEmailData {
  eventTitle: string;
  eventSlug: string;
  name: string;
  attending: string;
  bringingGuests: string;
  guestCount: number;
  guestNames: string[];
  itemsBringing: string[];
  otherItems: string;
  to: string;
}

export async function sendRSVPEmail(data: RSVPEmailData) {
  const {
    eventTitle,
    eventSlug,
    name,
    attending,
    bringingGuests,
    guestCount,
    guestNames,
    itemsBringing,
    otherItems,
    to,
  } = data;

  // Capitalize attending and bringingGuests values
  function capitalizeYesNo(value: string) {
    if (typeof value !== 'string') return value;
    return value.toLowerCase() === 'yes' ? 'Yes' : value.toLowerCase() === 'no' ? 'No' : value;
  }

  const subject = `RSVP Confirmation for ${eventTitle}`;
  const guestList = guestNames.length ? guestNames.join(', ') : 'None';
  const itemsList = itemsBringing.length ? itemsBringing.join(', ') : 'None';
  const otherItemsList = otherItems ? otherItems : 'None';
  const attendingDisplay = capitalizeYesNo(attending);
  const bringingGuestsDisplay = capitalizeYesNo(bringingGuests);

  // Assume the frontend is served at the same host
  const baseUrl = process.env.FRONTEND_BASE_URL || '';
  const manageRsvpsUrl = `${baseUrl}/admin/events/${eventSlug}`;
  const viewRsvpsUrl = `${baseUrl}/view/events/${eventSlug}`;

  const html = `
    <h2>RSVP Confirmation</h2>
    <p><strong>Event:</strong> ${eventTitle}</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Attending:</strong> ${attendingDisplay}</p>
    <p><strong>Bringing Guests:</strong> ${bringingGuestsDisplay} (${guestCount})</p>
    <p><strong>Guest Names:</strong> ${guestList}</p>
    <p><strong>Items Claimed:</strong> ${itemsList}</p>
    <p><strong>Other Items:</strong> ${otherItemsList}</p>
    <p><a href="${manageRsvpsUrl}">Manage RSVPs for this event</a></p>
    <p><a href="${viewRsvpsUrl}">View all RSVPs for this event</a></p>
  `;

  await transporter.sendMail({
    from: {
      name: process.env.EMAIL_FROM_NAME || '',
      address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || '',
    },
    to,
    subject,
    html,
  });
}

export interface RSVPEditLinkEmailData {
  eventTitle: string;
  eventSlug: string;
  name: string;
  to: string;
  editLink: string;
}

export async function sendRSVPEditLinkEmail(data: RSVPEditLinkEmailData) {
  const {
    eventTitle,
    eventSlug,
    name,
    to,
    editLink,
  } = data;

  const subject = `Confirming your RSVP for ${eventTitle}`; // Update the subject line

  // Generate calendar download link
  const baseUrl = process.env.FRONTEND_BASE_URL || '';
  const calendarLink = `${baseUrl}/api/events/${eventSlug}/calendar.ics`;

  const html = `
    <p>Hello ${name},</p>
    <p>You have successfully RSVP'd for the event "${eventTitle}".</p>
    <p>You can edit your RSVP at any time by clicking the link below:</p>
    <p><a href="${editLink}">${editLink}</a></p>
    <p style="margin: 20px 0;">
      <a href="${calendarLink}" 
         style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
        📅 Add to Calendar!
      </a>
    </p>
    <p>Please save this email if you think you might need to edit your submission later.</p>
    <p>Thank you!</p>
  `;

  await transporter.sendMail({
    from: {
      name: process.env.EMAIL_FROM_NAME || '',
      address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || '',
    },
    to,
    subject,
    html,
  });
}

export interface EventConclusionEmailData {
  eventTitle: string;
  attendeeName: string;
  message: string;
  to: string;
}

export async function sendEventConclusionEmail(data: EventConclusionEmailData) {
  const {
    eventTitle,
    attendeeName,
    message,
    to,
  } = data;

  const subject = `Thank You for Attending ${eventTitle}!`; // Subject for the conclusion email

  const html = `
    <p>Hello ${attendeeName},</p>
    <p>${message}</p>
    <p>Thank you for attending!</p>
  `;

  await transporter.sendMail({
    from: {
      name: process.env.EMAIL_FROM_NAME || '',
      address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || '',
    },
    to,
    subject,
    html,
  });
}
