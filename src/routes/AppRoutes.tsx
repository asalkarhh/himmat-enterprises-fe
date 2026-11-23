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

// FE02 Catalog Pages
import { ProductsPage } from '../pages/catalog/ProductsPage';
import { ProductDetailPage } from '../pages/catalog/ProductDetailPage';
import { BrandsPage } from '../pages/catalog/BrandsPage';
import { CategoriesPage } from '../pages/catalog/CategoriesPage';
import { SubcategoriesPage } from '../pages/catalog/SubcategoriesPage';
import { PricingPreviewPage } from '../pages/catalog/PricingPreviewPage';

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

          {/* FE02 Catalog & Pricing routes */}
          <Route path="/catalog" element={<Navigate to="/catalog/products" replace />} />
          <Route path="/catalog/products" element={<ProductsPage />} />
          <Route path="/catalog/products/:id" element={<ProductDetailPage />} />
          <Route path="/catalog/brands" element={<BrandsPage />} />
          <Route path="/catalog/categories" element={<CategoriesPage />} />
          <Route path="/catalog/subcategories" element={<SubcategoriesPage />} />
          <Route path="/catalog/pricing-preview" element={<PricingPreviewPage />} />

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
