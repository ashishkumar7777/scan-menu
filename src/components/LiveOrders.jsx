import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function LiveOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    axios.get('http://localhost:5000/api/orders')
      .then((res) => {
        setOrders(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching orders:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 5 seconds to catch new incoming orders
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

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
          {orders.map((order) => (
            <div 
              key={order._id} 
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
                  {order.orderId || `#${order._id.slice(-6)}`}
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: order.source === 'QR_SCAN' ? '#dbeafe' : '#fef3c7',
                  color: order.source === 'QR_SCAN' ? '#1e40af' : '#92400e'
                }}>
                  {order.source || 'POS'}
                </span>
              </div>

              {order.tableNumber && (
                <div style={{ fontSize: '14px', color: '#475569', marginBottom: '10px' }}>
                  📍 Table No: <strong>{order.tableNumber}</strong>
                </div>
              )}

              <hr style={{ borderColor: '#f1f5f9', margin: '10px 0' }} />

              <div style={{ marginBottom: '12px' }}>
                {order.items?.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                    <span>{item.name} x {item.quantity}</span>
                    <span style={{ color: '#64748b' }}>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <hr style={{ borderColor: '#f1f5f9', margin: '10px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                <span>Total Amount:</span>
                <span style={{ color: '#16a34a', fontSize: '18px' }}>₹{order.grandTotal || order.subTotal}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}