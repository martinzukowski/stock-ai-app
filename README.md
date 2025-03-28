# 📈 Stock AI Advisor

A full-stack web app that helps you track your stock portfolio and get AI-powered investment suggestions in real time.

## 🔍 Features

- ✅ **Track your stocks** with live price updates (powered by Finnhub)
- 🤖 **AI-powered advice** using OpenAI (GPT-3.5) — get custom buy/hold/sell suggestions based on your holdings
- 📰 **AI-based stock discovery** — reads real news headlines and recommends new stocks worth watching
- 📊 **Portfolio summary** — total value, gains/losses, and an AI-written recap of your portfolio’s performance
- 🔎 **Auto-suggest search** — find stocks quickly with smart ticker search
- ✨ **Auto-fill buy price** — auto-fills live price when adding a stock
- 🧠 Built with **MongoDB, Express, React (Next.js), and Node.js**

---

## 🧪 Tech Stack

- **Frontend**: React + Next.js + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas
- **APIs**:
  - [OpenAI GPT-3.5](https://platform.openai.com/)
  - [Finnhub Stock API](https://finnhub.io/)
- **Hosting**: Vercel (frontend) + Render (backend)

---

## 🚀 Live Demo

👉 [Click here to try it out](https://your-vercel-url.com)

---

## 🛠 Setup Instructions

1. Clone the repo:
 ```
   git clone https://github.com/martinzukowski/stock-ai-app.git
   cd stock-ai-app
```

2. Set up the backend:
```
   cd server
   npm install
```
   Then create a .env file inside the /server folder and paste your keys like this:
```
   MONGO_URI=your_mongodb_connection_string
   OPENAI_API_KEY=your_openai_key
   FINNHUB_API_KEY=your_finnhub_key
```
   Start the backend:

```   npm run dev```

3. Set up the frontend:
```
   cd ../client
   npm install
   npm run dev
```
4. Open your browser:

   Visit http://localhost:3000 to view the app.
