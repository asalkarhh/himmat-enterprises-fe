import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth.types';

export interface RoleRouteProps {
  allowedRoles?: UserRole[];
  requiredPermission?: string;
  children?: React.ReactNode;
}

export const RoleRoute: React.FC<RoleRouteProps> = ({
  allowedRoles,
  requiredPermission,
  children,
}) => {
  const { user, isOwner, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Owner always has full access
  if (isOwner) {
    return children ? <>{children}</> : <Outlet />;
  }

  // Check role restrictions
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  // Check permission restrictions
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RoleRoute;
