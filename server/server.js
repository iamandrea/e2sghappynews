const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const Sentiment = require('sentiment');
const cors = require('cors');
const moment = require('moment');

const app = express();
const sentiment = new Sentiment();
app.use(cors());
app.use(express.json());

// Positive impact themes and their associated keywords
const positiveThemes = {
  recovery: [
    'restored',
    'recovered',
    'revived',
    'rebounding',
    'healing',
    'thriving',
    'flourishing',
    'regeneration',
    'revival',
    'comeback'
  ],
  breakthrough: [
    'breakthrough',
    'discovery',
    'innovation',
    'revolutionary',
    'pioneering',
    'milestone',
    'achievement',
    'success',
    'solution'
  ],
  community: [
    'community',
    'together',
    'collaboration',
    'partnership',
    'alliance',
    'collective',
    'initiative',
    'movement',
    'volunteer'
  ],
  conservation: [
    'protected',
    'preserved',
    'saved',
    'rescued',
    'safeguarded',
    'conservation',
    'sanctuary',
    'reserve'
  ],
  hope: [
    'hope',
    'promising',
    'optimistic',
    'inspiring',
    'encouraging',
    'positive',
    'bright future',
    'potential'
  ]
};

// Keywords to exclude (expanded)
const excludeKeywords = [
  // Politics and conflict
  'politician',
  'election',
  'campaign',
  'vote',
  'party',
  'protest',
  'dispute',
  'controversy',
  'war',
  'conflict',
  'military',
  'weapon',
  
  // Business/Corporate
  'stock',
  'market',
  'profit',
  'earnings',
  'revenue',
  'dividend',
  'shares',
  'investor',
  
  // Celebrity/Entertainment
  'celebrity',
  'star',
  'actor',
  'actress',
  'movie',
  'film',
  'entertainment',
  'hollywood',
  
  // Crime
  'crime',
  'arrest',
  'police',
  'criminal',
  'court',
  'trial',
  'prison',
  'sentence',
  
  // Misc
  'death',
  'died',
  'kill',
  'scandal',
  'controversy',
  'lawsuit',
  'sue',
  'litigation'
];

// Environmental keywords (core focus areas)
const environmentalKeywords = [
  // Wildlife and Nature
  'wildlife',
  'species',
  'animal',
  'plant',
  'forest',
  'ocean',
  'marine',
  'ecosystem',
  'biodiversity',
  'habitat',
  'conservation',
  'endangered',
  'protected',
  
  // Climate and Energy
  'renewable',
  'sustainable',
  'clean energy',
  'solar',
  'wind power',
  'green energy',
  'carbon neutral',
  'zero emission',
  'climate solution',
  
  // Conservation
  'preservation',
  'restoration',
  'recovery',
  'regeneration',
  'rewilding',
  'conservation',
  'protect',
  'sanctuary',
  'reserve',
  
  // Innovation
  'breakthrough',
  'innovation',
  'solution',
  'technology',
  'discovery',
  'research',
  'study',
  'finding',
  
  // Community
  'community',
  'local',
  'initiative',
  'project',
  'volunteer',
  'education',
  'awareness',
  'partnership'
];

