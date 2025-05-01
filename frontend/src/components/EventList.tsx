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
  rsvp_cutoff_date?: string;
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

  const isEventOpen = (event: Event) => {
    if (!event.rsvp_cutoff_date) return true;
    const cutoffDate = new Date(event.rsvp_cutoff_date);
    return new Date() < cutoffDate;
  };

  const handleEventClick = (event: Event) => {
    if (isEventOpen(event)) {
      navigate(`/rsvp/events/${event.slug}`);
    }
  };

  const handleAdminClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/admin/events/${event.slug}`);
  };

  const handleViewClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/view/events/${event.slug}`);
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

      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {events.map((event) => (
            <Grid item xs={12} sm={6} md={6} key={event.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: isEventOpen(event) ? 'pointer' : 'default',
                  opacity: isEventOpen(event) ? 1 : 0.7,
                  '& .MuiCardContent-root': {
                    padding: 3
                  }
                }} 
                onClick={() => handleEventClick(event)}
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
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {event.description}
                  </Typography>
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
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<AdminPanelSettingsIcon />}
                    onClick={(e) => handleAdminClick(event, e)}
                  >
                    Manage
                  </Button>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={(e) => handleViewClick(event, e)}
                  >
                    View RSVPs
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default EventList; 