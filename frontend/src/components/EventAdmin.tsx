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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  SelectChangeEvent,
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rsvpToEdit, setRsvpToEdit] = useState<RSVP | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    attending: 'yes',
    bringing_guests: 'no',
    guest_count: 0,
    guest_names: '',
    items_bringing: '',
  });

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
      setRsvps(rsvps.filter((r: RSVP) => r.id !== rsvpToDelete.id));
      setDeleteDialogOpen(false);
      setRsvpToDelete(null);
    } catch (error) {
      setError('Failed to delete RSVP');
    }
  };

  const handleEditRsvp = (rsvp: RSVP) => {
    setRsvpToEdit(rsvp);
    setEditForm({
      name: rsvp.name,
      attending: rsvp.attending,
      bringing_guests: rsvp.bringing_guests,
      guest_count: rsvp.guest_count,
      guest_names: rsvp.guest_names,
      items_bringing: rsvp.items_bringing,
    });
    setEditDialogOpen(true);
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev: typeof editForm) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setEditForm((prev: typeof editForm) => ({
      ...prev,
      [name as string]: value,
    }));
  };

  const handleEditSubmit = async () => {
    if (!rsvpToEdit) return;
    
    try {
      await axios.put(`/api/events/${slug}/rsvps/${rsvpToEdit.id}`, editForm);
      setRsvps(rsvps.map((r: RSVP) => r.id === rsvpToEdit.id ? { ...r, ...editForm } : r));
      setEditDialogOpen(false);
      setRsvpToEdit(null);
    } catch (error) {
      setError('Failed to update RSVP');
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
              {rsvps.map((rsvp: RSVP) => (
                <TableRow key={rsvp.id}>
                  <TableCell>{rsvp.name}</TableCell>
                  <TableCell>{rsvp.attending.charAt(0).toUpperCase() + rsvp.attending.slice(1)}</TableCell>
                  <TableCell>
                    {rsvp.bringing_guests === 'yes' ? `${rsvp.guest_count} (${rsvp.guest_names})` : 'No'}
                  </TableCell>
                  <TableCell>{rsvp.items_bringing}</TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleEditRsvp(rsvp)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
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

      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit RSVP</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              name="name"
              value={editForm.name}
              onChange={handleTextInputChange}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Attending</InputLabel>
              <Select
                name="attending"
                value={editForm.attending}
                onChange={handleSelectChange}
                label="Attending"
              >
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="maybe">Maybe</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Bringing Guests</InputLabel>
              <Select
                name="bringing_guests"
                value={editForm.bringing_guests}
                onChange={handleSelectChange}
                label="Bringing Guests"
              >
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </Select>
            </FormControl>
            {editForm.bringing_guests === 'yes' && (
              <>
                <TextField
                  label="Number of Guests"
                  name="guest_count"
                  type="number"
                  value={editForm.guest_count}
                  onChange={handleTextInputChange}
                  fullWidth
                />
                <TextField
                  label="Guest Names"
                  name="guest_names"
                  value={editForm.guest_names}
                  onChange={handleTextInputChange}
                  fullWidth
                  multiline
                  rows={2}
                />
              </>
            )}
            <TextField
              label="Items Bringing"
              name="items_bringing"
              value={editForm.items_bringing}
              onChange={handleTextInputChange}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} color="primary">Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EventAdmin; 