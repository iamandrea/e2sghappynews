const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const Sentiment = require('sentiment');
const cors = require('cors');
const moment = require('moment');
const NodeCache = require('node-cache');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Initialize Express and other middleware
const app = express();
const sentiment = new Sentiment();
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour
if (process.env.NODE_ENV === 'production') {
  // In production (like on Render), only allow your GitHub Pages domain
  app.use(cors({
    origin: 'https://iamandrea.github.io',
    methods: ['GET', 'POST']
  }));
} else {
  // In development (local testing), allow all origins
  app.use(cors());
}
app.use(express.json());

// Cache keys
const CACHE_KEYS = {
  ARTICLES: 'articles',
  LAST_FETCH: 'lastFetch'
};

// Date-related patterns to look for in HTML
const datePatterns = {
  timeTag: 'time',
  dateAttributes: ['datetime', 'data-datetime', 'pubdate'],
  dateClasses: ['date', 'time', 'published', 'post-date', 'article-date', 'timestamp'],
  dateFormats: [
    'YYYY-MM-DD',
    'YYYY/MM/DD',
    'DD-MM-YYYY',
    'DD/MM/YYYY',
    'MMM DD, YYYY',
    'MMMM DD, YYYY',
    'DD MMM YYYY',
    'DD MMMM YYYY'
  ]
};

// Environmental keywords
const environmentalKeywords = [
  'climate solution',
  'renewable energy',
  'sustainable',
  'conservation',
  'biodiversity',
  'clean energy',
  'environmental protection',
  'green initiative',
  'eco-friendly',
  'carbon reduction',
  'climate action',
  'climate wins',
  'nature',
  'science',
  'environment',
  'eco friendly',
  'sustainable living',
  'protect our planet',
  'restoration',
  'preservation'
];

// Keywords to exclude
const excludedKeywords = [
  'crime',
  'murder',
  'death',
  'killed',
  'war',
  'conflict',
  'disaster',
  'catastrophe',
  'tragedy',
  'crisis',
  'scandal',
  'controversy',
  'politician',
  'celebrity',
  'gossip'
];

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

