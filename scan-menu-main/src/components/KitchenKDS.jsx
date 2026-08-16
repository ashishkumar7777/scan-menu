import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import ThermalPrintReceipt from './ThermalPrintReceipt';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  let badgeBg = '#334155';
  let badgeColor = '#94a3b8';
  let isPulsing = false;

  if (elapsedMinutes >= 15) {
    badgeBg = '#ef4444';
    badgeColor = '#ffffff';
    isPulsing = true;
  } else if (elapsedMinutes >= 10) {
    badgeBg = '#f59e0b';
    badgeColor = '#000000';
  } else if (elapsedMinutes >= 5) {
    badgeBg = '#0284c7';
    badgeColor = '#ffffff';
  }

  const formattedSec = String(elapsedSeconds).padStart(2, '0');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        fontWeight: '800',
        padding: '3px 8px',
        borderRadius: '6px',
        backgroundColor: badgeBg,
        color: badgeColor,
        boxShadow: isPulsing ? '0 0 10px rgba(239, 68, 68, 0.8)' : 'none',
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

  const handlePrintKOT = (ord) => {
    setPrintOrder(ord);
    setTimeout(() => {
      window.print();
    }, 100);
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

    // 3. Update Database status to SERVED (leaves KDS, keeps table in Yellow/Served state)
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
    <div style={{ padding: '24px', background: '#0f172a', minHeight: 'calc(100vh - 60px)', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Hidden Thermal Receipt Render Area */}
      <ThermalPrintReceipt order={printOrder} type="KOT" />

      {/* KDS Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', color: '#38bdf8' }}>🍳 Live Kitchen Display (KDS)</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Active orders queue in preparation</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {orders.length > 0 && (
            <button
              onClick={clearAllPending}
              style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              🗑️ Clear All ({orders.length})
            </button>
          )}

          <button 
            onClick={() => fetchLiveOrders(false)} 
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
          >
            🔄 Refresh
          </button>

          <div style={{ background: '#1e293b', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', border: '1px solid #334155' }}>
            Pending Orders: <span style={{ color: '#f59e0b' }}>{orders.length}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>Syncing Kitchen Feed...</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#1e293b', borderRadius: '16px', border: '2px dashed #334155' }}>
          <div style={{ fontSize: '50px', marginBottom: '10px' }}>👨‍🍳</div>
          <h3 style={{ margin: '0 0 6px 0', color: '#38bdf8' }}>All Orders Prepared!</h3>
          <p style={{ margin: 0, color: '#94a3b8' }}>Waiting for new customer orders from POS or QR Menu...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
          {orders.map((ord) => {
            const cardKey = ord._id || ord.orderId;
            const isQR = ord.source === 'QR_MENU' || (ord.orderId || '').startsWith('ORD') || (ord.orderId || '').startsWith('QR');

            return (
              <div
                key={cardKey}
                style={{
                  background: '#1e293b',
                  borderRadius: '14px',
                  border: '1px solid #334155',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                {/* Card Top Header */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', background: '#182234', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '17px', fontWeight: '800' }}>
                        {ord.orderId}
                      </h3>
                      {ord.tokenNumber && (
                        <span style={{ fontSize: '11px', color: '#38bdf8', background: '#0c4a6e', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                          #{ord.tokenNumber}
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '13px', marginTop: '4px' }}>
                      {ord.tableNo ? `📍 Table #${ord.tableNo}` : ord.orderType || 'TAKEAWAY'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', background: isQR ? '#312e81' : '#78350f', color: isQR ? '#a5b4fc' : '#fde68a' }}>
                        {isQR ? 'QR' : 'POS'}
                      </span>
                      <button
                        onClick={() => handlePrintKOT(ord)}
                        title="Print KOT Ticket"
                        style={{ background: '#334155', border: 'none', color: '#f8fafc', padding: '3px 7px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                      >
                        🖨️ KOT
                      </button>
                    </div>

                    {/* Live Timer Indicator */}
                    <ElapsedTimer createdAt={ord.createdAt || new Date()} />
                  </div>
                </div>

                {/* Items List */}
                <div style={{ padding: '16px', flex: 1, minHeight: '120px' }}>
                  {ord.items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '15px', borderBottom: '1px dashed #334155', paddingBottom: '6px' }}>
                      <span style={{ color: '#f1f5f9' }}>
                        <strong style={{ color: '#38bdf8', fontSize: '17px', marginRight: '6px' }}>
                          {item.quantity || 1}x
                        </strong>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Card Action */}
                <div style={{ padding: '14px', background: '#0f172a' }}>
                  <button
                    onClick={() => markCompleted(ord)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
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