const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const Sentiment = require('sentiment');
const cors = require('cors');
const moment = require('moment');
const NodeCache = require('node-cache');

// Initialize Express and other middleware
const app = express();
const sentiment = new Sentiment();
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour
app.use(cors());
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

// Keywords to exclude
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

// Environmental keywords
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
    name: 'The Guardian Environment',
    url: 'https://www.theguardian.com/environment',
    baseUrl: 'https://www.theguardian.com',
    dateSelector: 'time'
  },
  {
    name: 'CNN Climate',
    url: 'https://www.cnn.com/world/cnn-climate',
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

function extractDate($, element, source) {
  let publishDate;

  // Try source-specific date selector first
  if (source.dateSelector) {
    // Look in the parent article/container first
    let dateElement = $(element).closest('article').find(source.dateSelector);
    if (!dateElement.length) {
      // If not found in article, search in parent containers
      dateElement = $(element).parents().find(source.dateSelector).first();
    }
    if (dateElement.length) {
      publishDate = dateElement.attr('datetime') || dateElement.attr('data-date') || dateElement.text();
    }
  }

  // If no date found, try common patterns
  if (!publishDate) {
    const possibleElements = [
      // Try time elements
      $(element).closest('article').find('time'),
      $(element).parents().find('time').first(),
      
      // Try elements with date-related classes
      ...datePatterns.dateClasses.map(className => 
        $(element).closest('article').find(`.${className}`).add(
          $(element).parents().find(`.${className}`).first()
        )
      ),
      
      // Try elements with date-related attributes
      ...datePatterns.dateAttributes.map(attr => 
        $(element).closest('article').find(`[${attr}]`).add(
          $(element).parents().find(`[${attr}]`).first()
        )
      )
    ];

    // Check each possible element
    for (const el of possibleElements) {
      if (el && el.length) {
        // Try various attributes first
        publishDate = el.attr('datetime') || 
                     el.attr('data-date') || 
                     el.attr('data-timestamp') || 
                     el.text();
        if (publishDate) break;
      }
    }
  }

  if (publishDate) {
    // Clean up the date string
    publishDate = publishDate.trim()
      .replace(/Published:?/i, '')
      .replace(/Posted:?/i, '')
      .replace(/Date:?/i, '')
      .replace(/Updated:?/i, '')
      .trim();

    // Try parsing with moment using multiple formats
    const parsedDate = moment(publishDate, datePatterns.dateFormats, true);
    if (parsedDate.isValid()) {
      return parsedDate.format('YYYY-MM-DD');
    }

    // Try parsing with built-in Date parser as fallback
    const dateObj = new Date(publishDate);
    if (!isNaN(dateObj.getTime())) {
      return moment(dateObj).format('YYYY-MM-DD');
    }
  }

  // If we still can't find a date, check for relative date strings
  const relativeDatePatterns = [
    { regex: /(\d+)\s*days?\s*ago/i, unit: 'days' },
    { regex: /(\d+)\s*weeks?\s*ago/i, unit: 'weeks' },
    { regex: /(\d+)\s*months?\s*ago/i, unit: 'months' },
    { regex: /yesterday/i, unit: 'days', value: 1 }
  ];

  const containerText = $(element).closest('article').text() || $(element).parent().text();
  for (const pattern of relativeDatePatterns) {
    const match = containerText.match(pattern.regex);
    if (match) {
      const value = pattern.value || parseInt(match[1]);
      return moment().subtract(value, pattern.unit).format('YYYY-MM-DD');
    }
  }

  // Default to today's date if no date found
  return moment().format('YYYY-MM-DD');
}

async function scrapeNews(since = null) {
  let articles = [];
  const oneMonthAgo = moment().subtract(1, 'month');

  for (const source of sources) {
    try {
      console.log(`Scraping ${source.name}...`);
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      // Find all article containers first
      const articles_elements = $('article').add($('div.article')).add($('div.post'));
      
      articles_elements.each((i, article) => {
        // Try to find the title in order of preference
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
          
          if (analysis.isRelevant) {
            const publishDate = extractDate($, article, source);
            console.log(`Found article: "${title}" with date: ${publishDate}`);
            
            // Only add articles from the last month and after the since date if provided
            const articleDate = moment(publishDate);
            if (articleDate.isAfter(oneMonthAgo) && (!since || articleDate.isAfter(since))) {
              articles.push({
                title,
                link,
                source: source.name,
                sentiment: analysis.score,
                themes: analysis.themes,
                date: publishDate
              });
            }
          }
        }
      });

      if (articles_elements.length === 0) {
        $('a:not(:has(img))').each((i, element) => {
          const title = $(element).text().trim()
            .replace(/\s+/g, ' ')
            .replace(/\n/g, ' ')
            .replace(/^(By|From)\s+\w+\s+\w+/, '')
            .trim();
          let link = $(element).attr('href');
          
          if (link && title && title.length > 20 && !$(element).find('img').length) {
            if (!link.startsWith('http')) {
              link = source.baseUrl + (link.startsWith('/') ? link : '/' + link);
            }
            
            const analysis = analyzeContent(title);
            
            if (analysis.isRelevant) {
              const publishDate = extractDate($, element, source);
              console.log(`Found article: "${title}" with date: ${publishDate}`);
              
              // Only add articles from the last month and after the since date if provided
              const articleDate = moment(publishDate);
              if (articleDate.isAfter(oneMonthAgo) && (!since || articleDate.isAfter(since))) {
                articles.push({
                  title,
                  link,
                  source: source.name,
                  sentiment: analysis.score,
                  themes: analysis.themes,
                  date: publishDate
                });
              }
            }
          }
        });
      }

      console.log(`Found ${articles.length} articles from ${source.name}`);
    } catch (error) {
      console.error(`Error scraping ${source.name}:`, error.message);
    }
  }
  
  // Remove duplicates and sort by date (newest first)
  articles = Array.from(new Set(articles.map(a => JSON.stringify(a))))
    .map(a => JSON.parse(a))
    .sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
  
  return articles;
}

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
