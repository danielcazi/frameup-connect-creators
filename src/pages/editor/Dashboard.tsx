import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProposalCard } from '@/components/editor/ProposalCard';
import { EditorProjectCard } from '@/components/editor/EditorProjectCard';
import { RecentMessages } from '@/components/editor/RecentMessages';
import ProjectCard from '@/components/editor/ProjectCard';
import { useEditorProjects } from '@/hooks/useEditorProjects';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Bell,
    Briefcase,
    RefreshCw,
    DollarSign,
    TrendingUp,
    Search,
    LayoutGrid,
    List,
    AlertTriangle,
    MessageSquare,
    CheckCircle2,
    Star,
    Archive,
    Filter,
} from 'lucide-react';

export default function EditorDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { projects, proposals, loading, error, stats, refresh } = useEditorProjects();

    const { subscription } = useSubscription();

    // Marketplace state
    const [marketplaceProjects, setMarketplaceProjects] = useState<any[]>([]);
    const [marketplaceLoading, setMarketplaceLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentProjectsCount, setCurrentProjectsCount] = useState(0);

    useEffect(() => {
        if (user) {
            fetchMarketplaceProjects();
            loadCurrentProjectsCount();
        }
    }, [user]);

    async function loadCurrentProjectsCount() {
        if (!user) return;
        try {
            const { count } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_editor_id', user.id)
                .eq('status', 'in_progress');

            setCurrentProjectsCount(count || 0);
        } catch (error) {
            console.error('Error loading current projects count:', error);
        }
    }

    async function fetchMarketplaceProjects() {
        try {
            setMarketplaceLoading(true);

            // 1. Fetch open projects
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    id,
                    title,
                    description,
                    video_type,
                    editing_style,
                    duration_category,
                    base_price,
                    deadline_days,
                    created_at,
                    status,
                    creator_id
                `)
                .eq('status', 'open')
                .order('created_at', { ascending: false })
                .limit(6);

            if (error) throw error;
            if (!data) return;

            // 2. Fetch application counts manually
            const projectIds = data.map(p => p.id);
            let applicationCounts: Record<string, number> = {};

            if (projectIds.length > 0) {
                const { data: applicationsData } = await supabase
                    .from('project_applications')
                    .select('project_id')
                    .in('project_id', projectIds);

                applicationCounts = applicationsData?.reduce((acc, app) => {
                    acc[app.project_id] = (acc[app.project_id] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>) || {};
            }

            // 3. Fetch creator details manually
            const creatorIds = Array.from(new Set(data.map(p => p.creator_id).filter(Boolean)));
            let creatorsMap: Record<string, any> = {};

            if (creatorIds.length > 0) {
                const { data: creatorsData } = await supabase
                    .from('users')
                    .select('id, full_name, username, profile_photo_url')
                    .in('id', creatorIds);

                if (creatorsData) {
                    creatorsMap = creatorsData.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
                }
            }

            // 4. Merge data
            // @ts-ignore
            const projectsWithDetails = data.map(project => ({
                ...project,
                users: creatorsMap[project.creator_id] || { full_name: 'Desconhecido', username: 'unknown' },
                _count: {
                    applications: applicationCounts[project.id] || 0
                }
            }));

            setMarketplaceProjects(projectsWithDetails);
        } catch (err) {
            console.error('Error fetching marketplace projects:', err);
        } finally {
            setMarketplaceLoading(false);
        }
    }

    // Calcular estatísticas específicas do layout antigo se necessário
    // Mas as do hook parecem bater: Ganhos, Projetos Concluídos (totalCompleted), Favoritos (mock?), Candidaturas (totalProposals?)
    // O screenshot mostra "Candidaturas: 3 (Pendentes de resposta)" -> Isso pode ser minhas candidaturas enviadas (applications)
    // O hook useEditorProjects traz 'proposals' (que eu recebi). 
    // Vamos manter as stats do hook pois são reais, ajustando apenas o visual.

    return (
        <DashboardLayout
            userType="editor"
            title="Dashboard" // Título simples como no print
            subtitle="Visão geral e projetos disponíveis"
        >
            <div className="space-y-8">

                {/* 1. Statistics Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Ganhos Totais */}
                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-foreground">Ganhos Totais</span>
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">
                            R$ {stats.totalEarned.toFixed(2).replace('.', ',')}
                        </h3>
                        <p className="text-xs text-muted-foreground">Em projetos concluídos</p>
                    </div>

                    {/* Projetos Concluídos */}
                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-foreground">Projetos Concluídos</span>
                            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">
                            {stats.totalCompleted}
                        </h3>
                        <p className="text-xs text-muted-foreground">Entregues com sucesso</p>
                    </div>

                    {/* Favoritos (Mockado por enquanto ou precisa de hook) */}
                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-foreground">Favoritos</span>
                            <Star className="w-4 h-4 text-yellow-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">
                            1
                        </h3>
                        <p className="text-xs text-muted-foreground">Creators que te favoritaram</p>
                    </div>

                    {/* Candidaturas (Minhas aplicações) */}
                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-foreground">Candidaturas</span>
                            <Archive className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">
                            {stats.pendingApplications}
                        </h3>
                        <p className="text-xs text-muted-foreground">Pendentes de resposta</p>
                    </div>
                </div>

                {/* Proposals Alert (If any) - Keeping this visible/prominent */}
                {proposals.length > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                            <Bell className="w-5 h-5" />
                            Novas Propostas de Recontratação ({proposals.length})
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {proposals.map(proposal => (
                                <ProposalCard
                                    key={proposal.id}
                                    project={proposal}
                                    onUpdate={refresh}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Main Content Grid: Active Projects (Left) + Recent Messages (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Em Andamento */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <ClockIcon className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-bold text-foreground">Em Andamento</h2>
                        </div>

                        {projects.length > 0 ? (
                            <div className="space-y-4">
                                {projects.map(project => (
                                    <EditorProjectCard
                                        key={project.id}
                                        project={project}
                                        viewMode="list" // List view fits better in column
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-muted/20 border border-dashed border-border rounded-xl">
                                <p className="text-muted-foreground">
                                    Nenhum projeto em andamento no momento.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Mensagens Recentes */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold text-foreground">Mensagens Recentes</h2>
                            </div>
                            <Button variant="link" className="h-auto p-0 text-primary" onClick={() => navigate('/editor/messages')}>
                                Ver todas
                            </Button>
                        </div>

                        <RecentMessages limit={3} />
                    </div>
                </div>

                {/* 3. Marketplace Section */}
                <div className="space-y-6 pt-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-bold text-foreground">Novos Projetos</h2>
                            <span className="text-sm text-muted-foreground ml-2">
                                {marketplaceProjects.length} disponíveis
                            </span>
                        </div>

                        <div className="flex gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="Buscar projetos..."
                                    className="pl-9 w-[300px]"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" className="gap-2">
                                <Filter className="w-4 h-4" />
                                Filtros
                            </Button>
                        </div>
                    </div>

                    {marketplaceLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-[300px] bg-muted/40 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {marketplaceProjects
                                .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(project => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        hasApplied={false} // Simplification for now (requires loadMyApplications)
                                        canApply={
                                            currentProjectsCount < (subscription?.subscription_plans.max_simultaneous_projects || 0)
                                        }
                                        hasSubscription={!!subscription} // Checks if subscription exists
                                        onApply={() => navigate(`/editor/project/${project.id}`)}
                                    />
                                ))
                            }
                        </div>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

