import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectCard from '@/components/editor/ProjectCard';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';

interface Project {
    id: string;
    title: string;
    description: string;
    video_type: string;
    editing_style: string;
    duration_category: string;
    base_price: number;
    deadline_days: number;
    created_at: string;
    status: string;
    users: {
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
    _count?: {
        applications: number;
    };
}

const EditorProjects = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user) {
            fetchMyProjects();
        }
    }, [user, statusFilter, searchTerm]);

    const fetchMyProjects = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Fetch projects where the editor is assigned OR has an application
            // For simplicity, let's fetch projects where they are assigned first.
            // If we want to show applications too, we might need a different query or tab.
            // Let's assume "Meus Projetos" means projects they are working on or finished.

            let query = supabase
                .from('projects')
                .select(`
          *,
          users:creator_id (
            full_name,
            username,
            profile_photo_url
          )
        `)
                .eq('assigned_editor_id', user.id);

            // Apply status filter
            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            // Apply search
            if (searchTerm) {
                query = query.ilike('title', `%${searchTerm}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            setProjects(data || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Carregando...</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout
            userType="editor"
            title="Meus Projetos"
            subtitle="Gerencie os projetos em que você está trabalhando"
            headerAction={
                projects.length > 0 ? (
                    <Button onClick={() => navigate('/editor/dashboard')}>
                        <Search className="w-4 h-4 mr-2" />
                        Encontrar Projetos
                    </Button>
                ) : undefined
            }
        >
            {/* Filters Section */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Buscar projetos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                <SelectValue placeholder="Status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Status</SelectItem>
                            <SelectItem value="in_progress">Em Andamento</SelectItem>
                            <SelectItem value="in_review">Em Revisão</SelectItem>
                            <SelectItem value="completed">Concluídos</SelectItem>
                            <SelectItem value="cancelled">Cancelados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Projects List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && (
                    <>
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </>
                )}

                {!loading && projects.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState
                            illustration="projects"
                            title={searchTerm ? "Nenhum projeto encontrado" : "Nenhum projeto ativo"}
                            description={searchTerm ? "Tente buscar com outros termos." : "Você ainda não tem projetos atribuídos. Vá para o Dashboard para encontrar novos projetos."}
                            action={!searchTerm ? {
                                label: "Encontrar Projetos",
                                onClick: () => navigate('/editor/dashboard'),
                                variant: "default",
                            } : undefined}
                        />
                    </div>
                )}

                {!loading && projects.map(project => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                        hasApplied={true} // Since it's assigned, effectively applied/accepted
                        canApply={false} // Already assigned
                        onApply={() => navigate(`/editor/project/${project.id}`)} // Navigate to details
                        showStatus={true}
                    />
                ))}
            </div>
        </DashboardLayout>
    );
};

export default EditorProjects;