const sources = [
  {
    name: 'BBC Environment',
    url: 'https://www.bbc.com/news/science_and_environment',
    baseUrl: 'https://www.bbc.com',
    dateSelector: 'time'
  },
  {
    name: 'BBC Climate',
    url: 'https://www.bbc.com/news/topics/cmj34zmwm1zt',
    baseUrl: 'https://www.bbc.com',
    dateSelector: 'time'
  },
  {
    name: 'The Guardian Environment',
    url: 'https://www.theguardian.com/environment',
    baseUrl: 'https://www.theguardian.com',
    dateSelector: 'time'
  },
  {
    name: 'CNN Climate',
    url: 'https://edition.cnn.com/climate',
    baseUrl: 'https://www.cnn.com',
    dateSelector: '.timestamp'
  },
  {
    name: 'ABC News Environment',
    url: 'https://www.abc.net.au/news/environment',
    baseUrl: 'https://www.abc.net.au',
    dateSelector: 'time'
  },
  {
    name: 'Sydney Morning Herald Environment',
    url: 'https://www.smh.com.au/environment',
    baseUrl: 'https://www.smh.com.au',
    dateSelector: 'time'
  },
  {
    name: 'The Age Environment',
    url: 'https://www.theage.com.au/environment',
    baseUrl: 'https://www.theage.com.au',
    dateSelector: 'time'
  },
  {
    name: 'New York Times Climate',
    url: 'https://www.nytimes.com/section/climate',
    baseUrl: 'https://www.nytimes.com',
    dateSelector: 'time'
  },
  {
    name: 'The Conversation Environment',
    url: 'https://theconversation.com/us/environment',
    baseUrl: 'https://theconversation.com',
    dateSelector: 'time'
  },
  {
    name: 'National Geographic Environment',
    url: 'https://www.nationalgeographic.com/environment',
    baseUrl: 'https://www.nationalgeographic.com',
    dateSelector: 'time'
  },
  {
    name: 'Scientific American Environment',
    url: 'https://www.scientificamerican.com/earth-and-environment',
    baseUrl: 'https://www.scientificamerican.com',
    dateSelector: '.t_meta-date'
  },
  {
    name: 'EcoWatch',
    url: 'https://www.ecowatch.com',
    baseUrl: 'https://www.ecowatch.com',
    dateSelector: 'time'
  },
  {
    name: 'Environmental News Network',
    url: 'https://www.enn.com',
    baseUrl: 'https://www.enn.com',
    dateSelector: '.date'
  },
  {
    name: 'GreenBiz',
    url: 'https://www.greenbiz.com',
    baseUrl: 'https://www.greenbiz.com',
    dateSelector: 'time'
  },
  {
    name: 'CleanTechnica',
    url: 'https://cleantechnica.com',
    baseUrl: 'https://cleantechnica.com',
    dateSelector: 'time'
  },
  {
    name: 'Yale Environment 360',
    url: 'https://e360.yale.edu',
    baseUrl: 'https://e360.yale.edu',
    dateSelector: '.article-date'
  },
  {
    name: 'Mongabay',
    url: 'https://news.mongabay.com',
    baseUrl: 'https://news.mongabay.com',
    dateSelector: '.article-timestamp'
  },
  {
    name: 'Inside Climate News',
    url: 'https://insideclimatenews.org',
    baseUrl: 'https://insideclimatenews.org',
    dateSelector: 'time'
  },
  {
    name: 'Nature Climate Change',
    url: 'https://www.nature.com/nclimate',
    baseUrl: 'https://www.nature.com',
    dateSelector: 'time'
  },
  {
    name: 'Climate Home News',
    url: 'https://www.climatechangenews.com',
    baseUrl: 'https://www.climatechangenews.com',
    dateSelector: '.entry-date'
  },
  {
    name: 'Grist',
    url: 'https://grist.org',
    baseUrl: 'https://grist.org',
    dateSelector: 'time'
  },
  {
    name: 'Environmental Health News',
    url: 'https://www.ehn.org',
    baseUrl: 'https://www.ehn.org',
    dateSelector: '.date'
  },
  {
    name: 'Earth.org',
    url: 'https://earth.org/news',
    baseUrl: 'https://earth.org',
    dateSelector: 'time'
  },
  {
    name: 'Treehugger',
    url: 'https://www.treehugger.com',
    baseUrl: 'https://www.treehugger.com',
    dateSelector: 'time'
  },
  {
    name: 'World Economic Forum Environment',
    url: 'https://www.weforum.org/agenda/environment',
    baseUrl: 'https://www.weforum.org',
    dateSelector: '.date'
  },
  {
    name: 'Environmental Leader',
    url: 'https://www.environmentalleader.com',
    baseUrl: 'https://www.environmentalleader.com',
    dateSelector: 'time'
  },
  {
    name: 'Green Queen',
    url: 'https://www.greenqueen.com.hk',
    baseUrl: 'https://www.greenqueen.com.hk',
    dateSelector: '.jeg_meta_date'
  },
  {
    name: 'Eco-Business',
    url: 'https://www.eco-business.com',
    baseUrl: 'https://www.eco-business.com',
    dateSelector: '.date'
  },
  {
    name: 'Ensia',
    url: 'https://ensia.com',
    baseUrl: 'https://ensia.com',
    dateSelector: 'time'
  },
  {
    name: 'Environmental Protection',
    url: 'https://eponline.com',
    baseUrl: 'https://eponline.com',
    dateSelector: '.date'
  },
  {
    name: 'Sustainability Times',
    url: 'https://www.sustainability-times.com',
    baseUrl: 'https://www.sustainability-times.com',
    dateSelector: '.date'
  },
  {
    name: 'Positive News Environment',
    url: 'https://www.positive.news/environment',
    baseUrl: 'https://www.positive.news',
    dateSelector: 'time'
  }
];

async function launchBrowser() {
  const basePath = '/home/node/.cache/puppeteer/chrome';
  let executablePath = null;

  try {
    const folders = fs.readdirSync(basePath);
    for (const folder of folders) {
      const possiblePath = path.join(basePath, folder, 'chrome');
      if (fs.existsSync(possiblePath)) {
        executablePath = possiblePath;
        break;
      }
    }
  } catch (err) {
    console.warn('No Chrome installation found at', basePath);
  }

  if (!executablePath) {
    console.warn('Falling back to default Puppeteer path.');
  } else {
    console.log('Using Chrome at:', executablePath);
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  return browser;
}



async function scrapeWithPuppeteer(url) {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Add timeout and catch navigation issues
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }); // 20 sec

    const content = await page.content();
    await browser.close();
    return content;

  } catch (error) {
    console.error(`Puppeteer error scraping ${url}:`, error.message);
    await browser.close();
    return ''; // Return empty string to prevent crash
  }
}


