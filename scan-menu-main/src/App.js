import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import ScanMenu from './components/ScanMenu';
import PosBilling from './components/PosBilling';
import LiveOrders from './components/LiveOrders';
import InventoryManager from './components/InventoryManager';
import SalesReport from './components/SalesReport'; // ADDED: SalesReport import

function NavigationBar() {
  const location = useLocation();

  const getLinkStyle = (path, activeColor) => ({
    color: '#fff',
    textDecoration: 'none',
    background: location.pathname === path ? activeColor : '#334155',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background 0.2s ease'
  });

  return (
    <nav style={{ background: '#0f172a', padding: '10px 20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
      <span style={{ color: '#fff', fontWeight: 'bold', marginRight: '20px' }}>⚡ RestoManager System</span>
      
      <Link to="/" style={getLinkStyle('/', '#3b82f6')}>
        📱 QR Mobile View
      </Link>
      
      <Link to="/pos" style={getLinkStyle('/pos', '#2563eb')}>
        🖥️ POS Billing Console
      </Link>

      <Link to="/inventory" style={getLinkStyle('/inventory', '#d97706')}>
        📦 Stock Inventory
      </Link>
      
      <Link to="/orders" style={getLinkStyle('/orders', '#16a34a')}>
        📋 Live Orders
      </Link>

      {/* ADDED: Reports Navigation Link */}
      <Link to="/reports" style={getLinkStyle('/reports', '#8b5cf6')}>
        📊 Sales Reports
      </Link>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div>
        {/* Navigation Switch Bar */}
        <NavigationBar />

        {/* Routes */}
        <Routes>
          <Route path="/" element={<ScanMenu />} />
          <Route path="/menu" element={<ScanMenu />} />
          <Route path="/pos" element={<PosBilling />} />
          <Route path="/inventory" element={<InventoryManager />} />
          <Route path="/orders" element={<LiveOrders />} />
          {/* ADDED: Reports Route */}
          <Route path="/reports" element={<SalesReport />} />
        </Routes>
      </div>
    </Router>
  );
}