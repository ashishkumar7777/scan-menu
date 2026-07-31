import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000/api/orders';

export default function LiveOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatAmount = (val) => {
    const num = Number(val);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(API_URL);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const socket = io(SOCKET_URL);

    socket.on('new_order_received', (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
    });

    return () => {
      socket.off('new_order_received');
      socket.disconnect();
    };
  }, [fetchOrders]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📋 Live Orders Dashboard</h2>
        <button 
          onClick={fetchOrders}
          style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p style={{ color: '#64748b' }}>No orders found in database.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {orders.map((order, idx) => {
            const uniqueKey = order._id || order.orderId || order.id || `order-${idx}`;
            const displayId = order.orderId || (order._id ? `#${order._id.slice(-6)}` : `#ORD-${idx}`);
            const finalTotal = order.grandTotal ?? order.totalAmount ?? order.subTotal ?? 0;

            return (
              <div 
                key={uniqueKey} 
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#1e293b' }}>
                    {displayId}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: order.source === 'QR_SCAN' ? '#dbeafe' : '#fef3c7',
                    color: order.source === 'QR_SCAN' ? '#1e40af' : '#92400e'
                  }}>
                    {order.source || order.orderType || 'POS'}
                  </span>
                </div>

                {order.tableNumber && (
                  <div style={{ fontSize: '14px', color: '#475569', marginBottom: '10px' }}>
                    📍 Table No: <strong>{order.tableNumber}</strong>
                  </div>
                )}

                <hr style={{ borderColor: '#f1f5f9', margin: '10px 0' }} />

                <div style={{ marginBottom: '12px' }}>
                  {order.items?.map((item, itemIdx) => {
                    // Universal item name resolution
                    const itemName = 
                      item.name || 
                      item.itemName || 
                      item.title || 
                      item.item_name || 
                      (typeof item.itemId === 'object' ? item.itemId?.name : null) || 
                      'Item';

                    const price = Number(item.price) || 0;
                    const qty = Number(item.quantity) || 1;
                    const lineTotal = item.total ? Number(item.total) : price * qty;

                    return (
                      <div key={item._id || itemIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                        <span>{itemName} x {qty}</span>
                        <span style={{ color: '#64748b' }}>₹{formatAmount(lineTotal)}</span>
                      </div>
                    );
                  })}
                </div>

                <hr style={{ borderColor: '#f1f5f9', margin: '10px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                  <span>Total Amount:</span>
                  <span style={{ color: '#16a34a', fontSize: '18px' }}>₹{formatAmount(finalTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>  
  );
}