function analyzeContent(title, content = '') {
  const text = (title + ' ' + content).toLowerCase();
  
  // Check for excluded topics first
  if (excludedKeywords.some(keyword => text.includes(keyword.toLowerCase()))) {
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
  
  // Calculate normalized score (0-100)
  const normalizedScore = Math.min(Math.max(((sentimentResult.score + 5) / 10) * 100, 0), 100);
  
  // Determine themes based on keywords
  const themes = new Set();
  if (text.includes('climate') || text.includes('carbon')) themes.add('climate');
  if (text.includes('nature') || text.includes('wildlife')) themes.add('nature');
  if (text.includes('science') || text.includes('research')) themes.add('science');
  if (text.includes('community') || text.includes('people')) themes.add('community');
  if (text.includes('renewable') || text.includes('energy')) themes.add('energy');
  if (text.includes('sustainable') || text.includes('eco')) themes.add('sustainable');
  
  // Article is relevant if it:
  // 1. Has a positive sentiment
  // 2. Contains environmental keywords
  // 3. Doesn't contain excluded keywords
  // 4. Has meaningful length
  const isRelevant = sentimentResult.score > 0 && 
                     matchedThemes.length > 0 && 
                     !excludedKeywords.some(keyword => text.includes(keyword.toLowerCase())) && 
                     title.length > 20;
  
  return {
    score: normalizedScore,
    isRelevant,
    themes: Array.from(themes),
    keywords: matchedThemes
  };
}

function extractDate($, element, source) {
  let publishDate;

  try {
    // Try source-specific date selector first
    if (source.dateSelector) {
      const dateElement = $(element).closest('article').find(source.dateSelector);
      if (dateElement.length > 0) {
        publishDate = dateElement.attr('datetime') || dateElement.text();
      }
    }

    // If no date found, try common date patterns
    if (!publishDate) {
      // Try time tag
      const timeTag = $(element).closest('article').find('time');
      if (timeTag.length > 0) {
        publishDate = timeTag.attr('datetime') || timeTag.text();
      }
    }

    if (!publishDate) {
      // Try meta tags
      $('meta').each((i, meta) => {
        const property = $(meta).attr('property') || '';
        const name = $(meta).attr('name') || '';
        if (property.includes('time') || property.includes('date') ||
            name.includes('time') || name.includes('date')) {
          publishDate = $(meta).attr('content');
          return false; // Break the loop
        }
      });
    }

    if (!publishDate) {
      // Try common date classes and patterns
      const datePatterns = [
        '.date',
        '.published',
        '.post-date',
        '.entry-date',
        '[itemprop="datePublished"]',
        '.timestamp',
        '.article-date'
      ];

      for (const pattern of datePatterns) {
        const dateElement = $(element).closest('article').find(pattern);
        if (dateElement.length > 0) {
          publishDate = dateElement.attr('datetime') || dateElement.text();
          break;
        }
      }
    }

    // If we found a date, try to parse it
    if (publishDate) {
      // Try parsing with moment
      let parsedDate = moment(publishDate);
      
      // If that fails, try some common formats
      if (!parsedDate.isValid()) {
        const formats = [
          'YYYY-MM-DD',
          'YYYY/MM/DD',
          'DD-MM-YYYY',
          'DD/MM/YYYY',
          'MMM DD, YYYY',
          'MMMM DD, YYYY',
          'DD MMM YYYY',
          'DD MMMM YYYY'
        ];
        
        for (const format of formats) {
          parsedDate = moment(publishDate, format);
          if (parsedDate.isValid()) {
            break;
          }
        }
      }
      
      // If we successfully parsed the date, return it
      if (parsedDate.isValid()) {
        return parsedDate.format('YYYY-MM-DD');
      }
    }

    // If all else fails, return today's date
    return moment().format('YYYY-MM-DD');
  } catch (error) {
    console.error('Error extracting date:', error);
    return moment().format('YYYY-MM-DD');
  }
}

async function scrapeNews(since = null) {
  let articles = [];
  const oneMonthAgo = moment().subtract(30, 'days').startOf('day');

  for (const source of sources) {
    try {
      console.log(`Scraping ${source.name}...`);

      const responseData = await scrapeWithPuppeteer(source.url);
      console.log(`Response received from ${source.name}:`, responseData.substring(0, 500)); // Log first 500 characters of response

      const $ = cheerio.load(responseData);
      const articles_elements = $('article').add($('div.article')).add($('div.post'));

      articles_elements.each((i, article) => {
        let titleElement = $(article).find('h1.entry-title, h2.entry-title, h3.entry-title').first() ||
                          $(article).find('.article-title, .post-title').first() ||
                          $(article).find('h1:not(:has(img)), h2:not(:has(img)), h3:not(:has(img))').first();

        if (!titleElement.length) {
          titleElement = $(article).find('a:not(:has(img))').filter(function() {
            const text = $(this).text().trim();
            return text.length > 20 && !$(this).find('img').length;
          }).first();
        }

        let title = titleElement.text().trim();
        let link = titleElement.prop('tagName') === 'A' ? titleElement.attr('href') : $(article).find('a').first().attr('href');

        title = title
          .replace(/\s+/g, ' ')
          .replace(/\n/g, ' ')
          .replace(/^(By|From)\s+\w+\s+\w+/, '')
          .trim();

        if (link && title && title.length > 20) {
          if (!link.startsWith('http')) {
            link = source.baseUrl + (link.startsWith('/') ? link : '/' + link);
          }

          const analysis = analyzeContent(title);
          const publishDate = extractDate($, article, source);
          const articleDate = moment(publishDate);

          console.log(`Article "${title}" date: ${articleDate.format('YYYY-MM-DD')}, threshold: ${oneMonthAgo.format('YYYY-MM-DD')}`);

          // Only add articles from the last 30 days and after the since date if provided
          if (articleDate.isAfter(oneMonthAgo) && (!since || articleDate.isAfter(since))) {
            // Check for duplicates (case insensitive)
            const isDuplicate = articles.some(a =>
              a.title.toLowerCase() === title.toLowerCase() &&
              a.link.toLowerCase() === link.toLowerCase()
            );
            // Check for tags and impact score
            if (!isDuplicate && analysis.score > 0 && analysis.themes.length > 0) {
              articles.push({
                title,
                link,
                source: source.name,
                sentiment: analysis.score,
                themes: analysis.themes,
                date: publishDate
              });
              console.log(`Added article: ${title}`);
            } else {
              console.log(`Article not added due to: ${isDuplicate ? 'duplicate' : (analysis.score <= 0 ? '0% impact score' : 'no tags')}`);
            }
          }
        }
      });

      console.log(`Found ${articles.length} articles from ${source.name}`);
    } catch (error) {
      console.error(`Error scraping ${source.name}:`, error.message);
    }
  }

  articles = Array.from(new Set(articles.map(a => JSON.stringify(a))))
    .map(a => JSON.parse(a))
    .sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());

  return articles;
}


