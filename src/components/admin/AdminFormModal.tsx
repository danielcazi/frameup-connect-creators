import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import {
    getEligibleUsers,
    createAdmin,
    updateAdmin,
    AdminUser,
    RoleTemplate,
    EligibleUser,
    AdminRole,
    ALL_PERMISSIONS,
    PERMISSION_CATEGORIES,
    getRoleDisplayName,
    getRoleIcon,
} from '@/services/adminManagement';
import {
    X,
    Search,
    Loader2,
    Check,
    ChevronDown,
    ChevronUp,
    User,
    Shield,
} from 'lucide-react';

interface AdminFormModalProps {
    admin: AdminUser | null;
    roleTemplates: RoleTemplate[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function AdminFormModal({
    admin,
    roleTemplates,
    onClose,
    onSuccess,
}: AdminFormModalProps) {
    const { user } = useAdmin();
    const { toast } = useToast();

    const isEditing = !!admin;

    // Form state
    const [selectedUserId, setSelectedUserId] = useState<string>(admin?.user_id || '');
    const [selectedRole, setSelectedRole] = useState<AdminRole>(admin?.role as AdminRole || 'gestor');
    const [permissions, setPermissions] = useState<string[]>(admin?.permissions || []);
    const [department, setDepartment] = useState(admin?.department || '');
    const [notes, setNotes] = useState(admin?.notes || '');

    // UI state
    const [loading, setLoading] = useState(false);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [selectedUser, setSelectedUser] = useState<EligibleUser | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<string[]>(PERMISSION_CATEGORIES);

    // Carregar usuários elegíveis
    useEffect(() => {
        if (!isEditing) {
            searchEligibleUsers('');
        }
    }, [isEditing]);

    // Quando selecionar um role, preencher permissões do template
    useEffect(() => {
        if (!isEditing) {
            const template = roleTemplates.find((t) => t.role_name === selectedRole);
            if (template) {
                setPermissions(template.permissions);
            }
        }
    }, [selectedRole, roleTemplates, isEditing]);

    const searchEligibleUsers = async (search: string) => {
        setSearchingUsers(true);
        try {
            const users = await getEligibleUsers(search);
            setEligibleUsers(users);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
        } finally {
            setSearchingUsers(false);
        }
    };

    const handleUserSearch = (value: string) => {
        setUserSearch(value);
        searchEligibleUsers(value);
        setShowUserDropdown(true);
    };

    const handleSelectUser = (eligibleUser: EligibleUser) => {
        setSelectedUser(eligibleUser);
        setSelectedUserId(eligibleUser.user_id);
        setUserSearch(eligibleUser.full_name);
        setShowUserDropdown(false);
    };

    const handleTogglePermission = (permission: string) => {
        setPermissions((prev) =>
            prev.includes(permission)
                ? prev.filter((p) => p !== permission)
                : [...prev, permission]
        );
    };

    const handleToggleCategory = (category: string) => {
        const categoryPermissions = ALL_PERMISSIONS
            .filter((p) => p.category === category)
            .map((p) => p.key);

        const allSelected = categoryPermissions.every((p) => permissions.includes(p));

        if (allSelected) {
            setPermissions((prev) => prev.filter((p) => !categoryPermissions.includes(p)));
        } else {
            setPermissions((prev) => [...new Set([...prev, ...categoryPermissions])]);
        }
    };

    const toggleCategoryExpand = (category: string) => {
        setExpandedCategories((prev) =>
            prev.includes(category)
                ? prev.filter((c) => c !== category)
                : [...prev, category]
        );
    };

    const handleSubmit = async () => {
        // Validações
        if (!isEditing && !selectedUserId) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Selecione um usuário.',
            });
            return;
        }

