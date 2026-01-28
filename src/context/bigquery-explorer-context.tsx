
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Table, Project } from '@/lib/bigquery-mock';

interface BigQueryExplorerContextType {
  schemaProjects: Project[];
  setSchemaProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  selectedTable: Table | null;
  setSelectedTable: (table: Table | null) => void;
  isLoadingSchema: boolean;
  setIsLoadingSchema: React.Dispatch<React.SetStateAction<boolean>>;
  schemaError: string | null;
  setSchemaError: React.Dispatch<React.SetStateAction<string | null>>;
}

const BigQueryExplorerContext = createContext<BigQueryExplorerContextType | undefined>(undefined);

export function BigQueryExplorerProvider({ children }: { children: ReactNode }) {
  const [schemaProjects, setSchemaProjects] = useState<Project[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const value = {
    schemaProjects,
    setSchemaProjects,
    selectedTable,
    setSelectedTable,
    isLoadingSchema,
    setIsLoadingSchema,
    schemaError,
    setSchemaError,
  };

  return (
    <BigQueryExplorerContext.Provider value={value}>
      {children}
    </BigQueryExplorerContext.Provider>
  );
}

export function useBigQueryExplorer() {
  const context = useContext(BigQueryExplorerContext);
  if (context === undefined) {
    throw new Error('useBigQueryExplorer must be used within a BigQueryExplorerProvider');
  }
  return context;
}
