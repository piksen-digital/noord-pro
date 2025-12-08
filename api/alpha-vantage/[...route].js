import fetch from 'node-fetch';

// Rate limiting in memory (for free tier limits)
const rateLimits = new Map();
const RATE_LIMIT = 5; // 5 calls per minute per IP for Alpha Vantage free tier

export default async function handler(req, res) {
  const { route } = req.query;
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
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
      error: 'Rate limit exceeded. Alpha Vantage free tier allows 5 calls per minute.',
      retryAfter: Math.ceil((calls[0] + 60000 - now) / 1000)
    });
  }
  
  if (!apiKey) {
    return res.status(500).json({
      error: 'Alpha Vantage API key not configured',
      message: 'Please set ALPHA_VANTAGE_API_KEY environment variable'
    });
  }
  
  try {
    // Build URL based on route
    const path = Array.isArray(route) ? route.join('/') : route;
    
    // Determine function and symbol from path
    const [functionName, symbol, ...rest] = path.split('/');
    
    if (!functionName || !symbol) {
      return res.status(400).json({
        error: 'Invalid request. Format: /api/alpha-vantage/[function]/[symbol]',
        example: '/api/alpha-vantage/TIME_SERIES_INTRADAY/AAPL'
      });
    }
    
    // Alpha Vantage API base URL
    let url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}&apikey=${apiKey}`;
    
    // Add additional parameters
    if (rest.length > 0) {
      const params = rest.join('&');
      url += `&${params}`;
    }
    
    // Common parameters
    if (functionName === 'TIME_SERIES_INTRADAY') {
      url += '&interval=5min&outputsize=compact';
    } else if (functionName === 'TIME_SERIES_DAILY') {
      url += '&outputsize=compact';
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API error messages
    if (data['Error Message']) {
      return res.status(400).json({
        error: 'Alpha Vantage API error',
        message: data['Error Message']
      });
    }
    
    if (data['Note']) {
      console.log('Alpha Vantage rate limit note:', data['Note']);
    }
    
    // Set cache headers (Alpha Vantage updates every 5-15 minutes)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Alpha Vantage API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch data from Alpha Vantage',
      message: error.message
    });
  }
}
