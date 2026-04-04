import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/contexts/DataContext';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Pencil, Check, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const PAGE_SIZES = [10, 25, 50, 100];

const DataTablePage = () => {
  const { dataset, setDataset, loadDemo } = useData();

  useEffect(() => {
    if (!dataset) loadDemo();
  }, []);

  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const filtered = useMemo(() => {
    if (!dataset) return [];
    if (!search.trim()) return dataset.rows;
    const q = search.toLowerCase();
    return dataset.rows.filter(row =>
      dataset.columns.some(col => String(row[col.name]).toLowerCase().includes(q))
    );
  }, [dataset, search]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(0);
  };

  const startEdit = (rowIdx: number, col: string) => {
    const globalIdx = page * pageSize + rowIdx;
    setEditingCell({ row: globalIdx, col });
    setEditValue(String(sorted[globalIdx]?.[col] ?? ''));
  };

  const commitEdit = useCallback(() => {
    if (!editingCell || !dataset) return;
    const { row, col } = editingCell;
    const actualRow = sorted[row];
    if (!actualRow) { setEditingCell(null); return; }

    const globalIndex = dataset.rows.indexOf(actualRow);
    if (globalIndex === -1) { setEditingCell(null); return; }

    const colDef = dataset.columns.find(c => c.name === col);
    let newVal: any = editValue;
    if (colDef?.type === 'number') {
      const n = Number(editValue);
      if (!isNaN(n)) newVal = n;
    }

    const newRows = [...dataset.rows];
    newRows[globalIndex] = { ...newRows[globalIndex], [col]: newVal };
    setDataset({ ...dataset, rows: newRows });
    setEditingCell(null);
  }, [editingCell, editValue, dataset, sorted, setDataset]);

  const cancelEdit = () => setEditingCell(null);

  if (!dataset) return null;

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Table</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-mono text-primary">{sorted.length.toLocaleString()}</span> records · click any cell to edit
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search all columns..."
            className="pl-9 h-9 text-xs font-mono bg-card border-border"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-xl flex-1 overflow-hidden flex flex-col"
      >
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
              <tr className="border-b border-border">
                <th className="py-3 px-3 text-left font-mono text-muted-foreground font-medium w-12">#</th>
                {dataset.columns.map(col => (
                  <th
                    key={col.name}
                    onClick={() => handleSort(col.name)}
                    className="text-left py-3 px-3 font-mono text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      {col.name}
                      <SortIcon col={col.name} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, rowIdx) => {
                const globalIdx = page * pageSize + rowIdx;
                return (
                  <tr key={globalIdx} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                    <td className="py-2 px-3 font-mono text-muted-foreground/60">{globalIdx + 1}</td>
                    {dataset.columns.map(col => {
                      const isEditing = editingCell?.row === globalIdx && editingCell?.col === col.name;

                      if (isEditing) {
                        return (
                          <td key={col.name} className="py-1 px-2">
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') commitEdit();
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                className="w-full px-2 py-1 text-xs font-mono bg-primary/10 border border-primary/30 rounded text-foreground outline-none focus:border-primary"
                              />
                              <button onClick={commitEdit} className="p-0.5 hover:text-primary text-muted-foreground">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={cancelEdit} className="p-0.5 hover:text-destructive text-muted-foreground">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.name}
                          onClick={() => startEdit(rowIdx, col.name)}
                          className="py-2 px-3 font-mono text-foreground cursor-pointer group/cell relative"
                        >
                          <span>{typeof row[col.name] === 'number' ? row[col.name].toLocaleString() : String(row[col.name])}</span>
                          <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover/cell:text-muted-foreground/50 absolute right-2 top-1/2 -translate-y-1/2 transition-colors" />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="h-8 w-[70px] text-xs font-mono bg-transparent border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => (
                  <SelectItem key={s} value={String(s)} className="text-xs font-mono">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">
              {(page * pageSize + 1).toLocaleString()}–{Math.min((page + 1) * pageSize, sorted.length).toLocaleString()} of {sorted.length.toLocaleString()}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DataTablePage;
