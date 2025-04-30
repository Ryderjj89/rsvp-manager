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
  OutlinedInput,
  ListItemText,
  Checkbox,
  Chip,
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
  items_bringing: string[] | string;
}

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  slug: string;
  needed_items?: string[] | string;
}

const EventAdmin: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [neededItems, setNeededItems] = useState<string[]>([]);
  const [claimedItems, setClaimedItems] = useState<string[]>([]);
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
    items_bringing: [] as string[],
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
      
      // Process needed items
      let items: string[] = [];
      if (eventResponse.data.needed_items) {
        try {
          if (typeof eventResponse.data.needed_items === 'string') {
            const parsed = JSON.parse(eventResponse.data.needed_items);
            items = Array.isArray(parsed) ? parsed : [];
          } else if (Array.isArray(eventResponse.data.needed_items)) {
            items = eventResponse.data.needed_items;
          }
        } catch (e) {
          console.error('Error parsing needed_items:', e);
          items = [];
        }
      }
      
      // Get all claimed items from existing RSVPs
      const claimed = new Set<string>();
      const processedRsvps = rsvpsResponse.data.map((rsvp: RSVP) => {
        let itemsBringing: string[] = [];
        try {
          if (typeof rsvp.items_bringing === 'string') {
            try {
              const parsed = JSON.parse(rsvp.items_bringing);
              itemsBringing = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.error('Error parsing items_bringing JSON:', e);
            }
          } else if (Array.isArray(rsvp.items_bringing)) {
            itemsBringing = rsvp.items_bringing;
          }
          
          if (itemsBringing.length > 0) {
            itemsBringing.forEach(item => claimed.add(item));
          }
        } catch (e) {
          console.error('Error processing items for RSVP:', e);
        }
        
        return {
          ...rsvp,
          items_bringing: itemsBringing
        };
      });
      
      // Filter out claimed items from needed items
      const availableItems = items.filter(item => !claimed.has(item));
      
      setNeededItems(availableItems);
      setClaimedItems(Array.from(claimed));
      setRsvps(processedRsvps);
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
      items_bringing: Array.isArray(rsvp.items_bringing) ? rsvp.items_bringing : [],
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

  const handleItemsChange = (e: SelectChangeEvent<string[]>) => {
    const { value } = e.target;
    const newItems = Array.isArray(value) ? value : [];
    setEditForm(prev => ({
      ...prev,
      items_bringing: newItems
    }));
  };

  const handleEditSubmit = async () => {
    if (!rsvpToEdit) return;
    
    try {
      const submissionData = {
        ...editForm,
        items_bringing: JSON.stringify(editForm.items_bringing)
      };
      await axios.put(`/api/events/${slug}/rsvps/${rsvpToEdit.id}`, submissionData);
      
      // Update the local state
      const updatedRsvps = rsvps.map((r: RSVP) => {
        if (r.id === rsvpToEdit.id) {
          return {
            ...r,
            ...editForm,
            items_bringing: editForm.items_bringing // Keep as array in local state
          };
        }
        return r;
      });
      
      // Recalculate claimed items
      const claimed = new Set<string>();
      updatedRsvps.forEach((rsvp: RSVP) => {
        let rsvpItems: string[] = [];
        try {
          if (typeof rsvp.items_bringing === 'string') {
            const parsed = JSON.parse(rsvp.items_bringing);
            rsvpItems = Array.isArray(parsed) ? parsed : [];
          } else if (Array.isArray(rsvp.items_bringing)) {
            rsvpItems = rsvp.items_bringing;
          }
          
          rsvpItems.forEach(item => claimed.add(item));
        } catch (e) {
          console.error('Error processing items for RSVP:', e);
        }
      });

      // Get all items from the event
      let allItems: string[] = [];
      if (event?.needed_items) {
        try {
          if (typeof event.needed_items === 'string') {
            const parsed = JSON.parse(event.needed_items);
            allItems = Array.isArray(parsed) ? parsed : [];
          } else if (Array.isArray(event.needed_items)) {
            allItems = event.needed_items;
          }
        } catch (e) {
          console.error('Error parsing event needed_items:', e);
          allItems = [];
        }
      }

      // Update needed and claimed items
      const claimedArray = Array.from(claimed);
      const availableItems = allItems.filter(item => !claimed.has(item));

      setRsvps(updatedRsvps);
      setNeededItems(availableItems);
      setClaimedItems(claimedArray);
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

        {/* Add items status section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Items Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Still Needed:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {neededItems.map((item: string, index: number) => (
                  <Chip
                    key={index}
                    label={item}
                    color="primary"
                    variant="outlined"
                  />
                ))}
                {neededItems.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    All items have been claimed
                  </Typography>
                )}
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Claimed Items:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {claimedItems.map((item: string, index: number) => (
                  <Chip
                    key={index}
                    label={item}
                    color="success"
                  />
                ))}
                {claimedItems.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No items have been claimed yet
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
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
                    {rsvp.bringing_guests === 'yes' ? 
                      `${rsvp.guest_count} (${rsvp.guest_names.replace(/\s+/g, ', ')})` : 
                      'No'
                    }
                  </TableCell>
                  <TableCell>
                    {(() => {
                      let items: string[] = [];
                      try {
                        if (typeof rsvp.items_bringing === 'string') {
                          try {
                            const parsed = JSON.parse(rsvp.items_bringing);
                            items = Array.isArray(parsed) ? parsed : [];
                          } catch (e) {
                            console.error('Error parsing items_bringing JSON in table:', e);
                          }
                        } else if (Array.isArray(rsvp.items_bringing)) {
                          items = rsvp.items_bringing;
                        }
                      } catch (e) {
                        console.error('Error processing items in table:', e);
                      }
                      
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {items.length > 0 ? items.map((item: string, index: number) => (
                            <Chip
                              key={`${item}-${index}`}
                              label={item}
                              color="primary"
                              size="small"
                            />
                          )) : (
                            <Typography variant="body2" color="text.secondary">
                              No items
                            </Typography>
                          )}
                        </Box>
                      );
                    })()}
                  </TableCell>
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
            <FormControl fullWidth>
              <InputLabel>What items are you bringing?</InputLabel>
              <Select
                multiple
                name="items_bringing"
                value={editForm.items_bringing}
                onChange={handleItemsChange}
                input={<OutlinedInput label="What items are you bringing?" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {Array.isArray(selected) ? selected.map((value: string) => (
                      <Chip
                        key={value}
                        label={value}
                        color="primary"
                      />
                    )) : null}
                  </Box>
                )}
              >
                {Array.from(new Set([...neededItems, ...editForm.items_bringing])).map((item: string) => (
                  <MenuItem key={item} value={item}>
                    <Checkbox checked={editForm.items_bringing.includes(item)} />
                    <ListItemText 
                      primary={item} 
                      secondary={neededItems.includes(item) ? 'Available' : 'Currently assigned'}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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