import React, { useState, useMemo } from 'react';
import { ChevronDown, Loader, AlertCircle, Copy, CheckCircle } from 'lucide-react';

// ============================================================================
// MOCK DATA - FMCG/CPG Database Simulation
// ============================================================================

const DISTRIBUTORS = Array.from({ length: 60 }, (_, i) => ({
  distributor_id: `D${String(i + 1).padStart(3, '0')}`,
  name: [
    'Metro Wholesale', 'Prabhat Distribution', 'Apollo Retail', 'VizHub Corp',
    'Summit Logistics', 'Zenith Partners', 'Crown Distribution', 'Elite Supply',
    'Nexus Trade', 'Prime Commerce', 'Velocity Traders', 'Quantum Retail',
    'Phoenix Logistics', 'Nova Networks', 'Titan Trade', 'Apex Commerce',
    'Galaxy Distributors', 'Stellar Supply', 'Zenith Retail', 'Echo Commerce'
  ][i % 20],
  region: ['North', 'South', 'East', 'West', 'Central'][i % 5],
  active_status: i % 8 === 0 ? 'Inactive' : 'Active'
}));

const SKU_MASTER = [
  { sku_id: 'SKU-101', product_name: 'Premium Cola 2L', category: 'Beverage', mrp: 120, case_size: 12 },
  { sku_id: 'SKU-102', product_name: 'Orange Juice 1L', category: 'Beverage', mrp: 95, case_size: 12 },
  { sku_id: 'SKU-103', product_name: 'Water Bottle 500ml', category: 'Beverage', mrp: 45, case_size: 24 },
  { sku_id: 'SKU-201', product_name: 'Snack Chips 50g', category: 'Snacks', mrp: 35, case_size: 48 },
  { sku_id: 'SKU-202', product_name: 'Chocolate Bar 40g', category: 'Snacks', mrp: 50, case_size: 36 },
  { sku_id: 'SKU-203', product_name: 'Biscuit Pack 200g', category: 'Snacks', mrp: 65, case_size: 24 },
  { sku_id: 'SKU-301', product_name: 'Shampoo 200ml', category: 'Personal Care', mrp: 180, case_size: 12 },
  { sku_id: 'SKU-302', product_name: 'Toothpaste 100g', category: 'Personal Care', mrp: 75, case_size: 24 },
  { sku_id: 'SKU-303', product_name: 'Soap Bar 125g', category: 'Personal Care', mrp: 40, case_size: 48 },
  { sku_id: 'SKU-401', product_name: 'Detergent 1kg', category: 'Home Care', mrp: 220, case_size: 12 },
];

const INVENTORY_LEVELS = Array.from({ length: 200 }, (_, i) => {
  const dist = DISTRIBUTORS[i % DISTRIBUTORS.length];
  const sku = SKU_MASTER[i % SKU_MASTER.length];
  return {
    distributor_id: dist.distributor_id,
    sku_id: sku.sku_id,
    stock_cases: Math.floor(Math.random() * 500),
    days_of_cover: Math.floor(Math.random() * 30),
    last_replenished: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };
});

const ROUTE_EXECUTION = Array.from({ length: 150 }, (_, i) => ({
  rep_id: `REP-${String(i + 1).padStart(3, '0')}`,
  rep_name: ['Rajesh Kumar', 'Priya Singh', 'Amit Patel', 'Sneha Sharma', 'Vikram Joshi'][i % 5],
  date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  planned_visits: Math.floor(Math.random() * 15) + 5,
  actual_visits: Math.floor(Math.random() * 15) + 2,
  productive_calls: Math.floor(Math.random() * 10) + 1
}));

// ============================================================================
// QUERY TRANSLATION & EXECUTION LAYER
// ============================================================================

const SUGGESTED_QUERIES = [
  "Which distributors in the North region have less than 3 Days of Cover for SKU-101?",
  "Show me sales reps with a strike rate (productive calls / actual visits) below 40% this week.",
  "List all active distributors out of stock for the Beverage category."
];

