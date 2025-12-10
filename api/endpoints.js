// api/endpoints.js
export default async function handler(req, res) {
  const endpoints = {
    shortMonitoring: [
      '/api/short/risk/{symbol}',
      '/api/short/borrow-rates',
      '/api/short/squeeze-alerts'
    ],
    level2Analysis: [
      '/api/level2/patterns/{symbol}',
      '/api/level2/orderbook/{symbol}',
      '/api/level2/flow/{symbol}'
    ],
    darkPool: [
      '/api/darkpool/activity',
      '/api/darkpool/impact/{symbol}',
      '/api/darkpool/simulation'
    ],
    webhooks: [
      '/webhooks/discord',
      '/webhooks/telegram',
      '/webhooks/sms',
      '/webhooks/email'
    ]
  };
  
  res.status(200).json(endpoints);
}