        if (permissions.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Selecione pelo menos uma permissão.',
            });
            return;
        }

        setLoading(true);
        try {
            if (isEditing) {
                await updateAdmin(
                    admin!.id,
                    {
                        role: selectedRole,
                        permissions,
                        department: department || undefined,
                        notes: notes || undefined,
                    },
                    user!.id
                );
                toast({
                    title: 'Administrador atualizado',
                    description: 'As alterações foram salvas com sucesso.',
                });
            } else {
                await createAdmin(
                    {
                        user_id: selectedUserId,
                        role: selectedRole,
                        permissions,
                        department: department || undefined,
                        notes: notes || undefined,
                    },
                    user!.id
                );
                toast({
                    title: 'Administrador criado',
                    description: `${selectedUser?.full_name} agora é um administrador.`,
                });
            }
            onSuccess();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Ocorreu um erro ao salvar.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {isEditing ? 'Editar Administrador' : 'Novo Administrador'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {isEditing
                                ? `Editando ${admin?.full_name}`
                                : 'Selecione um usuário e configure suas permissões'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="space-y-6">
                        {/* Seleção de Usuário */}
                        {!isEditing && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Usuário *
                                </label>
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar por nome ou email..."
                                            value={userSearch}
                                            onChange={(e) => handleUserSearch(e.target.value)}
                                            onFocus={() => setShowUserDropdown(true)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                        {searchingUsers && (
                                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                                        )}
                                    </div>

                                    {showUserDropdown && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setShowUserDropdown(false)}
                                            />
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {eligibleUsers.length === 0 ? (
                                                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                        {userSearch
                                                            ? 'Nenhum usuário encontrado'
                                                            : 'Digite para buscar usuários'}
                                                    </div>
                                                ) : (
                                                    eligibleUsers.map((eligibleUser) => (
                                                        <button
                                                            key={eligibleUser.user_id}
                                                            onClick={() => handleSelectUser(eligibleUser)}
                                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                                <User className="w-4 h-4 text-gray-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {eligibleUser.full_name}
                                                                </p>
                                                                <p className="text-xs text-gray-500">{eligibleUser.email}</p>
                                                            </div>
                                                            <span className="ml-auto text-xs text-gray-400 capitalize">
                                                                {eligibleUser.user_type}
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Seleção de Perfil */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Perfil *
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {roleTemplates.map((template) => (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => setSelectedRole(template.role_name as AdminRole)}
                                        className={`p-3 rounded-lg border-2 text-left transition-all ${selectedRole === template.role_name
                                                ? 'border-primary bg-primary/5'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{getRoleIcon(template.role_name as any)}</span>
                                            <span className="font-medium text-sm">{template.display_name}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2">
                                            {template.permissions.length} permissões
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Permissões */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Permissões ({permissions.length} selecionadas)
                            </label>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                {PERMISSION_CATEGORIES.map((category) => {
                                    const categoryPermissions = ALL_PERMISSIONS.filter(
                                        (p) => p.category === category
                                    );
                                    const selectedInCategory = categoryPermissions.filter((p) =>
                                        permissions.includes(p.key)
                                    ).length;
                                    const isExpanded = expandedCategories.includes(category);

                                    return (
                                        <div key={category} className="border-b border-gray-100 last:border-0">
                                            {/* Category Header */}
                                            <div
                                                className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                                                onClick={() => toggleCategoryExpand(category)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedInCategory === categoryPermissions.length}
                                                        onChange={() => handleToggleCategory(category)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <span className="font-medium text-gray-900">{category}</span>
                                                    <span className="text-xs text-gray-500">
                                                        ({selectedInCategory}/{categoryPermissions.length})
                                                    </span>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>

                                            {/* Permissions List */}
                                            {isExpanded && (
                                                <div className="px-4 py-2 space-y-2">
                                                    {categoryPermissions.map((permission) => (
                                                        <label
                                                            key={permission.key}
                                                            className="flex items-center gap-3 py-1 cursor-pointer hover:bg-gray-50 px-2 rounded"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={permissions.includes(permission.key)}
                                                                onChange={() => handleTogglePermission(permission.key)}
                                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                                            />
                                                            <span className="text-sm text-gray-700">{permission.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Departamento */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Departamento
                            </label>
                            <input
                                type="text"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                placeholder="Ex: Financeiro, Suporte, Operações..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>

                        {/* Notas */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notas internas
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Observações sobre este administrador..."
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (!isEditing && !selectedUserId)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Shield className="w-4 h-4" />
                        )}
                        {isEditing ? 'Salvar alterações' : 'Criar administrador'}
                    </button>
                </div>
            </div>
        </div>
    );
}
