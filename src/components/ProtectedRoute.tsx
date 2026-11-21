import { useEffect, useRef } from 'react';
import PageLoading from '@/components/ui/PageLoading';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { isAuthPath, type AuthLocationState } from '@/utils/authPaths';
import { useUserContext } from '@/hooks';

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
      const state: AuthLocationState = { fromProtectedRoute: true };
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search), { replace: true, state });
    }
  }, [isLoading, user, authOpen, navigate]);

  if (isLoading) {
    return (
      <PageLoading />
    );
  }

  if (!user) return null;

  return <Outlet />;
}
