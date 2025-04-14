# Earth To Sea Guardians - Happy News

A React application that aggregates and displays positive environmental news from various sources. The application focuses on uplifting stories about environmental conservation, scientific breakthroughs, community initiatives, and wildlife protection.

## Features

- Scrapes environmental news from multiple reputable sources
- Analyzes content for truly uplifting themes (not just positive sentiment)
- Categorizes articles by themes like recovery, breakthrough, community, and conservation
- Displays color-coded theme tags for easy visualization
- Filters out non-environmental and negative content
- Shows impact scores for each article

## Installation

1. Clone the repository:
```bash
git clone https://github.com/{username}/e2sghappynews.git
cd e2sghappynews
```

2. Install dependencies for both frontend and backend:
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

3. Start the development servers:
```bash
# Start the backend server (from the server directory)
cd server
node server.js

# In a new terminal, start the frontend (from the project root)
npm start
```

The application will be available at http://localhost:3000

## Deployment to GitHub Pages

1. Update the `homepage` field in `package.json`:
   Replace `{username}` with your GitHub username:
```json
{
  "homepage": "https://{username}.github.io/e2sghappynews"
}
```

2. Install the `gh-pages` package if you haven't already:
```bash
npm install --save-dev gh-pages
```

3. Deploy to GitHub Pages:
```bash
npm run deploy
```

This will build the application and deploy it to the `gh-pages` branch of your repository.

4. Configure GitHub Repository:
   - Go to your repository's Settings
   - Scroll to the "GitHub Pages" section
   - Select the `gh-pages` branch as the source
   - Save the changes

Your application will be available at `https://{username}.github.io/e2sghappynews`

## Backend Deployment

For the backend server, you'll need to deploy it to a service that can run Node.js applications. Some options include:
- Heroku
- DigitalOcean
- AWS
- Google Cloud Platform

After deploying the backend, update the API URL in the frontend code (src/App.js) to point to your deployed backend URL.

## Technology Stack

- Frontend:
  - React
  - Material-UI
  - Axios
  - Moment.js

- Backend:
  - Node.js
  - Express
  - Cheerio (for web scraping)
  - Sentiment (for content analysis)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