const translateQueryToSQL = (query) => {
  const normalized = query.toLowerCase();
  
  if (normalized.includes('north') && normalized.includes('days of cover') && normalized.includes('sku-101')) {
    return {
      sql: `SELECT d.distributor_id, d.name, d.region, i.sku_id, i.days_of_cover 
            FROM distributors d 
            JOIN inventory_levels i ON d.distributor_id = i.distributor_id 
            WHERE d.region = 'North' AND i.days_of_cover < 3 AND i.sku_id = 'SKU-101'`,
      type: 'inventory_low_stock'
    };
  }
  
  if (normalized.includes('strike rate') && normalized.includes('productive calls')) {
    return {
      sql: `SELECT rep_id, rep_name, date, actual_visits, productive_calls, 
            ROUND(100.0 * productive_calls / actual_visits, 1) as strike_rate_percent
            FROM route_execution 
            WHERE ROUND(100.0 * productive_calls / actual_visits, 1) < 40 
            ORDER BY strike_rate_percent ASC`,
      type: 'rep_performance'
    };
  }
  
  if (normalized.includes('active distributors') && normalized.includes('out of stock') && normalized.includes('beverage')) {
    return {
      sql: `SELECT DISTINCT d.distributor_id, d.name, d.region, s.category
            FROM distributors d 
            JOIN inventory_levels i ON d.distributor_id = i.distributor_id 
            JOIN sku_master s ON i.sku_id = s.sku_id 
            WHERE d.active_status = 'Active' AND i.stock_cases = 0 AND s.category = 'Beverage'`,
      type: 'stockout_active'
    };
  }
  
  return null;
};

