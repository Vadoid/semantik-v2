'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from '@/components/ui/sidebar';
import SchemaBrowser from '@/components/bigquery-explorer/schema-browser';
import AppHeader from '@/components/bigquery-explorer/app-header';
import type { Table, Project } from '@/lib/bigquery-mock';
import { getBigQuerySchema, getProjects } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { BigQueryExplorerProvider, useBigQueryExplorer } from '@/context/bigquery-explorer-context';
import { safeLocalStorage } from '@/lib/safe-storage';
import { deleteSession } from '@/app/auth-actions';

function ExplorerLayoutContent({ children, user }: { children: React.ReactNode; user: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  const [userProjects, setUserProjects] = useState<{ id: string; name: string }[]>([]);

  const {
    setSchemaProjects,
    setSelectedTable,
    setIsLoadingSchema,
    setSchemaError
  } = useBigQueryExplorer();

  const handleLogout = useCallback(async () => {
    try {
      await deleteSession();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [router]);

  const fetchSchemaAndProjects = useCallback(async () => {
    if (!projectId) return;

    setIsLoadingSchema(true);
    setSchemaError(null);
    try {
      const [schema, projects] = await Promise.all([
        getBigQuerySchema(projectId),
        getProjects()
      ]);
      setSchemaProjects(schema);
      setUserProjects(projects);
      safeLocalStorage.setItem('lastSelectedProject', projectId);
    } catch (error: any) {
      console.error('Failed to fetch schema or projects:', error);
      if (error.message.includes('Authentication') || error.message.includes('Invalid Credentials')) {
        handleLogout();
      } else {
        setSchemaError(error.message || 'An unknown error occurred while fetching data.');
      }
    } finally {
      setIsLoadingSchema(false);
    }
  }, [projectId, handleLogout, setSchemaError, setIsLoadingSchema, setSchemaProjects]);

  useEffect(() => {
    if (!projectId && pathname !== '/select-project') {
      const lastProjectId = safeLocalStorage.getItem('lastSelectedProject');
      if (lastProjectId) {
        router.push(`/?project=${lastProjectId}`);
      } else {
        router.push('/select-project');
      }
      return;
    }

    if (projectId) {
      fetchSchemaAndProjects();
    } else {
      setIsLoadingSchema(false);
    }
  }, [projectId, router, pathname, fetchSchemaAndProjects, setIsLoadingSchema]);

  const handleTableSelect = (table: Table) => {
    setSelectedTable(table);
    if (pathname !== '/') {
      router.push(`/?project=${projectId}`);
    }
  };

  const isAuthPage = pathname === '/login' || pathname === '/select-project';

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!projectId && !isAuthPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SchemaBrowser
          userProjects={userProjects}
          currentProjectId={projectId!}
          onTableSelect={handleTableSelect}
          onRefresh={fetchSchemaAndProjects}
        />
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-screen">
          <AppHeader user={user} />
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}


export default function ExplorerLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: any;
}) {
  return (
    <BigQueryExplorerProvider>
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <ExplorerLayoutContent user={user}>
          {children}
        </ExplorerLayoutContent>
      </Suspense>
    </BigQueryExplorerProvider>
  )
}
