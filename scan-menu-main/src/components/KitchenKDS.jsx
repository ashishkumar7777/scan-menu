import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function KitchenKDS() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Track locally dismissed orders so socket re-fetch doesn't revive them
  const dismissedIdsRef = useRef(new Set());

  const fetchLiveOrders = useCallback(async () => {
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
    } catch (err) {
      console.error('Error loading KDS orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveOrders();
    const socket = io(API_BASE_URL);

    socket.on('new_order_received', fetchLiveOrders);
    socket.on('order_status_updated', fetchLiveOrders);

    return () => {
      socket.off('new_order_received', fetchLiveOrders);
      socket.off('order_status_updated', fetchLiveOrders);
      socket.disconnect();
    };
  }, [fetchLiveOrders]);

  const markCompleted = async (ord) => {
    const mongoId = ord._id ? String(ord._id) : '';
    const orderIdStr = ord.orderId ? String(ord.orderId) : '';
    const primaryKey = mongoId || orderIdStr;

    // 1. Immediately track as dismissed
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

    // 3. Update Database (Calls fallback routes to ensure update goes through)
    try {
      await axios.post(`${API_BASE_URL}/api/orders/${primaryKey}/status`, { status: 'COMPLETED' })
        .catch(() => axios.patch(`${API_BASE_URL}/api/orders/${primaryKey}/status`, { status: 'COMPLETED' }))
        .catch(() => axios.post(`${API_BASE_URL}/api/orders/update-status`, { id: primaryKey, status: 'COMPLETED' }));
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
            onClick={fetchLiveOrders} 
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
          {orders.map((ord) => {
            const cardKey = ord._id || ord.orderId;
            const isQR = ord.source === 'QR_MENU' || (ord.orderId || '').startsWith('ORD') || (ord.orderId || '').startsWith('QR');

            return (
              <div key={cardKey} style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>{ord.orderId}</h3>
                    <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '13px', marginTop: '4px' }}>
                      {ord.tableNo ? `📍 Table #${ord.tableNo}` : ord.orderType || 'TAKEAWAY'}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', background: isQR ? '#312e81' : '#78350f', color: isQR ? '#a5b4fc' : '#fde68a' }}>
                    {isQR ? 'QR SCAN' : 'POS COUNTER'}
                  </span>
                </div>

                <div style={{ padding: '16px', flex: 1, minHeight: '120px' }}>
                  {ord.items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '15px' }}>
                      <span style={{ color: '#f1f5f9' }}>
                        <strong style={{ color: '#38bdf8', fontSize: '16px' }}>{item.quantity || 1}x</strong> {item.name}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '14px', background: '#0f172a' }}>
                  <button
                    onClick={() => markCompleted(ord)}
                    style={{ width: '100%', padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
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