const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
const MAX_ITEMS = 50;
const GEMINI_PROMPT_PREFIX = "Analyze this aggregated dataset summary and return JSON insights:\n";
const SENSITIVE_FIELD_HINTS = [
  "name",
  "full_name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "mobile",
  "contact",
  "address",
  "location",
  "ssn",
  "aadhaar",
  "aadhar",
  "pan",
  "password",
  "token",
  "secret",
  "dob",
  "birth",
];

export const AI_INSIGHTS_FALLBACK = {
  overview: "Unavailable",
  insights: [],
  anomalies: [],
  risks: [],
  recommendations: [],
};

const getGeminiApiKey = () => process.env.GEMINI_API_KEY?.trim() ?? "";

const buildAuthError = () => ({
  ...AI_INSIGHTS_FALLBACK,
  error: "GEMINI_API_KEY is not configured.",
});

const normalizeFieldName = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const isSensitiveField = (fieldName) => {
  const normalizedFieldName = normalizeFieldName(fieldName);
  return SENSITIVE_FIELD_HINTS.some((hint) => normalizedFieldName.includes(hint));
};

const clampArray = (value) => (Array.isArray(value) ? value.slice(0, MAX_ITEMS) : []);

const sanitizeColumns = (columns) =>
  clampArray(columns)
    .filter((column) => column && !isSensitiveField(column.name))
    .map((column) => ({
      name: String(column.name ?? ""),
      type: String(column.type ?? "unknown"),
    }))
    .filter((column) => column.name);

const sanitizeUniqueCounts = (uniqueCounts) =>
  Object.fromEntries(
    Object.entries(uniqueCounts ?? {})
      .filter(([key]) => !isSensitiveField(key))
      .slice(0, MAX_ITEMS)
      .map(([key, value]) => [key, Number.isFinite(Number(value)) ? Number(value) : 0]),
  );

const sanitizeStatistics = (statistics) =>
  Object.fromEntries(
    Object.entries(statistics ?? {})
      .filter(([key]) => !isSensitiveField(key))
      .slice(0, MAX_ITEMS)
      .map(([key, value]) => {
        const metric = value && typeof value === "object" ? value : {};
        return [
          key,
          {
            mean: Number.isFinite(Number(metric.mean)) ? Number(metric.mean) : null,
            min: Number.isFinite(Number(metric.min)) ? Number(metric.min) : null,
            max: Number.isFinite(Number(metric.max)) ? Number(metric.max) : null,
            std_dev: Number.isFinite(Number(metric.std_dev)) ? Number(metric.std_dev) : null,
          },
        ];
      }),
  );

const sanitizeAggregationItems = (items) =>
  clampArray(items).map((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const key = item.key ?? item.label ?? item.name ?? item.group ?? item.category ?? null;
      const value = item.value ?? item.count ?? item.total ?? item.avg ?? null;
      return {
        key: key == null ? "" : String(key),
        value: Number.isFinite(Number(value)) ? Number(value) : String(value ?? ""),
      };
    }

    return {
      key: "",
      value: "",
    };
  }).filter((item) => item.key);

const sanitizeAggregations = (aggregations) =>
  Object.fromEntries(
    Object.entries(aggregations ?? {})
      .filter(([key]) => !isSensitiveField(key))
      .slice(0, MAX_ITEMS)
      .map(([key, value]) => [key, sanitizeAggregationItems(value)]),
  );

export const buildAIInsightsPayload = ({ schema, summary, statistics, aggregations }) => {
  const payload = {
    dataset_name: String(
      schema?.datasetName
      ?? schema?.dataset_name
      ?? summary?.dataset_name
      ?? "dataset",
    ),
    columns: sanitizeColumns(schema?.columns),
    summary: {
      row_count: Number.isFinite(Number(summary?.row_count ?? summary?.rowCount))
        ? Number(summary?.row_count ?? summary?.rowCount)
        : Number.isFinite(Number(schema?.rowCount))
        ? Number(schema.rowCount)
        : 0,
      unique_counts: sanitizeUniqueCounts(summary?.unique_counts ?? summary?.uniqueCounts),
    },
    statistics: sanitizeStatistics(statistics),
    aggregations: sanitizeAggregations(aggregations),
  };

  return payload;
};

export const buildGeminiRequestBody = (payload) => ({
  contents: [
    {
      parts: [
        {
          text: `${GEMINI_PROMPT_PREFIX}${JSON.stringify(payload)}`,
        },
      ],
    },
  ],
});

const buildGeminiRequestUrl = (apiKey) => `${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`;

const callGeminiGenerateContent = async ({ apiKey, payload }) => {
  const response = await fetch(buildGeminiRequestUrl(apiKey), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildGeminiRequestBody(payload)),
  });

  const responseBody = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    body: responseBody,
  };
};

export const generateAIInsights = async ({ schema, summary, statistics, aggregations }) => {
  const apiKey = getGeminiApiKey();
  const payload = buildAIInsightsPayload({ schema, summary, statistics, aggregations });

  if (!apiKey) {
    return {
      ...buildAuthError(),
      meta: {
        payload,
      },
    };
  }

  const geminiResponse = await callGeminiGenerateContent({ apiKey, payload });

  return {
    ...AI_INSIGHTS_FALLBACK,
    meta: {
      provider: "gemini",
      endpoint: GEMINI_API_URL,
      configured: true,
      schemaColumns: payload.columns.length,
      hasSummary: Boolean(summary),
      hasStatistics: Boolean(statistics),
      hasAggregations: Boolean(aggregations),
      payload,
      requestBody: buildGeminiRequestBody(payload),
      geminiResponse,
    },
  };
};
