import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function StoreSettings() {
  const { storeSettings, updateStoreSettings } = useAuth();

  const [pinSecurityEnabled, setPinSecurityEnabled] = useState(storeSettings.pinSecurityEnabled ?? true);
  const [managerPin, setManagerPin] = useState(storeSettings.managerPin || '9999');
  const [cashierPin, setCashierPin] = useState(storeSettings.cashierPin || '1111');
  const [kitchenPin, setKitchenPin] = useState(storeSettings.kitchenPin || '2222');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (pinSecurityEnabled) {
      const pinRegex = /^\d{4}$/;
      if (!pinRegex.test(managerPin) || !pinRegex.test(cashierPin) || !pinRegex.test(kitchenPin)) {
        return setErrorMsg('All PINs must be exactly 4 numeric digits.');
      }
    }

    updateStoreSettings({
      pinSecurityEnabled,
      managerPin,
      cashierPin,
      kitchenPin,
    });

    setSuccessMsg('Settings saved successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div style={{ padding: '30px', minHeight: 'calc(100vh - 60px)', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
          ⚙️ Owner PIN & Security Settings
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
          Configure staff 4-digit PINs or toggle the authentication lock across all consoles.
        </p>

        <form onSubmit={handleSave} style={{ background: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          
          {/* Master Enable/Disable Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0f172a' }}>Staff PIN Security System</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                {pinSecurityEnabled ? 'System is Active: Tabs require PIN to unlock.' : 'System Disabled: All tabs open directly without PIN.'}
              </p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
              <input
                type="checkbox"
                checked={pinSecurityEnabled}
                onChange={(e) => setPinSecurityEnabled(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: pinSecurityEnabled ? '#16a34a' : '#cbd5e1',
                borderRadius: '34px',
                transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: '20px',
                  width: '20px',
                  left: pinSecurityEnabled ? '26px' : '3px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: '0.3s'
                }} />
              </span>
            </label>
          </div>

          {/* 4-Digit PIN Configs */}
          <div style={{ opacity: pinSecurityEnabled ? 1 : 0.45, pointerEvents: pinSecurityEnabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#334155' }}>Configure 4-Digit Staff PINs:</h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              
              {/* Manager PIN */}
              <div style={{ background: '#faf5ff', padding: '14px', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#6b21a8', marginBottom: '6px' }}>
                  👑 Manager PIN
                </label>
                <input
                  type="text"
                  maxLength="4"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #d8b4fe', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', boxSizing: 'border-box' }}
                />
              </div>

              {/* Cashier PIN */}
              <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1e40af', marginBottom: '6px' }}>
                  🖥️ Cashier PIN
                </label>
                <input
                  type="text"
                  maxLength="4"
                  value={cashierPin}
                  onChange={(e) => setCashierPin(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #93c5fd', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', boxSizing: 'border-box' }}
                />
              </div>

              {/* Kitchen PIN */}
              <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#166534', marginBottom: '6px' }}>
                  🍳 Kitchen PIN
                </label>
                <input
                  type="text"
                  maxLength="4"
                  value={kitchenPin}
                  onChange={(e) => setKitchenPin(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 'bold', marginBottom: '14px' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ color: '#16a34a', fontSize: '13px', fontWeight: 'bold', marginBottom: '14px' }}>
              ✓ {successMsg}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            💾 Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}