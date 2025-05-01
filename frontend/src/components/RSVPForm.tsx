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
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Event } from '../types';

interface RSVPFormData {
  name: string;
  attending: string;
  bringing_guests: string;
  guest_count: number;
  guest_names: string[];
  items_bringing: string[];
}

const RSVPForm: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [formData, setFormData] = useState<RSVPFormData>({
    name: '',
    attending: '',
    bringing_guests: '',
    guest_count: 1,
    guest_names: [],
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
        
        // Check if event is closed for RSVPs
        if (eventResponse.data.rsvp_cutoff_date) {
          const cutoffDate = new Date(eventResponse.data.rsvp_cutoff_date);
          if (new Date() > cutoffDate) {
            navigate(`/view/events/${slug}`);
            return;
          }
        }

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
    
    if (name === 'attending') {
      // Reset guest-related fields when attendance changes to 'no' or 'maybe'
      if (value === 'no' || value === 'maybe') {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          bringing_guests: 'no',
          guest_count: 0,
          guest_names: [],
          items_bringing: []
        }));
        return;
      }
    }

    if (name === 'bringing_guests') {
      // Reset guest fields when bringing_guests changes
      if (value === 'no') {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          guest_count: 0,
          guest_names: []
        }));
        return;
      } else if (value === 'yes') {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          guest_count: 1,
          guest_names: ['']
        }));
        return;
      }
    }

    if (name === 'guest_count') {
      const count = parseInt(value) || 0;
      // Adjust guest_names array size based on count
      setFormData(prev => ({
        ...prev,
        [name]: count,
        guest_names: Array(count).fill('').map((_, i) => prev.guest_names[i] || '')
      }));
      return;
    }

    if (name.startsWith('guest_name_')) {
      const index = parseInt(name.split('_')[2]);
      setFormData(prev => ({
        ...prev,
        guest_names: prev.guest_names.map((name, i) => i === index ? value : name)
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    
    if (name === 'attending' && value !== 'yes') {
      // If not attending, reset all guest-related fields and items
      setFormData(prev => ({
        ...prev,
        attending: value as 'no' | 'maybe',
        bringing_guests: 'no',
        guest_count: 0,
        guest_names: [],
        items_bringing: [] // Clear items when not attending
      }));
    } else if (name === 'bringing_guests') {
      // When bringing guests is changed
      setFormData(prev => ({
        ...prev,
        bringing_guests: value as 'yes' | 'no',
        // If changing to 'yes', set guest count to 1 and initialize one empty name field
        guest_count: value === 'yes' ? 1 : 0,
        // Clear guest names if changing to 'no', otherwise initialize with empty string
        guest_names: value === 'no' ? [] : ['']
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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

    // Validate required fields
    if (!formData.name.trim() || !formData.attending) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    if (formData.attending === 'yes' && !formData.bringing_guests) {
      setError('Please indicate if you are bringing guests');
      setIsSubmitting(false);
      return;
    }

    if (formData.bringing_guests === 'yes' && 
        (formData.guest_count < 1 || 
         formData.guest_names.some(name => !name.trim()))) {
      setError('Please provide names for all guests');
      setIsSubmitting(false);
      return;
    }

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
      const newRsvpItems = response.data.items_bringing;
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
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: event?.wallpaper ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${event.wallpaper})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          backgroundColor: event?.wallpaper ? '#000' : 'rgb(25, 28, 34)',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ py: 4 }}>
          <Container maxWidth="sm">
            <Paper elevation={3} sx={{ p: 4, mt: 4, textAlign: 'center' }}>
              <Typography variant="h4" component="h2" gutterBottom color="primary">
                Thank you!
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Your RSVP has been submitted successfully.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/')}
                >
                  Back to Events
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<VisibilityIcon />}
                  onClick={() => navigate(`/view/events/${slug}`)}
                >
                  View RSVPs
                </Button>
              </Box>
            </Paper>
          </Container>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: event?.wallpaper ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${event.wallpaper})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundColor: event?.wallpaper ? '#000' : 'rgb(25, 28, 34)',
        overflowY: 'auto',
      }}
    >
      <Box sx={{ py: 4 }}>
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

            {event?.rsvp_cutoff_date && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                <strong>Note:</strong> RSVPs will close on {new Date(event.rsvp_cutoff_date).toLocaleString()}
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

              <FormControl fullWidth required>
                <InputLabel>Are you attending?</InputLabel>
                <Select
                  name="attending"
                  value={formData.attending}
                  onChange={handleSelectChange}
                  label="Are you attending?"
                  required
                >
                  <MenuItem value="">Select an option</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>

              {formData.attending === 'yes' && (
                <>
                  <FormControl fullWidth required>
                    <InputLabel>Are you bringing any guests?</InputLabel>
                    <Select
                      name="bringing_guests"
                      value={formData.bringing_guests}
                      onChange={handleSelectChange}
                      label="Are you bringing any guests?"
                      required
                    >
                      <MenuItem value="">Select an option</MenuItem>
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
                        required
                        inputProps={{ min: 1 }}
                        error={formData.guest_count < 1}
                        helperText={formData.guest_count < 1 ? "Number of guests must be at least 1" : ""}
                      />

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Guest Names
                        </Typography>
                        {Array.from({ length: formData.guest_count }).map((_, index) => (
                          <TextField
                            key={index}
                            fullWidth
                            label={`Guest ${index + 1} Name`}
                            name={`guest_name_${index}`}
                            value={formData.guest_names[index] || ''}
                            onChange={handleChange}
                            margin="normal"
                            required
                          />
                        ))}
                      </Box>
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
                disabled={isSubmitting || 
                  !formData.name.trim() || 
                  !formData.attending ||
                  (formData.attending === 'yes' && !formData.bringing_guests) ||
                  (formData.bringing_guests === 'yes' && (formData.guest_count < 1 || formData.guest_names.some(name => !name.trim())))}
                sx={{ mt: 2 }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit RSVP'}
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default RSVPForm; 