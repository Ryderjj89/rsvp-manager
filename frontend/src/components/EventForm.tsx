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
} from '@mui/material';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

interface FormData {
  title: string;
  description: string;
  date: string;
  location: string;
  needed_items: string[];
}

const EventForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    date: '',
    location: '',
    needed_items: [],
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
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom color="primary" align="center">
          Create New Event
        </Typography>
        
        {error && (
          <Typography color="error" align="center" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            variant="outlined"
            required
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            variant="outlined"
            multiline
            rows={4}
          />
          <TextField
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
          <TextField
            fullWidth
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            variant="outlined"
            required
          />
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Event Wallpaper
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                component="span"
                startIcon={<WallpaperIcon />}
                onClick={handleWallpaperClick}
                sx={{ flexGrow: 1 }}
              >
                {wallpaper ? 'Change Wallpaper' : 'Upload Wallpaper'}
              </Button>
              {wallpaper && (
                <IconButton 
                  color="error" 
                  onClick={() => setWallpaper(null)}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
            {wallpaper && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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
            <Typography variant="subtitle1">Needed Items</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
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
                  color="primary"
                />
              ))}
            </Box>
          </Box>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            sx={{ mt: 2 }}
          >
            Create Event
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default EventForm; 