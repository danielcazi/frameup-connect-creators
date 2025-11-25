import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video, Bell, MessageSquare, Menu, X, ChevronDown, LogOut, Settings, CreditCard, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NavLink } from '@/components/NavLink';
import NotificationBell from '@/components/layout/NotificationBell';
import MessagesBadge from '@/components/layout/MessagesBadge';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export const Header = () => {
  const { user, userType, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [navigate]);

  const handleLogoClick = () => {
    if (userType === 'creator') {
      navigate('/creator/dashboard');
    } else if (userType === 'editor') {
      navigate('/editor/dashboard');
    } else {
      navigate('/');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
  };

  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || '';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-16 border-b border-border bg-card">
        <div className="container mx-auto h-full px-6">
          <div className="flex h-full items-center justify-between">
            {/* Logo */}
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 transition-transform hover:scale-105"
            >
              <Video className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">FRAMEUP</span>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden items-center gap-8 md:flex">
              {!user && (
                <>
                  <a href="#como-funciona" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                    Como Funciona
                  </a>
                  <a href="#precos" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                    Preços
                  </a>
                  <a href="#contato" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                    Contato
                  </a>
                </>
              )}

              {userType === 'creator' && (
                <>
                  <NavLink
                    to="/creator/dashboard"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    activeClassName="text-primary font-semibold"
                  >
                    Início
                  </NavLink>
                  <NavLink
                    to="/creator/projects"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    activeClassName="text-primary font-semibold"
                  >
                    Projetos
                  </NavLink>
                  <NavLink
                    to="/creator/editors"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    activeClassName="text-primary font-semibold"
                  >
                    Editores
                  </NavLink>
                </>
              )}

              {userType === 'editor' && (
                <>
                  <NavLink
                    to="/editor/dashboard"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    activeClassName="text-primary font-semibold"
                  >
                    Dashboard
                  </NavLink>
                  <NavLink
                    to="/editor/my-projects"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    activeClassName="text-primary font-semibold"
                  >
                    Meus Projetos
                  </NavLink>
                  <NavLink
                    to="/editor/profile/edit"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    activeClassName="text-primary font-semibold"
                  >
                    Perfil
                  </NavLink>
                </>
              )}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  {/* Create Project Button (Creator only) */}
                  {userType === 'creator' && (
                    <Button
                      onClick={() => navigate('/creator/project/new')}
                      className="hidden bg-primary hover:bg-primary-hover md:flex"
                    >
                      + Criar Projeto
                    </Button>
                  )}

                  {/* Notifications */}
                  <NotificationBell />

                  {/* Messages */}
                  <div className="hidden md:block">
                    <MessagesBadge />
                  </div>

                  {/* User Avatar Menu */}
                  <div className="relative hidden md:block" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user?.user_metadata?.profile_photo_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>

                    {/* User Menu Dropdown */}
                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-64 animate-fade-in rounded-lg border border-border bg-card shadow-lg">
                        <div className="border-b border-border p-4">
                          <p className="font-semibold text-foreground">
                            {user?.user_metadata?.full_name || 'Usuário'}
                          </p>
                          <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate(userType === 'creator' ? '/creator/profile' : '/editor/profile/edit');
                              setUserMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                          >
                            <User className="h-4 w-4" />
                            Meu Perfil
                          </button>
                          <button
                            onClick={() => {
                              navigate('/settings');
                              setUserMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                          >
                            <Settings className="h-4 w-4" />
                            Configurações
                          </button>
                          {userType === 'editor' && (
                            <button
                              onClick={() => {
                                navigate('/editor/subscription');
                                setUserMenuOpen(false);
                              }}
                              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                            >
                              <CreditCard className="h-4 w-4" />
                              Assinatura
                            </button>
                          )}
                        </div>
                        <div className="border-t border-border py-2">
                          <button
                            onClick={handleSignOut}
                            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-error transition-colors hover:bg-muted"
                          >
                            <LogOut className="h-4 w-4" />
                            Sair
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted md:hidden"
                  >
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/login')}
                    className="hidden md:inline-flex"
                  >
                    Entrar
                  </Button>
                  <Button
                    onClick={() => navigate('/cadastro')}
                    className="hidden bg-primary hover:bg-primary-hover md:inline-flex"
                  >
                    Cadastrar
                  </Button>
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted md:hidden"
                  >
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sidebar */}
          <div className="fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-64 animate-slide-in-right bg-card shadow-xl md:hidden">
            <div className="flex h-full flex-col overflow-y-auto p-4">
              {user ? (
                <>
                  {/* User Info */}
                  <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user?.user_metadata?.profile_photo_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {user?.user_metadata?.full_name || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <nav className="flex flex-col gap-2">
                    {userType === 'creator' && (
                      <>
                        <NavLink
                          to="/creator/dashboard"
                          className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          activeClassName="bg-primary/10 text-primary"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Início
                        </NavLink>
                        <NavLink
                          to="/creator/projects"
                          className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          activeClassName="bg-primary/10 text-primary"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Projetos
                        </NavLink>
                        <NavLink
                          to="/creator/editors"
                          className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          activeClassName="bg-primary/10 text-primary"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Editores
                        </NavLink>
                        <Button
                          onClick={() => {
                            navigate('/creator/project/new');
                            setMobileMenuOpen(false);
                          }}
                          className="mt-4 bg-primary hover:bg-primary-hover"
                        >
                          + Criar Projeto
                        </Button>
                      </>
                    )}

                    {userType === 'editor' && (
                      <>
                        <NavLink
                          to="/editor/dashboard"
                          className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          activeClassName="bg-primary/10 text-primary"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Dashboard
                        </NavLink>
                        <NavLink
                          to="/editor/my-projects"
                          className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          activeClassName="bg-primary/10 text-primary"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Meus Projetos
                        </NavLink>
                        <NavLink
                          to="/editor/profile/edit"
                          className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          activeClassName="bg-primary/10 text-primary"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Perfil
                        </NavLink>
                      </>
                    )}

                    {/* Quick Actions */}
                    <div className="mt-6 space-y-2 border-t border-border pt-4">
                      <button
                        onClick={() => {
                          navigate('/messages');
                          setMobileMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <span className="flex items-center gap-3">
                          <MessageSquare className="h-4 w-4" />
                          Mensagens
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          navigate('/notifications');
                          setMobileMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <span className="flex items-center gap-3">
                          <Bell className="h-4 w-4" />
                          Notificações
                        </span>
                      </button>
                    </div>

                    {/* Settings */}
                    <div className="mt-auto space-y-2 border-t border-border pt-4">
                      <button
                        onClick={() => {
                          navigate(userType === 'creator' ? '/creator/profile' : '/editor/profile/edit');
                          setMobileMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <User className="h-4 w-4" />
                        Meu Perfil
                      </button>
                      <button
                        onClick={() => {
                          navigate('/settings');
                          setMobileMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <Settings className="h-4 w-4" />
                        Configurações
                      </button>
                      {userType === 'editor' && (
                        <button
                          onClick={() => {
                            navigate('/editor/subscription');
                            setMobileMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <CreditCard className="h-4 w-4" />
                          Assinatura
                        </button>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-error transition-colors hover:bg-muted"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </button>
                    </div>
                  </nav>
                </>
              ) : (
                <nav className="flex flex-col gap-4">
                  <a
                    href="#como-funciona"
                    className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Como Funciona
                  </a>
                  <a
                    href="#precos"
                    className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Preços
                  </a>
                  <a
                    href="#contato"
                    className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contato
                  </a>
                  <div className="mt-4 space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigate('/login');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      Entrar
                    </Button>
                    <Button
                      onClick={() => {
                        navigate('/cadastro');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full bg-primary hover:bg-primary-hover"
                    >
                      Cadastrar
                    </Button>
                  </div>
                </nav>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};
