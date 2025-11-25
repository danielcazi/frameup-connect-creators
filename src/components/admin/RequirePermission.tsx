import { ReactNode } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Permission } from '@/types/admin';

interface RequirePermissionProps {
    children: ReactNode;
    permission?: Permission;
    permissions?: Permission[];
    requireAll?: boolean; // Se true, requer TODAS as permissões. Se false, requer PELO MENOS UMA
    fallback?: ReactNode;
}

/**
 * Componente que renderiza children apenas se o admin tiver as permissões necessárias
 * 
 * @example
 * // Requer uma permissão específica
 * <RequirePermission permission="ban_users">
 *   <button>Banir Usuário</button>
 * </RequirePermission>
 * 
 * @example
 * // Requer todas as permissões
 * <RequirePermission permissions={['view_users', 'ban_users']} requireAll>
 *   <button>Gerenciar Usuários</button>
 * </RequirePermission>
 * 
 * @example
 * // Requer pelo menos uma permissão
 * <RequirePermission permissions={['ban_users', 'unban_users']} requireAll={false}>
 *   <button>Ações de Usuário</button>
 * </RequirePermission>
 */
export function RequirePermission({
    children,
    permission,
    permissions = [],
    requireAll = true,
    fallback = null
}: RequirePermissionProps) {
    const { admin, hasPermission, checkPermissions } = useAdmin();

    // Se não está autenticado como admin, não renderiza
    if (!admin) {
        return <>{fallback}</>;
    }

    // Verifica permissão única
    if (permission) {
        if (!hasPermission(permission)) {
            return <>{fallback}</>;
        }
        return <>{children}</>;
    }

    // Verifica múltiplas permissões
    if (permissions.length > 0) {
        const hasRequiredPermissions = requireAll
            ? checkPermissions(permissions)
            : permissions.some(p => hasPermission(p));

        if (!hasRequiredPermissions) {
            return <>{fallback}</>;
        }
    }

    return <>{children}</>;
}
