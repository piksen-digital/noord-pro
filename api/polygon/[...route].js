import fetch from 'node-fetch';

// Rate limiting for Polygon (5 calls/minute free tier)
const rateLimits = new Map();
const RATE_LIMIT = 5;

export default async function handler(req, res) {
  const { route } = req.query;
  const apiKey = process.env.POLYGON_API_KEY;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  // Rate limiting check
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, []);
  }
  
  const calls = rateLimits.get(ip).filter(time => time > windowStart);
  calls.push(now);
  rateLimits.set(ip, calls);
  
  if (calls.length > RATE_LIMIT) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Polygon free tier allows ${RATE_LIMIT} calls per minute.`,
      retryAfter: Math.ceil((calls[0] + 60000 - now) / 1000)
    });
  }
  
  if (!apiKey) {
    return res.status(500).json({
      error: 'Polygon API key not configured',
      message: 'Please set POLYGON_API_KEY environment variable'
    });
  }
  
  try {
    // Build URL
    const path = Array.isArray(route) ? route.join('/') : route;
    
    if (!path) {
      return res.status(400).json({
        error: 'Invalid request',
        example: '/api/polygon/v2/aggs/ticker/AAPL/range/1/day/2023-01-01/2023-12-31',
        endpoints: [
          '/v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}',
          '/v2/snapshot/locale/us/markets/stocks/tickers',
          '/v3/reference/tickers',
          '/v1/open-close/{ticker}/{date}',
          '/v2/aggs/grouped/locale/us/market/stocks/{date}'
        ]
      });
    }
    
    // Polygon API base URL (using the free tier endpoint)
    const url = `https://api.polygon.io/${path}?apiKey=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Polygon API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Check for error in response
    if (data.error) {
      return res.status(400).json({
        error: 'Polygon API error',
        message: data.error
      });
    }
    
    // Note: Polygon free tier has 15-minute delayed data
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800'); // 15-30 minute cache
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-RateLimit-Remaining', RATE_LIMIT - calls.length);
    res.setHeader('X-RateLimit-Reset', Math.ceil((calls[0] + 60000) / 1000));
    
    return res.status(200).json({
      ...data,
      note: 'Polygon free tier provides 15-minute delayed data'
    });
    
  } catch (error) {
    console.error('Polygon API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch data from Polygon',
      message: error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
