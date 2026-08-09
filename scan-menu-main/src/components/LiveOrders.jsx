import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000/api/orders';

const normalizeWhatsAppPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const isValidWhatsAppNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10;
};

const buildWhatsAppUrl = (phone, message) => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!isValidWhatsAppNumber(phone)) return null;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

export default function LiveOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const formatAmount = (val) => {
    const num = Number(val);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const upsertOrder = useCallback((incomingOrder) => {
    if (!incomingOrder) return;
    if (incomingOrder.paymentStatus !== 'PAID' || incomingOrder.orderStatus === 'Completed') return;

    setOrders((prev) => {
      const incomingKey = incomingOrder._id || incomingOrder.orderId;
      const existingIndex = prev.findIndex(
        (order) => (order._id || order.orderId) === incomingKey
      );

      if (existingIndex === -1) {
        return [incomingOrder, ...prev];
      }

      const updated = [...prev];
      updated[existingIndex] = { ...updated[existingIndex], ...incomingOrder };
      return updated;
    });
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(API_URL);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const socket = io(SOCKET_URL);

    socket.on('new_order_received', (newOrder) => {
      upsertOrder(newOrder);
    });

    return () => {
      socket.off('new_order_received');
      socket.disconnect();
    };
  }, [fetchOrders, upsertOrder]);

  const handleMarkAsDone = async (order) => {
    const orderKey = order._id || order.orderId;
    const displayId = order.orderId || orderKey;
    const customerName = order.customerName || 'Customer';
    const customerPhone = order.customerPhone;

    setUpdatingOrderId(orderKey);

    try {
      const updatePath = order._id
        ? `${API_URL}/${order._id}`
        : `${API_URL}/${order.orderId}`;

      await axios.patch(updatePath, { orderStatus: 'Completed' });

      setOrders((prev) =>
        prev.filter((existing) => (existing._id || existing.orderId) !== orderKey)
      );

      const message = `Hi ${customerName}, your order #${displayId} is READY! Please collect from counter.`;
      const whatsappUrl = buildWhatsAppUrl(customerPhone, message);

      if (whatsappUrl) {
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      console.error('Error updating order:', err);
      alert(err.response?.data?.message || 'Failed to mark order as done.');
      fetchOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const activeOrders = orders.filter(
    (order) => order.paymentStatus === 'PAID' && order.orderStatus !== 'Completed'
  );

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Live Orders Dashboard</h2>
        <button
          onClick={fetchOrders}
          style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading orders...</p>
      ) : activeOrders.length === 0 ? (
        <p style={{ color: '#64748b' }}>No active orders found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {activeOrders.map((order, idx) => {
            const uniqueKey = order._id || order.orderId || order.id || `order-${idx}`;
            const displayId = order.orderId || (order._id ? `#${order._id.slice(-6)}` : `#ORD-${idx}`);
            const finalTotal = order.grandTotal ?? order.totalAmount ?? order.subTotal ?? 0;
            const isUpdating = updatingOrderId === (order._id || order.orderId);
            const isCompleted = order.orderStatus === 'Completed';

            return (
              <div
                key={uniqueKey}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
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
                    color: order.source === 'QR_SCAN' ? '#1e40af' : '#92400e',
                  }}
                  >
                    {order.source || order.orderType || 'POS'}
                  </span>
                </div>

                <div style={{ fontSize: '14px', color: '#334155', marginBottom: '8px' }}>
                  <div><strong>Customer:</strong> {order.customerName || 'Guest'}</div>
                  <div><strong>WhatsApp:</strong> {order.customerPhone || 'Not provided'}</div>
                </div>

                {order.tableNumber && (
                  <div style={{ fontSize: '14px', color: '#475569', marginBottom: '10px' }}>
                    Table No: <strong>{order.tableNumber}</strong>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: order.paymentStatus === 'PAID' ? '#dcfce7' : '#fee2e2',
                    color: order.paymentStatus === 'PAID' ? '#15803d' : '#b91c1c',
                  }}
                  >
                    {order.paymentStatus || 'PENDING'}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: '#e2e8f0',
                    color: '#334155',
                  }}
                  >
                    {order.orderStatus || 'NEW'}
                  </span>
                </div>

                <hr style={{ borderColor: '#f1f5f9', margin: '10px 0' }} />

                <div style={{ marginBottom: '12px' }}>
                  {order.items?.map((item, itemIdx) => {
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', marginBottom: '14px' }}>
                  <span>Total Amount:</span>
                  <span style={{ color: '#16a34a', fontSize: '18px' }}>₹{formatAmount(finalTotal)}</span>
                </div>

                {!isCompleted && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsDone(order)}
                    disabled={isUpdating}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '700',
                      cursor: isUpdating ? 'wait' : 'pointer',
                    }}
                  >
                    {isUpdating ? 'Updating...' : 'Mark as Done'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
