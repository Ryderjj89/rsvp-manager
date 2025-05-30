import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container, Box } from '@mui/material';
import EventList from './components/EventList';
import EventForm from './components/EventForm';
import RSVPForm from './components/RSVPForm';
import EventAdmin from './components/EventAdmin';
import EventView from './components/EventView';
import RSVPEditForm from './components/RSVPEditForm'; // Import the new component
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: 'rgba(0, 0, 0, 0.7)',
    },
  },
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 3,
      },
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(0, 0, 0, 0.7) !important',
          '& .MuiTableContainer-root, & .MuiTable-root, & .MuiTableCell-root': {
            backdropFilter: 'blur(10px)',
            backgroundColor: 'transparent !important',
          },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          '& .MuiPaper-root': {
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(0, 0, 0, 0.7) !important',
          },
        },
      },
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Box
          sx={{
            minHeight: '100vh',
            backgroundColor: 'rgb(25, 28, 34)',
          }}
        >
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Routes>
              <Route path="/" element={<EventList />} />
              <Route path="/create" element={<EventForm />} />
              <Route path="/rsvp/events/:slug" element={<RSVPForm />} />
              <Route path="/admin/events/:slug" element={<EventAdmin />} />
              <Route path="/view/events/:slug" element={<EventView />} />
              <Route path="/events/:slug/rsvp/edit/:editId" element={<RSVPEditForm />} /> {/* Add the new route */}
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