const executeQuery = (queryType) => {
  switch (queryType) {
    case 'inventory_low_stock':
      const northLowStock = [];
      INVENTORY_LEVELS.forEach(inv => {
        if (inv.days_of_cover < 3 && inv.sku_id === 'SKU-101') {
          const dist = DISTRIBUTORS.find(d => d.distributor_id === inv.distributor_id);
          if (dist && dist.region === 'North') {
            northLowStock.push({
              distributor_id: inv.distributor_id,
              name: dist.name,
              region: dist.region,
              sku_id: inv.sku_id,
              days_of_cover: inv.days_of_cover
            });
          }
        }
      });
      return northLowStock;
      
    case 'rep_performance':
      const repMetrics = ROUTE_EXECUTION.map(r => ({
        ...r,
        strike_rate_percent: r.actual_visits > 0 ? Math.round(100 * r.productive_calls / r.actual_visits * 10) / 10 : 0
      })).filter(r => r.strike_rate_percent < 40)
        .sort((a, b) => a.strike_rate_percent - b.strike_rate_percent);
      return repMetrics;
      
    case 'stockout_active':
      const stockoutResults = [];
      const processedDists = new Set();
      
      INVENTORY_LEVELS.forEach(inv => {
        if (inv.stock_cases === 0) {
          const dist = DISTRIBUTORS.find(d => d.distributor_id === inv.distributor_id);
          const sku = SKU_MASTER.find(s => s.sku_id === inv.sku_id);
          
          if (dist && sku && dist.active_status === 'Active' && sku.category === 'Beverage') {
            const key = `${dist.distributor_id}-${sku.category}`;
            if (!processedDists.has(key)) {
              stockoutResults.push({
                distributor_id: dist.distributor_id,
                name: dist.name,
                region: dist.region,
                category: sku.category
              });
              processedDists.add(key);
            }
          }
        }
      });
      return stockoutResults;
      
    default:
      return [];
  }
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

const QueryInput = ({ onQuery }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (text) => {
    if (text.trim()) {
      onQuery(text);
      setInput('');
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    setTimeout(() => handleSubmit(suggestion), 0);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit(input)}
          placeholder="Ask a business question about your DMS data..."
          className="w-full px-4 py-3 bg-zinc-900 border border-cyan-500/30 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all font-mono text-sm"
        />
        <button
          onClick={() => handleSubmit(input)}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded transition-colors"
        >
          Generate
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Suggested Queries</p>
        <div className="grid gap-2">
          {SUGGESTED_QUERIES.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-left px-3 py-2 bg-zinc-950 border border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-900/80 rounded text-xs text-zinc-300 hover:text-amber-300 transition-all duration-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const SQLCodeBlock = ({ sql }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-black/60 border border-zinc-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700/50 bg-zinc-950">
        <span className="text-xs font-mono text-zinc-500">SQL TRANSLATION</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-cyan-400 transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle size={14} />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="px-4 py-3 text-xs font-mono text-cyan-300 overflow-x-auto">
        {sql}
      </pre>
    </div>
  );
};

const ResultsTable = ({ data, columns }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-8 h-8 text-amber-500/40 mb-2" />
        <p className="text-sm text-zinc-400">Zero operational bottlenecks found for this query.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-zinc-700 rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-950 border-b border-zinc-700">
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-2 text-left text-xs font-semibold text-cyan-300 uppercase tracking-widest"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className={`border-b border-zinc-800 ${
                idx % 2 === 0 ? 'bg-zinc-950/50' : 'bg-zinc-900/30'
              } hover:bg-zinc-900/60 transition-colors`}
            >
              {columns.map((col) => (
                <td key={`${idx}-${col}`} className="px-4 py-2 text-zinc-300 font-mono text-xs">
                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-700 text-xs text-zinc-500">
        {data.length} row{data.length !== 1 ? 's' : ''} returned
      </div>
    </div>
  );
};

const ResultsPanel = ({ goal, sql, results }) => {
  const [expandedSQL, setExpandedSQL] = useState(false);
  const columns = results.length > 0 ? Object.keys(results[0]) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* The Goal */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Business Objective</p>
        <div className="p-3 bg-gradient-to-r from-amber-600/10 to-transparent border border-amber-600/30 rounded-lg">
          <p className="text-sm text-amber-100">{goal}</p>
        </div>
      </div>

      {/* The Engine */}
      <div className="space-y-2">
        <button
          onClick={() => setExpandedSQL(!expandedSQL)}
          className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-widest font-semibold hover:text-zinc-300 transition-colors"
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${expandedSQL ? 'rotate-180' : ''}`}
          />
          Query Engine
        </button>
        {expandedSQL && <SQLCodeBlock sql={sql} />}
      </div>

      {/* The Result */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Query Results</p>
        <ResultsTable data={results} columns={columns} />
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  const [queryState, setQueryState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleQuery = (query) => {
    setLoading(true);
    setError(null);

    setTimeout(() => {
      const translation = translateQueryToSQL(query);

      if (!translation) {
        setError("The agent couldn't map that request to the current DMS schema. Try asking about Inventory, Route Execution, or SKUs.");
        setLoading(false);
        return;
      }

      const results = executeQuery(translation.type);
      setQueryState({
        goal: query,
        sql: translation.sql,
        results
      });
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-blue-950/10 to-zinc-950">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500/5 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Main container */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12 space-y-2">
          <div className="flex items-baseline gap-3">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              DMS <span className="text-cyan-400">Intelligence</span>
            </h1>
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Agent v1.0</span>
          </div>
          <p className="text-sm text-zinc-400">Natural language interface to live distributor and route execution data</p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel - Input */}
          <div className="lg:col-span-1">
            <div className="sticky top-12 space-y-8">
              <QueryInput onQuery={handleQuery} />
            </div>
          </div>

          {/* Right panel - Results */}
          <div className="lg:col-span-2">
            {loading && (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <Loader size={32} className="text-cyan-500 animate-spin" />
                <p className="text-sm text-zinc-400">Translating business logic to SQL...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-950/30 border border-red-600/40 rounded-lg flex gap-3">
                <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {queryState && !loading && (
              <ResultsPanel
                goal={queryState.goal}
                sql={queryState.sql}
                results={queryState.results}
              />
            )}

            {!queryState && !loading && !error && (
              <div className="py-24 text-center space-y-2">
                <p className="text-sm text-zinc-500">Query results will appear here</p>
                <p className="text-xs text-zinc-600">Use the input panel to ask about your DMS data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
