/** Routes rendered as the auth modal on top of the previous page. */
export const AUTH_PATHS = ['/login', '/register', '/forget'] as const;

export function isAuthPath(pathname: string): boolean {
  return (AUTH_PATHS as readonly string[]).includes(pathname);
}

/**
 * Router state that picks the page shown behind the auth modal.
 * - `authBackground`: an explicit page (logout uses '/').
 * - `fromProtectedRoute`: a protected page redirected here; it cannot render for a signed-out
 *   visitor, so the modal shows the page visited before it instead.
 */
export type AuthLocationState = { authBackground?: string; fromProtectedRoute?: boolean } | null;
