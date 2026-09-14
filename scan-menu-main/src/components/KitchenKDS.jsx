import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import ThermalPrintReceipt from './ThermalPrintReceipt';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://resto-backend-rete.onrender.com';

// Web Audio API Sound Chime for New Kitchen Orders
const playKitchenChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    
    // First high note (bell strike)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5 note
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Second harmonious note
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.15); // D6 note
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.9);
  } catch (err) {
    console.warn('Audio chime autoplay blocked or unsupported:', err);
  }
};

// Component to track dynamic elapsed timer per card
function ElapsedTimer({ createdAt }) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const createdTime = new Date(createdAt).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - createdTime);
      const totalSec = Math.floor(diffMs / 1000);
      setElapsedMinutes(Math.floor(totalSec / 60));
      setElapsedSeconds(totalSec % 60);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  // Determine Urgency Styles
  let badgeBg = '#f1f5f9';
  let badgeColor = '#475569';
  let borderColor = '#e2e8f0';

  if (elapsedMinutes >= 15) {
    badgeBg = '#fee2e2';
    badgeColor = '#dc2626';
    borderColor = '#fca5a5';
  } else if (elapsedMinutes >= 10) {
    badgeBg = '#fef3c7';
    badgeColor = '#d97706';
    borderColor = '#fcd34d';
  } else if (elapsedMinutes >= 5) {
    badgeBg = '#e0f2fe';
    badgeColor = '#0284c7';
    borderColor = '#bae6fd';
  }

  const formattedSec = String(elapsedSeconds).padStart(2, '0');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        fontWeight: '800',
        padding: '3px 8px',
        borderRadius: '9999px',
        backgroundColor: badgeBg,
        color: badgeColor,
        border: `1px solid ${borderColor}`,
        transition: 'all 0.3s ease',
      }}
    >
      ⏱️ {elapsedMinutes}:{formattedSec}
    </span>
  );
}

