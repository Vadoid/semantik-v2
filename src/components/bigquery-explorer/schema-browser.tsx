

'use client';

import { Project, Table, Dataset } from '@/lib/bigquery-mock';
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from '@/components/ui/sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Database, Table as TableIcon, LogOut, Settings, BarChart, DatabaseZap, AlertTriangle, Loader2, Home, RefreshCcw, Trash2, Pencil, Info, Calendar, Rows, HardDrive } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTablesForDataset, deleteBqDataset, deleteBqTable } from '@/app/actions';
import { deleteSession } from '@/app/auth-actions';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Button } from '../ui/button';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { useBigQueryExplorer } from '@/context/bigquery-explorer-context';

type SchemaBrowserProps = {
  userProjects: { id: string; name: string; }[];
  currentProjectId: string;
  onTableSelect: (table: Table) => void;
  onRefresh: () => void;
};

export default function SchemaBrowser({ userProjects, currentProjectId, onTableSelect, onRefresh }: SchemaBrowserProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingTables, setLoadingTables] = useState<Record<string, boolean>>({});
  const [deletingDataset, setDeletingDataset] = useState<Dataset | null>(null);
  const [deletingTable, setDeletingTable] = useState<{ table: Table, dataset: Dataset } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { state, toggleSidebar } = useSidebar();
  const [viewingMetadata, setViewingMetadata] = useState<Table | null>(null);

  const {
    schemaProjects,
    setSchemaProjects,
    selectedTable,
    isLoadingSchema,
    schemaError,
  } = useBigQueryExplorer();

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId && newProjectId !== currentProjectId) {
      router.push(`/?project=${newProjectId}`);
    }
  };

  const handleLogout = async () => {
    try {
      await deleteSession();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDatasetToggle = async (datasetId: string) => {
    const project = schemaProjects.find(p => p.id === currentProjectId);
    if (!project) return;

    const dataset = project.datasets.find(d => d.id === datasetId);
    if (!dataset || dataset.tables.length > 0) {
      return; // Tables already loaded or dataset not found
    }

    setLoadingTables(prev => ({ ...prev, [datasetId]: true }));
    try {
      const tables = await getTablesForDataset(currentProjectId, datasetId);
      setSchemaProjects(prevProjects => prevProjects.map(p => {
        if (p.id === currentProjectId) {
          return {
            ...p,
            datasets: p.datasets.map(d => d.id === datasetId ? { ...d, tables } : d)
          };
        }
        return p;
      }));
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error loading tables', description: e.message });
    } finally {
      setLoadingTables(prev => ({ ...prev, [datasetId]: false }));
    }
  };

  const handleDeleteDataset = async () => {
    if (!deletingDataset) return;

    setIsDeleting(true);
    try {
      await deleteBqDataset(currentProjectId, deletingDataset.id);

      // Refresh schema after deletion
      onRefresh();

      toast({ title: 'Dataset deleted', description: `Dataset '${deletingDataset.name}' has been deleted.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error deleting dataset', description: e.message });
    } finally {
      setIsDeleting(false);
      setDeletingDataset(null);
    }
  };

  const handleDeleteTable = async () => {
    if (!deletingTable) return;

    setIsDeleting(true);
    try {
      const { table, dataset } = deletingTable;
      const tableIdParts = table.id.split('.');
      const actualTableId = tableIdParts[tableIdParts.length - 1];

      await deleteBqTable(currentProjectId, dataset.id, actualTableId);

      onRefresh();

      toast({ title: 'Table deleted', description: `Table '${table.name}' has been deleted.` });

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error deleting table', description: e.message });
    } finally {
      setIsDeleting(false);
      setDeletingTable(null);
    }
  }


  const handleDragStart = (event: React.DragEvent<HTMLLIElement>, table: Table) => {
    event.dataTransfer.setData('application/json', JSON.stringify(table));
  };

  const selectedProjectName = userProjects.find(p => p.id === currentProjectId)?.name || currentProjectId;

  const getLink = (path: string) => {
    return currentProjectId ? `${path}?project=${currentProjectId}` : path;
  }

  const renderContent = () => {
    if (isLoadingSchema) {
      return (
        <div className="space-y-4 px-4">
          <Skeleton className="h-10 w-full bg-sidebar-accent" />
          <Skeleton className="h-8 w-full mt-4 bg-sidebar-accent" />
          <div className="pl-4 space-y-2">
            <Skeleton className="h-6 w-3/4 bg-sidebar-accent" />
            <div className="pl-4 space-y-1">
              <Skeleton className="h-6 w-2/3 bg-sidebar-accent" />
              <Skeleton className="h-6 w-2/3 bg-sidebar-accent" />
            </div>
          </div>
        </div>
      )
    }

    if (schemaError) {
      return (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="text-xs">
              {schemaError}
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    const currentProject = schemaProjects.find(p => p.id === currentProjectId);

    if (!currentProject || currentProject.datasets.length === 0) {
      return (
        <div className="p-4 text-sm text-sidebar-foreground/70">
          No datasets found in this project.
        </div>
      )
    }

    return (
      <Accordion type="multiple" className="w-full" onValueChange={(openItems) => {
        const project = schemaProjects.find(p => p.id === currentProjectId);
        if (!project) return;
        const newDatasetId = openItems.find(id => {
          const dataset = project.datasets.find(d => d.id === id);
          return dataset && dataset.tables.length === 0 && !loadingTables[id];
        });
        if (newDatasetId) {
          handleDatasetToggle(newDatasetId);
        }
      }}>
        {currentProject.datasets.map((dataset) => (
          <AccordionItem value={dataset.id} key={dataset.id} className="border-b border-sidebar-border">
            <ContextMenu>
              <ContextMenuTrigger className="w-full">
                <AccordionTrigger className={cn("hover:no-underline rounded-md hover:bg-sidebar-accent px-2 text-sidebar-foreground/80 hover:text-sidebar-foreground w-full", state === 'collapsed' && 'justify-center')}>
                  <div className="flex items-center gap-2 text-sm overflow-hidden">
                    <Database className="h-4 w-4 flex-shrink-0" />
                    {state === 'expanded' && <span className="truncate">{dataset.name}</span>}
                  </div>
                </AccordionTrigger>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem className="text-destructive" onSelect={() => setDeletingDataset(dataset)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Dataset
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            <AccordionContent className="pl-6 pt-1 pb-1">
              {loadingTables[dataset.id] ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground/60" />
                </div>
              ) : (
                <ul className="space-y-1">
                  {dataset.tables.map((table) => (
                    <ContextMenu key={table.id}>
                      <ContextMenuTrigger>
                        <li
                          draggable
                          onDragStart={(e) => handleDragStart(e, table)}
                          onDragEnd={(e) => e.currentTarget.classList.remove('opacity-50')}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <button
                            onClick={() => onTableSelect(table)}
                            className={cn(
                              'w-full text-left flex items-center gap-2 p-2 rounded-md text-sm transition-colors overflow-hidden',
                              selectedTable?.id === table.id
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90'
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            )}
                          >
                            <TableIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{table.name}</span>
                          </button>
                        </li>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onSelect={() => onTableSelect(table)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Use in Editor
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => setViewingMetadata(table)}>
                          <Info className="mr-2 h-4 w-4" />
                          Show Metadata
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem className="text-destructive" onSelect={() => setDeletingTable({ table, dataset })}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Table
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                  {dataset.tables.length === 0 && !loadingTables[dataset.id] && (
                    <p className="text-xs text-sidebar-foreground/60 px-2 py-1">No tables in this dataset.</p>
                  )}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    )
  }

  return (
    <>
      <SidebarHeader>
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center gap-2 overflow-hidden">
            <DatabaseZap className="h-8 w-8 text-sidebar-primary flex-shrink-0" onClick={toggleSidebar} />
            {state === 'expanded' && <span className="text-lg font-semibold text-sidebar-foreground truncate">Semantik</span>}
          </div>
          {state === 'expanded' && (
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onRefresh} disabled={isLoadingSchema}>
              <RefreshCcw className={cn("h-4 w-4", isLoadingSchema && "animate-spin")} />
            </Button>
          )}
        </div>
        {state === 'expanded' && <Select onValueChange={handleProjectChange} value={currentProjectId}>
          <SelectTrigger className="w-full bg-sidebar-accent border-sidebar-border text-sidebar-foreground focus:ring-sidebar-ring">
            <SelectValue>
              <span className="truncate">{selectedProjectName}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {userProjects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <span className="truncate">{project.name} ({project.id})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>}
      </SidebarHeader>

      <SidebarContent>
        {renderContent()}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href={getLink("/")} className='w-full'>
              <SidebarMenuButton tooltip="Query Explorer">
                <Home />
                {state === 'expanded' && <span>Explorer</span>}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href={getLink("/dashboard")} className='w-full'>
              <SidebarMenuButton tooltip="Dashboard">
                <BarChart />
                {state === 'expanded' && <span>Dashboard</span>}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Settings />
              {state === 'expanded' && <span>Settings</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={handleLogout}>
              <LogOut />
              {state === 'expanded' && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <ConfirmationDialog
        isOpen={!!deletingDataset}
        onOpenChange={(isOpen) => !isOpen && setDeletingDataset(null)}
        onConfirm={handleDeleteDataset}
        title={`Delete Dataset: ${deletingDataset?.name}`}
        description={`Are you sure you want to delete the dataset '${deletingDataset?.name}'? This action is permanent and cannot be undone.`}
        confirmText="Delete"
        isConfirming={isDeleting}
      />
      <ConfirmationDialog
        isOpen={!!deletingTable}
        onOpenChange={(isOpen) => !isOpen && setDeletingTable(null)}
        onConfirm={handleDeleteTable}
        title={`Delete Table: ${deletingTable?.table.name}`}
        description={`Are you sure you want to delete the table '${deletingTable?.table.name}' from the dataset '${deletingTable?.dataset.name}'? This action is permanent and cannot be undone.`}
        confirmText="Delete"
        isConfirming={isDeleting}
      />
      <MetadataDialog
        table={viewingMetadata}
        isOpen={!!viewingMetadata}
        onOpenChange={(isOpen) => !isOpen && setViewingMetadata(null)}
      />
    </>
  );
}

function MetadataDialog({ table, isOpen, onOpenChange }: { table: Table | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const metadataItems = table ? [
    { label: "Table ID", value: table.id, icon: <TableIcon /> },
    { label: "Location", value: table.location, icon: <TableIcon /> },
    { label: "Type", value: table.type, icon: <Info /> },
    { label: "Created", value: table.creationTime ? new Date(Number(table.creationTime)).toLocaleString() : 'N/A', icon: <Calendar /> },
    { label: "Last Modified", value: table.lastModifiedTime ? new Date(Number(table.lastModifiedTime)).toLocaleString() : 'N/A', icon: <Calendar /> },
    { label: "Size", value: table.numBytes ? formatBytes(Number(table.numBytes)) : 'N/A', icon: <HardDrive /> },
    { label: "Rows", value: table.numRows ? Number(table.numRows).toLocaleString() : 'N/A', icon: <Rows /> },
  ] : [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="text-primary" />
            Metadata for {table?.name}
          </DialogTitle>
          <DialogDescription>
            Detailed information about this BigQuery table.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {metadataItems.map(item => (
            <div key={item.label} className="flex items-start gap-3 p-2 rounded-md bg-muted/50">
              <div className="text-muted-foreground mt-1">{item.icon}</div>
              <div>
                <p className="font-semibold text-muted-foreground">{item.label}</p>
                <p className="text-foreground break-all">{item.value}</p>
              </div>
            </div>
          ))}
          <div className="col-span-1 md:col-span-2 flex items-start gap-3 p-2 rounded-md bg-muted/50">
            <div className="text-muted-foreground mt-1"><Info /></div>
            <div>
              <p className="font-semibold text-muted-foreground">Description</p>
              <p className="text-foreground break-all">{table?.description || 'No description provided.'}</p>
            </div>
          </div>
        </div>
        {table?.timePartitioning && (
          <div>
            <h4 className="font-semibold mb-2">Time Partitioning</h4>
            <div className="text-sm p-3 bg-muted/50 rounded-md space-y-1">
              <p><span className="font-semibold">Field:</span> {table.timePartitioning.field}</p>
              <p><span className="font-semibold">Type:</span> {table.timePartitioning.type}</p>
              {table.timePartitioning.expirationMs && <p><span className="font-semibold">Expiration:</span> {Number(table.timePartitioning.expirationMs) / 1000 / 60 / 60} hours</p>}
            </div>
          </div>
        )}
        {table?.rangePartitioning && (
          <div>
            <h4 className="font-semibold mb-2">Range Partitioning</h4>
            <div className="text-sm p-3 bg-muted/50 rounded-md space-y-1">
              <p><span className="font-semibold">Field:</span> {table.rangePartitioning.field}</p>
              <p><span className="font-semibold">Start:</span> {table.rangePartitioning.range.start}</p>
              <p><span className="font-semibold">End:</span> {table.rangePartitioning.range.end}</p>
              <p><span className="font-semibold">Interval:</span> {table.rangePartitioning.range.interval}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


