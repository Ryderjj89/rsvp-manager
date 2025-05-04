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
  Container,
  Chip,
} from '@mui/material';
import axios from 'axios';

interface RSVP {
  id: number;
  name: string;
  attending: string;
  bringing_guests: string;
  guest_count: number;
  guest_names: string[] | string;
  items_bringing: string[] | string;
  other_items?: string;
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

const EventView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [neededItems, setNeededItems] = useState<string[]>([]);
  const [claimedItems, setClaimedItems] = useState<string[]>([]);
  const [otherItems, setOtherItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const otherItemsSet = new Set<string>();
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
        // Add non-empty other_items to set
        if (typeof rsvp.other_items === 'string' && rsvp.other_items.trim() !== '') {
          otherItemsSet.add(rsvp.other_items.trim());
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
      setOtherItems(Array.from(otherItemsSet));
      setLoading(false);
    } catch (error) {
      setError('Failed to load event data');
      setLoading(false);
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
                {event.title} - RSVPs
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

            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Items Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '60%' }}>
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
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Other Items:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {otherItems.length > 0
                      ? otherItems.join(', ')
                      : 'No other items have been brought'}
                  </Typography>
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
                    <TableCell>Needed Items</TableCell>
                    <TableCell>Other Items</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rsvps.map((rsvp: RSVP) => (
                    <TableRow key={rsvp.id}>
                      <TableCell>{rsvp.name}</TableCell>
                      <TableCell>{rsvp.attending.charAt(0).toUpperCase() + rsvp.attending.slice(1)}</TableCell>
                      <TableCell>
                        {rsvp.bringing_guests === 'yes' ? 
                          `${rsvp.guest_count} (${Array.isArray(rsvp.guest_names) ? 
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
                        {rsvp.other_items || 'None'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default EventView; 