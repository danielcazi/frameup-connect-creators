// src/components/kanban/KanbanBoard.tsx
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { KanbanColumn, organizeProjectsByColumn } from '@/utils/kanbanHelpers';
import { KanbanProjectCard, KanbanProject } from './KanbanProjectCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Re-export specific Project type if needed, or stick to the one defined in Card
interface Project extends KanbanProject { }

interface KanbanBoardProps {
    projects: Project[];
    columns: KanbanColumn[];
    onProjectClick: (projectId: string) => void;
    onChatClick?: (projectId: string) => void;
    isLoading?: boolean;
}

export function KanbanBoard({
    projects,
    columns,
    onProjectClick,
    onChatClick,
    isLoading = false
}: KanbanBoardProps) {

    // Organizar projetos por coluna
    const projectsByColumn = useMemo(() => {
        // Cast to any if there's slight type mismatch between Project interfaces from separate files, 
        // but ideally they should match structure. Helper expects 'Project' from hooks. 
        // We might need to ensure compatibility.
        // The helper uses 'status' field primarily.
        return organizeProjectsByColumn(projects as any, columns);
    }, [projects, columns]);

    if (isLoading) {
        return <KanbanSkeleton columns={columns} />;
    }

    return (
        <div className="w-full h-full min-h-[500px]">
            <ScrollArea className="w-full h-full whitespace-nowrap">
                <div className="flex gap-4 pb-4 px-1 min-w-max h-full">
                    {columns.map((column) => {
                        // Helper returns Record<string, Project[]>, verify key matches ID
                        const columnProjects = projectsByColumn[column.id] || [];

                        return (
                            <div
                                key={column.id}
                                className={cn(
                                    "w-[320px] flex-shrink-0 flex flex-col rounded-xl border-2 p-3 transition-colors h-full max-h-[calc(100vh-250px)]",
                                    "bg-muted/30 dark:bg-muted/10",
                                    column.borderColor
                                )}
                            >
                                {/* Header da Coluna */}
                                <div className="mb-3 flex-shrink-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl select-none">{column.emoji}</span>
                                            <h3 className={cn("text-sm font-bold truncate", column.color)}>
                                                {column.title}
                                            </h3>
                                        </div>

                                        {/* Badge contador */}
                                        <span className={cn(
                                            "flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full text-xs font-bold",
                                            "bg-background border-2 border-border text-foreground shadow-sm"
                                        )}>
                                            {columnProjects.length}
                                        </span>
                                    </div>

                                    <p className="text-[10px] text-muted-foreground line-clamp-2 h-8 leading-tight">
                                        {column.description}
                                    </p>
                                </div>

                                {/* Lista de Cards - Scrollable verticalmente dentro da coluna */}
                                <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-border">
                                    {columnProjects.length > 0 ? (
                                        columnProjects.map((project: any) => (
                                            <KanbanProjectCard
                                                key={project.id}
                                                project={project}
                                                onClick={() => onProjectClick(project.id)}
                                                onChatClick={onChatClick ? () => onChatClick(project.id) : undefined}
                                            />
                                        ))
                                    ) : (
                                        <EmptyColumn emoji={column.emoji} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}

// Componente para coluna vazia
function EmptyColumn({ emoji }: { emoji: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center h-full opacity-60">
            <div className="text-4xl mb-2 opacity-30 grayscale select-none">{emoji}</div>
            <p className="text-sm text-muted-foreground font-medium">
                Vazio
            </p>
        </div>
    );
}

// Skeleton loading
function KanbanSkeleton({ columns }: { columns: KanbanColumn[] }) {
    return (
        <div className="flex gap-4 pb-4 overflow-hidden">
            {columns.map((column) => (
                <div
                    key={column.id}
                    className="w-[320px] flex-shrink-0 rounded-xl border-2 border-border bg-muted/30 p-4 h-[600px]"
                >
                    <div className="animate-pulse">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-5 w-32 bg-muted rounded" />
                            <div className="h-7 w-7 bg-muted rounded-full" />
                        </div>
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-muted rounded-xl" />
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default KanbanBoard;
