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
import AddIcon from '@mui/icons-material/Add';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import axios from 'axios';

interface RSVP {
  id: number;
  name: string;
  attending: 'yes' | 'no' | 'maybe';
  bringing_guests: 'yes' | 'no';
  guest_count: number;
  guest_names: string[] | string;
  items_bringing: string[] | string;
  event_id?: number;
  created_at?: string;
  updated_at?: string;
}

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  slug: string;
  needed_items?: string[] | string;
  wallpaper?: string;
  rsvp_cutoff_date?: string;
}

interface EditFormData {
  name: string;
  attending: 'yes' | 'no' | 'maybe';
  bringing_guests: 'yes' | 'no';
  guest_count: number;
  guest_names: string[];
  items_bringing: string[];
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
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    attending: 'yes',
    bringing_guests: 'no',
    guest_count: 0,
    guest_names: [],
    items_bringing: []
  });
  const [deleteEventDialogOpen, setDeleteEventDialogOpen] = useState(false);
  const [manageItemsDialogOpen, setManageItemsDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [updateInfoDialogOpen, setUpdateInfoDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    description: '',
    location: '',
    date: '',
    rsvp_cutoff_date: '',
    wallpaper: null as File | null
  });

  useEffect(() => {
    fetchEventAndRsvps();
  }, [slug]);

  const fetchEventAndRsvps = async () => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      const [eventResponse, rsvpsResponse] = await Promise.all([
        axios.get(`/api/events/${slug}`, config),
        axios.get(`/api/events/${slug}/rsvps`, config)
      ]);

      if (!eventResponse.data || !rsvpsResponse.data) {
        throw new Error('Failed to fetch data from server');
      }

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
          
          // Add items to claimed set
          itemsBringing.forEach(item => claimed.add(item));
        } catch (e) {
          console.error('Error processing items for RSVP:', e);
        }
        
        return {
          ...rsvp,
          items_bringing: itemsBringing
        };
      });
      
      // Update state with processed data
      setRsvps(processedRsvps);
      setClaimedItems(Array.from(claimed));
      // Filter needed items to only show unclaimed ones
      setNeededItems(items.filter(item => !claimed.has(item)));
      setLoading(false);
    } catch (error) {
      console.error('Failed to load event data:', error);
      if (axios.isAxiosError(error)) {
        console.error('Server error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
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
    let processedGuestNames: string[] = [];
    if (Array.isArray(rsvp.guest_names)) {
      processedGuestNames = rsvp.guest_names;
    } else if (typeof rsvp.guest_names === 'string' && rsvp.guest_names) {
      processedGuestNames = rsvp.guest_names.split(',').map(name => name.trim());
    }

    setRsvpToEdit(rsvp);
    setEditForm({
      name: rsvp.name,
      attending: rsvp.attending || 'yes',
      bringing_guests: rsvp.bringing_guests || 'no',
      guest_count: typeof rsvp.guest_count === 'number' ? rsvp.guest_count : 0,
      guest_names: processedGuestNames,
      items_bringing: Array.isArray(rsvp.items_bringing) ? rsvp.items_bringing :
        typeof rsvp.items_bringing === 'string' ? 
          (rsvp.items_bringing ? JSON.parse(rsvp.items_bringing) : []) : []
    });
    setEditDialogOpen(true);
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('guest_name_')) {
      // Handle individual guest name changes
      const index = parseInt(name.split('_')[2]);
      setEditForm(prev => {
        const newGuestNames = [...prev.guest_names];
        newGuestNames[index] = value;
        return {
          ...prev,
          guest_names: newGuestNames
        };
      });
    } else if (name === 'guest_count') {
      const newCount = Math.max(0, parseInt(value) || 0);
      setEditForm(prev => {
        // Create new guest names array preserving existing names
        const newGuestNames = [...prev.guest_names];
        // If increasing size, add empty strings for new slots
        while (newGuestNames.length < newCount) {
          newGuestNames.push('');
        }
        // If decreasing size, truncate the array
        while (newGuestNames.length > newCount) {
          newGuestNames.pop();
        }
        return {
          ...prev,
          guest_count: newCount,
          guest_names: newGuestNames
        };
      });
    } else {
      setEditForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    
    if (name === 'attending' && value !== 'yes') {
      // If not attending, reset all guest-related fields and items
      setEditForm(prev => ({
        ...prev,
        attending: value as 'no' | 'maybe',
        bringing_guests: 'no',
        guest_count: 0,
        guest_names: [],
        items_bringing: [] // Clear items when not attending
      }));
    } else if (name === 'bringing_guests') {
      // When bringing guests is changed
      setEditForm(prev => ({
        ...prev,
        bringing_guests: value as 'yes' | 'no',
        // If changing to 'yes', set guest count to 1 and initialize one empty name field
        guest_count: value === 'yes' ? 1 : 0,
        // Clear guest names if changing to 'no', otherwise initialize with empty string or keep existing
        guest_names: value === 'no' ? [] : (value === 'yes' ? [''] : prev.guest_names)
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleItemsChange = (e: SelectChangeEvent<string[]>) => {
    const { value } = e.target;
    const newItems = typeof value === 'string' ? value.split(',') : value;
    setEditForm(prev => ({
      ...prev,
      items_bringing: newItems
    }));
  };

  const handleEditSubmit = async () => {
    if (!rsvpToEdit || !event) return;
    
    try {
      // Filter out empty guest names
      const filteredGuestNames = editForm.guest_names
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      // Prepare submission data in the exact format the backend expects
      const submissionData = {
        name: editForm.name,
        attending: editForm.attending,
        bringing_guests: editForm.bringing_guests,
        guest_count: editForm.bringing_guests === 'yes' ? Math.max(1, parseInt(editForm.guest_count.toString(), 10)) : 0,
        guest_names: filteredGuestNames,
        items_bringing: JSON.stringify(editForm.items_bringing),
        event_id: event.id
      };

      console.log('Submitting RSVP update:', {
        endpoint: `/api/events/${slug}/rsvps/${rsvpToEdit.id}`,
        data: submissionData
      });

      // Update the RSVP
      const response = await axios({
        method: 'put',
        url: `/api/events/${slug}/rsvps/${rsvpToEdit.id}`,
        data: submissionData,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Server response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      });

      // Handle successful update (both 200 and 204 responses)
      if (response.status === 204 || response.status === 200) {
        // Create updated RSVP object using our submitted data since 204 returns no content
        const updatedRsvp: RSVP = {
          ...rsvpToEdit,
          ...submissionData,
          guest_names: filteredGuestNames,
          items_bringing: editForm.items_bringing // Keep as array in local state
        };
        
        // Update the local state
        setRsvps(prevRsvps => prevRsvps.map((r: RSVP) => 
          r.id === rsvpToEdit.id ? updatedRsvp : r
        ));

        // Recalculate claimed items
        const claimed = new Set<string>();
        const updatedRsvps = rsvps.map((r: RSVP) => 
          r.id === rsvpToEdit.id ? updatedRsvp : r
        );

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

        setNeededItems(availableItems);
        setClaimedItems(claimedArray);
        setEditDialogOpen(false);
        setRsvpToEdit(null);

        // Verify the update was successful but don't throw error if verification response is empty
        try {
          const verifyResponse = await axios.get(`/api/events/${slug}/rsvps`, {
            headers: {
              'Accept': 'application/json'
            }
          });
          console.log('Verification response:', verifyResponse.data);
        } catch (verifyError) {
          console.warn('Verification request failed, but update may still be successful:', verifyError);
        }
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }

    } catch (error) {
      console.error('Error in handleEditSubmit:', error);
      setError('Failed to update RSVP. Please try again.');
      
      // Only refresh data if we get a specific error indicating the RSVP doesn't exist
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        await fetchEventAndRsvps();
      }
    }
  };

  const handleDeleteEvent = async () => {
    try {
      await axios.delete(`/api/events/${slug}`);
      navigate('/');
    } catch (error) {
      setError('Failed to delete event');
      setDeleteEventDialogOpen(false);
    }
  };

  const handleAddItem = async () => {
    if (!event || !newItem.trim()) return;

    try {
      const updatedItems = [...(Array.isArray(event.needed_items) ? event.needed_items : []), newItem.trim()];
      await axios.put(`/api/events/${slug}`, {
        ...event,
        needed_items: updatedItems
      });
      
      setEvent(prev => prev ? { ...prev, needed_items: updatedItems } : null);
      setNeededItems(prev => [...prev, newItem.trim()]);
      setNewItem('');
    } catch (error) {
      setError('Failed to add item');
    }
  };

  const handleRemoveItem = async (itemToRemove: string) => {
    if (!event) return;

    try {
      // Update event's needed_items
      const updatedItems = Array.isArray(event.needed_items) 
        ? event.needed_items.filter(item => item !== itemToRemove)
        : [];
      
      await axios.put(`/api/events/${slug}`, {
        ...event,
        needed_items: updatedItems
      });

      // Update RSVPs to remove the item from any that had claimed it
      const updatedRsvps = rsvps.map(rsvp => {
        let currentItems: string[] = Array.isArray(rsvp.items_bringing) 
          ? rsvp.items_bringing 
          : typeof rsvp.items_bringing === 'string'
            ? JSON.parse(rsvp.items_bringing)
            : [];
        
        // Remove the item if it exists in this RSVP
        if (currentItems.includes(itemToRemove)) {
          const updatedRsvpItems = currentItems.filter((item: string) => item !== itemToRemove);
          // Update the RSVP in the database
          axios.put(`/api/events/${slug}/rsvps/${rsvp.id}`, {
            ...rsvp,
            items_bringing: JSON.stringify(updatedRsvpItems)
          });
          return {
            ...rsvp,
            items_bringing: updatedRsvpItems
          };
        }
        return rsvp;
      });

      // Recalculate claimed items
      const claimed = new Set<string>();
      updatedRsvps.forEach(rsvp => {
        let rsvpItems: string[] = Array.isArray(rsvp.items_bringing) 
          ? rsvp.items_bringing 
          : typeof rsvp.items_bringing === 'string'
            ? JSON.parse(rsvp.items_bringing)
            : [];
        rsvpItems.forEach((item: string) => claimed.add(item));
      });
      
      // Update all state
      setEvent(prev => prev ? { ...prev, needed_items: updatedItems } : null);
      setNeededItems(prev => prev.filter((item: string) => item !== itemToRemove));
      setRsvps(updatedRsvps);
      setClaimedItems(Array.from(claimed));
    } catch (error) {
      setError('Failed to remove item');
    }
  };

  const handleUpdateInfoClick = () => {
    if (!event) return;
    
    setUpdateForm({
      description: event.description,
      location: event.location,
      date: event.date.slice(0, 16), // Format date for datetime-local input
      rsvp_cutoff_date: event.rsvp_cutoff_date ? event.rsvp_cutoff_date.slice(0, 16) : '',
      wallpaper: null
    });
    setUpdateInfoDialogOpen(true);
  };

  const handleUpdateInfoSubmit = async () => {
    if (!event) return;
    
    try {
      // Create FormData and append all fields
      const formData = new FormData();
      formData.append('description', updateForm.description);
      formData.append('location', updateForm.location);
      formData.append('date', updateForm.date);
      formData.append('rsvp_cutoff_date', updateForm.rsvp_cutoff_date);
      formData.append('title', event.title); // Keep existing title
      formData.append('needed_items', JSON.stringify(event.needed_items)); // Keep existing needed items
      
      // Append wallpaper if a new one was selected
      if (updateForm.wallpaper) {
        formData.append('wallpaper', updateForm.wallpaper);
      }
      
      const response = await axios.put(`/api/events/${slug}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setEvent(prev => prev ? {
        ...prev,
        description: updateForm.description,
        location: updateForm.location,
        date: updateForm.date,
        rsvp_cutoff_date: updateForm.rsvp_cutoff_date,
        wallpaper: response.data.wallpaper || prev.wallpaper
      } : null);
      
      setUpdateInfoDialogOpen(false);
    } catch (error) {
      console.error('Error updating event:', error);
      setError('Failed to update event information');
    }
  };

  const handleWallpaperChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUpdateForm(prev => ({
        ...prev,
        wallpaper: e.target.files![0]
      }));
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
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: event?.wallpaper ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${event.wallpaper})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundColor: event?.wallpaper ? '#000' : 'rgb(25, 28, 34)',
        overflowY: 'auto',
      }}
    >
      <Box sx={{ py: 4 }}>
        <Container maxWidth="lg">
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, mt: 4 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" component="h2" color="primary" gutterBottom>
                {event.title} - Admin
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap',
                gap: 2, 
                mb: 3 
              }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/')}
                  sx={{ 
                    minWidth: 'fit-content',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Back to Events
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleUpdateInfoClick}
                  startIcon={<EditIcon />}
                  sx={{ 
                    minWidth: 'fit-content',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Update Info
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setManageItemsDialogOpen(true)}
                  sx={{ 
                    minWidth: 'fit-content',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Manage Items
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteEventDialogOpen(true)}
                  sx={{ 
                    minWidth: 'fit-content',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Delete Event
                </Button>
              </Box>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Info:</strong> {event.description || 'None'}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Location:</strong> {event.location}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Date:</strong> {new Date(event.date).toLocaleString()}
              </Typography>
              {event.rsvp_cutoff_date && (
                <Typography variant="subtitle1" gutterBottom>
                  <strong>RSVP cut-off date:</strong> {new Date(event.rsvp_cutoff_date).toLocaleString()}
                </Typography>
              )}
            </Box>

            {/* Add items status section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6">
                Items Status
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 3, 
                maxWidth: { xs: '100%', sm: '60%' }
              }}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Still Needed:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {neededItems.map((item: string, index: number) => (
                      <Chip
                        key={`${item}-${index}`}
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
                        key={`${item}-${index}`}
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
              RSVPs: {rsvps.length} | Total Guests: {rsvps.reduce((total, rsvp) => {
                // Count the RSVP person as 1 if they're attending
                const rsvpCount = rsvp.attending === 'yes' ? 1 : 0;
                // Add their guests if they're bringing any
                const guestCount = (rsvp.attending === 'yes' && rsvp.bringing_guests === 'yes') ? rsvp.guest_count : 0;
                return total + rsvpCount + guestCount;
              }, 0)}
            </Typography>

            <TableContainer sx={{ 
              overflowX: 'auto',
              '& .MuiTable-root': {
                minWidth: { xs: '100%', sm: 650 }
              }
            }}>
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
                      <TableCell>{rsvp.name || 'No name provided'}</TableCell>
                      <TableCell>
                        {rsvp.attending ? 
                          rsvp.attending.charAt(0).toUpperCase() + rsvp.attending.slice(1) : 
                          'Unknown'
                        }
                      </TableCell>
                      <TableCell>
                        {rsvp.bringing_guests === 'yes' ? 
                          `${rsvp.guest_count || 0} (${Array.isArray(rsvp.guest_names) ? 
                            rsvp.guest_names.join(', ') : 
                            typeof rsvp.guest_names === 'string' ? 
                              rsvp.guest_names.replace(/\s+/g, ', ') : 
                              'No names provided'})` : 
                          'No'
                        }
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
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
                            
                            return items.length > 0 ? items.map((item: string, index: number) => (
                              <Chip
                                key={`${item}-${index}`}
                                label={item}
                                color="success"
                                size="small"
                                variant={claimedItems.includes(item) ? "filled" : "outlined"}
                              />
                            )) : (
                              <Typography variant="body2" color="text.secondary">
                                No items
                              </Typography>
                            );
                          })()}
                        </Box>
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
                    {/* Individual guest name fields */}
                    {Array.from({ length: editForm.guest_count }, (_, index) => (
                      <TextField
                        key={`guest_name_${index}`}
                        label={`Guest ${index + 1} Name`}
                        name={`guest_name_${index}`}
                        value={editForm.guest_names[index] || ''}
                        onChange={handleTextInputChange}
                        fullWidth
                      />
                    ))}
                  </>
                )}
                <FormControl fullWidth>
                  <InputLabel>What items are you bringing?</InputLabel>
                  <Select<string[]>
                    multiple
                    name="items_bringing"
                    value={editForm.items_bringing}
                    onChange={handleItemsChange}
                    input={<OutlinedInput label="What items are you bringing?" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value: string) => (
                          <Chip
                            key={value}
                            label={value}
                            color="primary"
                          />
                        ))}
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

          <Dialog
            open={deleteEventDialogOpen}
            onClose={() => setDeleteEventDialogOpen(false)}
          >
            <DialogTitle>Delete Event</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete "{event.title}"? This action cannot be undone.
              </Typography>
              <Typography color="error" sx={{ mt: 2 }}>
                All RSVPs associated with this event will also be deleted.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteEventDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleDeleteEvent} color="error" variant="contained">
                Delete Event
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={manageItemsDialogOpen}
            onClose={() => setManageItemsDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Manage Needed Items</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="New Item"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddItem}
                    disabled={!newItem.trim()}
                  >
                    Add
                  </Button>
                </Box>
                <Typography variant="subtitle1" gutterBottom>
                  Current Items:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {event?.needed_items && Array.isArray(event.needed_items) && event.needed_items.map((item, index) => (
                    <Chip
                      key={`${item}-${index}`}
                      label={item}
                      onDelete={() => handleRemoveItem(item)}
                      color={claimedItems.includes(item) ? "success" : "primary"}
                    />
                  ))}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setManageItemsDialogOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={updateInfoDialogOpen}
            onClose={() => setUpdateInfoDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Update Event Information</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Description"
                  value={updateForm.description}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, description: e.target.value }))}
                  fullWidth
                  multiline
                  rows={3}
                />
                <TextField
                  label="Location"
                  value={updateForm.location}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, location: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Date and Time"
                  type="datetime-local"
                  value={updateForm.date}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, date: e.target.value }))}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                <TextField
                  label="RSVP Cut-off Date"
                  type="datetime-local"
                  value={updateForm.rsvp_cutoff_date}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, rsvp_cutoff_date: e.target.value }))}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Wallpaper
                  </Typography>
                  {event.wallpaper && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Current wallpaper:
                      </Typography>
                      <Box
                        component="img"
                        src={event.wallpaper}
                        alt="Current wallpaper"
                        sx={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                  )}
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    startIcon={<WallpaperIcon />}
                    sx={{ mt: 1 }}
                  >
                    {updateForm.wallpaper ? 'Change Wallpaper' : (event.wallpaper ? 'Replace Wallpaper' : 'Upload Wallpaper')}
                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handleWallpaperChange}
                    />
                  </Button>
                  {updateForm.wallpaper && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Selected file: {updateForm.wallpaper.name}
                    </Typography>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setUpdateInfoDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateInfoSubmit} color="primary">Save Changes</Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </Box>
  );
};

export default EventAdmin; 