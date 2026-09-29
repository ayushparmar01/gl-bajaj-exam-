import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout-root">
      <Navbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
      <div className="layout-body">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="layout-main">
          <div className="layout-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
