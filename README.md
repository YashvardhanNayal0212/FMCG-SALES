# FMCG Sales Director Intelligence Agent MVP

A natural language interface for querying live Distributor Management System (DMS) and Sales Force Automation (SFA) data.

## Quick Start (Local Development)

### Prerequisites
- Node.js 16+ installed
- npm (comes with Node.js)

### Setup

1. **Install dependencies**
```bash
npm install
```

2. **Create `.env` file**
```bash
cp .env.example .env
```
Add your OpenAI key in `.env`:
```env
OPENAI_API_KEY=your_key_here
```

3. **Start frontend development server**
```bash
npm run dev
```

4. **Open in browser**
Navigate to `http://localhost:5173`

For local API testing with `api/translate.js`, run with Vercel CLI:
```bash
vercel dev
```

## How to Use

1. **Ask a question** in the input field or click a suggested query
2. **Wait for translation** (simulated LLM converts English to SQL)
3. **View results** in three tiers:
   - Business Objective (your question)
   - Query Engine (the SQL generated)
   - Query Results (data table)

### Example Queries

- "Which distributors in the North region have less than 3 Days of Cover for SKU-101?"
- "Show me sales reps with a strike rate (productive calls / actual visits) below 40% this week."
- "List all active distributors out of stock for the Beverage category."

## Build for Production

```bash
npm run build
```

Creates optimized `dist/` folder ready for deployment.

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to vercel.com → Sign in with GitHub
3. Click "Add New Project" → Select this repo
4. Add Environment Variable in Vercel:
   - `OPENAI_API_KEY=your_key_here`
5. Click "Deploy"

Your app will be live in seconds.

## Project Structure

```
fmcg-agent/
├── src/
│   ├── App.jsx          (Main component with mock data & logic)
│   ├── main.jsx         (React entry point)
│   └── index.css        (Tailwind imports)
├── index.html           (HTML entry point)
├── package.json         (Dependencies)
├── vite.config.js       (Vite config)
├── tailwind.config.js   (Tailwind config)
└── postcss.config.js    (PostCSS config)
```

## Tech Stack

- **Frontend:** React 18 + Hooks
- **Styling:** Tailwind CSS
- **Build Tool:** Vite
- **Icons:** Lucide React
- **Backend API:** Vercel Serverless Function + OpenAI API
- **Database:** Mock client-side JSON (results execution still local for MVP)

## Features

✅ Natural language query input
✅ LLM-powered query translation via OpenAI API key
✅ Client-side SQL execution against mock data
✅ Enterprise-grade dark UI with cyan accents
✅ Collapsible SQL code blocks
✅ Responsive data tables
✅ Error handling & graceful fallbacks
✅ <4 second end-to-end latency

## Future Enhancements

- Add backend database (PostgreSQL)
- Implement user authentication
- Add query history & saved queries
- Export results to CSV/Excel

## License

MIT
