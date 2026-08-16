import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import ScanMenu from './components/ScanMenu';
import PosBilling from './components/PosBilling';
import KitchenKDS from './components/KitchenKDS';
import OrderHistory from './components/OrderHistory';
import InventoryManager from './components/InventoryManager';
import SalesReport from './components/SalesReport';
import TableQRGenerator from './components/TableQRGenerator';

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
    transition: 'background 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  });

  return (
    <nav style={{ background: '#0f172a', padding: '10px 20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ color: '#fff', fontWeight: 'bold', marginRight: '16px', fontSize: '15px' }}>
        ⚡ RestoManager System
      </span>
      
      <Link to="/" style={getLinkStyle('/', '#3b82f6')}>
        📱 QR Mobile View
      </Link>
      
      <Link to="/pos" style={getLinkStyle('/pos', '#2563eb')}>
        🖥️ POS Billing Console
      </Link>

      <Link to="/inventory" style={getLinkStyle('/inventory', '#d97706')}>
        📦 Stock Inventory
      </Link>
      
      {/* Dedicated Kitchen Display Screen */}
      <Link to="/kds" style={getLinkStyle('/kds', '#16a34a')}>
        🍳 Kitchen KDS
      </Link>

      {/* Dedicated Order Details & History Screen */}
      <Link to="/history" style={getLinkStyle('/history', '#0284c7')}>
        📑 Order History
      </Link>

      <Link to="/reports" style={getLinkStyle('/reports', '#8b5cf6')}>
        📊 Sales Reports
      </Link>

      {/* Table QR Standee Studio */}
      <Link to="/table-qrs" style={getLinkStyle('/table-qrs', '#ea580c')}>
        🪑 Table QRs
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
          <Route path="/scan/:cafeId" element={<ScanMenu />} />
          <Route path="/pos" element={<PosBilling />} />
          <Route path="/inventory" element={<InventoryManager />} />
          
          {/* Separated Routes for KDS and Order History */}
          <Route path="/kds" element={<KitchenKDS />} />
          <Route path="/orders" element={<KitchenKDS />} />
          <Route path="/history" element={<OrderHistory />} />

          <Route path="/reports" element={<SalesReport />} />
          
          {/* Table QR Generator Route */}
          <Route path="/table-qrs" element={<TableQRGenerator />} />
        </Routes>
      </div>
    </Router>
  );
}