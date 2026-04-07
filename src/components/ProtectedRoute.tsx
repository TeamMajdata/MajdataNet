import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useUserContext } from '@/hooks';
import { LoadingSpinner } from '@/components';

export default function ProtectedRoute() {
  const { user, isLoading } = useUserContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="50px" />
      </div>
    );
  }

  if (!user) return null;

  return <Outlet />;
}
