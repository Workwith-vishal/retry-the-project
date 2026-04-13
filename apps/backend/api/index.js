import initSqlJs from "sql.js";
import { randomUUID } from "node:crypto";

let db = null;
let dbReady = null;

const initDB = async () => {
  if (db) return db;
  if (dbReady) return dbReady;

  dbReady = (async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();
    
    db.run(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      
      CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        file_name TEXT,
        uploaded_at TEXT NOT NULL,
        row_count INTEGER NOT NULL,
        column_count INTEGER NOT NULL,
        columns_json TEXT NOT NULL,
        rows_json TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        sql_text TEXT,
        chart_json TEXT,
        insights_json TEXT,
        created_at TEXT NOT NULL
      );
    `);
    
    return db;
  })();
  
  return dbReady;
};

const getCurrentDatasetId = () => {
  const result = db.exec("SELECT value FROM meta WHERE key = 'current_dataset_id'");
  return result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : null;
};

const setCurrentDatasetId = (id) => {
  db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('current_dataset_id', ?)", [id]);
};

const getDatasetById = (id) => {
  const result = db.exec("SELECT * FROM datasets WHERE id = ?", [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  
  const row = result[0].values[0];
  const columns = result[0].columns;
  return {
    id: row[columns.indexOf("id")],
    name: row[columns.indexOf("name")],
    sourceType: row[columns.indexOf("source_type")],
    fileName: row[columns.indexOf("file_name")],
    uploadedAt: row[columns.indexOf("uploaded_at")],
    rowCount: row[columns.indexOf("row_count")],
    columnCount: row[columns.indexOf("column_count")],
    columns: JSON.parse(row[columns.indexOf("columns_json")]),
    rows: JSON.parse(row[columns.indexOf("rows_json")]),
  };
};

const getChatMessages = (datasetId) => {
  const result = db.exec("SELECT * FROM chat_messages WHERE dataset_id = ? ORDER BY created_at ASC", [datasetId]);
  if (result.length === 0) return [];
  
  const rows = result[0].values;
  const cols = result[0].columns;
  return rows.map(row => ({
    id: row[cols.indexOf("id")],
    role: row[cols.indexOf("role")],
    content: row[cols.indexOf("content")],
    sql: row[cols.indexOf("sql_text")] || undefined,
    chart: row[cols.indexOf("chart_json")] ? JSON.parse(row[cols.indexOf("chart_json")]) : undefined,
    insights: row[cols.indexOf("insights_json")] ? JSON.parse(row[cols.indexOf("insights_json")]) : [],
    timestamp: row[cols.indexOf("created_at")],
  }));
};

const normalizeColumns = (rows, columns) => {
  if (columns.length > 0) {
    return columns.map((col) => ({
      name: col.name || col,
      type: col.type || typeof rows[0]?.[col.name || col] || "string",
      sample: rows.slice(0, 5).map((row) => row[col.name || col]).filter((v) => v !== undefined && v !== null),
    }));
  }
  if (rows.length === 0) return [];
  const firstRow = rows[0];
  const columnNames = Object.keys(firstRow);
  return columnNames.map((name) => ({
    name,
    type: typeof firstRow[name],
    sample: rows.slice(0, 5).map((row) => row[name]).filter((v) => v !== undefined && v !== null),
  }));
};

const generateDemoDataset = () => {
  const regions = ["North", "South", "East", "West", "Central"];
  const products = ["Widget A", "Widget B", "Gadget X", "Gadget Y", "Service Z"];
  const channels = ["Online", "Retail", "Wholesale", "Direct"];
  const rows = [];
  for (let i = 0; i < 100; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const baseRevenue = product.includes("Widget") ? 5000 : product.includes("Gadget") ? 8000 : 3000;
    const revenue = Math.round((baseRevenue + Math.random() * 5000) * 100) / 100;
    const units = Math.floor(50 + Math.random() * 450);
    const profitMargin = 0.2 + Math.random() * 0.4;
    rows.push({
      Region: region,
      Product: product,
      Channel: channel,
      Revenue: revenue,
      Units: units,
      ProfitMargin: Math.round(profitMargin * 100) / 100,
      Date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split("T")[0],
    });
  }
  return { name: "Sales Performance Dataset", fileName: null, sourceType: "demo", columns: normalizeColumns(rows, []), rows };
};

const buildDatasetSchema = (dataset) => {
  const numericColumns = dataset.columns.filter((col) => ["number", "integer", "float", "double"].includes(col.type));
  const categoricalColumns = dataset.columns.filter((col) => !numericColumns.includes(col));
  const dateColumns = dataset.columns.filter((col) => col.type === "date" || /date/i.test(col.name));
  return {
    columns: dataset.columns.map((col) => ({
      name: col.name, type: col.type,
      uniqueValues: new Set(dataset.rows.map((row) => String(row[col.name]))).size,
      nullCount: dataset.rows.filter((row) => row[col.name] === null || row[col.name] === undefined).length,
    })),
    numericColumns: numericColumns.map((c) => c.name),
    categoricalColumns: categoricalColumns.map((c) => c.name),
    dateColumns: dateColumns.map((c) => c.name),
    totalRows: dataset.rowCount,
    totalColumns: dataset.columns.length,
  };
};

const computeStats = (values) => {
  const nums = values.filter((v) => typeof v === "number" && !isNaN(v));
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const sum = nums.reduce((acc, val) => acc + val, 0);
  const mean = sum / nums.length;
  const median = nums.length % 2 === 0 ? (sorted[nums.length / 2 - 1] + sorted[nums.length / 2]) / 2 : sorted[Math.floor(nums.length / 2)];
  const variance = nums.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / nums.length;
  return { mean: Math.round(mean * 100) / 100, median, stdDev: Math.round(Math.sqrt(variance) * 100) / 100, min: sorted[0], max: sorted[sorted.length - 1] };
};

const createChatResponse = (ds, query) => {
  const lowerQuery = query.toLowerCase();
  const schema = buildDatasetSchema(ds);

  if (/average|mean|avg/i.test(lowerQuery)) {
    const numericCols = schema.numericColumns;
    if (numericCols.length > 0) {
      const targetCol = numericCols.find((c) => lowerQuery.includes(c.toLowerCase())) || numericCols[0];
      const stats = computeStats(ds.rows.map((r) => r[targetCol]));
      return { content: `The average ${targetCol} is ${stats?.mean || 0}.`, chart: { type: "bar", data: { labels: ["Average", "Median"], datasets: [{ label: targetCol, data: [stats?.mean || 0, stats?.median || 0] }] } }, insights: [{ metric: `Average ${targetCol}`, value: stats?.mean || 0 }] };
    }
  }
  if (/sum|total/i.test(lowerQuery)) {
    const numericCols = schema.numericColumns;
    if (numericCols.length > 0) {
      const targetCol = numericCols.find((c) => lowerQuery.includes(c.toLowerCase())) || numericCols[0];
      const total = ds.rows.reduce((acc, row) => acc + (Number(row[targetCol]) || 0), 0);
      return { content: `The total ${targetCol} is ${total.toLocaleString()}.`, chart: { type: "bar", data: { labels: ["Total"], datasets: [{ label: targetCol, data: [total] }] } }, insights: [{ metric: `Total ${targetCol}`, value: total }] };
    }
  }
  if (/category|group|breakdown/i.test(lowerQuery)) {
    const catCols = schema.categoricalColumns;
    if (catCols.length > 0) {
      const targetCol = catCols[0];
      const counts = {};
      ds.rows.forEach((row) => { const val = String(row[targetCol]); counts[val] = (counts[val] || 0) + 1; });
      const labels = Object.keys(counts);
      return { content: `Breakdown by ${targetCol}: ${labels.map((l) => `${l} (${counts[l]})`).join(", ")}.`, chart: { type: "doughnut", data: { labels, datasets: [{ label: targetCol, data: Object.values(counts) }] } }, insights: labels.slice(0, 3).map((l) => ({ metric: l, value: counts[l] })) };
    }
  }
  return { content: `Dataset has ${ds.rowCount} rows and ${ds.columns.length} columns.`, chart: null, insights: [] };
};

const generateCorrelationAnalysis = (ds) => {
  const numericCols = ds.columns.filter((c) => ["number", "integer", "float", "double"].includes(c.type));
  const correlations = [];
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const values1 = ds.rows.map((r) => r[numericCols[i].name]).filter((v) => typeof v === "number");
      const values2 = ds.rows.map((r) => r[numericCols[j].name]).filter((v) => typeof v === "number");
      const minLen = Math.min(values1.length, values2.length);
      if (minLen > 2) {
        const x = values1.slice(0, minLen);
        const y = values2.slice(0, minLen);
        const xMean = x.reduce((a, b) => a + b, 0) / x.length;
        const yMean = y.reduce((a, b) => a + b, 0) / y.length;
        const numerator = x.reduce((acc, xi, i) => acc + (xi - xMean) * (y[i] - yMean), 0);
        const denominator = Math.sqrt(x.reduce((acc, xi) => acc + Math.pow(xi - xMean, 2), 0) * y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0));
        const coefficient = denominator === 0 ? 0 : numerator / denominator;
        let strength = Math.abs(coefficient) > 0.7 ? "strong" : Math.abs(coefficient) > 0.4 ? "moderate" : "weak";
        correlations.push({ column1: numericCols[i].name, column2: numericCols[j].name, coefficient: Math.round(coefficient * 1000) / 1000, strength, interpretation: coefficient > 0.5 ? "Positive correlation" : coefficient < -0.5 ? "Negative correlation" : "Weak correlation", sampleSize: minLen });
      }
    }
  }
  return { correlations: correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)), summary: `Found ${correlations.length} pairs.`, hasGemini: false };
};

const sendJson = (statusCode, payload, headers = {}) => {
  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS", ...headers },
  });
};

const readJsonBody = async (request) => {
  try { const text = await request.text(); return text ? JSON.parse(text) : {}; } catch { return {}; }
};

export async function GET(request) {
  await initDB();
  const url = new URL(request.url);
  const pathname = url.pathname;
  if (pathname === "/api/health") return sendJson(200, { status: "ok", database: "SQLite" });
  if (pathname === "/api/state") {
    const currentDatasetId = getCurrentDatasetId();
    return sendJson(200, { dataset: currentDatasetId ? getDatasetById(currentDatasetId) : null, chatMessages: currentDatasetId ? getChatMessages(currentDatasetId) : [] });
  }
  const schemaMatch = pathname.match(/^\/api\/datasets\/([^/]+)\/schema$/);
  if (schemaMatch) { const ds = getDatasetById(schemaMatch[1]); return ds ? sendJson(200, { schema: buildDatasetSchema(ds) }) : sendJson(404, { error: "Not found" }); }
  const aiCorrMatch = pathname.match(/^\/api\/datasets\/([^/]+)\/ai-correlations$/);
  if (aiCorrMatch) { const ds = getDatasetById(aiCorrMatch[1]); return ds ? sendJson(200, generateCorrelationAnalysis(ds)) : sendJson(404, { error: "Not found" }); }
  return sendJson(404, { error: "Route not found" });
}

export async function POST(request) {
  await initDB();
  const pathname = new URL(request.url).pathname;
  const body = await readJsonBody(request);
  
  if (pathname === "/api/datasets/demo") {
    const demo = generateDemoDataset();
    const id = randomUUID();
    db.run("INSERT INTO datasets VALUES (?,?,?,?,?,?,?,?,?)", [id, demo.name, demo.sourceType, demo.fileName, new Date().toISOString(), demo.rows.length, demo.columns.length, JSON.stringify(demo.columns), JSON.stringify(demo.rows)]);
    setCurrentDatasetId(id);
    return sendJson(201, { dataset: getDatasetById(id), chatMessages: [] });
  }
  
  if (pathname === "/api/datasets/import") {
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) return sendJson(400, { error: "Dataset must contain at least one row" });
    const columns = normalizeColumns(rows, Array.isArray(body.columns) ? body.columns : []);
    const id = randomUUID();
    db.run("INSERT INTO datasets VALUES (?,?,?,?,?,?,?,?,?)", [id, body.name || "Uploaded Dataset", body.sourceType || "upload", body.fileName || null, new Date().toISOString(), rows.length, columns.length, JSON.stringify(columns), JSON.stringify(rows)]);
    setCurrentDatasetId(id);
    return sendJson(201, { dataset: getDatasetById(id), chatMessages: [] });
  }
  
  const chatMatch = pathname.match(/^\/api\/datasets\/([^/]+)\/chat$/);
  if (chatMatch) {
    const ds = getDatasetById(chatMatch[1]);
    if (!ds) return sendJson(404, { error: "Dataset not found" });
    const query = String(body.query || "").trim();
    if (!query) return sendJson(400, { error: "Query is required" });
    const analysis = createChatResponse(ds, query);
    const now = new Date().toISOString();
    const userId = randomUUID();
    const assistantId = randomUUID();
    db.run("INSERT INTO chat_messages VALUES (?,?,?,?,?,?,?,?)", [userId, chatMatch[1], "user", query, null, null, null, now]);
    db.run("INSERT INTO chat_messages VALUES (?,?,?,?,?,?,?,?)", [assistantId, chatMatch[1], "assistant", analysis.content, analysis.sql || null, analysis.chart ? JSON.stringify(analysis.chart) : null, JSON.stringify(analysis.insights), now]);
    return sendJson(201, { userMessage: { id: userId, role: "user", content: query, timestamp: now }, assistantMessage: { id: assistantId, role: "assistant", content: analysis.content, chart: analysis.chart, insights: analysis.insights, timestamp: now } });
  }
  return sendJson(404, { error: "Route not found" });
}

export async function PATCH(request) {
  await initDB();
  const pathname = new URL(request.url).pathname;
  const body = await readJsonBody(request);
  const rowMatch = pathname.match(/^\/api\/datasets\/([^/]+)\/rows\/([^/]+)$/);
  if (rowMatch) {
    const ds = getDatasetById(rowMatch[1]);
    if (!ds) return sendJson(404, { error: "Dataset not found" });
    const rowId = Number(rowMatch[2]);
    if (ds.rows[rowId]) {
      ds.rows[rowId] = { ...ds.rows[rowId], [body.column]: body.value };
      db.run("UPDATE datasets SET rows_json = ? WHERE id = ?", [JSON.stringify(ds.rows), rowMatch[1]]);
      return sendJson(200, { dataset: getDatasetById(rowMatch[1]) });
    }
    return sendJson(404, { error: "Row not found" });
  }
  return sendJson(404, { error: "Route not found" });
}
