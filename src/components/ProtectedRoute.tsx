import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredUserType?: 'creator' | 'editor';
}

export const ProtectedRoute = ({ children, requiredUserType }: ProtectedRouteProps) => {
  const { user, userType, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // If not authenticated, redirect to login
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    // If user type doesn't match required type, redirect to correct dashboard
    if (requiredUserType && userType !== requiredUserType) {
      if (userType === 'creator') {
        navigate('/creator/dashboard', { replace: true });
      } else if (userType === 'editor') {
        navigate('/editor/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
      return;
    }
  }, [user, userType, loading, requiredUserType, navigate]);

  // Show loading spinner while checking authentication
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

  // If not authenticated or wrong user type, don't render anything
  // (the useEffect will handle the redirect)
  if (!user || (requiredUserType && userType !== requiredUserType)) {
    return null;
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};
