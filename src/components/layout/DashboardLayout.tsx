import React, { useState } from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import {
  Home,
  FolderOpen,
  Users,
  MessageSquare,
  User,
  CreditCard,
  Menu,
  X,
  Star,
  RefreshCw,
  Search
} from 'lucide-react';
import Badge from '@/components/common/Badge';
import SubscriptionBanner from '@/components/editor/SubscriptionBanner';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import MessageBadge from '@/components/messages/MessageBadge';
import LogoutButton from './LogoutButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TestModeBanner } from '@/components/TestModeBanner';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userType: 'creator' | 'editor' | 'admin';
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  userType,
  title,
  subtitle,
  headerAction,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Define navigation items based on user type
  const navItems: NavItem[] = userType === 'creator'
    ? [
      { label: 'Dashboard', path: '/creator/dashboard', icon: Home },
      { label: 'Meus Projetos', path: '/creator/projects', icon: FolderOpen },
      { label: 'Editores', path: '/creator/editors', icon: Users },
      { label: 'Favoritos', path: '/creator/favorites', icon: Star },
      { label: 'Mensagens', path: '/creator/messages', icon: MessageSquare, badge: 0 },
    ]
    : [
      { label: 'Dashboard', path: '/editor/dashboard', icon: Home },
      { label: 'Encontrar Projetos', path: '/editor/projects', icon: Search },
      { label: 'Propostas', path: '/editor/proposals', icon: RefreshCw },
      { label: 'Meus Projetos', path: '/editor/my-projects', icon: FolderOpen },
      { label: 'Mensagens', path: '/editor/messages', icon: MessageSquare, badge: 0 },
      { label: 'Perfil', path: '/editor/profile', icon: User },
      { label: 'Assinatura', path: '/editor/subscription/manage', icon: CreditCard },
    ];

  const SidebarContent = () => (
    <nav className="space-y-1">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg',
            'text-sm font-medium text-muted-foreground',
            'transition-all duration-200',
            'hover:bg-accent hover:text-foreground'
          )}
          activeClassName="bg-primary text-primary-foreground font-bold hover:bg-primary hover:text-primary-foreground"
        >
          <item.icon className="w-5 h-5 shrink-0" />
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <Badge variant="error" size="small" rounded>
              {item.badge}
            </Badge>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Test Mode Banner */}
      <TestModeBanner />

      {/* Subscription Banner */}
      <SubscriptionBanner />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-40">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <RouterNavLink to={userType === 'creator' ? '/creator/dashboard' : '/editor/dashboard'} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">FU</span>
              </div>
              <span className="font-bold text-lg text-foreground hidden sm:block">FrameUp</span>
            </RouterNavLink>
          </div>

          {/* Right side: Messages + Notifications + User */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mensagens */}
            <MessageBadge />

            {/* Notificações */}
            <NotificationDropdown />

            {/* Separador visual (opcional) */}
            <div className="hidden sm:block w-px h-6 bg-border mx-1" />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors outline-none">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <RouterNavLink
                    to={userType === 'creator' ? '/creator/profile' : '/editor/profile'}
                    className="w-full cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </RouterNavLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <LogoutButton
                    variant="ghost"
                    className="w-full justify-start h-8 px-2"
                    iconClassName="w-4 h-4 mr-2"
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-16 w-60 h-[calc(100vh-4rem)] bg-muted/30 border-r border-border">
        <div className="p-4 flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
        <div className="p-4 border-t border-border">
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed left-0 top-0 w-72 h-full bg-background border-r border-border z-50 lg:hidden animate-slide-in-right flex flex-col">
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent />
            </div>
            <div className="p-4 border-t border-border">
              <LogoutButton />
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="lg:ml-60 pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto p-6">
          {/* Page Header */}
          {(title || subtitle || headerAction) && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                {title && (
                  <h1 className="text-2xl font-bold text-foreground">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
              {headerAction && (
                <div className="shrink-0">
                  {headerAction}
                </div>
              )}
            </div>
          )}

          {/* Page Content */}
          <div className="pb-20 lg:pb-6">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border z-30">
        <div className="flex items-center justify-around h-full px-2">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-14 h-14 rounded-lg text-muted-foreground transition-colors hover:text-foreground"
              activeClassName="text-primary"
            >
              <item.icon className="w-6 h-6" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
