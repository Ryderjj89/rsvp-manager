export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  slug: string;
  created_at: string;
  needed_items: string[];
  wallpaper?: string;
  rsvp_cutoff_date?: string;
  max_guests_per_rsvp?: number;
}

export interface Rsvp {
  id: number;
  event_id: number;
  name: string;
  attending: string;
  bringing_guests: string;
  guest_count: number;
  guest_names: string[] | string;
  items_bringing: string[] | string;
  other_items?: string;
  created_at: string;
}
