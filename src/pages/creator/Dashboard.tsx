import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, LogOut, Plus, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const CreatorDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">FRAMEUP</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground">Creator</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            Dashboard do Creator
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta! Gerencie seus projetos de edição.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Novo Projeto
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Publique um novo projeto e receba propostas de editores
            </p>
            <Button className="w-full bg-primary hover:bg-primary-hover">
              Criar Projeto
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Meus Projetos
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Visualize e gerencie todos os seus projetos
            </p>
            <Button variant="outline" className="w-full">
              Ver Projetos
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="mt-12 text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">
            Nenhum projeto ainda
          </h3>
          <p className="mb-6 text-muted-foreground">
            Crie seu primeiro projeto para começar a trabalhar com editores profissionais
          </p>
          <Button className="bg-primary hover:bg-primary-hover">
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeiro Projeto
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CreatorDashboard;
