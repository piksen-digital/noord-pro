// api/fmp/[...path].js
export default async function handler(req, res) {
  const { path } = req.query;
  const apiKey = process.env.FMP_API_KEY;
  
  const response = await fetch(`https://financialmodelingprep.com/api/v3/${path.join('/')}?apikey=${apiKey}`);
  const data = await response.json();
  
  res.status(200).json(data);
}
