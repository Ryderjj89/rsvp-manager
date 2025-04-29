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
    <Container>
      <Paper elevation={3} sx={{ p: 3, my: 3 }}>
        <Typography variant="h4" gutterBottom>
          {event.title}
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          {event.date} at {event.location}
        </Typography>
        <Typography variant="body1" paragraph>
          {event.description}
        </Typography>

        <Typography variant="h5" gutterBottom>
          RSVPs
        </Typography>
        <List>
          {rsvps.map((rsvp) => (
            <ListItem key={rsvp.id}>
              <ListItemText
                primary={rsvp.name}
                secondary={`${rsvp.email} - ${rsvp.status}`}
              />
            </ListItem>
          ))}
        </List>

        <Box mt={3}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/')}
          >
            Back to Events
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default EventDetails; 