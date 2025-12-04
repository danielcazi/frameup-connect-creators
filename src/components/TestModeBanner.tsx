import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FlaskConical } from 'lucide-react';

export function TestModeBanner() {
    const { user, userType } = useAuth();
    const [isTest, setIsTest] = useState(false);

    useEffect(() => {
        async function check() {
            if (!user) return;

            if (userType === 'creator') {
                const { data } = await supabase
                    .from('users')
                    .select('is_test_account')
                    .eq('id', user.id)
                    .single();
                setIsTest(data?.is_test_account === true);
            } else if (userType === 'editor') {
                const { data } = await supabase
                    .from('editor_profiles')
                    .select('bypass_subscription')
                    .eq('user_id', user.id)
                    .single();
                setIsTest(data?.bypass_subscription === true);
            }
        }
        check();
    }, [user, userType]);

    if (!isTest) return null;

    return (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
            <FlaskConical className="w-4 h-4" />
            🧪 MODO TESTE - Pagamentos desativados
        </div>
    );
}
