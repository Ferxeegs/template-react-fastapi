import React from 'react';
import { Link, useLocation } from 'react-router';
import { GridIcon, DocsIcon, DollarLineIcon, TableIcon } from '../icons';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-2 py-2 bg-white border-t border-gray-200 lg:hidden dark:bg-gray-900 dark:border-gray-800 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <Link to="/" className="flex flex-col items-center justify-center w-full">
        <div className={getIconClass('/')}>
          <GridIcon />
        </div>
        <span className={getTextClass('/')}>Dashboard</span>
      </Link>
      
      <Link to="/purchase-requisitions" className="flex flex-col items-center justify-center w-full">
        <div className={getIconClass('/purchase-requisitions')}>
          <DocsIcon />
        </div>
        <span className={getTextClass('/purchase-requisitions')}>Permintaan</span>
      </Link>

      <Link to="/purchase-orders" className="flex flex-col items-center justify-center w-full">
        <div className={getIconClass('/purchase-orders')}>
          <DollarLineIcon />
        </div>
        <span className={getTextClass('/purchase-orders')}>PO</span>
      </Link>

      <Link to="/inventory" className="flex flex-col items-center justify-center w-full">
        <div className={getIconClass('/inventory')}>
          <TableIcon />
        </div>
        <span className={getTextClass('/inventory')}>Stock</span>
      </Link>
    </div>
  );
};

export default MobileBottomNav;
