import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ScanMenu from './components/ScanMenu';
import PosBilling from './components/PosBilling';
import LiveOrders from './components/LiveOrders';

export default function App() {
  return (
    <Router>
      <div>
        {/* Navigation Switch Bar */}
        <nav style={{ background: '#0f172a', padding: '10px 20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 'bold', marginRight: '20px' }}>⚡ RestoManager System</span>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', background: '#334155', padding: '6px 14px', borderRadius: '6px', fontSize: '14px' }}>
            📱 QR Mobile View
          </Link>
          <Link to="/pos" style={{ color: '#fff', textDecoration: 'none', background: '#2563eb', padding: '6px 14px', borderRadius: '6px', fontSize: '14px' }}>
            🖥️ POS Billing Console
          </Link>
          <Link to="/orders" style={{ color: '#fff', textDecoration: 'none', background: '#16a34a', padding: '6px 14px', borderRadius: '6px', fontSize: '14px' }}>
            📋 Live Orders
          </Link>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<ScanMenu />} />
          <Route path="/menu" element={<ScanMenu />} />
          <Route path="/pos" element={<PosBilling />} />
          <Route path="/orders" element={<LiveOrders />} />
        </Routes>
      </div>
    </Router>
  );
}