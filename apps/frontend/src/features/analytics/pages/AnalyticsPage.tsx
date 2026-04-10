import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Filter } from 'lucide-react';
import { useData } from '@/features/data/context/useData';
import { Dataset, generateAnalyticsHealthSummary, generateDemoCharts, generateDemoKPIs } from '@/features/data/model/dataStore';
import AnalyticsChart from '@/features/dashboard/components/AnalyticsChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import StatusPanel from '@/shared/layout/StatusPanel';

const AnalyticsPage = () => {
  const { dataset, isHydrating, apiError, loadDemo, retryHydrate } = useData();
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  useEffect(() => {
    if (!dataset && !isHydrating) {
      void loadDemo().catch(() => undefined);
    }
  }, [dataset, isHydrating, loadDemo]);

  const regionColumn = useMemo(
    () => dataset?.columns.find((column) => column.name.toLowerCase() === 'country' || column.name.toLowerCase() === 'region'),
    [dataset],
  );

  const regionOptions = useMemo(() => {
    if (!dataset || !regionColumn) return [];

    return [...new Set(
      dataset.rows
        .map((row) => String(row[regionColumn.name] ?? '').trim())
        .filter(Boolean),
    )].sort((left, right) => left.localeCompare(right));
  }, [dataset, regionColumn]);

  const analyticsDataset = useMemo<Dataset | null>(() => {
    if (!dataset) return null;
    if (!regionColumn || selectedRegion === 'all') return dataset;

    const filteredRows = dataset.rows.filter((row) => String(row[regionColumn.name] ?? '').trim() === selectedRegion);

    return {
      ...dataset,
      rows: filteredRows,
      rowCount: filteredRows.length,
    };
  }, [dataset, regionColumn, selectedRegion]);

  const charts = useMemo(() => (analyticsDataset ? generateDemoCharts(analyticsDataset) : []), [analyticsDataset]);
  const kpis = useMemo(() => (analyticsDataset ? generateDemoKPIs(analyticsDataset) : []), [analyticsDataset]);
  const analyticsHealth = useMemo(
    () => (analyticsDataset ? generateAnalyticsHealthSummary(analyticsDataset) : null),
    [analyticsDataset],
  );

  const downloadDossier = () => {
    if (!analyticsDataset) return;

    const dossier = [
      'INSIGHTFLOW ANALYTICS DOSSIER',
      `DATASET: ${analyticsDataset.name}`,
      `REGION FILTER: ${selectedRegion === 'all' ? 'ALL' : selectedRegion}`,
      `ROWS: ${analyticsDataset.rowCount}`,
      `COLUMNS: ${analyticsDataset.columns.length}`,
      '',
      'KPIS',
      ...kpis.map((kpi) => `- ${kpi.label}: ${kpi.value}`),
      '',
      'CHARTS',
      ...charts.map((chart) => `- ${chart.title}`),
    ].join('\n');

    const blob = new Blob([dossier], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analyticsDataset.name.replace(/\s+/g, '_').toLowerCase()}_${selectedRegion === 'all' ? 'all' : selectedRegion.toLowerCase()}_dossier.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isHydrating) {
    return <StatusPanel title="Loading analytics" message="Preparing comparative visualizations." />;
  }

  if (apiError) {
    return <StatusPanel title="Analytics unavailable" message={apiError} actionLabel="Retry" onAction={() => { void retryHydrate(); }} />;
  }

  if (!dataset) {
    return <StatusPanel title="No dataset loaded" message="Upload a dataset before opening analytics." actionLabel="Load Demo Dataset" onAction={() => { void loadDemo().catch(() => undefined); }} />;
  }

  return (
    <div className="space-y-8 px-10 py-10">
      <div className="flex flex-wrap items-center justify-end gap-4">
        <div className="flex items-center gap-3">
          <div className="terminal-label">Region Filter</div>
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="h-12 min-w-[220px] rounded-none border-border bg-card text-sm uppercase tracking-[0.08em]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by Region" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-border bg-card text-foreground">
              <SelectItem value="all" className="text-xs uppercase tracking-[0.08em]">All Regions</SelectItem>
              {regionOptions.map((option) => (
                <SelectItem key={option} value={option} className="text-xs uppercase tracking-[0.08em]">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button onClick={downloadDossier} className="terminal-button-inverse gap-2">
          <Download className="h-4 w-4" />
          Download Dossier
        </button>
      </div>

      <section className="space-y-4">
        <h2 className="text-3xl uppercase tracking-[0.08em] text-foreground">4.1 Dimensional Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {analyticsHealth && [
            {
              label: 'Integrity Rows',
              value: `${analyticsHealth.integrity.analyticsRows}/${analyticsHealth.integrity.totalRows}`,
            },
            {
              label: 'Anomaly Count',
              value: String(analyticsHealth.integrity.removedEmptyRows + analyticsHealth.integrity.invalidNumericValues),
            },
            {
              label: 'Risk Indicator',
              value: analyticsHealth.risk.level,
            },
            {
              label: 'Branch Coverage',
              value: analyticsHealth.branchCoverage.totalGroups > 0
                ? `${analyticsHealth.branchCoverage.includedGroups}/${analyticsHealth.branchCoverage.totalGroups}`
                : 'N/A',
            },
          ].map((item) => (
            <div key={item.label} className="terminal-panel p-6">
              <p className="terminal-label">{item.label}</p>
              <p className="mt-4 text-4xl uppercase tracking-[0.08em] text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl uppercase tracking-[0.08em] text-foreground">4.2 Comparative Visualization</h2>
        <div className="grid gap-6 xl:grid-cols-2">
          {charts.slice(0, 6).map((chart, index) => (
            <AnalyticsChart key={`${chart.title}-${index}`} config={chart} index={index} />
          ))}
          <div className="terminal-panel p-6">
            <h3 className="text-2xl uppercase tracking-[0.08em] text-foreground">4.3 Cross-Filter Observations</h3>
            <div className="mt-6 space-y-6 border-t border-border pt-6 text-base leading-8 text-muted-foreground">
              <div className="flex gap-4">
                <AlertTriangle className="mt-1 h-5 w-5 text-accent" />
                <p>
                  {analyticsHealth?.risk.metricName
                    ? `${analyticsHealth.risk.rule}. Current average is ${analyticsHealth.risk.average ?? 'N/A'} and the indicator is ${analyticsHealth.risk.level}.`
                    : 'Risk indicator is unavailable because this dataset does not contain a numeric metric.'}
                </p>
              </div>
              <div className="flex gap-4">
                <AlertTriangle className="mt-1 h-5 w-5 text-accent" />
                <p>
                  Analytics excluded {analyticsHealth?.branchCoverage.excludedGroups ?? 0} branch group(s) below the minimum sample size of {analyticsHealth?.branchCoverage.minimumGroupCount ?? 0}.
                </p>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="mt-1 h-5 w-5 text-success" />
                <p>
                  Data integrity checks removed {analyticsHealth?.integrity.removedEmptyRows ?? 0} empty row(s) and flagged {analyticsHealth?.integrity.invalidNumericValues ?? 0} invalid numeric value(s) before analytics ran.
                </p>
              </div>
            </div>
            <button className="terminal-button mt-8 w-full justify-center">Run AI Correlation Test</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AnalyticsPage;
