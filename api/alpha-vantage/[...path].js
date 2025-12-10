// api/alpha-vantage/[...path].js
export default async function handler(req, res) {
  const { path } = req.query;
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  const response = await fetch(`https://www.alphavantage.co/query?${path.join('&')}&apikey=${apiKey}`);
  const data = await response.json();
  
  res.status(200).json(data);
}
