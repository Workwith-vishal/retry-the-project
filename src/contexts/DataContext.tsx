import React, { createContext, useContext, useState, useCallback } from 'react';
import { Dataset, ChatMessage, generateDemoData } from '@/lib/data-store';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface DataContextType {
  dataset: Dataset | null;
  setDataset: (d: Dataset | null) => void;
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  uploadFile: (file: File) => Promise<void>;
  loadDemo: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

function inferType(values: string[]): 'string' | 'number' | 'date' {
  const sample = values.filter(Boolean).slice(0, 20);
  if (sample.every(v => !isNaN(Number(v)))) return 'number';
  if (sample.every(v => !isNaN(Date.parse(v)))) return 'date';
  return 'string';
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages(prev => [...prev, msg]);
  }, []);

  const parseRows = useCallback((rows: Record<string, any>[], fields: string[], fileName: string) => {
    const columns = fields.map(name => ({
      name,
      type: inferType(rows.slice(0, 20).map(r => String(r[name] ?? ''))),
      sample: rows.slice(0, 3).map(r => String(r[name] ?? '')),
    }));

    const ds: Dataset = {
      id: `upload-${Date.now()}`,
      name: fileName.replace(/\.(csv|xlsx|xls|json)$/i, ''),
      columns: columns as Dataset['columns'],
      rows,
      uploadedAt: new Date(),
      rowCount: rows.length,
    };
    setDataset(ds);
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      return new Promise<void>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rows = results.data as Record<string, any>[];
            const fields = results.meta.fields || [];
            parseRows(rows, fields, file.name);
            resolve();
          },
          error: (err) => reject(err),
        });
      });
    }

    if (ext === 'json') {
      const text = await file.text();
      let parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) parsed = [parsed];
      const fields = Object.keys(parsed[0] || {});
      parseRows(parsed, fields, file.name);
      return;
    }

    if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
      const fields = Object.keys(rows[0] || {});
      parseRows(rows, fields, file.name);
      return;
    }

    throw new Error('Unsupported file type');
  }, [parseRows]);

  const loadDemo = useCallback(() => {
    setDataset(generateDemoData());
  }, []);

  return (
    <DataContext.Provider value={{
      dataset, setDataset, chatMessages, addChatMessage,
      isProcessing, setIsProcessing, uploadCSV, loadDemo,
    }}>
      {children}
    </DataContext.Provider>
  );
};
