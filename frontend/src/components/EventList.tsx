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
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  slug: string;
}

const EventList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const navigate = useNavigate();

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

  const handleEventClick = (event: Event) => {
    navigate(`/rsvp/events/${event.slug}`);
  };

  const handleAdminClick = (event: Event) => {
    navigate(`/admin/events/${event.slug}`);
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
          onClick={() => navigate('/create')}
          size="large"
          sx={{ 
            py: 2, 
            px: 6, 
            fontSize: '1.2rem'
          }}
        >
          Create Event
        </Button>
      </Container>

      {events.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
            Current Events
          </Typography>
          <Grid container spacing={3}>
            {events.map((event) => (
              <Grid item xs={12} key={event.id}>
                <Card 
                  onClick={() => handleEventClick(event)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 6,
                    }
                  }}
                >
                  <CardContent>
                    <Typography variant="h5" component="h2">
                      {event.title}
                    </Typography>
                    <Typography color="textSecondary" gutterBottom>
                      {new Date(event.date).toLocaleString()} at {event.location}
                    </Typography>
                    <Typography variant="body2" component="p">
                      {event.description}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/view/events/${event.slug}`);
                      }}
                      color="primary"
                      aria-label="view rsvps"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      sx={{ ml: 1 }}
                    >
                      View RSVPs
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdminClick(event);
                      }}
                      color="primary"
                      aria-label="manage rsvps"
                      variant="outlined"
                      startIcon={<AdminPanelSettingsIcon />}
                      sx={{ ml: 1 }}
                    >
                      Manage RSVPs
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default EventList; 