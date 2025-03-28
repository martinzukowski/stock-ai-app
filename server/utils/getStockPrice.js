const axios = require('axios');
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

const getStockQuote = async (ticker) => {
  try {
    const res = await axios.get('https://finnhub.io/api/v1/quote', {
      params: {
        symbol: ticker,
        token: FINNHUB_API_KEY,
      },
    });
    return res.data; // includes c (current), pc (prev close), d (change), dp (% change)
  } catch (err) {
    console.error(`Error fetching quote for ${ticker}:`, err.message);
    return null;
  }
};

module.exports = getStockQuote;