export default function KitchenKDS() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printOrder, setPrintOrder] = useState(null);
  
  // Track locally dismissed orders so socket re-fetch doesn't revive them
  const dismissedIdsRef = useRef(new Set());

  const fetchLiveOrders = useCallback(async (isIncomingSocket = false) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/orders/live`).catch(() =>
        axios.get(`${API_BASE_URL}/api/orders`)
      );

      const rawList = res.data?.orders || res.data?.data || (Array.isArray(res.data) ? res.data : []);

      // Filter out completed / served status & any locally dismissed items
      const activeList = rawList.filter((o) => {
        const status = (o.status || '').toUpperCase();
        const mongoId = o._id ? String(o._id) : '';
        const orderIdStr = o.orderId ? String(o.orderId) : '';

        const isCompleted = ['COMPLETED', 'DONE', 'SERVED', 'CANCELLED'].includes(status);
        const wasDismissed = dismissedIdsRef.current.has(mongoId) || dismissedIdsRef.current.has(orderIdStr);

        return !isCompleted && !wasDismissed;
      });

      setOrders(activeList);

      // Play alert chime when a new ticket is pushed
      if (isIncomingSocket) {
        playKitchenChime();
      }
    } catch (err) {
      console.error('Error loading KDS orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveOrders(false);
    const socket = io(API_BASE_URL);

    socket.on('new_order_received', () => {
      fetchLiveOrders(true);
    });
    
    socket.on('order_status_updated', () => {
      fetchLiveOrders(false);
    });

    return () => {
      socket.off('new_order_received');
      socket.off('order_status_updated');
      socket.disconnect();
    };
  }, [fetchLiveOrders]);

  // Universal KOT Print (RawBT for Android, window.print for Desktop)
  const handlePrintKOT = (ord) => {
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      const orderItems = ord.items || ord.orderItems || ord.cartItems || [];
      const orderIdText = ord.orderId || (ord._id ? `#${String(ord._id).slice(-6).toUpperCase()}` : '#ORD');
      const tableText = ord.tableNo ? `Table #${ord.tableNo}` : (ord.orderType || 'TAKEAWAY');
      const tokenText = ord.tokenNumber ? `Token: #${ord.tokenNumber}\n` : '';

      const itemsFormatted = orderItems.map((item) => {
        const name = item.name || item.title || item.itemName || item.itemId?.name || 'Item';
        const qty = item.quantity || item.qty || 1;
        return `${qty}x  ${name}`;
      }).join('\n');

      const kotReceiptText = 
        `--------------------------------\n` +
        `           KOT ORDER            \n` +
        `--------------------------------\n` +
        `Order : ${orderIdText}\n` +
        tokenText +
        `Type  : ${tableText}\n` +
        `Time  : ${new Date(ord.createdAt || Date.now()).toLocaleTimeString()}\n` +
        `--------------------------------\n` +
        `ITEMS:\n` +
        itemsFormatted + '\n' +
        `--------------------------------\n\n\n\n`;

      // Safe RawBT intent trigger without reloading state
      const link = document.createElement('a');
      link.href = 'rawbt:data=' + encodeURIComponent(kotReceiptText);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Desktop / Windows
      setPrintOrder(ord);
      setTimeout(() => {
        window.print();
      }, 100);
    }
  };

  const markCompleted = async (ord) => {
    const mongoId = ord._id ? String(ord._id) : '';
    const orderIdStr = ord.orderId ? String(ord.orderId) : '';
    const primaryKey = mongoId || orderIdStr;

    // 1. Immediately track as dismissed from KDS screen
    if (mongoId) dismissedIdsRef.current.add(mongoId);
    if (orderIdStr) dismissedIdsRef.current.add(orderIdStr);

    // 2. Remove card instantly from the screen
    setOrders((prev) =>
      prev.filter((item) => {
        const itemMongoId = item._id ? String(item._id) : '';
        const itemOrderId = item.orderId ? String(item.orderId) : '';
        return itemMongoId !== mongoId && itemOrderId !== orderIdStr;
      })
    );

    // 3. Update Database status to SERVED
    try {
      await axios.post(`${API_BASE_URL}/api/orders/${primaryKey}/status`, { status: 'SERVED' })
        .catch(() => axios.patch(`${API_BASE_URL}/api/orders/${primaryKey}/status`, { status: 'SERVED' }))
        .catch(() => axios.post(`${API_BASE_URL}/api/orders/update-status`, { id: primaryKey, status: 'SERVED' }));
    } catch (err) {
      console.error('Failed to persist status to backend:', err);
    }
  };

  const clearAllPending = async () => {
    if (!window.confirm(`Clear all ${orders.length} orders from the screen?`)) return;

    orders.forEach((o) => {
      if (o._id) dismissedIdsRef.current.add(String(o._id));
      if (o.orderId) dismissedIdsRef.current.add(String(o.orderId));
    });

    setOrders([]);

    try {
      await axios.post(`${API_BASE_URL}/api/orders/clear-all-live`);
    } catch (err) {
      console.error('Error clearing all:', err);
    }
  };

  return (
    <div
      style={{
        padding: '24px 28px',
        background: '#f8fafc',
        minHeight: 'calc(100vh - 64px)',
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box'
      }}
    >
      {/* Hidden Thermal Receipt Render Area for Desktop */}
      <ThermalPrintReceipt order={printOrder} type="KOT" />

      {/* KDS Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
          >
            🍳
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>
              Live Kitchen Display (KDS)
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Active orders queue in preparation
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {orders.length > 0 && (
            <button
              onClick={clearAllPending}
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                padding: '8px 16px',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontWeight: '800',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              🗑️ Clear All ({orders.length})
            </button>
          )}

          <button 
            onClick={() => fetchLiveOrders(false)} 
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              padding: '8px 16px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontWeight: '800',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            🔄 Refresh
          </button>

          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: '9999px',
              fontWeight: '800',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
            }}
          >
            <span>Pending Orders:</span>
            <span
              style={{
                background: '#a3e635',
                color: '#0f172a',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: '900'
              }}
            >
              {orders.length}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Syncing Kitchen Feed...
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px dashed #cbd5e1',
            maxWidth: '520px',
            margin: '40px auto'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>👨‍🍳</div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
            All Orders Prepared!
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
            Waiting for new customer orders from POS or QR Menu...
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 320px))', gap: '18px', alignItems: 'start' }}>
          {orders.map((ord) => {
            const cardKey = ord._id || ord.orderId;
            const isQR = ord.source === 'QR_MENU' || (ord.orderId || '').startsWith('ORD') || (ord.orderId || '').startsWith('QR');
            const orderType = (ord.orderType || 'TAKEAWAY').toUpperCase();
            const orderItems = ord.items || ord.orderItems || ord.cartItems || [];

            return (
              <div
                key={cardKey}
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 6px 16px -4px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '260px',
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}
              >
                {/* Card Top Header */}
                <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px', fontWeight: '900', letterSpacing: '-0.3px' }}>
                          {ord.orderId || `#${String(cardKey).slice(-6).toUpperCase()}`}
                        </h3>
                        {ord.tokenNumber && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe'
                            }}
                          >
                            #{ord.tokenNumber}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: orderType === 'TAKEAWAY' ? '#d97706' : orderType === 'DELIVERY' ? '#9333ea' : '#16a34a',
                          letterSpacing: '0.4px',
                          textTransform: 'uppercase'
                        }}
                      >
                        {ord.tableNo ? `📍 Table #${ord.tableNo}` : ord.orderType || 'TAKEAWAY'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            background: isQR ? '#faf5ff' : '#f1f5f9',
                            color: isQR ? '#7e22ce' : '#334155',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          {isQR ? 'QR' : 'POS'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePrintKOT(ord)}
                          title="Print KOT Ticket"
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#0f172a',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: '800'
                          }}
                        >
                          🖨️ KOT
                        </button>
                      </div>

                      {/* Live Timer Indicator */}
                      <ElapsedTimer createdAt={ord.createdAt || new Date()} />
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div style={{ padding: '16px 18px', flex: 1, minHeight: '120px' }}>
                  {orderItems.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
                      No items recorded on this ticket.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {orderItems.map((item, idx) => {
                        const itemName = item.name || item.title || item.itemName || item.itemId?.name || 'Item';
                        const itemQty = item.quantity || item.qty || 1;

                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '14px',
                              borderBottom: idx === orderItems.length - 1 ? 'none' : '1px dashed #f1f5f9',
                              paddingBottom: '6px'
                            }}
                          >
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>
                              {itemName}
                            </span>
                            <span
                              style={{
                                fontWeight: '900',
                                color: '#16a34a',
                                background: '#dcfce7',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '12px'
                              }}
                            >
                              {itemQty}x
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Card Action */}
                <div style={{ padding: '14px 18px', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    type="button"
                    onClick={() => markCompleted(ord)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '9999px',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(240, 240, 240, 0.15)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgb(163, 230, 53)';
                      e.currentTarget.style.color = 'rgb(22, 22, 22)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#0f172a';
                      e.currentTarget.style.color = 'rgb(243, 239, 239)';
                    }}
                  >
                    ✓ Mark as Done & Serve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}