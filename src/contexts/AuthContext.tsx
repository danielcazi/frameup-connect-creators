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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const type = session.user.user_metadata?.user_type as UserType;
          setUserType(type);
        } else {
          setUserType(null);
        }

        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const type = session.user.user_metadata?.user_type as UserType;
        setUserType(type);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error };

    const userType = data.user?.user_metadata?.user_type;
    setUserType(userType);

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
