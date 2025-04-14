import React, { useState, useEffect } from 'react';
import { Container, Typography, Card, CardContent, Grid, AppBar, Toolbar, CircularProgress, Box, Chip, Stack } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import axios from 'axios';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32',
    },
    secondary: {
      main: '#81c784',
    },
    theme: {
      recovery: '#4caf50',
      breakthrough: '#2196f3',
      community: '#ff9800',
      conservation: '#8bc34a',
      hope: '#03a9f4',
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

function App() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/news');
        setNews(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching news:', error);
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const getThemeColor = (theme) => {
    const themeColors = {
      recovery: '#4caf50',
      breakthrough: '#2196f3',
      community: '#ff9800',
      conservation: '#8bc34a',
      hope: '#03a9f4',
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
              <Grid item xs={12} md={6} key={index}>
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
                            backgroundColor: getThemeColor(theme),
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
                      Date: {article.date}
                    </Typography>
                    <Typography color="primary" gutterBottom>
                      Impact Score: +{article.sentiment.toFixed(1)}
                    </Typography>
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
