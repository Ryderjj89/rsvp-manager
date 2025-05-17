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
import { Event } from '../types';

interface RSVPFormData {
  name: string;
  attending: string;
  bringing_guests: string;
  guest_count: number;
  guest_names: string[];
  items_bringing: string[];
  other_items: string;
}

const RSVPEditForm: React.FC = () => {
  const { slug, editId } = useParams<{ slug: string; editId: string }>();
  const [formData, setFormData] = useState<RSVPFormData>({
    name: '',
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvpId, setRsvpId] = useState<number | null>(null);
  const [isEventClosed, setIsEventClosed] = useState(false); // New state to track if event is closed

  useEffect(() => {
    const fetchRsvpDetails = async () => {
      try {
        const [eventResponse, rsvpResponse, rsvpsResponse] = await Promise.all([
          axios.get<Event>(`/api/events/${slug}`),
          axios.get(`/api/rsvps/edit/${editId}`), // New endpoint to fetch by editId
          axios.get(`/api/events/${slug}/rsvps`) // To get all RSVPs for claimed items
        ]);

        if (!eventResponse.data || !rsvpResponse.data || !rsvpsResponse.data) {
          throw new Error('Failed to fetch data from server');
        }

        // Check if event is closed for RSVPs
        if (eventResponse.data.rsvp_cutoff_date) {
          const cutoffDate = new Date(eventResponse.data.rsvp_cutoff_date);
          if (new Date() > cutoffDate) {
            setIsEventClosed(true); // Set state if closed
          }
        }

        setEvent(eventResponse.data);
        setRsvpId(rsvpResponse.data.id);

        if (!eventResponse.data || !rsvpResponse.data || !rsvpsResponse.data) {
          throw new Error('Failed to fetch data from server');
        }

        setEvent(eventResponse.data);
        setRsvpId(rsvpResponse.data.id);

        // Pre-fill the form with existing RSVP data
        setFormData({
          name: rsvpResponse.data.name,
          attending: rsvpResponse.data.attending,
          bringing_guests: rsvpResponse.data.bringing_guests,
          guest_count: rsvpResponse.data.guest_count,
          guest_names: Array.isArray(rsvpResponse.data.guest_names) ? rsvpResponse.data.guest_names : (typeof rsvpResponse.data.guest_names === 'string' && rsvpResponse.data.guest_names ? JSON.parse(rsvpResponse.data.guest_names) : []),
          items_bringing: Array.isArray(rsvpResponse.data.items_bringing) ? rsvpResponse.data.items_bringing : (typeof rsvpResponse.data.items_bringing === 'string' && rsvpResponse.data.items_bringing ? JSON.parse(rsvpResponse.data.items_bringing) : []),
          other_items: rsvpResponse.data.other_items || ''
        });

        // Process needed items (same logic as RSVPForm)
        let items: string[] = [];
        if (eventResponse.data.needed_items) {
          items = Array.isArray(eventResponse.data.needed_items)
            ? eventResponse.data.needed_items
            : typeof eventResponse.data.needed_items === 'string'
              ? JSON.parse(eventResponse.data.needed_items)
              : [];
        }

        // Get all claimed items from existing RSVPs (excluding the current one)
        const claimed = new Set<string>();
        if (Array.isArray(rsvpsResponse.data)) {
          rsvpsResponse.data.forEach((rsvp: any) => {
            if (rsvp.id !== rsvpResponse.data.id) { // Exclude current RSVP's claimed items initially
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
            }
          });
        }

        // Filter out claimed items from available items, but include items the current RSVP already claimed
        const availableItems = items.filter(item => !claimed.has(item) || (Array.isArray(rsvpResponse.data.items_bringing) ? rsvpResponse.data.items_bringing.includes(item) : (typeof rsvpResponse.data.items_bringing === 'string' && rsvpResponse.data.items_bringing ? JSON.parse(rsvpResponse.data.items_bringing).includes(item) : false)));

        setNeededItems(availableItems);
        setClaimedItems(Array.from(claimed)); // This will be claimed by others
        setLoading(false);

      } catch (error) {
        console.error('Error fetching RSVP details:', error);
        setError('Failed to load RSVP details. The link may be invalid or expired.');
        setLoading(false);
      }
    };
    fetchRsvpDetails();
  }, [slug, editId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'attending') {
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
      setFormData(prev => ({
        ...prev,
        attending: value as 'no' | 'maybe',
        bringing_guests: 'no',
        guest_count: 0,
        guest_names: [],
        items_bringing: [],
        other_items: ''
      }));
    } else if (name === 'bringing_guests') {
      setFormData(prev => {
        const maxGuests = event?.max_guests_per_rsvp;
        let initialGuestCount = 1;

        if (maxGuests === 0 && value === 'yes') {
          return {
            ...prev,
            bringing_guests: 'no',
            guest_count: 0,
            guest_names: []
          };
        }

        if (maxGuests !== undefined && maxGuests !== -1 && maxGuests < initialGuestCount) {
          initialGuestCount = maxGuests;
        }

        return {
          ...prev,
          bringing_guests: value as 'yes' | 'no',
          guest_count: value === 'yes' ? initialGuestCount : 0,
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
    
    // Prevent submission if the event is closed
    if (isEventClosed) {
      setError('Event registration is closed. Changes are not allowed.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

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
      const splitOtherItems = formData.other_items
        .split(/\r?\n|,/)
        .map(s => s.trim())
        .filter(Boolean)
        .join(', ');
      const submissionData = {
        ...formData,
        items_bringing: formData.items_bringing,
        other_items: splitOtherItems
      };
      
      // Use the new PUT endpoint for updating by editId
      await axios.put(`/api/rsvps/edit/${editId}`, submissionData);

      setSuccess(true);
    } catch (err) {
      console.error('Error updating RSVP:', err);
      setError('Failed to update RSVP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (error || !event) {
    return (
      <Container maxWidth="sm">
        <Typography color="error">{error || 'Event or RSVP not found'}</Typography>
      </Container>
    );
  }

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
                Success!
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Your RSVP has been updated successfully.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate(`/view/events/${slug}`)}
              >
                View All RSVPs
              </Button>
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
              Edit Your RSVP
            </Typography>

            {isEventClosed && (
              <Typography color="error" align="center" sx={{ mb: 2 }}>
                Event registration is closed. Changes are not allowed. Please contact the event organizer for assistance.
              </Typography>
            )}

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
                disabled={isEventClosed} // Disable if event is closed
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

                          const maxGuests = event?.max_guests_per_rsvp;
                          let newCount = value;

                          if (maxGuests !== undefined && maxGuests !== -1 && value > maxGuests) {
                            newCount = maxGuests;
                          }

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

              <FormControl fullWidth required disabled={isEventClosed}> {/* Disable if event is closed */}
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
                  <FormControl fullWidth required disabled={isEventClosed}> {/* Disable if event is closed */}
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

                          const maxGuests = event?.max_guests_per_rsvp;
                          let newCount = value;

                          if (maxGuests !== undefined && maxGuests !== -1 && value > maxGuests) {
                            newCount = maxGuests;
                          }

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
                        disabled={isEventClosed} // Disable if event is closed
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
                          disabled={isEventClosed} // Disable if event is closed
                        />
                      ))}
                    </>
                  )}

                  {neededItems.length > 0 && (
                    <FormControl fullWidth disabled={isEventClosed}> {/* Disable if event is closed */}
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
                    disabled={isEventClosed} // Disable if event is closed
                  />
                </>
              )}

              {!isEventClosed && ( // Hide submit button if event is closed
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
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </Button>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default RSVPEditForm;
