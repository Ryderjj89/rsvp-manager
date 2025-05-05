import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export interface RSVPEmailData {
  eventTitle: string;
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
    name,
    attending,
    bringingGuests,
    guestCount,
    guestNames,
    itemsBringing,
    otherItems,
    to,
  } = data;

  const subject = `RSVP Confirmation for ${eventTitle}`;
  const guestList = guestNames.length ? guestNames.join(', ') : 'None';
  const itemsList = itemsBringing.length ? itemsBringing.join(', ') : 'None';
  const otherItemsList = otherItems ? otherItems : 'None';

  const html = `
    <h2>RSVP Confirmation</h2>
    <p><strong>Event:</strong> ${eventTitle}</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Attending:</strong> ${attending}</p>
    <p><strong>Bringing Guests:</strong> ${bringingGuests} (${guestCount})</p>
    <p><strong>Guest Names:</strong> ${guestList}</p>
    <p><strong>Items Bringing (from needed list):</strong> ${itemsList}</p>
    <p><strong>Other Items:</strong> ${otherItemsList}</p>
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