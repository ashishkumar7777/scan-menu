import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

const DEFAULT_SETTINGS = {
  pinSecurityEnabled: true, // Master Switch
  managerPin: '9999',
  cashierPin: '1111',
  kitchenPin: '2222',
};

export function AuthProvider({ children }) {
  // Store Settings (Toggle & Custom PINs)
  const [storeSettings, setStoreSettings] = useState(() => {
    const saved = localStorage.getItem('resto_store_settings');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Logged-in Staff Session
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('resto_auth_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Update Settings Handler
  const updateStoreSettings = (newSettings) => {
    const updated = { ...storeSettings, ...newSettings };
    setStoreSettings(updated);
    localStorage.setItem('resto_store_settings', JSON.stringify(updated));
  };

  const loginWithPin = (enteredPin) => {
    let matchedRole = null;

    if (enteredPin === storeSettings.managerPin) {
      matchedRole = {
        role: 'MANAGER',
        name: 'Store Manager / Owner',
        allowedTabs: ['/', '/pos', '/tables', '/history', '/inventory', '/kds', '/orders', '/reports', '/table-qrs', '/settings'],
      };
    } else if (enteredPin === storeSettings.cashierPin) {
      matchedRole = {
        role: 'CASHIER',
        name: 'Cashier Staff',
        allowedTabs: ['/', '/pos', '/tables', '/history'],
      };
    } else if (enteredPin === storeSettings.kitchenPin) {
      matchedRole = {
        role: 'KITCHEN',
        name: 'Chef / Kitchen',
        allowedTabs: ['/', '/kds', '/orders'],
      };
    }

    if (matchedRole) {
      setCurrentUser(matchedRole);
      localStorage.setItem('resto_auth_user', JSON.stringify(matchedRole));
      setPinError('');
      setPinInput('');
      setPinPromptOpen(false);
      return matchedRole;
    } else {
      setPinError('Invalid 4-digit PIN. Try again.');
      setPinInput('');
      return null;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('resto_auth_user');
  };

  const openPinPrompt = () => {
    setPinPromptOpen(true);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        storeSettings,
        updateStoreSettings,
        loginWithPin,
        logout,
        openPinPrompt,
      }}
    >
      {children}

      {/* 4-Digit Security Keypad Modal */}
      {pinPromptOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px 24px', width: '100%', maxWidth: '340px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              🔒
            </div>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '19px', color: '#0f172a', fontWeight: '800' }}>
              Staff PIN Required
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '13px' }}>
              Enter 4-digit PIN to authenticate
            </p>

            {/* PIN Indicator Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px', minHeight: '20px' }}>
              {[0, 1, 2, 3].map((idx) => (
                <span
                  key={idx}
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: pinInput.length > idx ? '#0f172a' : '#e2e8f0',
                    transition: 'all 0.15s ease'
                  }}
                />
              ))}
            </div>

            {pinError && (
              <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: '700', marginBottom: '12px' }}>
                {pinError}
              </div>
            )}

            {/* Keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '✓'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    if (btn === 'C') {
                      setPinInput('');
                      setPinError('');
                    } else if (btn === '✓') {
                      loginWithPin(pinInput);
                    } else {
                      if (pinInput.length < 4) {
                        const next = pinInput + btn;
                        setPinInput(next);
                        if (next.length === 4) {
                          setTimeout(() => loginWithPin(next), 100);
                        }
                      }
                    }
                  }}
                  style={{
                    padding: '12px 0',
                    fontSize: '18px',
                    fontWeight: '700',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: btn === '✓' ? '#2563eb' : btn === 'C' ? '#f1f5f9' : '#ffffff',
                    color: btn === '✓' ? '#ffffff' : btn === 'C' ? '#ef4444' : '#0f172a',
                    cursor: 'pointer'
                  }}
                >
                  {btn}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setPinPromptOpen(false);
                setPinInput('');
                setPinError('');
              }}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);