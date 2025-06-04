import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  CardActions,
  Container,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import axios from 'axios';

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  slug: string;
  rsvp_cutoff_date?: string;
}

const EventList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const navigate = useNavigate();
  const [hideClosed, setHideClosed] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/api/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const isEventOpen = (event: Event) => {
    if (!event.rsvp_cutoff_date) return true;
    const cutoffDate = new Date(event.rsvp_cutoff_date);
    return new Date() < cutoffDate;
  };

  const handleAdminClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/admin/events/${event.slug}`;
  };

  const handleViewClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/view/events/${event.slug}`);
  };

  const handleCopyLink = (event: Event) => {
    const rsvpLink = `${window.location.origin}/rsvp/events/${event.slug}`;
    navigator.clipboard.writeText(rsvpLink)
      .then(() => {
        setSnackbarMessage('RSVP link copied to clipboard!');
        setOpenSnackbar(true);
      })
      .catch(err => {
        setSnackbarMessage('Failed to copy link.');
        setOpenSnackbar(true);
        console.error('Failed to copy: ', err);
      });
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <Box>
      <Container maxWidth="md" sx={{ textAlign: 'center', mb: 8 }}>
        <Typography variant="h2" component="h1" sx={{ mb: 4 }}>
          RSVP Manager
        </Typography>
        <Typography variant="h6" component="p" sx={{ mb: 6, color: 'text.secondary' }}>
          Welcome to RSVP Manager! Create and manage your events with ease. 
          Organize gatherings, track attendance, and coordinate items that guests can bring. 
          Perfect for parties, meetings, and any event that needs RSVP coordination.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.location.href = '/create'}
          size="large"
          sx={{ 
            py: 2, 
            px: 6, 
            fontSize: '1.2rem'
          }}
        >
          Create Event
        </Button>
        <Box sx={{ mt: 2, mb: 4, display: 'flex', justifyContent: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={hideClosed}
                onChange={(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => setHideClosed(checked)}
                color="primary"
              />
            }
            label="Hide Closed Events"
          />
        </Box>
      </Container>

      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {events
            .filter(event => !hideClosed || isEventOpen(event))
            .map((event) => (
              <Grid item xs={12} sm={6} md={12} key={event.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    opacity: isEventOpen(event) ? 1 : 0.7,
                    '& .MuiCardContent-root': {
                      padding: 3
                    }
                  }} 
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="h5" component="h2" sx={{ flexGrow: 1 }}>
                        {event.title}
                      </Typography>
                      <Chip
                        label={isEventOpen(event) ? "Open" : "Closed"}
                        color={isEventOpen(event) ? "success" : "error"}
                        size="small"
                      />
                    </Box>
                    {event.description && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Info:</strong> {event.description}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      <strong>Date:</strong> {new Date(event.date).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Location:</strong> {event.location}
                    </Typography>
                    {event.rsvp_cutoff_date && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>RSVP cut-off date:</strong> {new Date(event.rsvp_cutoff_date).toLocaleString()}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                    <Stack direction="row" spacing={1}>
                      {isEventOpen(event) && (
                        <Button
                          size="small"
                          startIcon={<HowToRegIcon />}
                          onClick={() => navigate(`/rsvp/events/${event.slug}`)}
                        >
                          Submit RSVP
                        </Button>
                      )}
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={(e) => handleViewClick(event, e)}
                      >
                        View RSVPs
                      </Button>
                    </Stack>
                    <Button
                      size="small"
                      startIcon={<AdminPanelSettingsIcon />}
                      onClick={(e) => handleAdminClick(event, e)}
                    >
                      Manage
                    </Button>
                    <Button
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => handleCopyLink(event)}
                    >
                      Copy RSVP Link
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
        </Grid>
      </Container>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EventList;
