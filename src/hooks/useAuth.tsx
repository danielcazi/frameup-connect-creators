import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error };

    // Get user type from metadata
    const userType = data.user?.user_metadata?.user_type;
    
    return { data, userType };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/');
    }
    return { error };
  };

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
          // Editor-specific metadata (will be used to populate tables)
          ...(editorData && {
            portfolio_videos: editorData.portfolioVideos,
            software_skills: editorData.softwareSkills,
          })
        }
      }
    });

    return { data, error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
    signUp,
  };
};
