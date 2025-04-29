import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
} from '@mui/material';
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
    navigate(`/events/${event.slug}/rsvp`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Events
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/create')}
        >
          Create Event
        </Button>
      </Box>

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
                  {new Date(event.date).toLocaleDateString()} at {event.location}
                </Typography>
                <Typography variant="body2" component="p">
                  {event.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default EventList; 