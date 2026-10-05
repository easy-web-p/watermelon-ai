import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

/**
 * Hash routing keeps the whole app deployable as a static bundle and works
 * unchanged inside the Capacitor Android/iOS shells, where there is no server
 * to rewrite deep links.
 */

function currentPath(): string {
  if (typeof window === 'undefined') return '/';
  if (window.location.hash) {
    const raw = window.location.hash.replace(/^#/, '');
    const path = raw.split('?')[0] || '/';
    return path.startsWith('/') ? path : `/${path}`;
  }
  const pathname = window.location.pathname;
  if (pathname && pathname !== '/' && pathname !== '/blank') {
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
  }
  return '/';
}

function currentSearch(): string {
  if (typeof window === 'undefined') return '';
  if (window.location.hash.includes('?')) {
    return window.location.hash.split('?')[1] ?? '';
  }
  return window.location.search.replace(/^\?/, '');
}

type RouterValue = {
  path: string;
  query: URLSearchParams;
  navigate: (to: string, options?: { replace?: boolean }) => void;
};

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(currentPath);
  const [search, setSearch] = useState(currentSearch);

  useEffect(() => {
    const sync = () => {
      setPath(currentPath());
      setSearch(currentSearch());
    };
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const target = `#${to.startsWith('/') ? to : `/${to}`}`;
    if (options?.replace) {
      window.history.replaceState(null, '', target);
      setPath(currentPath());
      setSearch(window.location.hash.split('?')[1] ?? '');
    } else {
      window.location.hash = target;
    }
  }, []);

  const value = useMemo<RouterValue>(
    () => ({ path, query: new URLSearchParams(search), navigate }),
    [path, search, navigate],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error('useRouter must be used inside <RouterProvider>');
  return value;
}

/** Scrolls the page to the top whenever the route changes. */
export function useScrollReset(path: string) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [path]);
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string;
  children: ReactNode;
};

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  return (
    <a
      href={`#${to}`}
      onClick={(event) => {
        onClick?.(event);
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.defaultPrevented) return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
