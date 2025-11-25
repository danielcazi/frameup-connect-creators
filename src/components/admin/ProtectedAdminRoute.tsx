import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { Permission } from '@/types/admin';

interface ProtectedAdminRouteProps {
    children: ReactNode;
    requiredPermissions?: Permission[];
    requireAll?: boolean; // Se true, requer TODAS as permissões. Se false, requer PELO MENOS UMA
}

export function ProtectedAdminRoute({
    children,
    requiredPermissions = [],
    requireAll = true
}: ProtectedAdminRouteProps) {
    const { admin, loading, checkPermissions, hasPermission } = useAdmin();

    // Mostra loading enquanto verifica autenticação
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Se não é admin, redireciona para login
    if (!admin) {
        return <Navigate to="/admin/login" replace />;
    }

    // Se requer permissões específicas
    if (requiredPermissions.length > 0) {
        const hasRequiredPermissions = requireAll
            ? checkPermissions(requiredPermissions)
            : requiredPermissions.some(p => hasPermission(p));

        if (!hasRequiredPermissions) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-red-600 mb-2">Acesso Negado</h1>
                        <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
}
