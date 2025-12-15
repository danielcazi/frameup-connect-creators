// src/pages/creator/Dashboard.tsx
// Versão ajustada para ficar similar ao Dashboard do Editor

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Componentes Ajustados
import { MetricCards } from '@/components/creator/MetricCards';
import { AlertBanner } from '@/components/creator/AlertBanner';
import { InProgressSection } from '@/components/creator/InProgressSection';
import { ProjectsGrid } from '@/components/creator/ProjectsGrid';
import { RecentMessages } from '@/components/creator/RecentMessages';

// Helpers
import { Project, calculateDashboardMetrics } from '@/utils/projectHelpers';


// Error Boundary para debug
import React from 'react';
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-500">
          <h1 className="text-2xl font-bold mb-4">Algo deu errado!</h1>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-w-full">
            {this.state.error?.toString()}
            <br />
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();


  // Estados
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ========== FETCH DE DADOS ==========

  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;

    try {
      // 1. Buscar projetos (usando deadline_days em vez de deadline_at)
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, title, status, is_batch, batch_quantity, videos_approved,
          base_price, video_type, editing_style, duration_category,
          deadline_days, created_at, updated_at, assigned_editor_id
        `)
        .eq('creator_id', user.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro no fetch de projetos:", error);
        throw error;
      };

      console.log('[Dashboard] Projetos carregados (raw):', data?.length);

      // 2. Buscar editores separadamente
      const editorIds = Array.from(new Set(data?.map(p => p.assigned_editor_id).filter(Boolean) || []));
      let editorsMap: Record<string, any> = {};

      if (editorIds.length > 0) {
        const { data: editorsData, error: editorsError } = await supabase
          .from('users')
          .select('id, full_name, profile_photo_url')
          .in('id', editorIds);

        if (!editorsError && editorsData) {
          editorsMap = editorsData.reduce((acc: any, editor) => {
            acc[editor.id] = editor;
            return acc;
          }, {});
        }
      }

      // 3. Formatar dados
      const formattedProjects: Project[] = (data || []).map(p => {
        // Calcular deadline_at baseado no deadline_days se necessário
        // Se o projeto foi criado recentemente e tem prazo em dias
        let calculatedDeadline = null;

        if (p.deadline_days) {
          const created = new Date(p.created_at);
          created.setDate(created.getDate() + p.deadline_days);
          calculatedDeadline = created.toISOString();
        }

        return {
          id: p.id,
          title: p.title,
          status: p.status,
          is_batch: p.is_batch || false,
          batch_quantity: p.batch_quantity,
          videos_approved: p.videos_approved || 0,
          base_price: p.base_price || 0,
          video_type: p.video_type,
          editing_style: p.editing_style,
          duration_category: p.duration_category,
          deadline_at: calculatedDeadline, // Usa o calculado
          created_at: p.created_at,
          updated_at: p.updated_at,
          creator_id: user.id,
          editor_id: p.assigned_editor_id,
          editor_name: p.assigned_editor_id ? editorsMap[p.assigned_editor_id]?.full_name : undefined,
          editor_avatar: p.assigned_editor_id ? editorsMap[p.assigned_editor_id]?.profile_photo_url : undefined,
          unread_messages: 0
        };
      });

      setProjects(formattedProjects);

      // Buscar contagem de mensagens não lidas
      await fetchUnreadCounts(formattedProjects);

    } catch (error) {
      console.error('[Dashboard] Erro ao buscar projetos:', error);
    }
  }, [user?.id]);

  const fetchUnreadCounts = async (projectsList: Project[]) => {
    if (!user?.id || projectsList.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('project_id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach(msg => {
        counts[msg.project_id] = (counts[msg.project_id] || 0) + 1;
      });

      setProjects(prev => prev.map(p => ({
        ...p,
        unread_messages: counts[p.id] || 0
      })));

    } catch (error) {
      console.error('[Dashboard] Erro ao buscar mensagens:', error);
    }
  };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    await fetchProjects();
    setIsLoading(false);
  }, [fetchProjects]);

  // ========== EFFECTS ==========

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Realtime
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`creator-dashboard-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `creator_id=eq.${user.id}`
      }, () => fetchProjects())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, () => fetchProjects())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user?.id, fetchProjects]);

  // ========== COMPUTED VALUES ==========

  const metrics = useMemo(() => calculateDashboardMetrics(projects), [projects]);

  // Alertas simplificados
  const alertCounts = useMemo(() => {
    const reviewCount = projects.filter(p => p.status === 'in_review').length;
    const unreadMessages = projects.reduce((sum, p) => sum + (p.unread_messages || 0), 0);
    const urgentDeadlines = projects.filter(p => {
      if (!p.deadline_at || p.status === 'completed') return false;
      const hours = (new Date(p.deadline_at).getTime() - Date.now()) / (1000 * 60 * 60);
      return hours > 0 && hours < 48;
    }).length;

    return { reviewCount, unreadMessages, urgentDeadlines };
  }, [projects]);

  // ========== HANDLERS ==========

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/creator/project/${projectId}`);
  };

  // ========== RENDER ==========

  return (
    <ErrorBoundary>
      <DashboardLayout
        userType="creator"
        title="Dashboard"
        subtitle="Visão geral dos seus projetos"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Header com Refresh (alinhado à direita como no Editor) */}
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              Atualizar
            </Button>
          </div>

          {/* Métricas (4 Cards) - Estilo igual ao Editor */}
          <MetricCards
            inProduction={metrics.inProduction}
            awaitingReview={metrics.awaitingReview}
            completed={metrics.completed}
            total={metrics.total}
            isLoading={isLoading}
          />

          {/* Grid: Em Andamento (60%) + Mensagens (40%) - Igual Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Em Andamento */}
            <div className="lg:col-span-3">
              <InProgressSection
                projects={projects}
                maxItems={3}
                onProjectClick={handleProjectClick}
              />
            </div>

            {/* Mensagens Recentes */}
            <div className="lg:col-span-2">
              <RecentMessages
                userId={user?.id || ''}
                maxMessages={3}
              />
            </div>
          </div>

          {/* Banner de Alertas Compacto */}
          <AlertBanner
            reviewCount={alertCounts.reviewCount}
            unreadMessages={alertCounts.unreadMessages}
            urgentDeadlines={alertCounts.urgentDeadlines}
          />

          {/* Grid de Projetos - Similar à seção "Novos Projetos" do Editor */}
          <ProjectsGrid
            projects={projects}
            maxItems={6}
            showSearch={true}
            showNewButton={true}
            onProjectClick={handleProjectClick}
          />
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  );
}
