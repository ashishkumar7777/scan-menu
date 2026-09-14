import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import ScanMenu from './components/ScanMenu';
import PosBilling from './components/PosBilling';
import KitchenKDS from './components/KitchenKDS';
import OrderHistory from './components/OrderHistory';
import InventoryManager from './components/InventoryManager';
import SalesReport from './components/SalesReport';
import TableQRGenerator from './components/TableQRGenerator';
import TableManagement from './components/TableManagement';
import StoreSettings from './components/StoreSettings';

function NavigationBar() {
  const location = useLocation();
  const { currentUser, storeSettings, logout, openPinPrompt } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isSecurityOn = storeSettings?.pinSecurityEnabled ?? true;

  const getPillStyle = (path) => {
    const isActive = location.pathname === path;
    return {
      textDecoration: 'none',
      fontSize: '13px',
      fontWeight: '700',
      padding: '7px 18px',
      borderRadius: '9999px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      whiteSpace: 'nowrap',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      background: isActive ? '#a3e635' : '#1e293b',
      color: isActive ? '#090d16' : '#94a3b8',
      boxShadow: isActive ? '0 0 14px rgba(163, 230, 53, 0.35)' : 'none',
      border: isActive ? '1px solid #bef264' : '1px solid rgba(255, 255, 255, 0.05)',
      cursor: 'pointer',
    };
  };

  const getDrawerLinkStyle = (path) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    textDecoration: 'none',
    color: location.pathname === path ? '#090d16' : '#e2e8f0',
    background: location.pathname === path ? '#a3e635' : 'transparent',
    fontWeight: location.pathname === path ? '800' : '600',
    fontSize: '14px',
    transition: 'all 0.15s ease',
  });

  return (
    <>
      <style>{`
        body {
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box;
        }
        @media (max-width: 960px) {
          .desktop-center-notch {
            display: none !important;
          }
          .user-name-label {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Top Nav */}
      <nav style={{
        background: '#ffffff',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f1f5f9',
        height: '60px',
        position: 'relative',
        fontFamily: 'Montserrat, sans-serif'
      }}>
        
        {/* Left: Menu & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10 }}>
          <button
            onClick={() => setDrawerOpen(true)}
            title="Open Menu"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              fontSize: '16px',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ☰
          </button>

          <span style={{ color: '#0f172a', fontWeight: '900', fontSize: '16px', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#65a30d', fontSize: '18px' }}>⚡</span> RestoManager
          </span>
        </div>

        {/* Center: Inverted Notch (Desktop Only) */}
        <div className="desktop-center-notch" style={{
          position: 'absolute',
          left: '50%',
          top: '-1px',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'flex-start',
          zIndex: 20
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" style={{ display: 'block', flexShrink: 0 }}>
            <path d="M0,0 C12.15,0 22,9.85 22,22 L22,0 Z" fill="#090d16" />
          </svg>

          <div style={{
            background: '#090d16',
            padding: '8px 14px 10px 14px',
            borderBottomLeftRadius: '22px',
            borderBottomRightRadius: '22px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 18px -4px rgba(0, 0, 0, 0.28)'
          }}>
            {(!isSecurityOn || !currentUser || currentUser.role === 'MANAGER' || currentUser.role === 'CASHIER') && (
              <Link to="/pos" style={getPillStyle('/pos')}>POS Billing</Link>
            )}

            {(!isSecurityOn || !currentUser || currentUser.role === 'MANAGER' || currentUser.role === 'KITCHEN') && (
              <Link to="/kds" style={getPillStyle('/kds')}>Kitchen</Link>
            )}

            {(!isSecurityOn || !currentUser || currentUser.role === 'MANAGER' || currentUser.role === 'CASHIER') && (
              <>
                <Link to="/history" style={getPillStyle('/history')}>Orders</Link>
                <Link to="/tables" style={getPillStyle('/tables')}>Live Tables</Link>
              </>
            )}
          </div>

          <svg width="22" height="22" viewBox="0 0 22 22" style={{ display: 'block', flexShrink: 0 }}>
            <path d="M22,0 C9.85,0 0,9.85 0,22 L0,0 Z" fill="#090d16" />
          </svg>
        </div>

        {/* Right: User & Lock Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
          {isSecurityOn ? (
            currentUser ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f8fafc',
                padding: '3px 6px 3px 10px',
                borderRadius: '9999px',
                border: '1px solid #e2e8f0'
              }}>
                <span className="user-name-label" style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: currentUser.role === 'MANAGER' ? '#7e22ce' : '#0284c7'
                }}>
                  👤 {currentUser.name}
                </span>

                <button
                  onClick={logout}
                  style={{
                    background: '#090d16',
                    border: 'none',
                    color: '#f8fafc',
                    padding: '5px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🔒 Lock
                </button>
              </div>
            ) : (
              <button
                onClick={() => openPinPrompt(location.pathname)}
                style={{
                  background: '#090d16',
                  border: 'none',
                  color: '#ffffff',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                🔑 Login
              </button>
            )
          ) : null}
        </div>
      </nav>

      {/* Slide Drawer (All navigation accessible on Mobile) */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(9, 13, 22, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '82%',
              maxWidth: '300px',
              height: '100%',
              background: '#090d16',
              borderRight: '1px solid #1e293b',
              padding: '20px 16px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '12px 0 35px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#fff', fontWeight: '900', fontSize: '16px' }}>
                <span style={{ color: '#a3e635' }}>⚡</span> RestoManager
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: '#1e293b',
                  border: 'none',
                  color: '#94a3b8',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
              <Link to="/pos" onClick={() => setDrawerOpen(false)} style={getDrawerLinkStyle('/pos')}>
                <span>🖥️</span> POS Billing
              </Link>
              <Link to="/kds" onClick={() => setDrawerOpen(false)} style={getDrawerLinkStyle('/kds')}>
                <span>🍳</span> Kitchen KDS
              </Link>
              <Link to="/history" onClick={() => setDrawerOpen(false)} style={getDrawerLinkStyle('/history')}>
                <span>📑</span> Order History
              </Link>
              <Link to="/tables" onClick={() => setDrawerOpen(false)} style={getDrawerLinkStyle('/tables')}>
                <span>🍽️</span> Live Tables
              </Link>
              <Link to="/" onClick={() => setDrawerOpen(false)} style={getDrawerLinkStyle('/')}>
                <span>📱</span> QR Customer Menu
              </Link>

              {(!isSecurityOn || !currentUser || currentUser.role === 'MANAGER') && (
                <>
                  <Link to="/inventory" onClick={() => setDrawerOpen(false)} style={getDrawerLinkStyle('/inventory')}>
                    <span>{isSecurityOn ? '🔒' : '📦'}</span> Stock Inventory
                  </Link>
                  <Link to="/reports" onClick={() => setDrawerOpen(false)} style={getDrawerLinkStyle('/reports')}>
                    <span>{isSecurityOn ? '🔒' : '📊'}</span> Sales Reports
                  </Link>
                  <Link to="/table-qrs" onClick={() => setDrawerOpen(false)} style={getDrawerLinkStyle('/table-qrs')}>
                    <span>🪑</span> Table QR Generator
                  </Link>
                  <Link to="/settings" onClick={() => setDrawerOpen(false)} style={getDrawerLinkStyle('/settings')}>
                    <span>⚙️</span> Store & PIN Settings
                  </Link>
                </>
              )}
            </div>

            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px', fontSize: '11px', color: '#64748b' }}>
              RestoManager SaaS POS
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div>
          <NavigationBar />

          <Routes>
            <Route path="/" element={<ScanMenu />} />
            <Route path="/menu" element={<ScanMenu />} />
            <Route path="/scan/:cafeId" element={<ScanMenu />} />

            <Route path="/pos" element={<ProtectedRoute allowedRoles={['MANAGER', 'CASHIER']}><PosBilling /></ProtectedRoute>} />
            <Route path="/tables" element={<ProtectedRoute allowedRoles={['MANAGER', 'CASHIER']}><TableManagement /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute allowedRoles={['MANAGER', 'CASHIER']}><OrderHistory /></ProtectedRoute>} />

            <Route path="/kds" element={<ProtectedRoute allowedRoles={['MANAGER', 'KITCHEN']}><KitchenKDS /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute allowedRoles={['MANAGER', 'KITCHEN']}><KitchenKDS /></ProtectedRoute>} />

            <Route path="/inventory" element={<ProtectedRoute allowedRoles={['MANAGER']}><InventoryManager /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['MANAGER']}><SalesReport /></ProtectedRoute>} />
            <Route path="/table-qrs" element={<ProtectedRoute allowedRoles={['MANAGER']}><TableQRGenerator /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['MANAGER']}><StoreSettings /></ProtectedRoute>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}