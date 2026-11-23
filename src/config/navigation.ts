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
    groupTitle: 'Future Modules',
    roles: ['OWNER', 'MANAGER'],
    items: [
      {
        title: 'Billing & POS',
        path: '/billing',
        icon: Receipt,
        roles: ['OWNER', 'MANAGER'],
        disabled: true,
        availabilityNote: 'Coming in FE06 (Immediate Billing & Customer Payments)',
      },
      {
        title: 'Customers & Sites',
        path: '/customers',
        icon: Users2,
        roles: ['OWNER', 'MANAGER'],
        disabled: true,
        availabilityNote: 'Coming in FE03 (Customers, Sites & Suppliers)',
      },
      {
        title: 'Products & Pricing',
        path: '/catalog',
        icon: Package,
        roles: ['OWNER', 'MANAGER'],
        disabled: true,
        availabilityNote: 'Coming in FE02 (Catalog, Variants & Pricing)',
      },
      {
        title: 'Inventory & Stock',
        path: '/inventory',
        icon: Boxes,
        roles: ['OWNER', 'MANAGER'],
        disabled: true,
        availabilityNote: 'Coming in FE04 (Inventory & Adjustments)',
      },
      {
        title: 'Purchases & Suppliers',
        path: '/purchases',
        icon: Truck,
        roles: ['OWNER', 'MANAGER'],
        disabled: true,
        availabilityNote: 'Coming in FE05 (Purchases & Supplier Settlements)',
      },
      {
        title: 'Payments & Dues',
        path: '/dues',
        icon: CreditCard,
        roles: ['OWNER', 'MANAGER'],
        disabled: true,
        availabilityNote: 'Coming in FE06 (Dues & Payment Allocation)',
      },
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
