import { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminManagement from '@/components/admin/AdminManagement';
import PlatformUsers from '@/components/admin/PlatformUsers';

type TabType = 'platform' | 'admins';

export default function AdminUsers() {
    const { hasPermission, admin } = useAdmin();
    const [activeTab, setActiveTab] = useState<TabType>('platform');

    const canViewUsers = hasPermission('view_users');
    const canManageAdmins = hasPermission('manage_admin_users');
    const isSuperAdmin = admin?.role === 'super_admin';

    // Se não tiver permissão para nada, mostrar mensagem
    if (!canViewUsers && !canManageAdmins) {
        return (
            <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Você não tem permissão para visualizar esta página.</p>
            </div>
        );
    }

    const tabs = [
        {
            id: 'platform' as TabType,
            label: 'Usuários da Plataforma',
            icon: Users,
            show: canViewUsers,
        },
        {
            id: 'admins' as TabType,
            label: 'Administradores',
            icon: Shield,
            show: canManageAdmins || isSuperAdmin,
        },
    ].filter((tab) => tab.show);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
                <p className="text-gray-600 mt-1">
                    Gerencie usuários da plataforma e administradores do sistema
                </p>
            </div>

            {/* Tabs */}
            {tabs.length > 1 && (
                <div className="mb-6 border-b border-gray-200">
                    <nav className="flex gap-4">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                                        activeTab === tab.id
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            )}

            {/* Tab Content */}
            {activeTab === 'platform' && canViewUsers && <PlatformUsers />}
            {activeTab === 'admins' && (canManageAdmins || isSuperAdmin) && <AdminManagement />}
        </div>
    );
}
