import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import {
    LayoutDashboard,
    Users,
    FileText,
    DollarSign,
    AlertCircle,
    CheckSquare,
    Tag,
    BarChart3,
    LogOut,
    Menu,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Permission } from '@/types/admin';

interface NavItem {
    label: string;
    icon: React.ReactNode;
    path: string;
    permission?: Permission;
}

export default function AdminLayout() {
    const { admin, loading, logout, hasPermission } = useAdmin();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Redirect se não for admin
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!admin) {
        return <Navigate to="/admin/login" replace />;
    }

    const navItems: NavItem[] = [
        {
            label: 'Dashboard',
            icon: <LayoutDashboard className="w-5 h-5" />,
            path: '/admin',
        },
        {
            label: 'Usuários',
            icon: <Users className="w-5 h-5" />,
            path: '/admin/users',
            permission: 'view_users',
        },
        {
            label: 'Projetos',
            icon: <FileText className="w-5 h-5" />,
            path: '/admin/projects',
            permission: 'view_all_projects',
        },
        {
            label: 'Financeiro',
            icon: <DollarSign className="w-5 h-5" />,
            path: '/admin/financial',
            permission: 'view_financial_data',
        },
        {
            label: 'Disputas',
            icon: <AlertCircle className="w-5 h-5" />,
            path: '/admin/disputes',
            permission: 'view_disputes',
        },
        {
            label: 'Aprovações',
            icon: <CheckSquare className="w-5 h-5" />,
            path: '/admin/approvals',
            permission: 'approve_editors',
        },
        {
            label: 'Descontos',
            icon: <Tag className="w-5 h-5" />,
            path: '/admin/discounts',
            permission: 'apply_discounts',
        },
        {
            label: 'Analytics',
            icon: <BarChart3 className="w-5 h-5" />,
            path: '/admin/analytics',
            permission: 'view_analytics',
        },
    ];

    const filteredNavItems = navItems.filter(
        (item) => !item.permission || hasPermission(item.permission)
    );

    const handleLogout = async () => {
        await logout();
        navigate('/admin/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-20'
                    } bg-gray-900 text-white transition-all duration-300 fixed h-full z-30`}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    {sidebarOpen ? (
                        <>
                            <h1 className="text-xl font-bold">FRAMEUP Admin</h1>
                            <button onClick={() => setSidebarOpen(false)}>
                                <X className="w-5 h-5" />
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setSidebarOpen(true)} className="mx-auto">
                            <Menu className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* User Info */}
                {sidebarOpen && (
                    <div className="p-4 border-b border-gray-800">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                {admin.role === 'super_admin' ? '👑' : '👨‍💼'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {admin.full_name || admin.role.replace('_', ' ').toUpperCase()}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {admin.department || 'Admin'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {filteredNavItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === item.path
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-gray-800'
                                }`}
                        >
                            {item.icon}
                            {sidebarOpen && <span className="text-sm">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        {sidebarOpen && <span className="text-sm">Sair</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main
                className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'
                    } transition-all duration-300`}
            >
                <Outlet />
            </main>
        </div>
    );
}
