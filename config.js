const CONFIG = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  },
  apis: {
    fmp: process.env.FMP_KEY || '',
    alphaVantage: process.env.ALPHA_VANTAGE_KEY || '',
    polygon: process.env.POLYGON_KEY || ''
  }
};

// Export for browser use
if (typeof module !== 'undefined') module.exports = CONFIG;
