import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User, EditorProfile, PortfolioVideo } from '@/types/database';

interface UseUserReturn {
  userData: User | null;
  editorProfile: EditorProfile | null;
  portfolioVideos: PortfolioVideo[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useUser = (): UseUserReturn => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [editorProfile, setEditorProfile] = useState<EditorProfile | null>(null);
  const [portfolioVideos, setPortfolioVideos] = useState<PortfolioVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Construct user data from auth user and metadata
      const authUserData: User = {
        id: user.id,
        email: user.email || '',
        user_type: user.user_metadata?.user_type || 'creator',
        full_name: user.user_metadata?.full_name || '',
        username: user.user_metadata?.username || '',
        phone: user.user_metadata?.phone || '',
        profile_photo_url: user.user_metadata?.profile_photo_url,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
      };

      setUserData(authUserData);

      // If editor, fetch additional profile data
      if (authUserData.user_type === 'editor') {
        const { data: profile, error: profileError } = await supabase
          .from('editor_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching editor profile:', profileError);
        } else {
          setEditorProfile(profile);
        }

        // Fetch portfolio videos
        const { data: videos, error: videosError } = await supabase
          .from('portfolio_videos')
          .select('*')
          .eq('editor_id', user.id)
          .order('order_position', { ascending: true });

        if (videosError) {
          console.error('Error fetching portfolio videos:', videosError);
        } else {
          setPortfolioVideos(videos || []);
        }
      }
    } catch (error) {
      console.error('Error in useUser:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  return {
    userData,
    editorProfile,
    portfolioVideos,
    loading,
    refetch: fetchUserData,
  };
};
