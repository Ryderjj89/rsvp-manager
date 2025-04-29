import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Event, Rsvp } from '../types';
import { Button, Container, Typography, Box, Paper, List, ListItem, ListItemText, CircularProgress, Alert } from '@mui/material';

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

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundImage: 'url(https://www.rydertech.us/backgrounds/space1.jpg)',
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

  const formatStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'attending':
        return 'Yes';
      case 'not_attending':
        return 'No';
      case 'maybe':
        return 'Maybe';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: 'url(https://www.rydertech.us/backgrounds/space1.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            my: 4,
            borderRadius: 2,
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            maxWidth: '800px',
            mx: 'auto'
          }}
        >
          <Typography 
            variant="h3" 
            gutterBottom 
            sx={{ 
              fontWeight: 600,
              color: 'primary.main',
              mb: 3
            }}
          >
            {event.title}
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              {event.date} at {event.location}
            </Typography>
          </Box>
          <Typography 
            variant="body1" 
            paragraph 
            sx={{ 
              fontSize: '1.1rem',
              lineHeight: 1.6,
              color: 'text.primary',
              mb: 4
            }}
          >
            {event.description}
          </Typography>

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
            bgcolor: 'rgba(255, 255, 255, 0.7)',
            borderRadius: 1,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            maxWidth: '600px',
            mx: 'auto'
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                      {rsvp.name}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {rsvp.email} - {formatStatus(rsvp.status)}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>

          <Box mt={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/')}
              sx={{
                px: 4,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                '&:hover': {
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }
              }}
            >
              Back to Events
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default EventDetails; 