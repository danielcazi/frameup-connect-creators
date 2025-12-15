import React, { useMemo } from 'react';
import { Project, groupProjectsByStatus } from '../../../utils/projectHelpers';
import { ProjectListItem } from './ProjectListItem';
import { Layers, CheckCircle, Clock, Video } from 'lucide-react';

interface ProjectListProps {
    projects: Project[];
    isLoading?: boolean;
}

const ProjectSection = ({
    title,
    icon: Icon,
    projects,
    emptyMessage
}: {
    title: string;
    icon: any;
    projects: Project[];
    emptyMessage?: string;
}) => {
    if (projects.length === 0) return null;

    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {title} <span className="text-sm font-normal text-gray-500 ml-1">({projects.length})</span>
                </h2>
            </div>
            <div className="space-y-1">
                {projects.map(project => (
                    <ProjectListItem key={project.id} project={project} />
                ))}
            </div>
        </div>
    );
};

export const ProjectList: React.FC<ProjectListProps> = ({ projects, isLoading = false }) => {
    const grouped = useMemo(() => groupProjectsByStatus(projects), [projects]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum projeto encontrado</h3>
                <p className="text-gray-500">Seus projetos aparecerão aqui.</p>
            </div>
        );
    }

    return (
        <div>
            <ProjectSection
                title="Aguardando Revisão"
                icon={Clock}
                projects={grouped.awaiting_review}
            />

            <ProjectSection
                title="Em Produção"
                icon={Video}
                projects={grouped.in_production}
            />

            <ProjectSection
                title="Aguardando Editor"
                icon={Layers}
                projects={grouped.awaiting_editor}
            />

            <ProjectSection
                title="Concluídos Recentemente"
                icon={CheckCircle}
                projects={grouped.completed.slice(0, 5)}
            />
        </div>
    );
};
