

'use client';

import React, { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Table2, Plus, Lightbulb, X, ArrowRight, Loader2, ArrowLeft, CheckCircle, AlertTriangle, Pencil, Trash2, Link as LinkIcon, ArrowLeftCircle, ArrowRightCircle } from 'lucide-react';
import type { Table } from '@/lib/bigquery-mock';
import { Rnd } from 'react-rnd';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription as DialogDescriptionComponent,
    DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { proposeJoins, ProposeJoinsOutput } from '@/ai/flows/propose-joins';
import { generateSqlFromSemanticLayer } from '@/ai/flows/generate-sql-from-semantic-layer';
import { createSemanticView, checkDatasetExists, createBqDataset, upsertSemanticViewMetadata, getSemanticViewConfig, getTableDetails, runBigQueryQuery, deleteSemanticView } from '@/app/actions';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Editor } from '@monaco-editor/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { cn } from '@/lib/utils';


function TableCard({
    table,
    onRemove,
    selectedFields,
    onFieldSelectionChange,
    onScroll,
}: {
    table: Table,
    onRemove: () => void,
    selectedFields: string[],
    onFieldSelectionChange: (fieldName: string, isSelected: boolean) => void,
    onScroll: () => void;
}) {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const handleSelectAll = (checked: boolean) => {
        table.schema.forEach(field => {
            onFieldSelectionChange(field.name, checked);
        });
    }

    useEffect(() => {
        const scrollable = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
        if (scrollable) {
            scrollable.addEventListener('scroll', onScroll);
            return () => scrollable.removeEventListener('scroll', onScroll);
        }
    }, [onScroll]);

    return (
        <div className="relative group h-full w-full">
            <Card className="w-full h-full bg-background shadow-md flex flex-col">
                <CardHeader className="p-3 border-b cursor-move flex-shrink-0">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Table2 className="h-4 w-4" />
                        {table.name}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-grow overflow-hidden">
                    <div className="p-2 border-b">
                        <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => handleSelectAll(true)}>Add all fields</Button>
                    </div>
                    <ScrollArea ref={scrollAreaRef} className="h-[calc(100%-2.5rem)]">
                        <ul className="space-y-1 text-sm p-2">
                            {table.schema.map((col) => (
                                <li
                                    key={col.name}
                                    className="flex items-center space-x-2 p-1 rounded-md hover:bg-secondary"
                                >
                                    <Checkbox
                                        id={`${table.id}-${col.name}`}
                                        checked={selectedFields.includes(col.name)}
                                        onCheckedChange={(checked) => onFieldSelectionChange(col.name, !!checked)}
                                    />
                                    <label
                                        htmlFor={`${table.id}-${col.name}`}
                                        className="flex justify-between items-center w-full text-xs cursor-pointer"
                                    >
                                        <span className="font-medium text-foreground truncate pr-2">{col.name}</span>
                                        <span className="text-muted-foreground font-mono">{col.type}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </CardContent>
            </Card>
            <Button
                variant="destructive"
                size="icon"
                className="absolute top-0 right-0 -m-2 h-6 w-6 hidden group-hover:flex z-20"
                onClick={onRemove}
            >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove table</span>
            </Button>
        </div>
    )
}

export type Relationship = {
    id: string;
    fromTable: string;
    fromField: string;
    toTable: string;
    toField: string;
    cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

type ViewDefinition = {
    tables: string[];
    relationships: Relationship[];
    selectedFields: Record<string, string[]>;
    tableStates: Record<string, { x: number; y: number; width: number | string; height: number | string }>;
}

const CARDINALITY_OPTIONS: Relationship['cardinality'][] = ['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'];

const RelationshipConnector = ({ fromCardRect, toCardRect, onClick }: { fromCardRect: DOMRect; toCardRect: DOMRect; onClick: () => void; }) => {
    if (!fromCardRect || !toCardRect) return null;

    const fromX = fromCardRect.left + fromCardRect.width / 2;
    const fromY = fromCardRect.top + fromCardRect.height / 2;
    const toX = toCardRect.left + toCardRect.width / 2;
    const toY = toCardRect.top + toCardRect.height / 2;

    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    return (
        <g>
            <line
                x1={fromX}
                y1={fromY}
                x2={toX}
                y2={toY}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                style={{ pointerEvents: 'none' }}
            />
            <foreignObject x={midX - 12} y={midY - 12} width="24" height="24" className="cursor-pointer" style={{ pointerEvents: 'auto' }}>
                <div
                    onClick={onClick}
                    className="w-full h-full flex items-center justify-center bg-background p-1 rounded-full border border-primary hover:bg-primary/10"
                >
                    <LinkIcon className="h-4 w-4 text-primary" />
                </div>
            </foreignObject>
        </g>
    );
};

export default function SemanticLayerView() {
    const [workflowStep, setWorkflowStep] = useState<'build' | 'save'>('build');

    const [droppedTables, setDroppedTables] = useState<Table[]>([]);
    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
    const [tableStates, setTableStates] = useState<Record<string, { x: number, y: number, width: number | string, height: number | string }>>({});
    const [viewName, setViewName] = useState('');

    const searchParams = useSearchParams();
    const projectId = searchParams.get('project');
    const router = useRouter();

    const { toast } = useToast();

    const handleSaveViewClick = () => {
        if (droppedTables.length === 0) {
            toast({ variant: 'destructive', title: 'Cannot save empty view', description: 'Add at least one table to the workspace.' });
            return;
        }
        if (Object.values(selectedFields).every(f => f.length === 0)) {
            toast({ variant: 'destructive', title: 'No fields selected', description: 'Select at least one field to include in the view.' });
            return;
        }
        setWorkflowStep('save');
    }

    const resetWorkspace = useCallback(() => {
        setDroppedTables([]);
        setRelationships([]);
        setSelectedFields({});
        setTableStates({});
        setViewName('');
    }, []);

    const handleBackToBuild = () => {
        setWorkflowStep('build');
    }

    const handleFinish = () => {
        resetWorkspace();
        router.push(`/semantic-layer?project=${projectId}`);
        setWorkflowStep('build');
    }

    if (workflowStep === 'save') {
        return <SaveViewStep
            tables={droppedTables}
            relationships={relationships}
            selectedFields={selectedFields}
            tableStates={tableStates}
            projectId={projectId || ''}
            onBack={handleBackToBuild}
            onFinish={handleFinish}
            viewName={viewName}
            setViewName={setViewName}
        />
    }

    return (
        <div className='flex flex-col h-full gap-4'>
            <ExistingViewsList projectId={projectId || ''} />
            <BuildViewStep
                droppedTables={droppedTables}
                setDroppedTables={setDroppedTables}
                relationships={relationships}
                setRelationships={setRelationships}
                selectedFields={selectedFields}
                setSelectedFields={setSelectedFields}
                tableStates={tableStates}
                setTableStates={setTableStates}
                onSaveViewClick={handleSaveViewClick}
                viewName={viewName}
                setViewName={setViewName}
                resetWorkspace={resetWorkspace}
            />
        </div>
    );
}

function BuildViewStep({
    droppedTables, setDroppedTables,
    relationships, setRelationships,
    selectedFields, setSelectedFields,
    tableStates, setTableStates,
    onSaveViewClick,
    viewName, setViewName,
    resetWorkspace
}: {
    droppedTables: Table[], setDroppedTables: React.Dispatch<React.SetStateAction<Table[]>>,
    relationships: Relationship[], setRelationships: React.Dispatch<React.SetStateAction<Relationship[]>>,
    selectedFields: Record<string, string[]>, setSelectedFields: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
    tableStates: Record<string, { x: number, y: number, width: number | string, height: number | string }>,
    setTableStates: React.Dispatch<React.SetStateAction<Record<string, { x: number, y: number, width: number | string, height: number | string }>>>,
    onSaveViewClick: () => void,
    viewName: string;
    setViewName: (name: string) => void;
    resetWorkspace: () => void;
}) {
    const [isProposing, setIsProposing] = useState(false);
    const [proposals, setProposals] = useState<ProposeJoinsOutput['proposals']>([]);
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('project');
    const viewToEdit = searchParams.get('edit');
    const router = useRouter();

    const [isLoadingView, setIsLoadingView] = useState(false);
    const [editingRelationship, setEditingRelationship] = useState<{ index: number } | null>(null);

    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [cardPositions, setCardPositions] = useState<Record<string, DOMRect>>({});
    const workspaceRef = useRef<HTMLDivElement>(null);

    const updatePositions = useCallback(() => {
        if (!workspaceRef.current) return;
        const workspaceRect = workspaceRef.current.getBoundingClientRect();

        const newCardPositions: Record<string, DOMRect> = {};
        Object.keys(cardRefs.current).forEach(cardKey => {
            const cardEl = cardRefs.current[cardKey];
            if (cardEl) {
                const rect = cardEl.getBoundingClientRect();
                newCardPositions[cardKey] = new DOMRect(
                    rect.x - workspaceRect.left,
                    rect.y - workspaceRect.top,
                    rect.width,
                    rect.height
                );
            }
        });
        setCardPositions(newCardPositions);

    }, []);

    useEffect(() => {
        const loadViewForEditing = async () => {
            if (!viewToEdit || !projectId) {
                // Only reset if we are not trying to edit and the workspace is empty.
                if (!viewToEdit && droppedTables.length === 0) resetWorkspace();
                return;
            }

            setIsLoadingView(true);
            // Do not reset here, let the new data overwrite it
            try {
                const config: ViewDefinition = await getSemanticViewConfig(projectId, viewToEdit);
                if (!config) {
                    toast({ variant: 'destructive', title: 'View not found', description: `Could not find metadata for view '${viewToEdit}'.` });
                    router.push(`/semantic-layer?project=${projectId}`);
                    setIsLoadingView(false);
                    return;
                }

                const tableDetails = await Promise.all(config.tables.map(tableId => getTableDetails(projectId, tableId)));

                setDroppedTables(tableDetails);
                setRelationships(config.relationships || []);
                setSelectedFields(config.selectedFields || {});
                setTableStates(config.tableStates || {});
                setViewName(viewToEdit);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Failed to load view', description: e.message });
            } finally {
                setIsLoadingView(false);
            }
        };
        loadViewForEditing();
        // We remove resetWorkspace from dependencies to prevent it from clearing state on re-renders.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewToEdit, projectId, toast, router]);


    useLayoutEffect(() => {
        updatePositions();
        const resizeObserver = new ResizeObserver(() => updatePositions());
        const currentWorkspace = workspaceRef.current;
        if (currentWorkspace) {
            resizeObserver.observe(currentWorkspace);
        }

        return () => {
            if (currentWorkspace) {
                resizeObserver.unobserve(currentWorkspace);
            }
        };
    }, [updatePositions, droppedTables, tableStates]);


    const registerCardRef = useCallback((tableId: string, el: HTMLElement | null) => {
        cardRefs.current[tableId] = el as HTMLDivElement;
    }, []);

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const tableData = event.dataTransfer.getData('application/json');
        if (tableData) {
            try {
                const table: Table = JSON.parse(tableData);
                if (!droppedTables.some(t => t.id === table.id)) {
                    setDroppedTables(prevTables => [...prevTables, table]);
                    setSelectedFields(prev => ({ ...prev, [table.id]: [] }));
                    setTableStates(prev => ({
                        ...prev,
                        [table.id]: { x: event.clientX - (workspaceRef.current?.getBoundingClientRect().left || 0) - 128, y: event.clientY - (workspaceRef.current?.getBoundingClientRect().top || 0) - 32, width: 256, height: 350 }
                    }));
                }
            } catch (error) {
                console.error("Failed to parse dropped data", error);
            }
        }
    };

    const handleFieldSelectionChange = (tableId: string, fieldName: string, isSelected: boolean) => {
        setSelectedFields(prev => {
            const currentFields = prev[tableId] || [];
            const newFields = isSelected
                ? [...currentFields, fieldName]
                : currentFields.filter(f => f !== fieldName);
            return { ...prev, [tableId]: [...new Set(newFields)] };
        });
    }

    const handleAddRelationship = (rel: Omit<Relationship, 'id'>) => {
        const newRel = { ...rel, id: `${rel.fromTable}.${rel.fromField}-${rel.toTable}.${rel.toField}` };
        if (!relationships.some(r => r.id === newRel.id)) {
            setRelationships(prev => [...prev, newRel]);
            toast({ title: 'Relationship added' });
        } else {
            toast({ variant: 'destructive', title: 'Relationship already exists' });
        }
        setEditingRelationship(null);
    }

    const handleUpdateRelationship = (relIndex: number, updatedRel: Relationship) => {
        setRelationships(prev => prev.map((r, i) => i === relIndex ? updatedRel : r));
        toast({ title: 'Relationship updated' });
    }

    const handleRemoveRelationship = (relIndex: number) => {
        setRelationships(prev => prev.filter((_, i) => i !== relIndex));
        toast({ title: 'Relationship removed' });
        setEditingRelationship(null);
    }

    const handleSuggestJoins = async () => {
        if (droppedTables.length < 2) {
            toast({ variant: 'destructive', title: 'Not enough tables', description: 'Please add at least two tables to suggest joins.' });
            return;
        }
        setIsProposing(true);
        try {
            const tableSchemas = droppedTables.map(t => ({
                id: t.id,
                name: t.name,
                schema: t.schema.map(f => ({ name: f.name, type: f.type, mode: f.mode || 'NULLABLE' }))
            }));
            const result = await proposeJoins({ tables: tableSchemas });
            setProposals(result.proposals);
            if (result.proposals.length > 0) {
                setEditingRelationship(null); // Ensure we are in "add" mode
            } else {
                toast({ title: 'No join proposals found' });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'AI Suggestion Failed', description: e.message });
        } finally {
            setIsProposing(false);
        }
    }

    const handleUseProposal = (proposal: ProposeJoinsOutput['proposals'][0]) => {
        const newRel = { ...proposal, id: `${proposal.fromTable}.${proposal.fromField}-${proposal.toTable}.${proposal.toField}` };
        if (!relationships.some(r => r.id === newRel.id)) {
            setRelationships(prev => [...prev, newRel]);
            toast({ title: 'Relationship added from proposal' });
        } else {
            toast({ variant: 'destructive', title: 'Relationship already exists' });
        }
        setProposals(proposals.filter(p => p !== proposal));
    }

    const removeTable = (tableId: string) => {
        setDroppedTables(prev => prev.filter(t => t.id !== tableId));
        setRelationships(prev => prev.filter(r => r.fromTable !== tableId && r.toTable !== tableId));
        setSelectedFields(prev => {
            const newFields = { ...prev };
            delete newFields[tableId];
            return newFields;
        });
        setTableStates(prev => {
            const newStates = { ...prev };
            delete newStates[tableId];
            return newStates;
        });
        delete cardRefs.current[tableId];

        toast({
            title: "Table removed",
            description: "The table and its relationships have been removed from the workspace."
        })
    }

    const updateTableState = (tableId: string, delta: { x: number, y: number }, size?: { width: string | number, height: string | number }) => {
        setTableStates(prev => {
            const newState = {
                ...prev[tableId],
                x: delta.x,
                y: delta.y,
                ...(size && { width: size.width, height: size.height }),
            };
            return { ...prev, [tableId]: newState };
        });
        updatePositions();
    };

    const isDialogOpen = proposals.length > 0 || editingRelationship !== null;
    const closeDialog = () => {
        setProposals([]);
        setEditingRelationship(null);
    }

    return (
        <Card className="flex flex-col h-full flex-grow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{viewToEdit ? `Edit: ${viewName}` : 'Create Semantic View'}</CardTitle>
                        <CardDescription>Drag tables to build a view, define relationships, and select fields.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleSuggestJoins} disabled={isProposing || droppedTables.length < 2}>
                            {isProposing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                            {isProposing ? 'Analyzing...' : 'Suggest Joins'}
                        </Button>
                        <Button variant="outline" onClick={() => { setProposals([]); setEditingRelationship({ index: -1 }); }} disabled={droppedTables.length < 2}>
                            <Plus className="mr-2 h-4 w-4" /> Add Relationship
                        </Button>
                        <Button onClick={onSaveViewClick}><Save className="mr-2 h-4 w-4" /> Generate SQL View</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                <div ref={workspaceRef} onDragOver={handleDragOver} onDrop={handleDrop} className="relative w-full flex-grow h-[70vh] border-2 border-dashed rounded-lg bg-secondary/50 p-4 overflow-hidden">

                    {isLoadingView ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : droppedTables.length === 0 ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <p className="text-muted-foreground">Drag and drop tables here</p>
                        </div>
                    ) : (
                        droppedTables.map((table) => (
                            <Rnd
                                key={table.id}
                                size={{ width: tableStates[table.id]?.width || 256, height: tableStates[table.id]?.height || 350 }}
                                position={{ x: tableStates[table.id]?.x || 0, y: tableStates[table.id]?.y || 0 }}
                                onDragStop={(e, d) => { updateTableState(table.id, { x: d.x, y: d.y }); }}
                                onResizeStop={(e, direction, ref, delta, position) => {
                                    updateTableState(table.id, position, { width: ref.style.width, height: ref.style.height });
                                }}
                                minWidth={200}
                                minHeight={350}
                                bounds="parent"
                                className="z-10"
                                dragHandleClassName="cursor-move"
                                ref={el => registerCardRef(table.id, el?.getSelfElement() ?? null)}
                            >
                                <TableCard
                                    table={table}
                                    onRemove={() => removeTable(table.id)}
                                    selectedFields={selectedFields[table.id] || []}
                                    onFieldSelectionChange={(fieldName, isSelected) => handleFieldSelectionChange(table.id, fieldName, isSelected)}
                                    onScroll={updatePositions}
                                />
                            </Rnd>
                        ))
                    )}

                    <svg className="absolute top-0 left-0 w-full h-full z-0" style={{ pointerEvents: 'none' }}>
                        {relationships.map((rel, index) => {
                            const fromCardRect = cardPositions[rel.fromTable];
                            const toCardRect = cardPositions[rel.toTable];

                            if (fromCardRect && toCardRect) {
                                return <RelationshipConnector
                                    key={rel.id}
                                    fromCardRect={fromCardRect}
                                    toCardRect={toCardRect}
                                    onClick={() => { setEditingRelationship({ index }); setProposals([]); }}
                                />
                            }
                            return null;
                        })}
                    </svg>
                </div>
                {relationships.length > 0 && (
                    <div className="mt-4 flex-shrink-0">
                        <h3 className="text-lg font-semibold mb-2">Defined Joins</h3>
                        <Card>
                            <CardContent className="p-4 space-y-2">
                                {relationships.map(rel => {
                                    const fromTable = droppedTables.find(t => t.id === rel.fromTable);
                                    const toTable = droppedTables.find(t => t.id === rel.toTable);
                                    return (
                                        <div key={rel.id} className="text-sm p-2 bg-muted rounded-md flex items-center justify-between">
                                            <div>
                                                <span className="font-semibold">{fromTable?.name}</span>
                                                <span className="text-muted-foreground"> ({rel.fromField})</span>
                                                <span className="mx-2 text-primary font-bold">&rarr;</span>
                                                <span className="font-semibold">{toTable?.name}</span>
                                                <span className="text-muted-foreground"> ({rel.toField})</span>
                                            </div>
                                            <span className="text-xs font-mono bg-primary/10 text-primary rounded px-2 py-0.5">{rel.cardinality}</span>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </CardContent>
            <RelationshipDialog
                isOpen={isDialogOpen}
                onOpenChange={(open) => !open && closeDialog()}
                tables={droppedTables}
                relationships={relationships}
                startIndex={editingRelationship?.index ?? -1}
                onAddRelationship={handleAddRelationship}
                onUpdateRelationship={handleUpdateRelationship}
                onRemoveRelationship={handleRemoveRelationship}
                proposals={proposals}
                onUseProposal={handleUseProposal}
                setProposals={setProposals}
            />
        </Card>
    );
}


function RelationshipDialog({
    isOpen,
    onOpenChange,
    tables,
    relationships,
    startIndex,
    onAddRelationship,
    onUpdateRelationship,
    onRemoveRelationship,
    proposals,
    onUseProposal,
    setProposals
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    tables: Table[];
    relationships: Relationship[];
    startIndex: number;
    onAddRelationship: (rel: Omit<Relationship, 'id'>) => void;
    onUpdateRelationship: (relIndex: number, rel: Relationship) => void;
    onRemoveRelationship: (relIndex: number) => void;
    proposals: ProposeJoinsOutput['proposals'];
    onUseProposal: (proposal: ProposeJoinsOutput['proposals'][0]) => void;
    setProposals: (proposals: ProposeJoinsOutput['proposals']) => void;
}) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const isEditing = startIndex !== -1;
    const currentRelationship = isEditing ? relationships[currentIndex] : null;

    const [fromTableId, setFromTableId] = useState<string | undefined>();
    const [fromField, setFromField] = useState<string | undefined>();
    const [toTableId, setToTableId] = useState<string | undefined>();
    const [toField, setToField] = useState<string | undefined>();
    const [cardinality, setCardinality] = useState<Relationship['cardinality']>('one-to-one');

    useEffect(() => {
        if (isOpen) {
            const initialIndex = startIndex < 0 ? 0 : startIndex;
            setCurrentIndex(initialIndex);
        }
    }, [isOpen, startIndex]);

    useEffect(() => {
        if (isEditing) {
            const rel = relationships[currentIndex];
            if (rel) {
                setFromTableId(rel.fromTable);
                setFromField(rel.fromField);
                setToTableId(rel.toTable);
                setToField(rel.toField);
                setCardinality(rel.cardinality);
            }
        } else {
            // Reset form for "Add New" mode
            setFromTableId(undefined);
            setFromField(undefined);
            setToTableId(undefined);
            setToField(undefined);
            setCardinality('one-to-one');
        }
    }, [currentIndex, isEditing, relationships]);


    const fromTable = tables.find(t => t.id === fromTableId);
    const toTable = tables.find(t => t.id === toTableId);

    const handleSubmit = () => {
        if (fromTableId && fromField && toTableId && toField) {
            if (isEditing && currentRelationship) {
                onUpdateRelationship(currentIndex, { id: currentRelationship.id, fromTable: fromTableId, fromField, toTable: toTableId, toField, cardinality });
            } else {
                onAddRelationship({ fromTable: fromTableId, fromField, toTable: toTableId, toField, cardinality });
            }
        }
    };

    const handleRemove = () => {
        if (isEditing) {
            onRemoveRelationship(currentIndex);
        }
    }

    const handleNext = () => {
        setCurrentIndex(prev => (prev + 1) % relationships.length);
    }

    const handlePrev = () => {
        setCurrentIndex(prev => (prev - 1 + relationships.length) % relationships.length);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>{isEditing ? 'Edit Relationships' : 'Add Relationship'}</DialogTitle>
                        {isEditing && relationships.length > 1 && (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={handlePrev} className="h-7 w-7"><ArrowLeftCircle /></Button>
                                <span className="text-sm text-muted-foreground">{currentIndex + 1} of {relationships.length}</span>
                                <Button variant="ghost" size="icon" onClick={handleNext} className="h-7 w-7"><ArrowRightCircle /></Button>
                            </div>
                        )}
                    </div>
                    <DialogDescriptionComponent>{isEditing ? 'Modify or remove this join.' : 'Define a join between two tables manually or use an AI suggestion.'}</DialogDescriptionComponent>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-4">
                    {proposals.length > 0 && !isEditing && (
                        <div className='space-y-2'>
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-foreground">AI Suggestions</h3>
                                <Button variant="ghost" size="sm" onClick={() => setProposals([])}>Clear</Button>
                            </div>
                            <ScrollArea className="max-h-48 w-full">
                                <div className="space-y-2 border rounded-lg p-2 mr-4">
                                    {proposals.map((p, index) => {
                                        const fromTableName = tables.find(t => t.id === p.fromTable)?.name || p.fromTable;
                                        const toTableName = tables.find(t => t.id === p.toTable)?.name || p.toTable;
                                        return (
                                            <div key={`${p.fromTable}-${p.toTable}-${index}`} className="flex items-start justify-between p-3 bg-secondary/50 rounded-md gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-sm text-foreground">{p.reason}</p>
                                                    <div className="flex items-center text-muted-foreground text-sm gap-2">
                                                        <span className="font-mono text-xs bg-muted p-1 rounded-sm">{fromTableName}.{p.fromField}</span>
                                                        <ArrowRight className="h-4 w-4 inline text-primary flex-shrink-0" />
                                                        <span className="font-mono text-xs bg-muted p-1 rounded-sm">{toTableName}.{p.toField}</span>
                                                    </div>
                                                </div>
                                                <div className='flex items-center gap-2'>
                                                    <div className="text-xs font-mono bg-primary/10 text-primary rounded px-2 py-1">{p.cardinality}</div>
                                                    <Button size="sm" onClick={() => onUseProposal(p)}>Use</Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    {proposals.length > 0 && !isEditing && <Separator />}

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="space-y-1">
                            <Label htmlFor="from-table">From Table</Label>
                            <Select onValueChange={setFromTableId} value={fromTableId}>
                                <SelectTrigger><SelectValue placeholder="Select a table" /></SelectTrigger>
                                <SelectContent>
                                    {tables.filter(t => t.id !== toTableId).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="from-field">From Field</Label>
                            <Select onValueChange={setFromField} disabled={!fromTable} value={fromField}>
                                <SelectTrigger><SelectValue placeholder="Select a field" /></SelectTrigger>
                                <SelectContent>
                                    {fromTable?.schema.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="to-table">To Table</Label>
                            <Select onValueChange={setToTableId} value={toTableId}>
                                <SelectTrigger><SelectValue placeholder="Select a table" /></SelectTrigger>
                                <SelectContent>
                                    {tables.filter(t => t.id !== fromTableId).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="to-field">To Field</Label>
                            <Select onValueChange={setToField} disabled={!toTable} value={toField}>
                                <SelectTrigger><SelectValue placeholder="Select a field" /></SelectTrigger>
                                <SelectContent>
                                    {toTable?.schema.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 col-span-2">
                            <Label htmlFor="cardinality">Cardinality</Label>
                            <Select onValueChange={(v) => setCardinality(v as any)} value={cardinality}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {CARDINALITY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {isEditing && (
                        <div className="flex justify-center items-center gap-2">
                            {relationships.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentIndex(index)}
                                    className={cn(
                                        "h-2 w-2 rounded-full transition-colors",
                                        index === currentIndex ? "bg-primary" : "bg-muted-foreground/50 hover:bg-muted-foreground"
                                    )}
                                    aria-label={`Go to relationship ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <DialogFooter className="justify-between">
                    <div>
                        {isEditing && <Button variant="destructive" onClick={handleRemove}><Trash2 className="mr-2 h-4 w-4" /> Remove</Button>}
                    </div>
                    <div className='flex gap-2'>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={!fromTableId || !fromField || !toTableId || !toField}>
                            {isEditing ? 'Update' : 'Add'} Relationship
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const SEMANTIC_VIEWS_DATASET = 'semantic_views';
const METADATA_TABLE = 'semantic_views_metadata';

type CreationStatus = 'idle' | 'checking-dataset' | 'dataset-missing' | 'creating-dataset' | 'creating-view' | 'success' | 'error';


function SaveViewStep({
    onBack,
    onFinish,
    tables,
    relationships,
    selectedFields,
    tableStates,
    projectId,
    viewName,
    setViewName,
}: {
    onBack: () => void;
    onFinish: () => void;
    tables: Table[];
    relationships: Relationship[];
    selectedFields: Record<string, string[]>;
    tableStates: Record<string, any>;
    projectId: string;
    viewName: string;
    setViewName: (name: string) => void;
}) {
    const { toast } = useToast();
    // const { user } = useUser();
    const user = { displayName: 'User' }; // Placeholder
    const [isGeneratingSql, setIsGeneratingSql] = useState(true);
    const [generatedSql, setGeneratedSql] = useState('');
    const [creationStatus, setCreationStatus] = useState<CreationStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const viewToEdit = searchParams.get('edit');

    const handleGenerateSql = useCallback(async () => {
        if (!viewName) {
            setIsGeneratingSql(false);
            return;
        };
        setIsGeneratingSql(true);
        setGeneratedSql('');
        try {
            const input = {
                viewName,
                tables,
                relationships,
                selectedFields,
                projectId,
            };
            const result = await generateSqlFromSemanticLayer(input);
            setGeneratedSql(result.sqlQuery);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to generate SQL', description: e.message });
        } finally {
            setIsGeneratingSql(false);
        }
    }, [viewName, tables, relationships, selectedFields, projectId, toast]);


    useEffect(() => {
        if (tables.length > 0 && !viewToEdit && !viewName) {
            const defaultName = `view_${tables.map(t => t.name.toLowerCase()).join('_')}`;
            setViewName(defaultName);
        }
    }, [tables, viewToEdit, viewName, setViewName]);

    useEffect(() => {
        handleGenerateSql();
    }, [viewName, handleGenerateSql]);

    const handleCreateView = async () => {
        if (!generatedSql || !projectId) return;

        setCreationStatus('checking-dataset');
        setErrorMessage(null);

        try {
            const datasetExists = await checkDatasetExists(projectId, SEMANTIC_VIEWS_DATASET);
            if (!datasetExists) {
                setCreationStatus('dataset-missing');
                return;
            }
            await createView(generatedSql);
        } catch (e: any) {
            setErrorMessage(e.message);
            setCreationStatus('error');
        }
    }

    const handleCreateDatasetAndContinue = async () => {
        setCreationStatus('creating-dataset');
        setErrorMessage(null);

        try {
            const tableLocation = tables.length > 0 ? tables[0].location : undefined;
            await createBqDataset(projectId, SEMANTIC_VIEWS_DATASET, tableLocation);
            await createView(generatedSql);
        } catch (e: any) {
            setErrorMessage(e.message);
            setCreationStatus('error');
        }
    }

    const createView = async (sql: string) => {
        if (!user || !user.displayName) {
            toast({ variant: 'destructive', title: 'User not found', description: 'Could not identify the current user.' });
            return;
        }
        setCreationStatus('creating-view');

        const viewDefinition: ViewDefinition = {
            tables: tables.map(t => t.id),
            relationships,
            selectedFields,
            tableStates,
        };

        try {
            await createSemanticView(projectId, sql);
            await upsertSemanticViewMetadata(projectId, SEMANTIC_VIEWS_DATASET, METADATA_TABLE, viewName, viewDefinition, user.displayName);
            setCreationStatus('success');
        } catch (e: any) {
            setErrorMessage(e.message);
            setCreationStatus('error');
        }
    }

    const isLoading = isGeneratingSql || creationStatus === 'checking-dataset' || creationStatus === 'creating-dataset' || creationStatus === 'creating-view';
    const tableLocation = tables.length > 0 ? tables[0].location : 'Default';


    return (
        <>
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Generate SQL View</CardTitle>
                            <CardDescription>Review and confirm the generated SQL, then save the view to BigQuery.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onBack} disabled={isLoading}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                            <Button onClick={handleCreateView} disabled={isLoading || !generatedSql}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {creationStatus === 'creating-view' ? 'Saving View...' : 'Save View'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col gap-6 min-h-0">
                    <div className="space-y-2">
                        <Label htmlFor="view-name">View Name</Label>
                        <Input
                            id="view-name"
                            value={viewName}
                            onChange={(e) => setViewName(e.target.value)}
                            placeholder="e.g., quarterly_sales_with_feedback"
                            disabled={isLoading || !!viewToEdit}
                        />
                    </div>
                    <div className="space-y-2 flex flex-col flex-grow min-h-0">
                        <Label>Generated SQL</Label>
                        <div className="border rounded-md flex-grow h-full">
                            {isGeneratingSql ? (
                                <div className="flex items-center justify-center p-8 space-x-2 bg-secondary h-full">
                                    <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />
                                    <span className="text-muted-foreground">AI is generating your SQL view...</span>
                                </div>
                            ) : (
                                <Editor
                                    height="100%"
                                    language="sql"
                                    theme="vs-light"
                                    value={generatedSql}
                                    options={{
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        readOnly: true,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
            <StatusDialog
                status={creationStatus}
                error={errorMessage}
                onConfirm={handleCreateDatasetAndContinue}
                onClose={() => setCreationStatus('idle')}
                onFinish={onFinish}
                location={tableLocation}
            />
        </>
    );
}


function StatusDialog({ status, error, onConfirm, onClose, onFinish, location }: { status: CreationStatus, error: string | null, onConfirm: () => void, onClose: () => void, onFinish: () => void, location?: string }) {
    const isOpen = status !== 'idle';

    let title = '';
    let content: React.ReactNode;
    let showFooter = true;

    switch (status) {
        case 'checking-dataset':
            title = 'Deploying View';
            content = <div className="flex items-center gap-2"><Loader2 className="animate-spin" />Checking for 'semantic_views' dataset...</div>;
            showFooter = false;
            break;
        case 'dataset-missing':
            title = 'Action Required';
            content = <div className='space-y-4'>
                <p>The dataset <span className='font-mono bg-muted p-1 rounded-sm'>semantic_views</span> does not exist.</p>
                {location && <p>It will be created in the <span className="font-semibold">{location}</span> region to match your source tables.</p>}
                <p>Would you like to create it now?</p>
            </div>;
            break;
        case 'creating-dataset':
            title = 'Deploying View';
            content = <div className="flex items-center gap-2"><Loader2 className="animate-spin" />Creating 'semantic_views' dataset in {location}...</div>;
            showFooter = false;
            break;
        case 'creating-view':
            title = 'Deploying View';
            content = <div className="flex items-center gap-2"><Loader2 className="animate-spin" />Creating the view and saving metadata in BigQuery...</div>;
            showFooter = false;
            break;
        case 'error':
            title = 'Deployment Failed';
            content = <div className='space-y-4'><div className="flex items-start gap-2 text-destructive"><AlertTriangle className="h-5 w-5 mt-0.5" />An error occurred.</div><p className='text-sm text-muted-foreground p-2 border bg-secondary rounded-md'>{error}</p></div>
            break;
        case 'success':
            title = "Deployment Successful!"
            content = <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />The semantic view has been created in BigQuery.</div>
            break;
        case 'idle':
            return null;

    }

    const handleDialogClose = () => {
        if (status === 'success') {
            onFinish();
        } else {
            onClose();
        }
    }


    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="py-4">{content}</div>
                {showFooter && (
                    <DialogFooter>
                        {status === 'dataset-missing' && (
                            <>
                                <Button variant="outline" onClick={onClose}>Cancel</Button>
                                <Button onClick={onConfirm}>Create Dataset and Continue</Button>
                            </>
                        )}
                        {status === 'error' && (
                            <Button variant="outline" onClick={onClose}>Close</Button>
                        )}
                        {status === 'success' && (
                            <Button onClick={onFinish}>Finish</Button>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}

function ExistingViewsList({ projectId }: { projectId: string }) {
    const [views, setViews] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewToDelete, setViewToDelete] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    // const { user } = useUser();
    const user = { displayName: 'User' }; // Placeholder or passed prop if needed

    const fetchViews = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError(null);
        try {
            const query = `
                WITH LatestVersions AS (
                    SELECT 
                        view_name, 
                        MAX(version) as latest_version
                    FROM \`${projectId}.semantic_views.semantic_views_metadata\`
                    GROUP BY view_name
                )
                SELECT 
                    t.view_name, 
                    t.last_updated, 
                    t.last_updated_by, 
                    t.created_by,
                    t.version,
                    t.status
                FROM \`${projectId}.semantic_views.semantic_views_metadata\` t
                JOIN LatestVersions lv ON t.view_name = lv.view_name AND t.version = lv.latest_version
                WHERE t.status = 'active'
                ORDER BY t.last_updated DESC
            `;
            const results = await runBigQueryQuery(query, projectId);
            setViews(results);
        } catch (e: any) {
            if (!e.message.includes('Not found')) {
                setError(e.message);
            } else {
                setViews([]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchViews();
    }, [fetchViews]);

    const handleEdit = (viewName: string) => {
        router.push(`/semantic-layer?project=${projectId}&edit=${viewName}`);
    }

    const handleDelete = async () => {
        if (!viewToDelete) return;
        setIsDeleting(true);
        try {
            await deleteSemanticView(projectId, viewToDelete.view_name);
            toast({
                title: "View Deleted",
                description: `Semantic view '${viewToDelete.view_name}' has been deleted.`
            });
            setViewToDelete(null);
            fetchViews(); // Refresh the list
        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: "Deletion Failed",
                description: e.message
            });
        } finally {
            setIsDeleting(false);
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Existing Semantic Views</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Failed to load views</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    if (views.length === 0) {
        return null;
    }


    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Existing Semantic Views</CardTitle>
                    <CardDescription>Manage and edit your previously created semantic views.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {views.map((view) => (
                            <div key={view.view_name} className="flex items-center justify-between p-3 bg-muted rounded-md">
                                <div>
                                    <p className="font-semibold">{view.view_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Last updated: {new Date(view.last_updated.value).toLocaleString()} by {view.last_updated_by || view.created_by || 'Unknown'} (v{view.version})
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(view.view_name)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => setViewToDelete(view)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
            <ConfirmationDialog
                isOpen={!!viewToDelete}
                onOpenChange={(isOpen) => !isOpen && setViewToDelete(null)}
                onConfirm={handleDelete}
                title={`Delete View: ${viewToDelete?.view_name}`}
                description="Are you sure? This will permanently delete the view from BigQuery and mark its metadata as deleted."
                confirmText="Delete"
                isConfirming={isDeleting}
            />
        </>
    )
}




