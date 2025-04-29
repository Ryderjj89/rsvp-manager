import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';

interface RSVP {
  id: number;
  name: string;
  attending: string;
  bringing_guests: string;
  guest_count: number;
  guest_names: string;
  items_bringing: string;
}

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  slug: string;
}

const EventAdmin: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rsvpToDelete, setRsvpToDelete] = useState<RSVP | null>(null);

  useEffect(() => {
    fetchEventAndRsvps();
  }, [slug]);

  const fetchEventAndRsvps = async () => {
    try {
      const [eventResponse, rsvpsResponse] = await Promise.all([
        axios.get(`/api/events/${slug}`),
        axios.get(`/api/events/${slug}/rsvps`)
      ]);
      setEvent(eventResponse.data);
      setRsvps(rsvpsResponse.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to load event data');
      setLoading(false);
    }
  };

  const handleDeleteRsvp = async (rsvp: RSVP) => {
    setRsvpToDelete(rsvp);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!rsvpToDelete) return;
    
    try {
      await axios.delete(`/api/events/${slug}/rsvps/${rsvpToDelete.id}`);
      setRsvps(rsvps.filter(r => r.id !== rsvpToDelete.id));
      setDeleteDialogOpen(false);
      setRsvpToDelete(null);
    } catch (error) {
      setError('Failed to delete RSVP');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (error || !event) {
    return (
      <Container maxWidth="lg">
        <Typography color="error">{error || 'Event not found'}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h2" color="primary">
            {event.title} - Admin
          </Typography>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
          >
            Back to Events
          </Button>
        </Box>

        <Typography variant="h6" gutterBottom>
          RSVPs ({rsvps.length})
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Attending</TableCell>
                <TableCell>Guests</TableCell>
                <TableCell>Items Bringing</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rsvps.map((rsvp) => (
                <TableRow key={rsvp.id}>
                  <TableCell>{rsvp.name}</TableCell>
                  <TableCell>{rsvp.attending}</TableCell>
                  <TableCell>
                    {rsvp.bringing_guests === 'yes' ? (
                      `${rsvp.guest_count} - ${rsvp.guest_names}`
                    ) : (
                      'No'
                    )}
                  </TableCell>
                  <TableCell>{rsvp.items_bringing}</TableCell>
                  <TableCell>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteRsvp(rsvp)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete RSVP</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {rsvpToDelete?.name}'s RSVP?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EventAdmin; 