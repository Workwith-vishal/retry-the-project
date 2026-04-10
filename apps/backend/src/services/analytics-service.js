const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const preferredNumericColumns = ["salary_usd", "salary", "compensation", "income", "pay", "revenue", "sales", "amount", "units_sold", "units", "profit_margin", "customer_rating"];
const preferredDimensionColumns = ["month", "date", "category", "region", "segment", "country", "education", "company_size"];
const nonAdditiveMetricHints = ["margin", "rate", "ratio", "percent", "percentage", "rating", "score", "mark", "marks", "grade", "gpa", "cgpa"];
const branchMinimumGroupCount = 2;

const toNumber = (value) => {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const inferType = (values) => {
  const sample = values.filter(Boolean).slice(0, 20);
  if (sample.length === 0) return "string";
  if (sample.every((value) => !Number.isNaN(Number(value)))) return "number";
  if (sample.every((value) => !Number.isNaN(Date.parse(value)))) return "date";
  return "string";
};

export const normalizeColumns = (rows, providedColumns = []) => {
  if (providedColumns.length > 0) {
    return providedColumns.map((column) => ({
      name: column.name,
      type: column.type || inferType(rows.slice(0, 20).map((row) => String(row[column.name] ?? ""))),
      sample: Array.isArray(column.sample) ? column.sample.map((value) => String(value)) : [],
    }));
  }

  const fields = Object.keys(rows[0] || {});
  return fields.map((name) => ({
    name,
    type: inferType(rows.slice(0, 20).map((row) => String(row[name] ?? ""))),
    sample: rows.slice(0, 3).map((row) => String(row[name] ?? "")),
  }));
};

export const generateDemoDataset = () => {
  const categories = ["Electronics", "Clothing", "Food", "Software", "Services"];
  const regions = ["North", "South", "East", "West"];
  const rows = [];

  for (let index = 0; index < 200; index += 1) {
    rows.push({
      month: months[Math.floor(Math.random() * months.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      region: regions[Math.floor(Math.random() * regions.length)],
      revenue: Math.floor(Math.random() * 50000) + 5000,
      units_sold: Math.floor(Math.random() * 500) + 10,
      profit_margin: Number((Math.random() * 0.4 + 0.1).toFixed(2)),
      customer_rating: Number((Math.random() * 2 + 3).toFixed(1)),
    });
  }

  return {
    name: "Sales Analytics 2024",
    sourceType: "demo",
    fileName: "sales-analytics-2024.json",
    columns: [
      { name: "month", type: "string", sample: months.slice(0, 3) },
      { name: "category", type: "string", sample: categories.slice(0, 3) },
      { name: "region", type: "string", sample: regions.slice(0, 3) },
      { name: "revenue", type: "number", sample: ["25000", "18000", "32000"] },
      { name: "units_sold", type: "number", sample: ["150", "230", "89"] },
      { name: "profit_margin", type: "number", sample: ["0.25", "0.18", "0.32"] },
      { name: "customer_rating", type: "number", sample: ["4.2", "3.8", "4.7"] },
    ],
    rows,
  };
};

const humanize = (value) =>
  value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const pickPreferredColumn = (columns, preferredNames) => {
  for (const name of preferredNames) {
    const found = columns.find((column) => column.name === name);
    if (found) return found;
  }

  return columns[0];
};

const metricAggregationForColumn = (columnName) =>
  nonAdditiveMetricHints.some((hint) => columnName.toLowerCase().includes(hint)) ? "average" : "sum";

const sortLabels = (labels, columnType) => {
  const uniqueLabels = [...new Set(labels)];
  const monthIndex = new Map(months.map((month, index) => [month.toLowerCase(), index]));

  if (uniqueLabels.length > 0 && uniqueLabels.every((label) => monthIndex.has(String(label).toLowerCase()))) {
    return [...uniqueLabels].sort(
      (left, right) => (monthIndex.get(String(left).toLowerCase()) ?? 99) - (monthIndex.get(String(right).toLowerCase()) ?? 99),
    );
  }

  if (columnType === "date") {
    return [...uniqueLabels].sort((left, right) => Date.parse(left) - Date.parse(right));
  }

  return [...uniqueLabels].sort((left, right) => String(left).localeCompare(String(right)));
};

const toLabel = (value) => {
  if (value == null) return null;
  const label = String(value).trim();
  return label || null;
};

const normalizeText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizeGenderLabel = (label) => {
  const normalized = normalizeText(label);

  if (["m", "male", "man", "boy"].includes(normalized)) return "Male";
  if (["f", "female", "woman", "girl"].includes(normalized)) return "Female";
  if (["other", "others", "non binary", "nonbinary"].includes(normalized)) return "Other";

  return label;
};

const normalizeBoardLabel = (label) => {
  const normalized = normalizeText(label);

  if (normalized === "cbse") return "CBSE";
  if (normalized === "icse") return "ICSE";
  if (normalized === "igcse") return "IGCSE";
  if (normalized === "ib") return "IB";
  if (normalized === "state board" || normalized === "stateboard") return "State Board";

  return label;
};

const normalizeDimensionLabel = (columnName, value) => {
  const label = toLabel(value);
  if (!label) return null;

  const normalizedColumnName = normalizeText(columnName);
  if (normalizedColumnName.includes("gender")) {
    return normalizeGenderLabel(label);
  }
  if (normalizedColumnName.includes("board")) {
    return normalizeBoardLabel(label);
  }

  return label;
};

const isGreetingQuery = (query) => {
  const normalizedQuery = normalizeText(query);

  return /^(hello|hi|hey|hola|good morning|good afternoon|good evening)( there)?$/.test(normalizedQuery);
};

const singularizeWord = (word) => {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
};

const normalizeComparableText = (value) =>
  normalizeText(value)
    .split(" ")
    .filter(Boolean)
    .map(singularizeWord)
    .join(" ");

const includesPhrase = (source, phrase) => {
  if (!source || !phrase) return false;
  return (` ${source} `).includes(` ${phrase} `);
};

const isMeaningfulValue = (value) => {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
};

const prepareDatasetForAnalytics = (dataset) => {
  const numericColumns = dataset.columns.filter((column) => column.type === "number");
  const sanitizedRows = [];
  let removedEmptyRows = 0;
  let invalidNumericValues = 0;

  dataset.rows.forEach((row) => {
    const hasMeaningfulField = dataset.columns.some((column) => isMeaningfulValue(row[column.name]));
    if (!hasMeaningfulField) {
      removedEmptyRows += 1;
      return;
    }

    const nextRow = { ...row };
    numericColumns.forEach((column) => {
      const rawValue = row[column.name];
      const numericValue = toNumber(rawValue);

      if (numericValue == null) {
        if (isMeaningfulValue(rawValue)) {
          invalidNumericValues += 1;
        }
        nextRow[column.name] = null;
        return;
      }

      nextRow[column.name] = numericValue;
    });

    sanitizedRows.push(nextRow);
  });

  if (removedEmptyRows > 0 || invalidNumericValues > 0) {
    console.info("[analytics] integrity validation", {
      totalRows: dataset.rows.length,
      analyticsRows: sanitizedRows.length,
      removedEmptyRows,
      invalidNumericValues,
    });
  }

  return {
    ...dataset,
    rows: sanitizedRows,
    rowCount: sanitizedRows.length,
  };
};

const getMinimumGroupCount = (dimensionColumn) =>
  normalizeText(dimensionColumn.name).includes("branch") ? branchMinimumGroupCount : 1;

const filterGroupedEntries = (entries, dimensionColumn, metricColumn) => {
  const minimumGroupCount = getMinimumGroupCount(dimensionColumn);
  if (minimumGroupCount <= 1) {
    return entries;
  }

  const filteredEntries = entries.filter(([, entry]) => entry.count >= minimumGroupCount);
  const excludedGroups = entries.length - filteredEntries.length;

  if (excludedGroups > 0) {
    console.info("[analytics] group threshold validation", {
      dimension: dimensionColumn.name,
      metric: metricColumn?.name ?? "count",
      minimumGroupCount,
      excludedGroups,
    });
  }

  return filteredEntries;
};

const logAverageValidation = ({ metricName, dimensionName, includedValues, skippedInvalidValues, skippedEmptyLabels, groupCount }) => {
  console.info("[analytics] average validation", {
    metric: metricName,
    dimension: dimensionName,
    formula: "sum(values) / count(values)",
    includedValues,
    skippedInvalidValues,
    skippedEmptyLabels,
    groupCount,
  });
};

const groupMetricByDimension = (rows, dimensionColumn, metricColumn, aggregation = "sum") => {
  const grouped = new Map();
  let includedValues = 0;
  let skippedInvalidValues = 0;
  let skippedEmptyLabels = 0;

  rows.forEach((row) => {
    const label = normalizeDimensionLabel(dimensionColumn.name, row[dimensionColumn.name]);
    const value = toNumber(row[metricColumn.name]);

    if (!label) {
      skippedEmptyLabels += 1;
      return;
    }

    if (value == null) {
      skippedInvalidValues += 1;
      return;
    }

    const current = grouped.get(label) ?? { sum: 0, count: 0 };
    current.sum += value;
    current.count += 1;
    grouped.set(label, current);
    includedValues += 1;
  });

  const groupedEntries = filterGroupedEntries([...grouped.entries()], dimensionColumn, metricColumn);
  const series = sortLabels(groupedEntries.map(([label]) => label), dimensionColumn.type).map((label) => {
    const entry = grouped.get(label) ?? { sum: 0, count: 0 };
    const value = aggregation === "average" && entry.count > 0 ? entry.sum / entry.count : entry.sum;

    return {
      [dimensionColumn.name]: label,
      [metricColumn.name]: Number(value.toFixed(2)),
    };
  });

  if (aggregation === "average") {
    logAverageValidation({
      metricName: metricColumn.name,
      dimensionName: dimensionColumn.name,
      includedValues,
      skippedInvalidValues,
      skippedEmptyLabels,
      groupCount: series.length,
    });
  }

  return series;
};

const countRowsByDimension = (rows, dimensionColumn, valueKey = "count") => {
  const grouped = new Map();

  rows.forEach((row) => {
    const label = normalizeDimensionLabel(dimensionColumn.name, row[dimensionColumn.name]);
    if (!label) return;
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  });

  const groupedEntries = filterGroupedEntries(
    [...grouped.entries()].map(([label, count]) => [label, { count }]),
    dimensionColumn,
    null,
  );

  return sortLabels(groupedEntries.map(([label]) => label), dimensionColumn.type).map((label) => ({
    [dimensionColumn.name]: label,
    [valueKey]: grouped.get(label) ?? 0,
  }));
};

const countRowsMatchingValues = (rows, dimensionColumn, matchValues, valueKey = "count") => {
  const requestedValues = new Set(matchValues);
  const grouped = new Map(matchValues.map((value) => [value, 0]));

  rows.forEach((row) => {
    const label = normalizeDimensionLabel(dimensionColumn.name, row[dimensionColumn.name]);
    if (!label || !requestedValues.has(label)) return;
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  });

  return matchValues.map((value) => ({
    [dimensionColumn.name]: value,
    [valueKey]: grouped.get(value) ?? 0,
  }));
};

export const buildDatasetSchema = (dataset) => {
  const numericColumns = dataset.columns.filter((column) => column.type === "number");
  const dimensionColumns = dataset.columns.filter((column) => column.type !== "number");
  const primaryMetric = numericColumns.length > 0 ? pickPreferredColumn(numericColumns, preferredNumericColumns) : null;
  const remainingMetrics = numericColumns.filter((column) => column.name !== primaryMetric?.name);
  const secondaryMetric = remainingMetrics.length > 0 ? remainingMetrics[0] : null;
  const primaryDimension = dimensionColumns.length > 0 ? pickPreferredColumn(dimensionColumns, preferredDimensionColumns) : null;
  const secondaryDimension = dimensionColumns.find((column) => column.name !== primaryDimension?.name) ?? null;

  return {
    datasetName: dataset.name,
    rowCount: dataset.rowCount,
    columnCount: dataset.columns.length,
    columns: dataset.columns.map((column) => ({
      name: column.name,
      type: column.type,
      sample: column.sample ?? [],
      role: column.type === "number" ? "metric" : "dimension",
      aggregation: column.type === "number" ? metricAggregationForColumn(column.name) : null,
    })),
    primaryMetric,
    secondaryMetric,
    primaryDimension,
    secondaryDimension,
  };
};

const pickDimensionForQuery = (schema, queryLower) => {
  const dimensions = schema.columns.filter((column) => column.role === "dimension");
  return dimensions.find((column) => queryLower.includes(column.name.toLowerCase()))
    ?? schema.primaryDimension
    ?? schema.secondaryDimension
    ?? null;
};

const pickMetricForQuery = (schema, queryLower) => {
  const metrics = schema.columns.filter((column) => column.role === "metric");
  return metrics.find((column) => queryLower.includes(column.name.toLowerCase()))
    ?? schema.primaryMetric
    ?? schema.secondaryMetric
    ?? null;
};

const detectQueryValueFilter = (dataset, schema, normalizedQuery) => {
  const dimensions = schema.columns.filter((column) => column.role === "dimension");
  const comparableQuery = normalizeComparableText(normalizedQuery);

  for (const dimension of dimensions) {
    const values = new Set();

    for (const row of dataset.rows) {
      const label = normalizeDimensionLabel(dimension.name, row[dimension.name]);
      if (label) {
        values.add(label);
      }
      if (values.size >= 50) {
        break;
      }
    }

    const matches = [];

    for (const value of values) {
      const normalizedValue = normalizeText(value);
      const comparableValue = normalizeComparableText(value);
      if (!normalizedValue) {
        continue;
      }

      if (includesPhrase(normalizedQuery, normalizedValue) || includesPhrase(comparableQuery, comparableValue)) {
        matches.push(value);
      }
    }

    if (matches.length > 0) {
      return { dimension, values: [...new Set(matches)] };
    }
  }

  return null;
};

const buildAnalysisPlan = (dataset, schema, query) => {
  const queryLower = query.toLowerCase();
  const normalizedQuery = normalizeText(query);
  const dimension = pickDimensionForQuery(schema, queryLower);
  const metric = pickMetricForQuery(schema, queryLower);
  const valueFilter = detectQueryValueFilter(dataset, schema, normalizedQuery);
  const wantsCount = /\bhow many\b|\bcount\b|\bnumber of\b|\btotal people\b|\bpeople\b/.test(normalizedQuery);
  const mentionsMetric = schema.columns
    .filter((column) => column.role === "metric")
    .some((column) => includesPhrase(normalizedQuery, normalizeText(column.name)));

  if ((queryLower.includes("trend") || queryLower.includes("monthly") || queryLower.includes("over time")) && schema.primaryDimension) {
    const trendDimension = schema.columns.find((column) => column.name === schema.primaryDimension.name && (column.type === "date" || column.name === "month"))
      ?? schema.columns.find((column) => column.type === "date")
      ?? schema.columns.find((column) => column.name === "month")
      ?? schema.primaryDimension;

    return {
      mode: "metricByDimension",
      metric,
      dimension: trendDimension,
      aggregation: metric ? metricAggregationForColumn(metric.name) : "sum",
      chartType: trendDimension.type === "date" || trendDimension.name === "month" ? "area" : "line",
      intent: "trend",
    };
  }

  if (wantsCount && valueFilter) {
    return {
      mode: "countMatchingValues",
      dimension: valueFilter.dimension,
      matchValues: valueFilter.values,
      chartType: "bar",
      intent: "count-filter",
    };
  }

  if (valueFilter && !mentionsMetric) {
    return {
      mode: "countMatchingValues",
      dimension: valueFilter.dimension,
      matchValues: valueFilter.values,
      chartType: "bar",
      intent: "value-filter",
    };
  }

  if (wantsCount && dimension) {
    return {
      mode: "countByDimension",
      dimension,
      chartType: "pie",
      intent: "count",
    };
  }

  if (dimension && metric) {
    return {
      mode: "metricByDimension",
      metric,
      dimension,
      aggregation: queryLower.includes("average") || queryLower.includes("avg")
        ? "average"
        : metricAggregationForColumn(metric.name),
      chartType: queryLower.includes("pie") ? "pie" : "bar",
      intent: "breakdown",
    };
  }

  if (dimension) {
    return {
      mode: "countByDimension",
      dimension,
      chartType: "pie",
      intent: "count",
    };
  }

  return {
    mode: "summary",
    metric,
    dimension,
    chartType: "bar",
    intent: "summary",
  };
};

const materializePlan = (dataset, plan) => {
  if (plan.mode === "metricByDimension" && plan.metric && plan.dimension) {
    const data = groupMetricByDimension(dataset.rows, plan.dimension, plan.metric, plan.aggregation);
    return {
      type: plan.chartType === "pie" && data.length <= 6 ? "pie" : plan.chartType,
      title: `${plan.aggregation === "average" ? "Average " : ""}${humanize(plan.metric.name)} by ${humanize(plan.dimension.name)}`,
      xKey: plan.dimension.name,
      yKey: plan.metric.name,
      data,
    };
  }

  if (plan.mode === "countByDimension" && plan.dimension) {
    const data = countRowsByDimension(dataset.rows, plan.dimension);
    return {
      type: data.length <= 6 ? "pie" : "bar",
      title: `Count by ${humanize(plan.dimension.name)}`,
      xKey: plan.dimension.name,
      yKey: "count",
      data,
    };
  }

  if (plan.mode === "countMatchingValues" && plan.dimension && Array.isArray(plan.matchValues) && plan.matchValues.length > 0) {
    const data = countRowsMatchingValues(dataset.rows, plan.dimension, plan.matchValues);
    const titleValues = plan.matchValues.join(", ");
    return {
      type: "bar",
      title: `Count of ${titleValues} in ${humanize(plan.dimension.name)}`,
      xKey: plan.dimension.name,
      yKey: "count",
      data,
    };
  }

  return null;
};

const buildSqlForPlan = (plan) => {
  if (plan.mode === "metricByDimension" && plan.metric && plan.dimension) {
    const aggregationSql = plan.aggregation === "average" ? "AVG" : "SUM";
    return `SELECT ${plan.dimension.name}, ${aggregationSql}(${plan.metric.name}) AS ${plan.metric.name} FROM dataset_rows GROUP BY ${plan.dimension.name} ORDER BY ${plan.metric.name} DESC;`;
  }

  if (plan.mode === "countByDimension" && plan.dimension) {
    return `SELECT ${plan.dimension.name}, COUNT(*) AS count FROM dataset_rows GROUP BY ${plan.dimension.name} ORDER BY count DESC;`;
  }

  if (plan.mode === "countMatchingValues" && plan.dimension && Array.isArray(plan.matchValues) && plan.matchValues.length > 0) {
    const escapedValues = plan.matchValues.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(", ");
    return `SELECT ${plan.dimension.name}, COUNT(*) AS count FROM dataset_rows WHERE ${plan.dimension.name} IN (${escapedValues}) GROUP BY ${plan.dimension.name} ORDER BY count DESC;`;
  }

  return "SELECT * FROM dataset_rows LIMIT 100;";
};

const buildInsightsFromSchema = (schema, plan) => {
  const base = [
    `Schema inspection found ${schema.columnCount} columns across ${schema.rowCount} rows.`,
    `Dimensions: ${schema.columns.filter((column) => column.role === "dimension").map((column) => column.name).join(", ") || "none"}.`,
    `Metrics: ${schema.columns.filter((column) => column.role === "metric").map((column) => column.name).join(", ") || "none"}.`,
  ];

  if (plan.mode === "metricByDimension" && plan.metric && plan.dimension) {
    base.push(`This response used the schema to pair metric \`${plan.metric.name}\` with dimension \`${plan.dimension.name}\`.`);
  } else if (plan.mode === "countByDimension" && plan.dimension) {
    base.push(`This response used the schema to count records by \`${plan.dimension.name}\` without sending row values to any AI system.`);
  } else if (plan.mode === "countMatchingValues" && plan.dimension && Array.isArray(plan.matchValues) && plan.matchValues.length > 0) {
    const valuesList = plan.matchValues.map((value) => `\`${value}\``).join(", ");
    base.push(`This response counted rows where \`${plan.dimension.name}\` matched ${valuesList} using only local processing.`);
  }

  return base;
};

export const createChatResponse = (dataset, query) => {
  const analyticsDataset = prepareDatasetForAnalytics(dataset);

  if (isGreetingQuery(query)) {
    return {
      content: "Hello, how can I help you?",
      sql: null,
      chart: null,
      insights: [],
      schema: buildDatasetSchema(analyticsDataset),
    };
  }

  const schema = buildDatasetSchema(analyticsDataset);
  const plan = buildAnalysisPlan(analyticsDataset, schema, query);
  const chart = materializePlan(analyticsDataset, plan);

  let content = `I analyzed the ${schema.datasetName} schema and used it to select an appropriate ${chart?.type ?? "summary"} view.`;
  if (plan.mode === "countMatchingValues" && plan.dimension && Array.isArray(plan.matchValues) && chart?.data?.length) {
    const total = chart.data.reduce((sum, item) => sum + Number(item.count ?? 0), 0);
    const breakdown = chart.data.map((item) => `${item[plan.dimension.name]}: ${Number(item.count ?? 0).toLocaleString()}`).join("; ");
    const valueList = plan.matchValues.map((value) => `"${value}"`).join(" and ");
    content = `${total.toLocaleString()} records match ${humanize(plan.dimension.name)} = ${valueList}. ${breakdown}.`;
  }

  return {
    content,
    sql: buildSqlForPlan(plan),
    chart,
    insights: buildInsightsFromSchema(schema, plan),
    schema,
  };
};
