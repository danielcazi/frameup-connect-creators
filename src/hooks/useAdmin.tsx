import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminUser, Permission, hasPermission } from '@/types/admin';
import { User } from '@supabase/supabase-js';

interface AdminContextType {
    admin: AdminUser | null;
    user: User | null;
    loading: boolean;
    hasPermission: (permission: Permission) => boolean;
    isAdmin: boolean;
    logout: () => Promise<void>;
    checkPermissions: (permissions: Permission[]) => boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
    const [admin, setAdmin] = useState<AdminUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Buscar sessão atual
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                loadAdminData(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listener para mudanças de autenticação
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                loadAdminData(session.user.id);
            } else {
                setAdmin(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadAdminData = async (userId: string) => {
        try {
            const { data: adminData, error: adminError } = await supabase
                .from('admin_users')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .maybeSingle();

            if (adminError) {
                console.error('Erro ao buscar admin:', adminError);
                setAdmin(null);
                setLoading(false);
                return;
            }

            if (!adminData) {
                setAdmin(null);
                setLoading(false);
                return;
            }

            const { data: userData } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', userId)
                .maybeSingle();

            setAdmin({
                ...adminData,
                full_name: userData?.full_name || adminData.role
            });
        } catch (error) {
            console.error('Erro ao carregar dados do admin:', error);
            setAdmin(null);
        } finally {
            setLoading(false);
        }
    };

    const checkHasPermission = (permission: Permission): boolean => {
        if (!admin) return false;
        return hasPermission(admin, permission);
    };

    const checkPermissions = (permissions: Permission[]): boolean => {
        if (!admin) return false;
        return permissions.every(p => hasPermission(admin, p));
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setAdmin(null);
        setUser(null);
    };

    const value = {
        admin,
        user,
        loading,
        hasPermission: checkHasPermission,
        isAdmin: !!admin,
        logout,
        checkPermissions,
    };

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
}
