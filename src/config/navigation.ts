import {
  LayoutDashboard,
  Receipt,
  Users2,
  Package,
  Boxes,
  Truck,
  CreditCard,
  DollarSign,
  BarChart3,
  Settings,
  Shield,
  User,
  Tag,
  FolderTree,
  Layers,
  Calculator,
  History,
  ShoppingBag,
  LucideIcon,
} from 'lucide-react';
import { UserRole } from '../types/auth.types';

export interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  roles: UserRole[];
  disabled?: boolean;
  availabilityNote?: string;
}

export interface NavGroup {
  groupTitle?: string;
  roles: UserRole[];
  items: NavItem[];
}

export const navigationConfig: NavGroup[] = [
  {
    roles: ['OWNER', 'MANAGER'],
    items: [
      {
        title: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        roles: ['OWNER', 'MANAGER'],
      },
    ],
  },
  {
    groupTitle: 'Catalog & Pricing',
    roles: ['OWNER', 'MANAGER'],
    items: [
      {
        title: 'Products',
        path: '/catalog/products',
        icon: Package,
        roles: ['OWNER', 'MANAGER'],
      },
      {
        title: 'Brands',
        path: '/catalog/brands',
        icon: Tag,
        roles: ['OWNER', 'MANAGER'],
      },
      {
        title: 'Categories',
        path: '/catalog/categories',
        icon: FolderTree,
        roles: ['OWNER', 'MANAGER'],
      },
      {
        title: 'Subcategories',
        path: '/catalog/subcategories',
        icon: Layers,
        roles: ['OWNER', 'MANAGER'],
      },
      {
        title: 'Pricing Calculator',
        path: '/catalog/pricing-preview',
        icon: Calculator,
        roles: ['OWNER', 'MANAGER'],
      },
    ],
  },
  {
    groupTitle: 'Parties & Suppliers',
    roles: ['OWNER', 'MANAGER'],
    items: [
      {
        title: 'Customers & Sites',
        path: '/customers',
        icon: Users2,
        roles: ['OWNER', 'MANAGER'],
      },
      {
        title: 'Suppliers',
        path: '/suppliers',
        icon: Truck,
        roles: ['OWNER', 'MANAGER'],
      },
    ],
  },
  {
    groupTitle: 'Inventory & Stock',
    roles: ['OWNER', 'MANAGER'],
    items: [
      {
        title: 'Inventory Balances',
        path: '/inventory',
        icon: Boxes,
        roles: ['OWNER', 'MANAGER'],
      },
      {
        title: 'Stock Movements',
        path: '/inventory/movements',
        icon: History,
        roles: ['OWNER', 'MANAGER'],
      },
    ],
  },
  {
    groupTitle: 'Purchases & Inward',
    roles: ['OWNER', 'MANAGER'],
    items: [
      {
        title: 'Purchases',
        path: '/purchases',
        icon: ShoppingBag,
        roles: ['OWNER', 'MANAGER'],
      },
    ],
  },
  {
    groupTitle: 'Sales & Billing',
    roles: ['OWNER', 'MANAGER'],
    items: [
      {
        title: 'Invoices',
        path: '/billing',
        icon: Receipt,
        roles: ['OWNER', 'MANAGER'],
      },
      {
        title: 'Outstanding Dues',
        path: '/dues',
        icon: CreditCard,
        roles: ['OWNER', 'MANAGER'],
      },
    ],
  },
  {
    groupTitle: 'Future Modules',
    roles: ['OWNER', 'MANAGER'],
    items: [
      {
        title: 'Expenses',
        path: '/expenses',
        icon: DollarSign,
        roles: ['OWNER', 'MANAGER'],
        disabled: true,
        availabilityNote: 'Coming in FE08 (Operating Expenses & Reports)',
      },
      {
        title: 'Reports',
        path: '/reports',
        icon: BarChart3,
        roles: ['OWNER', 'MANAGER'],
        disabled: true,
        availabilityNote: 'Coming in FE08 (Reports & Profit Analytics)',
      },
    ],
  },
  {
    groupTitle: 'Administration',
    roles: ['OWNER', 'MANAGER'],
    items: [
      {
        title: 'Shop Settings',
        path: '/settings/shop',
        icon: Settings,
        roles: ['OWNER', 'MANAGER'],
      },
      {
        title: 'Users & Roles',
        path: '/users',
        icon: Shield,
        roles: ['OWNER'], // Strictly Owner only
      },
      {
        title: 'My Account',
        path: '/account',
        icon: User,
        roles: ['OWNER', 'MANAGER'],
      },
    ],
  },
];