// Your API routes
app.get('/api/news', async (req, res) => {
  try {
    const lastFetchTime = cache.get(CACHE_KEYS.LAST_FETCH);
    let cachedArticles = cache.get(CACHE_KEYS.ARTICLES) || [];
    const since = req.query.since ? moment(req.query.since) : null;
    
    // If we have cached articles
    if (cachedArticles.length > 0) {
      console.log(`Using cached articles (${cachedArticles.length} articles)`);
      
      // If there's a since parameter, check for new articles
      if (since) {
        console.log(`Checking for new articles since ${since.format()}`);
        const newArticles = await scrapeNews(since);
        
        if (newArticles.length > 0) {
          console.log(`Found ${newArticles.length} new articles`);
          // Merge new articles with cached ones
          const allArticles = [...newArticles, ...cachedArticles];
          
          // Remove duplicates and sort
          const uniqueArticles = Array.from(new Set(allArticles.map(a => JSON.stringify(a))))
            .map(a => JSON.parse(a))
            .sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
          
          // Update cache
          cache.set(CACHE_KEYS.ARTICLES, uniqueArticles);
          cache.set(CACHE_KEYS.LAST_FETCH, moment().toISOString());
          
          res.json(uniqueArticles);
        } else {
          console.log('No new articles found');
          res.json(cachedArticles);
        }
      } else {
        // If no since parameter, just return cached articles
        res.json(cachedArticles);
      }
    } else {
      // If no cache, do a full fetch
      console.log('No cached articles found, performing full fetch');
      const articles = await scrapeNews();
      
      // Update cache
      cache.set(CACHE_KEYS.ARTICLES, articles);
      cache.set(CACHE_KEYS.LAST_FETCH, moment().toISOString());
      
      res.json(articles);
    }
  } catch (error) {
    console.error('Error in /api/news:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cache/articles', (req, res) => {
  cache.del(CACHE_KEYS.ARTICLES);
  console.log('Cleared articles cache');
  res.json({ message: 'Articles cache cleared' });
});


// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
  });
}



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
