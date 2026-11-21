import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToTop } from '@/utils/scrollUtils';
import { isAuthPath } from '@/utils/authPaths';

export default function ScrollToTopListener() {
  const { pathname } = useLocation();

  // Opening or switching the auth modal keeps the page underneath where it was.
  const pagePath = isAuthPath(pathname) ? null : pathname;

  useEffect(() => {
    if (pagePath !== null) scrollToTop();
  }, [pagePath]);

  return null;
}
