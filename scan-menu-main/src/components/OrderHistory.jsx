import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'yesterday' | 'week' | 'all'
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalOrders: 0, totalPages: 1, currentPage: 1 });
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
        filterDate: dateFilter,
        orderType: channelFilter,
      });
      if (search.trim()) params.append('search', search.trim());

      const res = await axios.get(`${API_BASE_URL}/api/orders/history?${params.toString()}`);
      if (res.data.success) {
        setOrders(res.data.orders || []);
        setPagination(res.data.pagination || { totalOrders: 0, totalPages: 1, currentPage: 1 });
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, [page, dateFilter, channelFilter, search]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>📑 Order History & Transaction Logs</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Showing <strong>{pagination.totalOrders}</strong> total orders recorded
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Past 7 Days' },
            { id: 'all', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setDateFilter(tab.id);
                setPage(1);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: dateFilter === tab.id ? '#2563eb' : 'transparent',
                color: dateFilter === tab.id ? '#fff' : '#334155',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Channel Filter Bar */}
      <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="🔍 Search by Order ID (e.g. POS-261), Table #, or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
          />
          <button type="submit" style={{ padding: '10px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            Search
          </button>
        </form>

        <select
          value={channelFilter}
          onChange={(e) => {
            setChannelFilter(e.target.value);
            setPage(1);
          }}
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', cursor: 'pointer' }}
        >
          <option value="ALL">All Channels</option>
          <option value="DINE_IN">🍽️ Dine-in</option>
          <option value="TAKEAWAY">🥡 Takeaway</option>
          <option value="DELIVERY">🛵 Delivery</option>
        </select>
      </div>

      {/* Orders Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '14px 16px' }}>Order ID</th>
              <th style={{ padding: '14px 16px' }}>Date & Time</th>
              <th style={{ padding: '14px 16px' }}>Source</th>
              <th style={{ padding: '14px 16px' }}>Channel / Table</th>
              <th style={{ padding: '14px 16px' }}>Customer</th>
              <th style={{ padding: '14px 16px' }}>Payment</th>
              <th style={{ padding: '14px 16px' }}>Status</th>
              <th style={{ padding: '14px 16px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '14px 16px', textAlign: 'center' }}>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ padding: '30px', textAlign: 'center' }}>Loading orders page {page}...</td></tr>
            ) : orders.length > 0 ? (
              orders.map((ord) => {
                const dateStr = ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                return (
                  <tr key={ord._id || ord.orderId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#0f172a' }}>{ord.orderId}</td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{dateStr}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: ord.source === 'QR_MENU' ? '#e0e7ff' : '#fef3c7', color: ord.source === 'QR_MENU' ? '#4338ca' : '#b45309' }}>
                        {ord.source === 'QR_MENU' ? 'QR' : 'POS'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>{ord.tableNo ? `Table #${ord.tableNo}` : ord.orderType || 'Takeaway'}</td>
                    <td style={{ padding: '14px 16px' }}>{ord.customerName || 'Guest'}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '600' }}>{ord.paymentMethod || 'CASH'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', background: ord.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7', color: ord.status === 'COMPLETED' ? '#15803d' : '#b45309' }}>
                        {ord.status || 'NEW'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>₹{ord.grandTotal || ord.subTotal || 0}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No orders found for this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Page <strong>{pagination.currentPage}</strong> of <strong>{pagination.totalPages}</strong>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: page <= 1 ? '#f1f5f9' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontWeight: '600' }}
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: page >= pagination.totalPages ? '#f1f5f9' : '#fff', cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer', fontWeight: '600' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Invoice #{selectedOrder.orderId}</h3>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><strong>Channel:</strong> {selectedOrder.orderType || 'Takeaway'}</div>
              <div><strong>Table:</strong> {selectedOrder.tableNo || 'N/A'}</div>
              <div><strong>Customer:</strong> {selectedOrder.customerName || 'Guest'}</div>
              <div><strong>Payment:</strong> {selectedOrder.paymentMethod || 'CASH'}</div>
            </div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Items</h4>
            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '16px' }}>
              {selectedOrder.items?.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                  <span>{it.quantity || 1}x {it.name}</span>
                  <span style={{ fontWeight: '600' }}>₹{Number(it.price) * (it.quantity || 1)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', paddingTop: '10px', borderTop: '2px solid #e2e8f0', marginBottom: '16px' }}>
              <span>Total:</span>
              <span style={{ color: '#16a34a' }}>₹{selectedOrder.grandTotal || selectedOrder.subTotal || 0}</span>
            </div>
            <button onClick={() => setSelectedOrder(null)} style={{ width: '100%', padding: '10px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}