import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Container,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Chip,
} from '@mui/material';
import { Event } from '../types';

interface RSVPFormData {
  name: string;
  attending: string;
  bringing_guests: string;
  guest_count: number;
  guest_names: string;
  items_bringing: string[];
}

const RSVPForm: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [formData, setFormData] = useState<RSVPFormData>({
    name: '',
    attending: '',
    bringing_guests: '',
    guest_count: 0,
    guest_names: '',
    items_bringing: []
  });
  const [neededItems, setNeededItems] = useState<string[]>([]);
  const [claimedItems, setClaimedItems] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const [eventResponse, rsvpsResponse] = await Promise.all([
          axios.get<Event>(`/api/events/${slug}`),
          axios.get(`/api/events/${slug}/rsvps`)
        ]);
        
        // Process needed items
        let items: string[] = [];
        if (eventResponse.data.needed_items) {
          items = Array.isArray(eventResponse.data.needed_items) 
            ? eventResponse.data.needed_items 
            : typeof eventResponse.data.needed_items === 'string'
              ? JSON.parse(eventResponse.data.needed_items)
              : [];
        }

        // Get all claimed items from existing RSVPs
        const claimed = new Set<string>();
        if (Array.isArray(rsvpsResponse.data)) {
          rsvpsResponse.data.forEach((rsvp: any) => {
            try {
              let rsvpItems: string[] = [];
              if (typeof rsvp.items_bringing === 'string') {
                try {
                  const parsed = JSON.parse(rsvp.items_bringing);
                  rsvpItems = Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                  console.error('Error parsing items_bringing JSON:', e);
                }
              } else if (Array.isArray(rsvp.items_bringing)) {
                rsvpItems = rsvp.items_bringing;
              }
              
              if (Array.isArray(rsvpItems)) {
                rsvpItems.forEach((item: string) => claimed.add(item));
              }
            } catch (e) {
              console.error('Error processing RSVP items:', e);
            }
          });
        }
        
        // Filter out claimed items from available items
        const availableItems = items.filter(item => !claimed.has(item));
        
        setNeededItems(availableItems);
        setClaimedItems(Array.from(claimed));
        setEvent(eventResponse.data);
      } catch (error) {
        console.error('Error fetching event details:', error);
        setError('Failed to load event details');
        setNeededItems([]);
      }
    };
    fetchEventDetails();
  }, [slug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemsChange = (e: SelectChangeEvent<string[]>) => {
    const { value } = e.target;
    const itemsArray = Array.isArray(value) ? value : [];
    setFormData(prev => ({
      ...prev,
      items_bringing: itemsArray
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const submissionData = {
        ...formData,
        items_bringing: formData.items_bringing
      };
      const response = await axios.post(`/api/events/${slug}/rsvp`, submissionData);
      
      // Update the needed and claimed items
      const [eventResponse, rsvpsResponse] = await Promise.all([
        axios.get(`/api/events/${slug}`),
        axios.get(`/api/events/${slug}/rsvps`)
      ]);
      
      // Process needed items
      let items: string[] = [];
      if (eventResponse.data.needed_items) {
        items = Array.isArray(eventResponse.data.needed_items) 
          ? eventResponse.data.needed_items 
          : typeof eventResponse.data.needed_items === 'string'
            ? JSON.parse(eventResponse.data.needed_items)
            : [];
      }
      
      // Get all claimed items from existing RSVPs including the new submission
      const claimed = new Set<string>();
      
      // First add items from the new submission
      const newRsvpItems = response.data.items_bringing || [];
      if (Array.isArray(newRsvpItems)) {
        newRsvpItems.forEach((item: string) => claimed.add(item));
      }
      
      // Then add items from existing RSVPs
      if (Array.isArray(rsvpsResponse.data)) {
        rsvpsResponse.data.forEach((rsvp: { items_bringing: string | string[] }) => {
          try {
            let rsvpItems: string[] = [];
            if (typeof rsvp.items_bringing === 'string') {
              try {
                const parsed = JSON.parse(rsvp.items_bringing);
                rsvpItems = Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                console.error('Error parsing items_bringing JSON:', e);
                rsvpItems = [];
              }
            } else if (Array.isArray(rsvp.items_bringing)) {
              rsvpItems = rsvp.items_bringing;
            }
            
            if (Array.isArray(rsvpItems)) {
              rsvpItems.forEach((item: string) => claimed.add(item));
            }
          } catch (e) {
            console.error('Error processing RSVP items:', e);
          }
        });
      }
      
      // Filter out claimed items
      const availableItems = items.filter(item => !claimed.has(item));
      
      setNeededItems(availableItems);
      setClaimedItems(Array.from(claimed));
      setSuccess(true);
    } catch (err) {
      console.error('Error submitting RSVP:', err);
      setError('Failed to submit RSVP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h2" gutterBottom color="primary">
            Thank You!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Your RSVP has been submitted successfully.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/')}
          >
            Back to Events
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: event?.wallpaper ? `url(${event.wallpaper})` : 'url(https://www.rydertech.us/backgrounds/space1.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" component="h2" gutterBottom color="primary" align="center">
            RSVP Form
          </Typography>
          
          {error && (
            <Typography color="error" align="center" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
              variant="outlined"
            />

            <FormControl fullWidth>
              <InputLabel>Are you attending?</InputLabel>
              <Select
                name="attending"
                value={formData.attending}
                onChange={handleSelectChange}
                label="Are you attending?"
                required
              >
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </Select>
            </FormControl>

            {formData.attending === 'yes' && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Are you bringing any guests?</InputLabel>
                  <Select
                    name="bringing_guests"
                    value={formData.bringing_guests}
                    onChange={handleSelectChange}
                    label="Are you bringing any guests?"
                  >
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormControl>

                {formData.bringing_guests === 'yes' && (
                  <>
                    <TextField
                      label="Number of Guests"
                      name="guest_count"
                      type="number"
                      value={formData.guest_count}
                      onChange={handleChange}
                      fullWidth
                      variant="outlined"
                      inputProps={{ min: 1 }}
                    />

                    <TextField
                      label="Guest Names"
                      name="guest_names"
                      value={formData.guest_names}
                      onChange={handleChange}
                      multiline
                      rows={3}
                      fullWidth
                      variant="outlined"
                      placeholder="Please list the names of your guests"
                    />
                  </>
                )}

                {neededItems.length > 0 && (
                  <FormControl fullWidth>
                    <InputLabel>What items are you bringing?</InputLabel>
                    <Select
                      multiple
                      name="items_bringing"
                      value={formData.items_bringing}
                      onChange={handleItemsChange}
                      input={<OutlinedInput label="What items are you bringing?" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                    >
                      {neededItems.map((item) => (
                        <MenuItem key={item} value={item}>
                          <Checkbox checked={formData.items_bringing.includes(item)} />
                          <ListItemText primary={item} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={isSubmitting}
              sx={{ mt: 2 }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit RSVP'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default RSVPForm; 