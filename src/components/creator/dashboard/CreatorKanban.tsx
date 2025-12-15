
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import CreatorKanbanCard from './CreatorKanbanCard';
import { Project } from '@/hooks/useCreatorProjects';
import { KANBAN_COLUMNS, organizeProjectsByColumn } from '@/utils/kanbanHelpers';

interface CreatorKanbanProps {
    projects: Project[];
    getBatchStatus: (project: Project) => string;
}

export default function CreatorKanban({ projects, getBatchStatus }: CreatorKanbanProps) {

    const projectsByStatus = useMemo(() => {
        // Pre-process projects to enforce batch status if needed before organizing
        const processedProjects = projects.map(p => {
            if (p.is_batch) {
                // If we want the Kanban to reflect the batch aggregate status
                const batchStatus = getBatchStatus(p);
                // Return a lightweight copy with modified status for sorting purposes
                return { ...p, status: batchStatus };
            }
            return p;
        });

        return organizeProjectsByColumn(processedProjects, KANBAN_COLUMNS);
    }, [projects, getBatchStatus]);

    return (
        <div className="flex overflow-x-auto pb-6 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
            {KANBAN_COLUMNS.map(column => {
                const columnProjects = projectsByStatus[column.id] || [];

                return (
                    <div
                        key={column.id}
                        className={cn(
                            'flex flex-col min-w-[280px] max-w-[280px] rounded-xl border bg-opacity-30 backdrop-blur-sm',
                            // Applying background color with low opacity via style or class if possible
                            // Helper gives 'bg-yellow-500', we want to use it as a tint or border
                            // Let's use the provided classes but maybe adjust opacity in class string
                            "bg-card", // Default card background
                            column.borderColor // Use border color from helper
                        )}
                        style={{ borderTopWidth: '4px' }} // Highlight top border
                    >
                        {/* Header */}
                        <div className={cn("flex items-center gap-2 p-3 border-b border-inherit bg-muted/20")}>
                            <div className="text-lg">
                                {column.emoji}
                            </div>
                            <div className="flex flex-col">
                                <span className={cn("font-semibold text-sm", column.color)}>
                                    {column.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {column.description}
                                </span>
                            </div>
                            <span
                                className="ml-auto text-xs font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full border"
                            >
                                {columnProjects.length}
                            </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-muted">
                            {columnProjects.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 py-8">
                                    <span className="text-2xl opacity-50 grayscale filter">{column.emoji}</span>
                                    <span className="text-xs mt-2">Vazio</span>
                                </div>
                            ) : (
                                columnProjects.map(project => (
                                    <CreatorKanbanCard
                                        key={project.id}
                                        project={project}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
