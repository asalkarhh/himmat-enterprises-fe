import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  settings: 'Settings',
  shop: 'Shop Settings',
  users: 'Users & Roles',
  account: 'My Account',
  forbidden: 'Access Denied',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'dashboard')) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center text-sm font-medium text-slate-700">
        <Home className="w-4 h-4 text-teal-700 mr-2" />
        <span>Dashboard</span>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-slate-500">
      <Link
        to="/dashboard"
        className="flex items-center text-slate-500 hover:text-slate-900 transition-colors"
      >
        <Home className="w-4 h-4 text-teal-700" />
        <span className="sr-only">Dashboard</span>
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNames[name] || name.charAt(0).toUpperCase() + name.slice(1);

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            {isLast ? (
              <span className="font-semibold text-slate-900 truncate" aria-current="page">
                {displayName}
              </span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-slate-900 transition-colors truncate"
              >
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
