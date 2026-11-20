/** Routes rendered as the auth modal on top of the previous page. */
export const AUTH_PATHS = ['/login', '/register', '/forget'] as const;

export function isAuthPath(pathname: string): boolean {
  return (AUTH_PATHS as readonly string[]).includes(pathname);
}

/**
 * Router state that picks the page shown behind the auth modal.
 * Protected routes set it to '/' because they cannot render for a signed-out visitor.
 */
export type AuthLocationState = { authBackground?: string } | null;
