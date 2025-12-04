import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

type UserType = 'creator' | 'editor' | null;

interface AuthContextType {
  user: User | null;
  userType: UserType;
  loading: boolean;
  session: Session | null;
  signUp: (
    email: string,
    password: string,
    userType: 'creator' | 'editor',
    fullName: string,
    username: string,
    phone: string,
    profilePhotoUrl?: string,
    editorData?: {
      portfolioVideos: Array<{ url: string; type: string; position: number }>;
      softwareSkills: string[];
    }
  ) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; userType?: UserType }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (data: any) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<UserType>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      // Safety timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('Auth initialization timed out, forcing loading to false');
        setLoading(false);
      }, 5000);

      try {
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('[AuthDebug] Auth state change:', event);
            setSession(session);
            setUser(session?.user ?? null);

            // Temporary debug: Skip user type fetch to rule out DB hang
            /*
            if (session?.user) {
              let type = session.user.user_metadata?.user_type as UserType;

              // Fallback: fetch from public.users if missing in metadata
              if (!type) {
                const { data } = await supabase
                  .from('users')
                  .select('user_type')
                  .eq('id', session.user.id)
                  .single();

                if (data) {
                  type = data.user_type as UserType;
                }
              }

              setUserType(type);
            } else {
              setUserType(null);
            }
            */

            // Just set type from metadata if available, or null
            setUserType((session?.user?.user_metadata?.user_type as UserType) || null);

            // This setLoading(false) handles subsequent auth state changes
            // and ensures loading is false after any auth event.
            setLoading(false);
          }
        );

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          let type = session.user.user_metadata?.user_type as UserType;

          // Fallback: fetch from public.users if missing in metadata
          if (!type) {
            const { data } = await supabase
              .from('users')
              .select('user_type')
              .eq('id', session.user.id)
              .single();

            if (data) {
              type = data.user_type as UserType;
            }
          }

          setUserType(type);
        }

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        clearTimeout(timeoutId);
        // This setLoading(false) ensures loading is false after the initial check,
        // regardless of success or failure.
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    userType: 'creator' | 'editor',
    fullName: string,
    username: string,
    phone: string,
    profilePhotoUrl?: string,
    editorData?: {
      portfolioVideos: Array<{ url: string; type: string; position: number }>;
      softwareSkills: string[];
    }
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          user_type: userType,
          full_name: fullName,
          username,
          phone,
          profile_photo_url: profilePhotoUrl,
          ...(editorData && {
            portfolio_videos: editorData.portfolioVideos,
            software_skills: editorData.softwareSkills,
          })
        }
      }
    });

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('[AuthDebug] Starting signIn for:', email);

    let authData: any = null;
    let authError: any = null;

    // Use direct fetch immediately as workaround for client hang
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        authError = new Error(data.error_description || data.msg || 'Login failed');
      } else {
        // Set session manually
        console.log('[AuthDebug] calling setSession');
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        console.log('[AuthDebug] setSession completed', { sessionError });

        if (sessionError) {
          authError = sessionError;
        } else {
          authData = { user: sessionData.user, session: sessionData.session };
        }
      }
    } catch (fetchErr) {
      console.error('[AuthDebug] Login failed:', fetchErr);
      authError = fetchErr;
    }

    if (authError) {
      console.error('[AuthDebug] Login error:', authError);
      return { error: authError };
    }

    console.log('[AuthDebug] Login success, user:', authData?.user?.id);
    let userType = authData?.user?.user_metadata?.user_type;
    console.log('[AuthDebug] Initial userType from metadata:', userType);

    if (!userType && authData?.user) {
      console.log('[AuthDebug] userType missing, fetching from public.users...');
      // Create a timeout promise for the user fetch
      const fetchTimeout = new Promise<{ data: any }>((resolve) => {
        setTimeout(() => {
          console.warn('[AuthDebug] User fetch timed out');
          resolve({ data: null });
        }, 5000);
      });

      const fetchUser = supabase
        .from('users')
        .select('user_type')
        .eq('id', authData.user.id)
        .single()
        .then(res => {
          console.log('[AuthDebug] User fetch result:', res);
          return res;
        });

      // Race the fetch against the timeout
      const { data: userData } = await Promise.race([fetchUser, fetchTimeout]);

      if (userData) {
        userType = userData.user_type;
        console.log('[AuthDebug] Resolved userType from DB:', userType);
      } else {
        console.warn('[AuthDebug] Failed to resolve userType from DB (null or timeout)');
      }
    }

    setUserType(userType);
    console.log('[AuthDebug] Final userType set:', userType);

    return { error: null, userType };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setUserType(null);
      setSession(null);
      navigate('/');
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar-senha`,
    });
    return { error };
  };

  const updateProfile = async (data: any) => {
    const { error } = await supabase.auth.updateUser({
      data
    });
    return { error };
  };

  const value = {
    user,
    userType,
    loading,
    session,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-lg text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
