import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { X, Building2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { navigationConfig } from '../config/navigation';
import { cn } from '../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const userRole = user?.role;
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Manage drawer focus and Escape-to-close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      requestAnimationFrame(() => {
        const closeBtn = drawerRef.current?.querySelector<HTMLButtonElement>('button[aria-label="Close menu"]');
        closeBtn?.focus();
      });
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  // Filter groups according to user role
  const visibleGroups = navigationConfig
    .filter((group) => userRole && group.roles.includes(userRole))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => userRole && item.roles.includes(userRole)),
    }))
    .filter((group) => group.items.length > 0);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100 bg-teal-900 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-teal-800 flex items-center justify-center shadow-inner shrink-0">
            <Building2 className="w-5 h-5 text-teal-200" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-base tracking-tight block leading-tight text-white truncate">
              Himmat Enterprises
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-teal-300 block truncate">
              {userRole === 'OWNER' ? 'Owner Portal' : 'Manager Portal'}
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="lg:hidden text-teal-200 hover:text-white p-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {visibleGroups.map((group, gIdx) => (
          <div key={group.groupTitle || gIdx} className="space-y-1">
            {group.groupTitle && (
              <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {group.groupTitle}
              </h4>
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;

                if (item.disabled) {
                  return (
                    <div
                      key={item.path}
                      title={item.availabilityNote || 'Module coming in next phase'}
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-400 bg-slate-50/50 cursor-not-allowed select-none"
                      aria-disabled="true"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="truncate">{item.title}</span>
                      </div>
                      <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 shrink-0">
                        Soon
                      </span>
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        onClose();
                      }
                    }}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                        isActive
                          ? 'bg-teal-50 text-teal-900 font-semibold shadow-sm border border-teal-200/80'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* User profile footer */}
      {user && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-800 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate leading-snug">
                {user.displayName}
              </p>
              <p className="text-xs text-slate-500 truncate">@{user.username}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Navigation Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        >
          <div
            ref={drawerRef}
            className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 transform transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
