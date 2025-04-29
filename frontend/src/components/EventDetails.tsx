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
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!event) {
    return (
      <Container>
        <Alert severity="warning">Event not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          my: 4,
          borderRadius: 2,
          background: 'linear-gradient(145deg, #ffffff, #f5f5f5)'
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
          bgcolor: 'background.paper',
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {rsvp.name}
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {rsvp.email} - {rsvp.status.charAt(0).toUpperCase() + rsvp.status.slice(1)}
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
  );
};

export default EventDetails; 