const sources = [
  {
    name: 'The Guardian',
    url: 'https://www.theguardian.com/environment',
    baseUrl: 'https://www.theguardian.com'
  },
  {
    name: 'CNN',
    url: 'https://www.cnn.com/world/cnn-climate',
    baseUrl: 'https://www.cnn.com'
  },
  {
    name: 'ABC News',
    url: 'https://www.abc.net.au/news/environment',
    baseUrl: 'https://www.abc.net.au'
  },
  {
    name: 'Sydney Morning Herald',
    url: 'https://www.smh.com.au/environment',
    baseUrl: 'https://www.smh.com.au'
  },
  {
    name: 'The Age',
    url: 'https://www.theage.com.au/environment',
    baseUrl: 'https://www.theage.com.au'
  },
  {
    name: 'New York Times',
    url: 'https://www.nytimes.com/section/climate',
    baseUrl: 'https://www.nytimes.com'
  },
  {
    name: 'The Conversation Environment',
    url: 'https://theconversation.com/us/environment',
    baseUrl: 'https://theconversation.com'
  },
  {
    name: 'National Geographic',
    url: 'https://www.nationalgeographic.com/environment',
    baseUrl: 'https://www.nationalgeographic.com'
  },
  {
    name: 'Scientific American',
    url: 'https://www.scientificamerican.com/earth-and-environment',
    baseUrl: 'https://www.scientificamerican.com'
  },
  {
    name: 'EcoWatch',
    url: 'https://www.ecowatch.com',
    baseUrl: 'https://www.ecowatch.com'
  },
  {
    name: 'Environmental News Network',
    url: 'https://www.enn.com',
    baseUrl: 'https://www.enn.com'
  },
  {
    name: 'GreenBiz',
    url: 'https://www.greenbiz.com',
    baseUrl: 'https://www.greenbiz.com'
  },
  {
    name: 'CleanTechnica',
    url: 'https://cleantechnica.com',
    baseUrl: 'https://cleantechnica.com'
  },
  {
    name: 'Yale Environment 360',
    url: 'https://e360.yale.edu',
    baseUrl: 'https://e360.yale.edu'
  }
];

function analyzeContent(title, content = '') {
  const text = (title + ' ' + content).toLowerCase();
  
  // Check for excluded topics first
  if (excludeKeywords.some(keyword => text.includes(keyword.toLowerCase()))) {
    return { isRelevant: false, score: 0, themes: [] };
  }
  
  // Check if it's an environmental story
  const isEnvironmental = environmentalKeywords.some(keyword => 
    text.includes(keyword.toLowerCase())
  );
  
  if (!isEnvironmental) {
    return { isRelevant: false, score: 0, themes: [] };
  }
  
  // Analyze positive themes
  const matchedThemes = [];
  let themeScore = 0;
  
  for (const [theme, keywords] of Object.entries(positiveThemes)) {
    const themeMatches = keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    if (themeMatches.length > 0) {
      matchedThemes.push(theme);
      themeScore += themeMatches.length;
    }
  }
  
  // Get basic sentiment score
  const sentimentResult = sentiment.analyze(text);
  
  // Calculate final score combining theme matches and sentiment
  const finalScore = (themeScore * 2) + sentimentResult.score;
  
  return {
    isRelevant: matchedThemes.length > 0 && finalScore > 0,
    score: finalScore,
    themes: matchedThemes
  };
}

async function scrapeNews() {
  let articles = [];

  for (const source of sources) {
    try {
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      $('a').each((i, element) => {
        const title = $(element).text().trim();
        let link = $(element).attr('href');
        
        if (link && title && title.length > 20) {
          if (!link.startsWith('http')) {
            link = source.baseUrl + link;
          }
          
          const analysis = analyzeContent(title);
          
          if (analysis.isRelevant) {
            articles.push({
              title,
              link,
              source: source.name,
              sentiment: analysis.score,
              themes: analysis.themes,
              date: moment().format('YYYY-MM-DD')
            });
          }
        }
      });
    } catch (error) {
      console.error(`Error scraping ${source.name}:`, error.message);
    }
  }

  // Filter articles from the last month
  const oneMonthAgo = moment().subtract(1, 'month');
  articles = articles.filter(article => moment(article.date).isAfter(oneMonthAgo));
  
  // Remove duplicates and sort by score
  articles = Array.from(new Set(articles.map(a => JSON.stringify(a))))
    .map(a => JSON.parse(a))
    .sort((a, b) => b.sentiment - a.sentiment);
  
  return articles;
}

app.get('/api/news', async (req, res) => {
  try {
    const articles = await scrapeNews();
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
