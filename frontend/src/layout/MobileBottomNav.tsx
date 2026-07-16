import React from 'react';
import { Link, useLocation } from 'react-router';
import { GridIcon, UserCircleIcon, LockIcon, SettingsIcon } from '../icons';
import { useAuth } from '../context/AuthContext';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { hasPermission } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getIconClass = (path: string) =>
    `w-6 h-6 mb-1 [&>svg]:w-full [&>svg]:h-full ${isActive(path) ? 'text-brand-500 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`;

  const getTextClass = (path: string) =>
    `text-[10px] font-medium ${isActive(path) ? 'text-brand-500 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`;

  const items = [
    { path: '/', label: 'Beranda', icon: <GridIcon />, show: true },
    {
      path: '/users',
      label: 'Users',
      icon: <UserCircleIcon />,
      show: hasPermission('view_user'),
    },
    {
      path: '/roles',
      label: 'Roles',
      icon: <LockIcon />,
      show: hasPermission('view_role'),
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: <SettingsIcon />,
      show: hasPermission('view_setting'),
    },
  ].filter((item) => item.show);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-2 py-2 bg-white border-t border-gray-200 lg:hidden dark:bg-gray-900 dark:border-gray-800 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {items.map((item) => (
        <Link key={item.path} to={item.path} className="flex flex-col items-center justify-center w-full">
          <div className={getIconClass(item.path)}>
            {item.icon}
          </div>
          <span className={getTextClass(item.path)}>{item.label}</span>
        </Link>
      ))}
    </div>
  );
};

export default MobileBottomNav;
