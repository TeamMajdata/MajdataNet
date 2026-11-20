import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { isAuthPath, type AuthLocationState } from '@/utils/authPaths';
import { useUserContext } from '@/hooks';
import { LoadingSpinner } from '@/components';

export default function ProtectedRoute() {
  const { user, isLoading } = useUserContext();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const redirected = useRef(false);
  // While the auth modal is open this route may be rendered underneath it; don't redirect again.
  const authOpen = isAuthPath(pathname);

  useEffect(() => {
    if (!isLoading && !user && !authOpen && !redirected.current) {
      redirected.current = true;
      const state: AuthLocationState = { authBackground: '/' };
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search), { replace: true, state });
    }
  }, [isLoading, user, authOpen, navigate]);

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
