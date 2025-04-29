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
} from '@mui/material';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const response = await axios.get(`/api/events/${slug}`);
        setNeededItems(response.data.needed_items || []);
      } catch (error) {
        setError('Failed to load event details');
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
    setFormData(prev => ({
      ...prev,
      items_bringing: Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await axios.post(`/api/events/${slug}/rsvp`, formData);
      setSuccess(true);
    } catch (err) {
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

              {neededItems && neededItems.length > 0 && (
                <FormControl fullWidth>
                  <InputLabel>What items are you bringing?</InputLabel>
                  <Select
                    multiple
                    name="items_bringing"
                    value={formData.items_bringing || []}
                    onChange={handleItemsChange}
                    input={<OutlinedInput label="What items are you bringing?" />}
                    renderValue={(selected) => {
                      const selectedArray = Array.isArray(selected) ? selected : [];
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selectedArray.map((value) => (
                            <Typography key={value} variant="body2">
                              {value}
                            </Typography>
                          ))}
                        </Box>
                      );
                    }}
                  >
                    {neededItems.map((item) => (
                      <MenuItem key={item} value={item}>
                        <Checkbox checked={Array.isArray(formData.items_bringing) && formData.items_bringing.indexOf(item) > -1} />
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
  );
};

export default RSVPForm; 