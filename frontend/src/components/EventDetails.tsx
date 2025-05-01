import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Event, Rsvp } from '../types';
import { 
  Button, 
  Container, 
  Typography, 
  Box, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  CircularProgress, 
  Alert,
  Chip
} from '@mui/material';

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  slug: string;
  needed_items?: string[] | string;
  wallpaper?: string;
}

const EventDetails: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const [eventResponse, rsvpsResponse] = await Promise.all([
          axios.get<Event>(`/api/events/${slug}`),
          axios.get<Rsvp[]>(`/api/events/${slug}/rsvps`)
        ]);
        setEvent(eventResponse.data);
        setRsvps(rsvpsResponse.data);
        setLoading(false);
      } catch (error) {
        setError('Failed to load event details');
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [slug]);

  const formatAttendingStatus = (attending: string) => {
    return attending.charAt(0).toUpperCase() + attending.slice(1);
  };

  const getStatusColor = (attending: string): "success" | "error" | "warning" => {
    switch (attending.toLowerCase()) {
      case 'yes':
        return 'success';
      case 'no':
        return 'error';
      default:
        return 'warning';
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundImage: event?.wallpaper ? `url(${event.wallpaper})` : 'url(https://www.rydertech.us/backgrounds/space1.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!event) {
    return (
      <Container maxWidth="md">
        <Alert severity="warning">Event not found</Alert>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: event.wallpaper ? `url(${event.wallpaper})` : 'url(https://www.rydertech.us/backgrounds/space1.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Paper sx={{ p: 4, mb: 4, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {event.title}
          </Typography>
          <Typography variant="body1" paragraph>
            {event.description}
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" component="div" gutterBottom>
              <strong>Date:</strong> {new Date(event.date).toLocaleDateString()}
            </Typography>
            <Typography variant="subtitle1" component="div">
              <strong>Location:</strong> {event.location}
            </Typography>
            {event.needed_items && event.needed_items.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" component="div" gutterBottom>
                  <strong>Needed Items:</strong>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {event.needed_items.map((item, index) => (
                    <Chip key={index} label={item} color="primary" />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(`/events/${event.slug}/rsvp`)}
          >
            RSVP to Event
          </Button>
        </Paper>

        <Paper sx={{ p: 4 }}>
          <Typography 
            variant="h5" 
            gutterBottom 
            sx={{ 
              fontWeight: 500,
              color: 'primary.main',
              mb: 2,
              borderBottom: '2px solid',
              borderColor: 'primary.main',
              pb: 1
            }}
          >
            RSVPs
          </Typography>
          <List sx={{ 
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 1,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            {rsvps.map((rsvp) => (
              <ListItem 
                key={rsvp.id}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': {
                    borderBottom: 'none'
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                        {rsvp.name}
                      </Typography>
                      <Chip 
                        label={formatAttendingStatus(rsvp.attending)}
                        color={getStatusColor(rsvp.attending)}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      {rsvp.bringing_guests === 'yes' && (
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Bringing {rsvp.guest_count} guest{rsvp.guest_count !== 1 ? 's' : ''}: {rsvp.guest_names}
                        </Typography>
                      )}
                      {rsvp.items_bringing && rsvp.items_bringing.length > 0 && (
                        <Typography>
                          <strong>Items:</strong> {Array.isArray(rsvp.items_bringing) ? rsvp.items_bringing.join(', ') : rsvp.items_bringing}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
            {rsvps.length === 0 && (
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="body1" color="text.secondary" align="center">
                      No RSVPs yet
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </Paper>
      </Container>
    </Box>
  );
};

export default EventDetails; 