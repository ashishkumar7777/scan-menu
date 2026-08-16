import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import ScanMenu from './components/ScanMenu';
import PosBilling from './components/PosBilling';
import KitchenKDS from './components/KitchenKDS';
import OrderHistory from './components/OrderHistory';
import InventoryManager from './components/InventoryManager';
import SalesReport from './components/SalesReport';
import TableQRGenerator from './components/TableQRGenerator';
import TableManagement from './components/TableManagement';

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

      <Link to="/tables" style={getLinkStyle('/tables', '#059669')}>
        🍽️ Live Tables
      </Link>

      <Link to="/inventory" style={getLinkStyle('/inventory', '#d97706')}>
        📦 Stock Inventory
      </Link>
      
      <Link to="/kds" style={getLinkStyle('/kds', '#16a34a')}>
        🍳 Kitchen KDS
      </Link>

      <Link to="/history" style={getLinkStyle('/history', '#0284c7')}>
        📑 Order History
      </Link>

      <Link to="/reports" style={getLinkStyle('/reports', '#8b5cf6')}>
        📊 Sales Reports
      </Link>

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
        <NavigationBar />

        <Routes>
          <Route path="/" element={<ScanMenu />} />
          <Route path="/menu" element={<ScanMenu />} />
          <Route path="/scan/:cafeId" element={<ScanMenu />} />
          <Route path="/pos" element={<PosBilling />} />
          <Route path="/tables" element={<TableManagement />} />
          <Route path="/inventory" element={<InventoryManager />} />
          
          <Route path="/kds" element={<KitchenKDS />} />
          <Route path="/orders" element={<KitchenKDS />} />
          <Route path="/history" element={<OrderHistory />} />

          <Route path="/reports" element={<SalesReport />} />
          <Route path="/table-qrs" element={<TableQRGenerator />} />
        </Routes>
      </div>
    </Router>
  );
}