import { Project } from '@/hooks/useCreatorProjects';

// src/utils/kanbanHelpers.ts
// Helpers para organização do Kanban de projetos

export interface KanbanColumn {
    id: string;
    title: string;
    emoji: string;
    color: string;
    bgColor: string; // Tailwinc class for bg
    borderColor: string;
    description: string;
    statusFilter: string[];
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
    {
        id: 'awaiting-editor',
        title: 'Aguardando Editor',
        emoji: '⏳',
        color: 'text-yellow-700 dark:text-yellow-400',
        bgColor: 'bg-yellow-500',
        borderColor: 'border-yellow-300 dark:border-yellow-700',
        description: 'Projetos aguardando candidaturas',
        statusFilter: ['pending', 'open', 'published']
    },
    {
        id: 'in-progress',
        title: 'Em Andamento',
        emoji: '🎬',
        color: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-500',
        borderColor: 'border-blue-300 dark:border-blue-700',
        description: 'Editor trabalhando',
        statusFilter: ['in_progress', 'active', 'editing']
    },
    {
        id: 'awaiting-review',
        title: 'Aguardando Revisão',
        emoji: '👀',
        color: 'text-purple-700 dark:text-purple-400',
        bgColor: 'bg-purple-500',
        borderColor: 'border-purple-300 dark:border-purple-700',
        description: 'Prontos para sua revisão',
        statusFilter: ['awaiting_review', 'delivered', 'review', 'revision_requested', 'revision']
    },
    {
        id: 'completed',
        title: 'Concluídos',
        emoji: '✅',
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-500',
        borderColor: 'border-green-300 dark:border-green-700',
        description: 'Projetos finalizados',
        statusFilter: ['completed', 'finished', 'done', 'approved']
    }
];

/**
 * Organiza projetos nas colunas do Kanban baseado no status
 */
export function organizeProjectsByColumn(
    projects: Project[],
    columns: KanbanColumn[]
): Record<string, Project[]> {
    const organized: Record<string, Project[]> = {};

    // Inicializar todas as colunas vazias
    columns.forEach(column => {
        organized[column.id] = [];
    });

    // Distribuir projetos nas colunas
    projects.forEach(project => {
        // Check main status
        let statusToCheck = project.status?.toLowerCase() || '';

        // Fallback/Override logic could go here if needed (e.g. batch status)
        // For now assuming existing status field is sufficient or pre-processed

        const targetColumn = columns.find(column =>
            column.statusFilter.includes(statusToCheck)
        );

        if (targetColumn) {
            organized[targetColumn.id].push(project);
        } else {
            // Handle Drafts or unmatched statuses?
            // User prompt put fallback to "Awaiting Editor", but "Draft" (Rascunho) is common.
            // User didn't include "Draft" column in the prompt snippet.
            // I will preserve 'draft' separation if possible or follow prompt strictly.
            // Prompt says: "Fallback: projetos sem status definido vão para 'Aguardando Editor'"
            // But drafts shouldn't really be awaiting editor.
            // I'll add 'draft' to awaiting-editor filter or just follow logic.
            // Actually, let's stick to the prompt's logic for now.
            organized['awaiting-editor'].push(project);
        }
    });

    return organized;
}

/**
 * Calcula estatísticas do Kanban
 */
export function calculateKanbanStats(projectsByColumn: Record<string, Project[]>) {
    return {
        awaitingEditor: projectsByColumn['awaiting-editor']?.length || 0,
        inProgress: projectsByColumn['in-progress']?.length || 0,
        awaitingReview: projectsByColumn['awaiting-review']?.length || 0,
        completed: projectsByColumn['completed']?.length || 0,
        total: Object.values(projectsByColumn).flat().length
    };
}
