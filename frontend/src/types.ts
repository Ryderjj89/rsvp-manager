export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  slug: string;
  created_at: string;
  needed_items: string[];
}

export interface Rsvp {
  id: number;
  event_id: number;
  name: string;
  attending: string;
  bringing_guests: string;
  guest_count: number;
  guest_names: string;
  items_bringing: string[];
  created_at: string;
} 