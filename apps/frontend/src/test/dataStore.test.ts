import { describe, expect, it } from "vitest";
import { Dataset, generateAnalyticsHealthSummary, generateDemoCharts, generateDemoKPIs } from "@/features/data/model/dataStore";

describe("dataStore dashboard helpers", () => {
  it("builds charts for arbitrary uploaded datasets without demo-only columns", () => {
    const dataset: Dataset = {
      id: "custom-1",
      name: "Regional Sales",
      uploadedAt: new Date("2026-04-06T00:00:00.000Z"),
      rowCount: 3,
      columns: [
        { name: "country", type: "string", sample: ["India", "USA"] },
        { name: "sales", type: "number", sample: ["100", "200"] },
        { name: "orders", type: "number", sample: ["4", "7"] },
      ],
      rows: [
        { country: "India", sales: 100, orders: 4 },
        { country: "USA", sales: 200, orders: 7 },
        { country: "India", sales: 150, orders: 5 },
      ],
    };

    expect(() => generateDemoCharts(dataset)).not.toThrow();
    expect(() => generateDemoKPIs(dataset)).not.toThrow();

    const charts = generateDemoCharts(dataset);
    expect(charts.length).toBeGreaterThan(0);
    expect(charts[0].data.length).toBeGreaterThan(0);
  });

  it("returns stable output for an empty dataset", () => {
    const dataset: Dataset = {
      id: "empty-1",
      name: "Empty Dataset",
      uploadedAt: new Date("2026-04-06T00:00:00.000Z"),
      rowCount: 0,
      columns: [{ name: "score", type: "number", sample: [] }],
      rows: [],
    };

    expect(() => generateDemoKPIs(dataset)).not.toThrow();
    expect(() => generateDemoCharts(dataset)).not.toThrow();
    expect(generateDemoCharts(dataset)).toEqual([]);
  });

  it("builds pie charts from counts when uploaded data only has non-additive numeric metrics", () => {
    const dataset: Dataset = {
      id: "survey-1",
      name: "Customer Survey",
      uploadedAt: new Date("2026-04-06T00:00:00.000Z"),
      rowCount: 4,
      columns: [
        { name: "team", type: "string", sample: ["A", "B"] },
        { name: "region", type: "string", sample: ["North", "South"] },
        { name: "rating", type: "number", sample: ["4.5", "3.8"] },
      ],
      rows: [
        { team: "A", region: "North", rating: 4.5 },
        { team: "A", region: "North", rating: 4.2 },
        { team: "B", region: "South", rating: 3.8 },
        { team: "C", region: "North", rating: 4.9 },
      ],
    };

    const charts = generateDemoCharts(dataset);
    const pieChart = charts.find((chart) => chart.type === "pie");

    expect(pieChart).toBeDefined();
    expect(pieChart?.title).toBe("Count by Team");
    expect(pieChart?.yKey).toBe("count");
    expect(pieChart?.data).toEqual([
      { team: "A", count: 2 },
      { team: "B", count: 1 },
      { team: "C", count: 1 },
    ]);
  });

  it("prioritizes salary columns for salary datasets", () => {
    const dataset: Dataset = {
      id: "salary-1",
      name: "Developer Salaries",
      uploadedAt: new Date("2026-04-06T00:00:00.000Z"),
      rowCount: 3,
      columns: [
        { name: "experience", type: "number", sample: ["5", "10"] },
        { name: "country", type: "string", sample: ["USA", "India"] },
        { name: "education", type: "string", sample: ["Masters", "Bachelors"] },
        { name: "salary_usd", type: "number", sample: ["100000", "200000"] },
      ],
      rows: [
        { experience: 5, country: "USA", education: "Masters", salary_usd: 100000 },
        { experience: 10, country: "USA", education: "Bachelors", salary_usd: 200000 },
        { experience: 2, country: "India", education: "Masters", salary_usd: 50000 },
      ],
    };

    const kpis = generateDemoKPIs(dataset);
    const charts = generateDemoCharts(dataset);

    expect(kpis[2]).toMatchObject({
      label: "Total Salary Usd",
      value: `$${(350000).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    });
    expect(kpis[3]).toMatchObject({ label: "Avg Experience", value: "5.67" });
    expect(charts[0]).toMatchObject({
      title: "Salary Usd by Country",
      xKey: "country",
      yKey: "salary_usd",
      data: [
        { country: "India", salary_usd: 50000 },
        { country: "USA", salary_usd: 300000 },
      ],
    });
    expect(charts.find((chart) => chart.type === "pie")).toMatchObject({
      title: "Count by Education",
      yKey: "count",
    });
  });

  it("uses the primary metric for pie charts instead of the first numeric column", () => {
    const dataset: Dataset = {
      id: "salary-pie-1",
      name: "Salary Pie Dataset",
      uploadedAt: new Date("2026-04-06T00:00:00.000Z"),
      rowCount: 4,
      columns: [
        { name: "experience", type: "number", sample: ["5", "10"] },
        { name: "country", type: "string", sample: ["USA", "India"] },
        { name: "education", type: "string", sample: ["Masters", "Bachelors"] },
        { name: "salary_usd", type: "number", sample: ["100000", "200000"] },
      ],
      rows: [
        { experience: 5, country: "USA", education: "Masters", salary_usd: 100000 },
        { experience: 10, country: "USA", education: "Bachelors", salary_usd: 200000 },
        { experience: 2, country: "India", education: "Masters", salary_usd: 50000 },
        { experience: 8, country: "India", education: "PhD", salary_usd: 150000 },
      ],
    };

    const charts = generateDemoCharts(dataset);

    expect(charts[1]).toMatchObject({
      type: "pie",
      title: "Count by Education",
      xKey: "education",
      yKey: "count",
      data: [
        { education: "Bachelors", count: 1 },
        { education: "Masters", count: 2 },
        { education: "PhD", count: 1 },
      ],
    });
  });

  it("averages mark-like columns using only valid numeric values", () => {
    const dataset: Dataset = {
      id: "student-avg-1",
      name: "Research Students",
      uploadedAt: new Date("2026-04-10T00:00:00.000Z"),
      rowCount: 6,
      columns: [
        { name: "Branch", type: "string", sample: ["CSE", "ECE"] },
        { name: "Gender", type: "string", sample: ["Male", "Female"] },
        { name: "Marks[10th]", type: "number", sample: ["91", "88"] },
      ],
      rows: [
        { Branch: "CSE", Gender: "Male", "Marks[10th]": "91" },
        { Branch: "CSE", Gender: "Male", "Marks[10th]": "95" },
        { Branch: "ECE", Gender: "Female", "Marks[10th]": "88" },
        { Branch: "ECE", Gender: "Female", "Marks[10th]": "92" },
        { Branch: "MECH", Gender: "Male", "Marks[10th]": null },
        { Branch: "MECH", Gender: "Male", "Marks[10th]": "not available" },
      ],
    };

    const charts = generateDemoCharts(dataset);

    expect(charts[0]).toMatchObject({
      title: "Average Marks[10th] by Branch",
      xKey: "Branch",
      yKey: "Marks[10th]",
      data: [
        { Branch: "CSE", "Marks[10th]": 93 },
        { Branch: "ECE", "Marks[10th]": 90 },
      ],
    });
  });

  it("normalizes gender labels before averaging marks", () => {
    const dataset: Dataset = {
      id: "student-gender-1",
      name: "Research Students",
      uploadedAt: new Date("2026-04-10T00:00:00.000Z"),
      rowCount: 6,
      columns: [
        { name: "Branch", type: "string", sample: ["CSE", "ECE"] },
        { name: "Gender", type: "string", sample: ["male", "Female"] },
        { name: "Marks[10th]", type: "number", sample: ["91", "88"] },
      ],
      rows: [
        { Branch: "CSE", Gender: "male", "Marks[10th]": "91" },
        { Branch: "CSE", Gender: "Male", "Marks[10th]": "95" },
        { Branch: "ECE", Gender: "M", "Marks[10th]": "89" },
        { Branch: "ECE", Gender: "female", "Marks[10th]": "88" },
        { Branch: "MECH", Gender: "Female", "Marks[10th]": "92" },
        { Branch: "IT", Gender: "F", "Marks[10th]": "90" },
      ],
    };

    const charts = generateDemoCharts(dataset);
    const genderAverageChart = charts.find((chart) => chart.title === "Average Marks[10th] by Gender");

    expect(genderAverageChart).toMatchObject({
      xKey: "Gender",
      yKey: "Marks[10th]",
      data: [
        { Gender: "Female", "Marks[10th]": 90 },
        { Gender: "Male", "Marks[10th]": 91.67 },
      ],
    });
  });

  it("normalizes board labels before counting grouped records", () => {
    const dataset: Dataset = {
      id: "student-board-1",
      name: "Research Students",
      uploadedAt: new Date("2026-04-10T00:00:00.000Z"),
      rowCount: 7,
      columns: [
        { name: "Branch", type: "string", sample: ["CSE", "ECE"] },
        { name: "Gender", type: "string", sample: ["Male", "Female"] },
        { name: "Board", type: "string", sample: ["cbse", "ICSE"] },
        { name: "Marks[10th]", type: "number", sample: ["91", "88"] },
      ],
      rows: [
        { Branch: "CSE", Gender: "Male", Board: "cbse", "Marks[10th]": "91" },
        { Branch: "CSE", Gender: "Male", Board: "CBSE", "Marks[10th]": "95" },
        { Branch: "ECE", Gender: "Female", Board: "Cbse", "Marks[10th]": "88" },
        { Branch: "ECE", Gender: "Female", Board: "ICSE", "Marks[10th]": "92" },
        { Branch: "MECH", Gender: "Female", Board: "icse", "Marks[10th]": "90" },
        { Branch: "IT", Gender: "Male", Board: "STATE BOARD", "Marks[10th]": "85" },
        { Branch: "IT", Gender: "Male", Board: "state board", "Marks[10th]": "87" },
      ],
    };

    const charts = generateDemoCharts(dataset);
    const boardCountChart = charts.find((chart) => chart.title === "Count by Board");

    expect(boardCountChart).toMatchObject({
      xKey: "Board",
      yKey: "count",
      data: [
        { Board: "CBSE", count: 3 },
        { Board: "ICSE", count: 2 },
        { Board: "State Board", count: 2 },
      ],
    });
  });

  it("excludes branch groups below the minimum sample threshold", () => {
    const dataset: Dataset = {
      id: "branch-threshold-1",
      name: "Branch Threshold",
      uploadedAt: new Date("2026-04-10T00:00:00.000Z"),
      rowCount: 5,
      columns: [
        { name: "Branch", type: "string", sample: ["CSE", "ECE"] },
        { name: "Marks[10th]", type: "number", sample: ["91", "88"] },
      ],
      rows: [
        { Branch: "CSE", "Marks[10th]": "91" },
        { Branch: "CSE", "Marks[10th]": "95" },
        { Branch: "ECE", "Marks[10th]": "88" },
        { Branch: "IT", "Marks[10th]": "85" },
        { Branch: "IT", "Marks[10th]": "87" },
      ],
    };

    const charts = generateDemoCharts(dataset);

    expect(charts[0]).toMatchObject({
      title: "Average Marks[10th] by Branch",
      data: [
        { Branch: "CSE", "Marks[10th]": 93 },
        { Branch: "IT", "Marks[10th]": 86 },
      ],
    });
  });

  it("builds analytics health summary from sanitized data", () => {
    const dataset: Dataset = {
      id: "health-summary-1",
      name: "Health Summary",
      uploadedAt: new Date("2026-04-10T00:00:00.000Z"),
      rowCount: 6,
      columns: [
        { name: "Branch", type: "string", sample: ["CSE", "ECE"] },
        { name: "Marks[10th]", type: "number", sample: ["91", "88"] },
      ],
      rows: [
        { Branch: "CSE", "Marks[10th]": "91" },
        { Branch: "CSE", "Marks[10th]": "95" },
        { Branch: "ECE", "Marks[10th]": "88" },
        { Branch: "IT", "Marks[10th]": "87" },
        { Branch: "", "Marks[10th]": "not available" },
        { Branch: "", "Marks[10th]": null },
      ],
    };

    const summary = generateAnalyticsHealthSummary(dataset);

    expect(summary).toMatchObject({
      integrity: {
        totalRows: 6,
        analyticsRows: 5,
        removedEmptyRows: 1,
        invalidNumericValues: 1,
      },
      risk: {
        level: "LOW",
        metricName: "Marks[10th]",
        average: 90.25,
        threshold: 60,
      },
      branchCoverage: {
        totalGroups: 3,
        includedGroups: 1,
        excludedGroups: 2,
        minimumGroupCount: 2,
      },
    });
  });
});
