'use client';

import { useEffect, useState } from 'react';

type Stock = {
  _id?: string;
  ticker: string;
  quantity: number;
  buyPrice: number;
  dateAdded?: string;
  currentPrice?: number;
};

type ChartData = {
  name: string;
  price: number;
  percent: number;
};

type Suggestion = {
  symbol: string;
  name: string;
};

export default function Home() {
  const [portfolio, setPortfolio] = useState<Stock[]>([]);
  const [aiAdvice, setAiAdvice] = useState<{ [id: string]: string }>({});
  const [loadingAdviceId, setLoadingAdviceId] = useState<string | null>(null);
  const [form, setForm] = useState({ ticker: '', quantity: '', buyPrice: '' });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recommended, setRecommended] = useState<{ ticker: string; reason: string }[]>([]);
  const [autoBuyPrice, setAutoBuyPrice] = useState<number | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const totalInvested = portfolio.reduce(
    (sum, stock) => sum + stock.quantity * stock.buyPrice,
    0
  );

  useEffect(() => {
    const fetchPortfolio = async () => {
      const res = await fetch('http://localhost:5000/api/portfolio');
      const data: Stock[] = await res.json();

      const enriched = await Promise.all(
        data.map(async (stock) => {
          const priceRes = await fetch(`http://localhost:5000/api/price/${stock.ticker}`);
          const { price } = await priceRes.json();
          return { ...stock, currentPrice: price };
        })
      );

      setPortfolio(enriched);
    };

    fetchPortfolio();
  }, []);

  useEffect(() => {
    const popularStocks = ['AAPL', 'MSFT', 'TSLA', 'NVDA'];
    const fetchChartPrices = async () => {
      const prices = await Promise.all(
        popularStocks.map(async (ticker) => {
          const res = await fetch(`http://localhost:5000/api/price/${ticker}`);
          const { price, percent } = await res.json();
          return { name: ticker, price, percent };
        })
      );
      setChartData(prices);
    };

    fetchChartPrices();
  }, []);

  useEffect(() => {
    const fetchRecommendations = async () => {
      const res = await fetch('http://localhost:5000/api/ai/recommendations');
      const data = await res.json();
      setRecommended(data);
    };
  
    fetchRecommendations();
  }, []);  

  useEffect(() => {
    const ready = portfolio.every((s) => typeof s.currentPrice === 'number');
  
    if (portfolio.length && ready) {
      const fetchSummary = async () => {
        const res = await fetch('http://localhost:5000/api/ai/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ portfolio }),
        });
        const data = await res.json();
        setAiSummary(data.summary);
      };
  
      fetchSummary();
    }
  }, [portfolio]);  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTickerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setForm({ ...form, ticker: value });
  
    if (value.length < 1) {
      setSuggestions([]);
      setAutoBuyPrice(null);
      return;
    }
  
    const res = await fetch(`http://localhost:5000/api/suggest/${value}`);
    const data = await res.json();
    setSuggestions(data);
  
    // Try to fetch current price
    try {
      const priceRes = await fetch(`http://localhost:5000/api/price/${value}`);
      const { price } = await priceRes.json();
      if (price) {
        setAutoBuyPrice(price);
        setForm((prev) => ({ ...prev, buyPrice: price.toString() }));
      }
    } catch (err) {
      console.log('Failed to fetch price:', err);
      setAutoBuyPrice(null);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: form.ticker.toUpperCase(),
        quantity: Number(form.quantity),
        buyPrice: Number(form.buyPrice),
      }),
    });
    const newStock = await res.json();
    setPortfolio([...portfolio, newStock]);
    setForm({ ticker: '', quantity: '', buyPrice: '' });
    setSuggestions([]);
  };

  const getAiAdvice = async (stock: Stock) => {
    setLoadingAdviceId(stock._id ?? '');
    try {
      const res = await fetch('http://localhost:5000/api/ai/advise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: stock.ticker,
          quantity: stock.quantity,
          buyPrice: stock.buyPrice,
          currentPrice: stock.currentPrice,
        }),
      });
      const data = await res.json();
      setAiAdvice((prev) => ({ ...prev, [stock._id ?? '']: data.advice }));
    } catch (err) {
      setAiAdvice((prev) => ({ ...prev, [stock._id ?? '']: 'Error fetching advice' }));
    } finally {
      setLoadingAdviceId(null);
    }
  };  

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">📊 My Stock Portfolio</h1>
      <p className="text-lg mb-4">
        💰 Total Invested: <strong>${totalInvested.toFixed(2)}</strong>
      </p>
      <p className="text-lg mb-4">
        💰 Total Invested: <strong>${totalInvested.toFixed(2)}</strong>
      </p>

      {aiSummary && (
        <p className="text-sm text-gray-300 mb-6 bg-purple-900 p-3 rounded leading-relaxed">
          🤖 <strong>AI Summary:</strong> {aiSummary}
        </p>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-6 space-y-2">
        <div className="relative">
          <input
            name="ticker"
            placeholder="Ticker"
            value={form.ticker}
            onChange={handleTickerChange}
            required
            className="border p-2 w-full"
          />
          {suggestions.length > 0 && (
            <ul className="bg-white border mt-1 rounded shadow-md z-10">
              {suggestions.map((s) => (
                <li
                  key={s.symbol}
                  className="p-2 hover:bg-blue-100 cursor-pointer text-black"
                  onClick={async () => {
                    setForm({ ...form, ticker: s.symbol });
                    setSuggestions([]);

                    try {
                      const priceRes = await fetch(`http://localhost:5000/api/price/${s.symbol}`);
                      const { price } = await priceRes.json();
                      if (price) {
                        setAutoBuyPrice(price);
                        setForm((prev) => ({ ...prev, buyPrice: price.toString() }));
                      }
                    } catch (err) {
                      console.log('Failed to fetch price:', err);
                    }
                  }}
                >
                  <strong className="text-blue-700">{s.symbol}</strong> – <span className="text-gray-700">{s.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <input
          name="quantity"
          type="number"
          placeholder="Quantity"
          value={form.quantity}
          onChange={handleChange}
          required
          className="border p-2 w-full"
        />

        <input
          name="buyPrice"
          type="number"
          placeholder="Buy Price"
          value={form.buyPrice}
          onChange={(e) => {
            handleChange(e);
            setAutoBuyPrice(null); // clear autofill hint when user manually edits
          }}
          required
          className="border p-2 w-full"
        />
        {autoBuyPrice && (
          <p className="text-sm text-gray-400 mt-1">
            💡 Filled with live market price: ${autoBuyPrice.toFixed(2)}
          </p>
        )}

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add Stock</button>
      </form>

      {/* Portfolio */}
      <div className="space-y-2">
        {Object.values(
          portfolio.reduce((acc, stock) => {
            const key = stock.ticker;
            if (!acc[key]) {
              acc[key] = {
                ticker: stock.ticker,
                quantity: stock.quantity,
                totalCost: stock.buyPrice * stock.quantity,
                currentPrice: stock.currentPrice,
              };
            } else {
              acc[key].quantity += stock.quantity;
              acc[key].totalCost += stock.buyPrice * stock.quantity;
            }
            return acc;
          }, {} as Record<string, { ticker: string; quantity: number; totalCost: number; currentPrice?: number }>)
        ).map((stock) => {
          const value = stock.quantity * (stock.currentPrice ?? 0);
          const gain = value - stock.totalCost;

          return (
            <div key={stock.ticker} className="border p-4 rounded shadow-sm">
              <p><strong>{stock.ticker}</strong></p>
              <p>Quantity: {stock.quantity}</p>
              <p>Current Price: ${stock.currentPrice?.toFixed(2) ?? '...'}</p>
              <p>Value: ${value.toFixed(2)}</p>
              <p className={gain >= 0 ? 'text-green-600' : 'text-red-600'}>
                {gain >= 0 ? '🔺' : '🔻'} Gain/Loss: ${gain.toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      <h2 className="text-xl font-semibold mt-10 mb-2">🤖 AI Recommended Stocks</h2>
      {recommended.length === 0 ? (
        <p className="text-gray-500">Loading recommendations...</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="text-left p-2">Ticker</th>
              <th className="text-left p-2">Why It's Hot</th>
            </tr>
          </thead>
          <tbody>
            {recommended.map((stock) => (
              <tr key={stock.ticker} className="border-t">
                <td className="p-2 font-semibold">{stock.ticker}</td>
                <td className="p-2 text-sm text-white-700">{stock.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Popular Stocks Table */}
      <h2 className="text-xl font-semibold mt-8 mb-2">🔥 Popular Stocks</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="text-left p-2">Ticker</th>
            <th className="text-right p-2">Price</th>
            <th className="text-right p-2">% Change</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((stock) => (
            <tr key={stock.name} className="border-t">
              <td className="p-2 font-semibold">{stock.name}</td>
              <td className="p-2 text-right">${stock.price.toFixed(2)}</td>
              <td className={`p-2 text-right ${stock.percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stock.percent >= 0 ? '🔺' : '🔻'} {stock.percent.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
