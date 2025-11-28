import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import {
    getAdminUsers,
    getRoleTemplates,
    removeAdmin,
    reactivateAdmin,
    AdminUser,
    RoleTemplate,
    getRoleDisplayName,
    getRoleColor,
    getRoleIcon,
} from '@/services/adminManagement';
import {
    Users,
    Plus,
    Search,
    MoreVertical,
    Shield,
    ShieldOff,
    Edit,
    Trash2,
    RefreshCw,
    Loader2,
} from 'lucide-react';
import AdminFormModal from './AdminFormModal';

export default function AdminManagement() {
    const { admin, user, hasPermission } = useAdmin();
    const { toast } = useToast();

    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);

    // Action menu
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const isSuperAdmin = admin?.role === 'super_admin';
    const canManageAdmins = hasPermission('manage_admin_users');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [adminsData, templates] = await Promise.all([
                getAdminUsers(),
                getRoleTemplates(),
            ]);
            setAdmins(adminsData);
            setRoleTemplates(templates);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar os administradores.',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (adminToRemove: AdminUser) => {
        // Não permitir remover a si mesmo
        if (adminToRemove.user_id === user?.id) {
            toast({
                variant: 'destructive',
                title: 'Ação não permitida',
                description: 'Você não pode remover a si mesmo.',
            });
            return;
        }

        // Confirmar
        if (!confirm(`Tem certeza que deseja remover ${adminToRemove.full_name} como administrador?`)) {
            return;
        }

        try {
            await removeAdmin(adminToRemove.id, user!.id, 'Removido pelo super admin');
            toast({
                title: 'Administrador removido',
                description: `${adminToRemove.full_name} foi removido com sucesso.`,
            });
            loadData();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Não foi possível remover o administrador.',
            });
        }
        setOpenMenuId(null);
    };

    const handleReactivate = async (adminToReactivate: AdminUser) => {
        try {
            await reactivateAdmin(adminToReactivate.id, user!.id);
            toast({
                title: 'Administrador reativado',
                description: `${adminToReactivate.full_name} foi reativado com sucesso.`,
            });
            loadData();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível reativar o administrador.',
            });
        }
        setOpenMenuId(null);
    };

    const handleEdit = (adminToEdit: AdminUser) => {
        setEditingAdmin(adminToEdit);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleCreate = () => {
        setEditingAdmin(null);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingAdmin(null);
    };

    const handleModalSuccess = () => {
        handleModalClose();
        loadData();
    };

    // Filtrar admins
    const filteredAdmins = admins.filter((a) => {
        const matchesSearch =
            !search ||
            a.full_name.toLowerCase().includes(search.toLowerCase()) ||
            a.email.toLowerCase().includes(search.toLowerCase());
        const matchesActive = showInactive || a.is_active;
        return matchesSearch && matchesActive;
    });

    const activeCount = admins.filter((a) => a.is_active).length;
    const inactiveCount = admins.filter((a) => !a.is_active).length;

    if (!canManageAdmins) {
        return (
            <div className="p-8 text-center text-gray-500">
                <ShieldOff className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Você não tem permissão para gerenciar administradores.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Administradores</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {activeCount} ativo{activeCount !== 1 ? 's' : ''}
                        {inactiveCount > 0 && ` • ${inactiveCount} inativo${inactiveCount !== 1 ? 's' : ''}`}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Atualizar"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {isSuperAdmin && (
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Novo Admin</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    Mostrar inativos
                </label>
            </div>

            {/* Role Templates Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {roleTemplates.map((template) => (
                    <div
                        key={template.id}
                        className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{getRoleIcon(template.role_name as any)}</span>
                            <span className="font-medium text-gray-900">{template.display_name}</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
                        <p className="text-xs text-gray-400 mt-2">
                            {template.permissions.length} permissões
                        </p>
                    </div>
                ))}
            </div>

            {/* Admin List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            ) : filteredAdmins.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">
                        {search ? 'Nenhum administrador encontrado.' : 'Nenhum administrador cadastrado.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Administrador</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Perfil</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700 hidden md:table-cell">Departamento</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700 hidden lg:table-cell">Último acesso</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-700">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredAdmins.map((adminUser) => (
                                <tr
                                    key={adminUser.id}
                                    className={`hover:bg-gray-50 transition-colors ${!adminUser.is_active ? 'opacity-60' : ''}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold">
                                                {adminUser.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-gray-900">{adminUser.full_name}</p>
                                                    {adminUser.user_id === user?.id && (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                                            Você
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">{adminUser.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleColor(adminUser.role as any)}`}>
                                            <span>{getRoleIcon(adminUser.role as any)}</span>
                                            {getRoleDisplayName(adminUser.role as any)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <span className="text-gray-600">{adminUser.department || '-'}</span>
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell">
                                        <span className="text-gray-500">
                                            {adminUser.last_login_at
                                                ? new Date(adminUser.last_login_at).toLocaleDateString('pt-BR')
                                                : 'Nunca'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {adminUser.is_active ? (
                                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-medium">
                                                <Shield className="w-3 h-3" />
                                                Ativo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">
                                                <ShieldOff className="w-3 h-3" />
                                                Inativo
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {isSuperAdmin && adminUser.user_id !== user?.id && (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === adminUser.id ? null : adminUser.id)}
                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    <MoreVertical className="w-4 h-4 text-gray-500" />
                                                </button>

                                                {openMenuId === adminUser.id && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setOpenMenuId(null)}
                                                        />
                                                        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                                                            <button
                                                                onClick={() => handleEdit(adminUser)}
                                                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                Editar
                                                            </button>
                                                            {adminUser.is_active ? (
                                                                <button
                                                                    onClick={() => handleRemove(adminUser)}
                                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Remover
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleReactivate(adminUser)}
                                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 text-green-600 flex items-center gap-2"
                                                                >
                                                                    <RefreshCw className="w-4 h-4" />
                                                                    Reativar
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <AdminFormModal
                    admin={editingAdmin}
                    roleTemplates={roleTemplates}
                    onClose={handleModalClose}
                    onSuccess={handleModalSuccess}
                />
            )}
        </div>
    );
}
