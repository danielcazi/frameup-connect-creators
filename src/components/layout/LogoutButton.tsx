import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface LogoutButtonProps {
    className?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showLabel?: boolean;
    iconClassName?: string;
    redirectTo?: string;
}

export default function LogoutButton({
    className,
    variant = 'ghost',
    showLabel = true,
    iconClassName,
    redirectTo = '/login'
}: LogoutButtonProps) {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        try {
            setLoading(true);

            // Sign out from Supabase
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            // Clear local storage
            localStorage.clear();
            sessionStorage.clear();

            toast({
                title: "Logout realizado",
                description: "Você saiu da sua conta com sucesso.",
            });

            // Redirect to login
            navigate(redirectTo);
        } catch (error) {
            console.error('Error logging out:', error);
            toast({
                variant: "destructive",
                title: "Erro ao sair",
                description: "Ocorreu um erro ao tentar sair. Tente novamente.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant={variant}
            className={cn("w-full justify-start", className)}
            onClick={handleLogout}
            disabled={loading}
        >
            <LogOut className={cn("w-4 h-4 mr-2", iconClassName)} />
            {showLabel && "Sair"}
        </Button>
    );
}
