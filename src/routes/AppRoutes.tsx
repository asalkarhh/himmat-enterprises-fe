import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { AccountPage } from '../pages/account/AccountPage';
import { ShopSettingsPage } from '../pages/settings/ShopSettingsPage';
import { UsersPage } from '../pages/users/UsersPage';
import { ForbiddenPage } from '../pages/common/ForbiddenPage';
import { NotFoundPage } from '../pages/common/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected application routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/settings/shop" element={<ShopSettingsPage />} />

          {/* Owner-only administrative routes */}
          <Route element={<RoleRoute allowedRoles={['OWNER']} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>

          {/* Error and access routes */}
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRoutes;
