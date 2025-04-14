import React, { useState, useEffect } from 'react';
import { Container, Typography, Card, CardContent, Grid, AppBar, Toolbar, CircularProgress, Box, Chip, Stack, LinearProgress } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import axios from 'axios';
import moment from 'moment';

// Use local server in development, deployed server in production
const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000'
  : 'https://happy-news-api.onrender.com';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32',
    },
    secondary: {
      main: '#81c784',
    },
    theme: {
      climate: '#2196f3',
      nature: '#4caf50',
      science: '#9c27b0',
      community: '#ff9800',
      energy: '#f44336',
      sustainable: '#009688',
    },
  },
  typography: {
    h6: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 700,
    },
  },
});

// Function to get color based on impact score
const getImpactColor = (score) => {
  if (score >= 80) return '#4caf50';
  if (score >= 60) return '#8bc34a';
  if (score >= 40) return '#ffeb3b';
  if (score >= 20) return '#ff9800';
  return '#f44336';
};

function App() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const fetchNews = async (since = null) => {
    try {
      setLoading(!since); // Only show loading on initial fetch
      const params = since ? { since: since.toISOString() } : {};
      const response = await axios.get(`${API_URL}/api/news`, { params });
      
      // Remove duplicates based on title and link
      const uniqueArticles = Array.from(new Map(
        response.data.map(article => [article.title + article.link, article])
      ).values());
      
      setNews(uniqueArticles);
      setLastFetchTime(moment());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching news:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Initial fetch');
    fetchNews();
  }, []);

  useEffect(() => {
    if (lastFetchTime) {
      console.log('Setting up auto-refresh');
      const interval = setInterval(() => {
        console.log('Auto-refreshing...');
        fetchNews(lastFetchTime);
      }, 300000); // Check for new articles every 5 minutes
      return () => clearInterval(interval);
    }
  }, [lastFetchTime]);

  const getThemeColor = (theme) => {
    const themeColors = {
      climate: '#2196f3',
      nature: '#4caf50',
      science: '#9c27b0',
      community: '#ff9800',
      energy: '#f44336',
      sustainable: '#009688',
    };
    return themeColors[theme] || '#757575';
  };

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1, textAlign: 'center' }}>
            Earth To Sea Guardians - Happy News
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {news.map((article, index) => (
              <Grid item xs={12} md={6} key={`${article.title}-${article.link}`}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {article.title}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                      {article.themes.map((theme, i) => (
                        <Chip
                          key={i}
                          label={theme.charAt(0).toUpperCase() + theme.slice(1)}
                          sx={{
                            backgroundColor: getThemeColor(theme.toLowerCase()),
                            color: 'white',
                            mb: 1,
                          }}
                          size="small"
                        />
                      ))}
                    </Stack>
                    <Typography color="textSecondary" gutterBottom>
                      Source: {article.source}
                    </Typography>
                    <Typography color="textSecondary" gutterBottom>
                      Date: {moment(article.date).format('MMMM D, YYYY')}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography color="textSecondary" gutterBottom>
                        Impact Score:
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ flexGrow: 1, mr: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={article.sentiment}
                            sx={{
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: '#e0e0e0',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getImpactColor(article.sentiment),
                                borderRadius: 5,
                              },
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          {Math.round(article.sentiment)}%
                        </Typography>
                      </Box>
                    </Box>
                    <Typography>
                      <a href={article.link} target="_blank" rel="noopener noreferrer">
                        Read More
                      </a>
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
