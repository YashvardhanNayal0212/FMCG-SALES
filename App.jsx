import React, { useState } from 'react';
import { ChevronDown, Loader, AlertCircle, Copy, CheckCircle, Terminal, Database, Play, Search } from 'lucide-react';

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

// Guaranteed matching rows for the "North region SKU-101 < 3 Days of Cover" query
INVENTORY_LEVELS.push(
  {
    distributor_id: 'D001',
    sku_id: 'SKU-101',
    stock_cases: 5,
    days_of_cover: 1, 
    last_replenished: '2026-05-25'
  },
  {
    distributor_id: 'D006', 
    sku_id: 'SKU-101',
    stock_cases: 12,
    days_of_cover: 2, 
    last_replenished: '2026-05-26'
  }
);

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
      sql: `SELECT \n  d.distributor_id, \n  d.name, \n  d.region, \n  i.sku_id, \n  i.days_of_cover \nFROM distributors d \nJOIN inventory_levels i ON d.distributor_id = i.distributor_id \nWHERE d.region = 'North' \n  AND i.days_of_cover < 3 \n  AND i.sku_id = 'SKU-101'`,
      type: 'inventory_low_stock'
    };
  }
  
  if (normalized.includes('strike rate') && normalized.includes('productive calls')) {
    return {
      sql: `SELECT \n  rep_id, \n  rep_name, \n  date, \n  actual_visits, \n  productive_calls, \n  ROUND(100.0 * productive_calls / actual_visits, 1) as strike_rate_percent\nFROM route_execution \nWHERE ROUND(100.0 * productive_calls / actual_visits, 1) < 40 \nORDER BY strike_rate_percent ASC`,
      type: 'rep_performance'
    };
  }
  
  if (normalized.includes('active distributors') && normalized.includes('out of stock') && normalized.includes('beverage')) {
    return {
      sql: `SELECT DISTINCT \n  d.distributor_id, \n  d.name, \n  d.region, \n  s.category\nFROM distributors d \nJOIN inventory_levels i ON d.distributor_id = i.distributor_id \nJOIN sku_master s ON i.sku_id = s.sku_id \nWHERE d.active_status = 'Active' \n  AND i.stock_cases = 0 \n  AND s.category = 'Beverage'`,
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
    <div className="space-y-6">
      <div className="relative flex items-center shadow-sm rounded-lg">
        <div className="absolute left-4 text-slate-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit(input)}
          placeholder="Ask a business question about your DMS data..."
          className="w-full pl-11 pr-32 py-3.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium"
        />
        <button
          onClick={() => handleSubmit(input)}
          className="absolute right-2 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
        >
          Execute
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Terminal size={14} />
          <span>Suggested Queries</span>
        </div>
        <div className="grid gap-2">
          {SUGGESTED_QUERIES.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-left px-4 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-900 rounded-lg text-sm text-slate-600 transition-all duration-200 leading-relaxed font-medium shadow-sm"
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
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Database size={14} />
          <span>Generated SQL</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-[13px] font-mono leading-relaxed text-indigo-300">
          {sql}
        </pre>
      </div>
    </div>
  );
};

const ResultsTable = ({ data, columns }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
        <AlertCircle className="w-8 h-8 text-slate-400 mb-3" />
        <p className="text-sm font-semibold text-slate-900">No operational bottlenecks found.</p>
        <p className="text-sm text-slate-500 mt-1">The query executed successfully but returned zero rows.</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide