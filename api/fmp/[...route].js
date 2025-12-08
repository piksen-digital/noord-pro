import fetch from 'node-fetch';

// Rate limiting for FMP (250 calls/day free tier)
const dailyCalls = new Map();
const MAX_DAILY_CALLS = 250;

export default async function handler(req, res) {
  const { route } = req.query;
  const apiKey = process.env.FMP_API_KEY;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  if (!apiKey) {
    return res.status(500).json({
      error: 'Financial Modeling Prep API key not configured',
      message: 'Please set FMP_API_KEY environment variable'
    });
  }
  
  // Simple daily rate limit check
  const today = new Date().toDateString();
  const key = `${ip}-${today}`;
  
  if (!dailyCalls.has(key)) {
    dailyCalls.set(key, 0);
  }
  
  const todayCalls = dailyCalls.get(key) + 1;
  dailyCalls.set(key, todayCalls);
  
  if (todayCalls > MAX_DAILY_CALLS) {
    return res.status(429).json({
      error: 'Daily rate limit exceeded',
      message: `FMP free tier allows ${MAX_DAILY_CALLS} calls per day. Reset at midnight.`,
      callsUsed: todayCalls,
      callsRemaining: 0
    });
  }
  
  try {
    // Build URL
    const path = Array.isArray(route) ? route.join('/') : route;
    
    if (!path) {
      return res.status(400).json({
        error: 'Invalid request',
        example: '/api/fmp/quote/AAPL',
        endpoints: [
          '/quote/:symbol',
          '/profile/:symbol',
          '/income-statement/:symbol',
          '/balance-sheet/:symbol',
          '/cash-flow/:symbol',
          '/historical-price-full/:symbol',
          '/market-capitalization/:symbol'
        ]
      });
    }
    
    // FMP API base URL
    const url = `https://financialmodelingprep.com/api/v3/${path}?apikey=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Set cache headers (FMP updates vary by endpoint)
    const cacheTime = path.includes('historical') ? 3600 : 300; // 1 hour for historical, 5 min for quotes
    res.setHeader('Cache-Control', `public, s-maxage=${cacheTime}, stale-while-revalidate=${cacheTime * 2}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-RateLimit-Remaining', MAX_DAILY_CALLS - todayCalls);
    res.setHeader('X-RateLimit-Used', todayCalls);
    
    return res.status(200).json({
      data,
      rateLimit: {
        used: todayCalls,
        remaining: MAX_DAILY_CALLS - todayCalls,
        reset: 'midnight'
      }
    });
    
  } catch (error) {
    console.error('FMP API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch data from Financial Modeling Prep',
      message: error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
