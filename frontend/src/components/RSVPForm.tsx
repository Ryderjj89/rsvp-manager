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
  FormControlLabel, // Import FormControlLabel
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Event } from '../types';

interface RSVPFormData {
  name: string;
  email_address: string; // Required email field
  attending: string;
  bringing_guests: string;
  guest_count: number;
  guest_names: string[];
  items_bringing: string[];
  other_items: string;
}

const RSVPForm: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [formData, setFormData] = useState<RSVPFormData>({
    name: '',
    email_address: '', // Required email field
    attending: '',
    bringing_guests: '',
    guest_count: 1,
    guest_names: [],
    items_bringing: [],
    other_items: ''
  });
  const [neededItems, setNeededItems] = useState<string[]>([]);
  const [claimedItems, setClaimedItems] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isItemsSelectOpen, setIsItemsSelectOpen] = useState(false); // State to control select dropdown

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
          items_bringing: [],
          other_items: ''
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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
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
        items_bringing: [], // Clear items when not attending
        other_items: ''
      }));
    } else if (name === 'bringing_guests') {
          // When bringing guests is changed
          setFormData(prev => {
            const maxGuests = event?.max_guests_per_rsvp;
            let initialGuestCount = 1;
            
            // If max_guests_per_rsvp is 0, don't allow guests
            if (maxGuests === 0 && value === 'yes') {
              return {
                ...prev,
                bringing_guests: 'no',
                guest_count: 0,
                guest_names: []
              };
            }
            
            // If max_guests_per_rsvp is set and not -1 (unlimited), limit initial count
            if (maxGuests !== undefined && maxGuests !== -1 && maxGuests < initialGuestCount) {
              initialGuestCount = maxGuests;
            }
            
            return {
              ...prev,
              bringing_guests: value as 'yes' | 'no',
              // If changing to 'yes', set guest count to appropriate value
              guest_count: value === 'yes' ? initialGuestCount : 0,
              // Clear guest names if changing to 'no', otherwise initialize with empty strings
              guest_names: value === 'no' ? [] : Array(initialGuestCount).fill('')
            };
          });
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
    if (!formData.name.trim() || !formData.email_address.trim() || !formData.attending) {
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
      const splitOtherItems = formData.other_items
        .split(/\r?\n|,/)
        .map(s => s.trim())
        .filter(Boolean)
        .join(', ');
      const submissionData = {
        ...formData,
        items_bringing: formData.items_bringing,
        other_items: splitOtherItems,
        send_email_confirmation: true, // Always send email confirmation now
        email_address: formData.email_address.trim(),
        send_event_conclusion_email: true, // Always send true for conclusion email
      };
      const response = await axios.post(`/api/events/${slug}/rsvp`, submissionData);
      
      // Update the needed and claimed items
      const [eventResponse, rsvpsResponse] = await Promise.all([
        axios.get(`/api/events/${slug}`),
        axios.get(`/api/events/${slug}/rsvps`)
      ]);
      
      // Email confirmation is always sent now
      setSuccess(true);
      
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

              <TextField
                label="Email Address"
                name="email_address"
                type="email"
                value={formData.email_address}
                onChange={handleChange}
                required
                fullWidth
                variant="outlined"
                helperText="You will receive a confirmation email with an edit link"
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
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (isNaN(value)) return;
          
          // Check if there's a maximum guest limit
          const maxGuests = event?.max_guests_per_rsvp;
          let newCount = value;
          
          // If max_guests_per_rsvp is set and not -1 (unlimited), enforce the limit
          if (maxGuests !== undefined && maxGuests !== -1 && value > maxGuests) {
            newCount = maxGuests;
          }
          
          // Ensure count is at least 1
          if (newCount < 1) newCount = 1;
          
          setFormData(prev => ({
            ...prev,
            guest_count: newCount,
            guest_names: Array(newCount).fill('').map((_, i) => prev.guest_names[i] || '')
          }));
        }}
        fullWidth
        variant="outlined"
        required
        inputProps={{ 
          min: 1,
          max: event?.max_guests_per_rsvp === -1 ? undefined : event?.max_guests_per_rsvp
        }}
        error={formData.guest_count < 1}
        helperText={
          formData.guest_count < 1 
            ? "Number of guests must be at least 1" 
            : event?.max_guests_per_rsvp === 0 
              ? "No additional guests allowed for this event"
              : event?.max_guests_per_rsvp === -1
                ? "No limit on number of guests"
                : `Maximum ${event?.max_guests_per_rsvp} additional guests allowed`
        }
      />

                      {Array.from({ length: formData.guest_count }).map((_, index) => (
                        <TextField
                          key={index}
                          fullWidth
                          label={`Guest ${index + 1} Name`}
                          name={`guest_name_${index}`}
                          value={formData.guest_names[index] || ''}
                          onChange={handleChange}
                          required
                        />
                      ))}
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
                        open={isItemsSelectOpen} // Control open state
                        onOpen={() => setIsItemsSelectOpen(true)} // Set open when opened
                        onClose={() => setIsItemsSelectOpen(false)} // Set closed when closed
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 300, // Limit height of the dropdown
                              overflowY: 'auto',
                            },
                          },
                          MenuListProps: {
                            sx: {
                            },
                          },
                        }}
                      >
                        {neededItems.map((item) => (
                          <MenuItem key={item} value={item}>
                            <Checkbox checked={formData.items_bringing.includes(item)} />
                            <ListItemText primary={item} />
                          </MenuItem>
                        ))}
                        <Box sx={{ 
                          position: 'sticky', 
                          bottom: 0, 
                          left: 0, 
                          right: 0, 
                          backgroundColor: 'background.paper', 
                          padding: 1, 
                          zIndex: 1,
                          borderTop: '1px solid',
                          borderColor: 'divider',
                          textAlign: 'center',
                        }}>
                          <Button 
                            variant="contained" 
                            onClick={() => setIsItemsSelectOpen(false)} 
                            fullWidth
                          >
                            Done
                          </Button>
                        </Box>
                      </Select>
                    </FormControl>
                  )}

                  <TextField
                    label="Any other item(s)?"
                    name="other_items"
                    value={formData.other_items}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    multiline
                    rows={2}
                    placeholder="Enter any additional items you'd like to bring"
                  />
                </>
              )}


              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={isSubmitting || 
                  !formData.name.trim() || 
                  !formData.email_address.trim() ||
                  !formData.attending ||
                  (formData.attending === 'yes' && !formData.bringing_guests) ||
                  (formData.bringing_guests === 'yes' && (formData.guest_count < 1 || formData.guest_names.some(name => !name.trim())))
                }
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
