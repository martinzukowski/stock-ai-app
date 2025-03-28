require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Portfolio = require('./models/Portfolio'); // 👈 Import your model

const app = express();
app.use(cors());
app.use(express.json());

// 🔌 MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// 🚀 Test route
app.get('/api/ping', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// 📦 Get all saved stocks
app.get('/api/portfolio', async (req, res) => {
  try {
    const stocks = await Portfolio.find();
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch portfolio.' });
  }
});

// ➕ Add a new stock
app.post('/api/portfolio', async (req, res) => {
  try {
    const { ticker, quantity, buyPrice } = req.body;
    const newStock = new Portfolio({ ticker, quantity, buyPrice });
    await newStock.save();
    res.status(201).json(newStock);
  } catch (err) {
    res.status(400).json({ error: 'Failed to add stock.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// 🗑 Delete a stock by ID
app.delete('/api/portfolio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Portfolio.findByIdAndDelete(id);
    res.status(204).end(); // No content
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete stock.' });
  }
});

const priceCache = {}; // simple in-memory cache
const CACHE_TTL = 60 * 1000; // 1 minute per ticker

app.get('/api/price/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const now = Date.now();

  // Check cache
  if (
    priceCache[ticker] &&
    now - priceCache[ticker].timestamp < CACHE_TTL
  ) {
    return res.json(priceCache[ticker].data);
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}`
    );
    const quote = await response.json();

    if (!quote.c) throw new Error("Invalid quote data");

    const data = {
      price: quote.c,
      change: quote.d,
      percent: quote.dp,
      prevClose: quote.pc,
    };

    // Store in cache
    priceCache[ticker] = {
      timestamp: now,
      data,
    };

    res.json(data);
  } catch (err) {
    console.error(`Error fetching quote for ${ticker}:`, err.message);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});


app.get('/api/suggest/:query', async (req, res) => {
  const query = req.params.query.toUpperCase();

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${query}&token=${process.env.FINNHUB_API_KEY}`
    );
    const data = await response.json();

    const filtered = data.result
      .filter((r) =>
        r.symbol &&
        r.description &&
        /^[A-Z]{1,6}$/.test(r.symbol) // Exclude weird tickers
      )
      .map((r) => ({
        symbol: r.symbol,
        name: r.description,
        score: r.symbol === query ? 2 : r.symbol.startsWith(query) ? 1 : 0, // prioritize exact or startsWith match
      }))
      .sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol)) // then alphabetically
      .slice(0, 8); // limit to top 8

    res.json(filtered);
  } catch (err) {
    console.error('Suggest error:', err.message);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});


app.post('/api/ai/advise', async (req, res) => {
  const { ticker, quantity, buyPrice, currentPrice } = req.body;

  const prompt = `
A user owns ${quantity} shares of ${ticker} stock. They bought in at $${buyPrice} and it is now trading at $${currentPrice}.
As a financial assistant, should the user buy more, hold, or sell? Keep your answer to 1-2 sentences.
`;

  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo',
    });

    const advice = chatCompletion.choices[0].message.content;
    res.json({ advice });
  } catch (err) {
    console.error('OpenAI error:', err.message);
    res.status(500).json({ error: 'Failed to get AI advice' });
  }
});

app.get('/api/ai/recommendations', async (req, res) => {
  try {
    const newsRes = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${process.env.FINNHUB_API_KEY}`
    );
    const news = await newsRes.json();

    // Get titles of top 5 articles
    const headlines = news.slice(0, 5).map(n => `- ${n.headline}`).join('\n');

    const prompt = `
Here are some recent financial news headlines:
${headlines}

Based on these, suggest 3-5 publicly traded companies (tickers only, like AAPL or TSLA) that look promising to invest in short term. For each, explain in 1 sentence why it's a good pick.
Return the result as JSON with format: [{ "ticker": "AAPL", "reason": "..." }]
`;

    const chat = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo',
    });

    const raw = chat.choices[0].message.content;
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error('AI stock rec error:', err.message);
    res.status(500).json({ error: 'Could not fetch AI recommendations' });
  }
});

app.post('/api/ai/summary', async (req, res) => {
  const { portfolio } = req.body;

  if (!portfolio || !portfolio.length) {
    return res.status(400).json({ error: 'No portfolio data provided' });
  }

  const summaryData = portfolio
    .map((stock) => {
      const change = stock.currentPrice - stock.buyPrice;
      const percentChange = (change / stock.buyPrice) * 100;
      return `${stock.ticker}: ${stock.quantity} shares bought at $${stock.buyPrice.toFixed(2)}, now $${stock.currentPrice.toFixed(2)} (${percentChange.toFixed(1)}%)`;
    })
    .join('\n');

  const prompt = `
Here is a user's stock portfolio performance today:
${summaryData}

Give a short 2-3 sentence summary on how the portfolio performed overall, and recommend what they should do today (buy, sell, hold, or adjust).
`;

  try {
    const chat = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo',
    });

    const message = chat.choices[0].message.content;
    res.json({ summary: message });
  } catch (err) {
    console.error('AI summary error:', err.message);
    res.status(500).json({ error: 'Failed to generate AI summary' });
  }
});
