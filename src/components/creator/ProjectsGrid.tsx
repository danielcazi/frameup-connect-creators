// src/components/creator/ProjectsGrid.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FolderOpen,
    PlusCircle,
    Search,
    Filter,
    ChevronRight,
    Calendar,
    User,
    Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProjectGridCard } from '@/components/creator/ProjectGridCard';
import { Project, getStatusConfig } from '@/utils/projectHelpers';
import { getDeadlineInfo } from '@/utils/dateHelpers';
import { cn } from '@/lib/utils';
import React from 'react';

interface ProjectsGridProps {
    projects: Project[];
    maxItems?: number;
    showSearch?: boolean;
    showNewButton?: boolean;
    onProjectClick?: (projectId: string) => void;
}

export function ProjectsGrid({
    projects,
    maxItems = 6,
    showSearch = true,
    showNewButton = true,
    onProjectClick
}: ProjectsGridProps) {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    // Filtrar projetos por busca
    const filteredProjects = projects.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.editor_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Limitar quantidade exibida
    const displayProjects = filteredProjects.slice(0, maxItems);

    const handleProjectClick = (project: Project) => {
        if (onProjectClick) {
            onProjectClick(project.id);
        } else {
            navigate(`/creator/project/${project.id}`);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-foreground" />
                    <h3 className="font-semibold text-foreground">Meus Projetos</h3>
                    <Badge variant="secondary" className="text-xs">
                        {projects.length} total
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    {/* Busca */}
                    {showSearch && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar projetos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 w-48 text-sm"
                            />
                        </div>
                    )}

                    {/* Filtros */}
                    <Button variant="outline" size="sm" className="h-9">
                        <Filter className="w-4 h-4 mr-2" />
                        Filtros
                    </Button>

                    {/* Novo Projeto */}
                    {showNewButton && (
                        <Button
                            size="sm"
                            className="h-9"
                            onClick={() => navigate('/creator/project/new')}
                        >
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Novo Projeto
                        </Button>
                    )}
                </div>
            </div>

            {/* Grid de Projetos */}
            {displayProjects.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayProjects.map((project) => (
                            <ProjectGridCard
                                key={project.id}
                                project={project}
                                onClick={() => handleProjectClick(project)}
                            />
                        ))}
                    </div>

                    {/* Link Ver Todos */}
                    {filteredProjects.length > maxItems && (
                        <div className="text-center pt-2">
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/creator/projects')}
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                Ver todos os {filteredProjects.length} projetos
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                /* Empty State */
                <div className="text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed border-border">
                    <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <h4 className="font-medium text-foreground mb-1">
                        {searchQuery ? 'Nenhum projeto encontrado' : 'Nenhum projeto ainda'}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                        {searchQuery
                            ? 'Tente buscar por outro termo'
                            : 'Comece criando seu primeiro projeto de edição'
                        }
                    </p>
                    {!searchQuery && (
                        <Button onClick={() => navigate('/creator/project/new')}>
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Criar Projeto
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

export default ProjectsGrid;
