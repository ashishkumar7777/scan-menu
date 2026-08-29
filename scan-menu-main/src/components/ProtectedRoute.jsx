import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { currentUser, storeSettings, openPinPrompt } = useAuth();
  const location = useLocation();

  // If Owner disabled the PIN security system, allow direct access everywhere
  if (!storeSettings?.pinSecurityEnabled) {
    return children;
  }

  // 1. Not Authenticated
  if (!currentUser) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: '50px', marginBottom: '10px' }}>🔒</div>
        <h2 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '22px' }}>Authentication Required</h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px 0' }}>
          This console is protected. Enter your 4-digit staff PIN to unlock.
        </p>
        <button
          onClick={() => openPinPrompt(location.pathname)}
          style={{ padding: '12px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
        >
          🔑 Enter Staff PIN
        </button>
      </div>
    );
  }

  // 2. Role Not Permitted
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: '50px', marginBottom: '10px' }}>🚫</div>
        <h2 style={{ color: '#ef4444', margin: '0 0 8px 0', fontSize: '22px' }}>Access Denied</h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px 0' }}>
          Logged in as <strong>{currentUser.name}</strong> ({currentUser.role}).<br />
          You do not have permission to view this tab.
        </p>
        <button
          onClick={() => openPinPrompt(location.pathname)}
          style={{ padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
        >
          Switch User / Re-enter PIN
        </button>
      </div>
    );
  }

  return children;
}