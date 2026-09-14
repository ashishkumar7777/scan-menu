import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://resto-backend-rete.onrender.com';

const TOTAL_TABLES = 12;

export default function TableManagement() {
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);

  const fetchTableData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/orders/live`).catch(() =>
        axios.get(`${API_BASE_URL}/api/orders`)
      );
      const rawList = res.data?.orders || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setActiveOrders(rawList);
    } catch (err) {
      console.error('Error fetching table orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTableData();

    const socket = io(API_BASE_URL);
    socket.on('new_order_received', fetchTableData);
    socket.on('order_status_updated', fetchTableData);

    return () => {
      socket.off('new_order_received', fetchTableData);
      socket.off('order_status_updated', fetchTableData);
      socket.disconnect();
    };
  }, [fetchTableData]);

  // Compute table status
  const getTableInfo = (tableNumber) => {
    const matchingOrder = activeOrders.find(
      (ord) =>
        String(ord.tableNo) === String(tableNumber) &&
        !['COMPLETED', 'CANCELLED', 'PAID_AND_SETTLED'].includes((ord.status || '').toUpperCase())
    );

    if (!matchingOrder) {
      return { status: 'AVAILABLE', order: null };
    }

    const status = (matchingOrder.status || '').toUpperCase();
    if (['SERVED', 'BILLED'].includes(status)) {
      return { status: 'BILLED', order: matchingOrder };
    }

    return { status: 'OCCUPIED', order: matchingOrder };
  };

  const handleSettleTable = async (order) => {
    if (!order) return;
    const orderId = order._id || order.id || order.orderId;
    if (!window.confirm(`Settle & free Table #${order.tableNo}?`)) return;

    try {
      await axios.patch(`${API_BASE_URL}/api/orders/${orderId}/status`, { status: 'COMPLETED' })
        .catch(() => axios.post(`${API_BASE_URL}/api/orders/${orderId}/status`, { status: 'COMPLETED' }));
      fetchTableData();
      setSelectedTable(null);
    } catch (err) {
      console.error('Error settling table:', err);
      alert('Failed to settle table.');
    }
  };

  // Status counts for summary pill bar
  let availableCount = 0;
  let occupiedCount = 0;
  let billedCount = 0;

  for (let i = 1; i <= TOTAL_TABLES; i++) {
    const info = getTableInfo(i);
    if (info.status === 'AVAILABLE') availableCount++;
    else if (info.status === 'OCCUPIED') occupiedCount++;
    else if (info.status === 'BILLED') billedCount++;
  }

  return (
    <div
      style={{
        padding: '24px 28px',
        background: '#f8fafc',
        minHeight: 'calc(100vh - 64px)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header & Metrics Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '14px',
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
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            🍽️
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>
              Live Table Occupancy & Management
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Real-time floor layout, dining sessions, table switching, and instant vacancy settlement.
            </p>
          </div>
        </div>

        {/* Legend / Status Pills */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            padding: '6px 10px',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          {/* Available Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#15803d' }}>
              Available ({availableCount})
            </span>
          </div>

          {/* Occupied Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', background: '#fef2f2', border: '1px solid #fecaca' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#b91c1c' }}>
              Occupied ({occupiedCount})
            </span>
          </div>

          {/* Billed / Served Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', background: '#fefce8', border: '1px solid #fef08a' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }} />
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#a16207' }}>
              Billed / Served ({billedCount})
            </span>
          </div>
        </div>
      </div>

      {/* Tables Bento Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Loading table floor layout...
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: '16px',
          }}
        >
          {Array.from({ length: TOTAL_TABLES }, (_, index) => {
            const tableNum = index + 1;
            const { status, order } = getTableInfo(tableNum);

            const isAvailable = status === 'AVAILABLE';
            const isBilled = status === 'BILLED';
            const isOccupied = status === 'OCCUPIED';

            const cardBg = isAvailable ? '#ffffff' : isBilled ? '#fffbeb' : '#fef2f2';
            const borderColor = isAvailable ? '#e2e8f0' : isBilled ? '#fde68a' : '#fecaca';
            const dotColor = isAvailable ? '#16a34a' : isBilled ? '#eab308' : '#ef4444';
            const statusTextColor = isAvailable ? '#16a34a' : isBilled ? '#b45309' : '#dc2626';

            return (
              <div
                key={tableNum}
                onClick={() => order && setSelectedTable({ tableNum, order })}
                style={{
                  background: cardBg,
                  borderRadius: '20px',
                  border: `1px solid ${borderColor}`,
                  padding: '16px 18px',
                  minHeight: '135px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  cursor: order ? 'pointer' : 'default',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 18px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                }}
              >
                {/* Top: Table Title & Glowing 3D Status Indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.3px' }}>
                      Table #{tableNum}
                    </h3>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        color: statusTextColor,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {status}
                    </span>
                  </div>

                  {/* 3D Glowing Ball Status */}
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: `radial-gradient(circle at 30% 30%, #ffffff, ${dotColor})`,
                      boxShadow: `0 2px 8px ${dotColor}66`,
                    }}
                  />
                </div>

                {/* Bottom: Context / Order Details */}
                <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: `1px solid ${isAvailable ? '#f1f5f9' : borderColor}` }}>
                  {isAvailable ? (
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                      Ready for next guests
                    </span>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                        {order.orderId || `#${String(order._id).slice(-4)}`}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '900',
                          color: '#0f172a',
                          background: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        ₹{order.totalAmount || order.grandTotal || 0}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Table Order Inspection & Fast Vacate */}
      {selectedTable && (
        <div
          onClick={() => setSelectedTable(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>
                  Dining Session
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
                  Table #{selectedTable.tableNum}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Order ID:</span>
                <span style={{ fontWeight: '800', color: '#0f172a' }}>{selectedTable.order.orderId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Total Amount:</span>
                <span style={{ fontWeight: '900', color: '#16a34a' }}>
                  ₹{selectedTable.order.totalAmount || selectedTable.order.grandTotal || 0}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleSettleTable(selectedTable.order)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
                }}
              >
                ✓ Settle & Free Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}