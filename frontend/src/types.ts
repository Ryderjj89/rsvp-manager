export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Rsvp {
  id: number;
  event_id: number;
  name: string;
  email: string;
  status: 'attending' | 'not_attending' | 'maybe';
  created_at: string;
  updated_at: string;
} 