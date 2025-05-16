import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Chip,
  IconButton,
  styled,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

const DarkTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.23)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#90caf9',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  '& .MuiOutlinedInput-input': {
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

interface FormData {
  title: string;
  description: string;
  date: string;
  location: string;
  needed_items: string[];
  rsvp_cutoff_date: string;
  max_guests_per_rsvp: number;
  email_notifications_enabled: boolean;
  email_recipients: string;
}

const EventForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    date: '',
    location: '',
    needed_items: [],
    rsvp_cutoff_date: '',
    max_guests_per_rsvp: 0,
    email_notifications_enabled: false,
    email_recipients: '',
  });
  const [wallpaper, setWallpaper] = useState<File | null>(null);
  const [currentItem, setCurrentItem] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleWallpaperClick = () => {
    fileInputRef.current?.click();
  };

  const handleWallpaperChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setWallpaper(e.target.files[0]);
    }
  };

  const handleItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentItem(e.target.value);
  };

  const handleAddItem = () => {
    if (currentItem.trim()) {
      setFormData((prev) => ({
        ...prev,
        needed_items: [...prev.needed_items, currentItem.trim()],
      }));
      setCurrentItem('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      needed_items: prev.needed_items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const submitData = new FormData();
      
      // Append all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'needed_items') {
          submitData.append(key, JSON.stringify(value));
        } else {
          submitData.append(key, String(value));
        }
      });

      // Append wallpaper if selected
      if (wallpaper) {
        submitData.append('wallpaper', wallpaper);
      }

      await axios.post('/api/events', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      navigate('/');
    } catch (error) {
      setError('Failed to create event. Please try again.');
      console.error('Error creating event:', error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mt: 4, 
          bgcolor: 'rgba(22, 28, 36, 0.95)',
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))'
        }}
      >
        <Typography variant="h4" component="h2" gutterBottom color="primary" align="center" sx={{ color: '#90caf9' }}>
          Create New Event
        </Typography>
        
        {error && (
          <Typography color="error" align="center" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DarkTextField
            fullWidth
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            variant="outlined"
            required
          />
          <DarkTextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            variant="outlined"
            multiline
            rows={4}
          />
          <DarkTextField
            fullWidth
            label="Date and Time"
            name="date"
            type="datetime-local"
            value={formData.date}
            onChange={handleChange}
            variant="outlined"
            required
            InputLabelProps={{
              shrink: true,
            }}
          />
          <DarkTextField
            fullWidth
            label="RSVP Cut-off Date"
            name="rsvp_cutoff_date"
            type="datetime-local"
            value={formData.rsvp_cutoff_date}
            onChange={handleChange}
            variant="outlined"
            InputLabelProps={{
              shrink: true,
            }}
          />
          
          <DarkTextField
            fullWidth
            label="Maximum Additional Guests Per RSVP"
            name="max_guests_per_rsvp"
            type="number"
            value={formData.max_guests_per_rsvp}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setFormData((prev) => ({
                ...prev,
                max_guests_per_rsvp: isNaN(value) ? 0 : value,
              }));
            }}
            variant="outlined"
            helperText="Set to 0 for no additional guests, -1 for unlimited"
            inputProps={{ min: -1 }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.email_notifications_enabled}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      email_notifications_enabled: e.target.checked,
                    }));
                  }}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-checked': {
                      color: '#90caf9',
                    },
                  }}
                />
              }
              label="Enable Email Notifications"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            />
          </Box>
          
          {formData.email_notifications_enabled && (
            <DarkTextField
              fullWidth
              label="Email Recipients (comma separated)"
              name="email_recipients"
              value={formData.email_recipients}
              onChange={handleChange}
              variant="outlined"
              placeholder="email1@example.com, email2@example.com"
              helperText="Enter email addresses separated by commas"
              sx={{ mt: 2 }}
            />
          )}
          <DarkTextField
            fullWidth
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            variant="outlined"
            required
          />
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Event Wallpaper
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                component="span"
                startIcon={<WallpaperIcon />}
                onClick={handleWallpaperClick}
                sx={{ 
                  flexGrow: 1,
                  borderColor: '#64b5f6',
                  color: '#64b5f6',
                  '&:hover': {
                    borderColor: '#90caf9',
                    backgroundColor: 'rgba(100, 181, 246, 0.08)',
                  }
                }}
              >
                {wallpaper ? 'Change Wallpaper' : 'Upload Wallpaper'}
              </Button>
              {wallpaper && (
                <IconButton 
                  color="error" 
                  onClick={() => setWallpaper(null)}
                  size="small"
                  sx={{ 
                    color: '#f44336',
                    '&:hover': {
                      backgroundColor: 'rgba(244, 67, 54, 0.08)',
                    }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
            {wallpaper && (
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                Selected: {wallpaper.name}
              </Typography>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleWallpaperChange}
              accept="image/jpeg,image/png,image/gif"
              style={{ display: 'none' }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Needed Items
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <DarkTextField
                fullWidth
                label="Add Item"
                value={currentItem}
                onChange={handleItemChange}
                variant="outlined"
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleAddItem}
                disabled={!currentItem.trim()}
                startIcon={<AddIcon />}
                sx={{ 
                  bgcolor: '#90caf9',
                  '&:hover': {
                    bgcolor: '#42a5f5',
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(144, 202, 249, 0.3)',
                  }
                }}
              >
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {formData.needed_items.map((item, index) => (
                <Chip
                  key={index}
                  label={item}
                  onDelete={() => handleRemoveItem(index)}
                  sx={{
                    bgcolor: 'rgba(144, 202, 249, 0.2)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    '& .MuiChip-deleteIcon': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': {
                        color: 'rgba(255, 255, 255, 0.9)',
                      }
                    }
                  }}
                />
              ))}
            </Box>
          </Box>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            sx={{ 
              mt: 2,
              bgcolor: '#90caf9',
              '&:hover': {
                bgcolor: '#42a5f5',
              }
            }}
          >
            Create Event
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default EventForm;
