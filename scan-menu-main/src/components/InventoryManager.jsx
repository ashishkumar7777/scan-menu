import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function InventoryManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockInputs, setStockInputs] = useState({});

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/items/all`);
      setItems(res.data);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleStockChange = (id, value) => {
    setStockInputs((prev) => ({ ...prev, [id]: value }));
  };

  const updateStock = async (id) => {
    const newStock = stockInputs[id];
    if (newStock === undefined || newStock === '') {
      return alert('Please enter a valid stock number');
    }

    try {
      const res = await axios.patch(`${API_BASE_URL}/api/items/${id}/stock`, {
        stockQuantity: Number(newStock)
      });
      if (res.data.success || res.status === 200) {
        alert('🎉 Stock updated successfully!');
        fetchInventory();
        setStockInputs((prev) => ({ ...prev, [id]: '' }));
      }
    } catch (err) {
      console.error('Error updating stock:', err);
      alert(err.response?.data?.message || 'Failed to update stock');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Connecting to inventory database...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f8fafc', minHeight: 'calc(100vh - 60px)' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>📦 Stock Inventory Management</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Set exact stock quantities for your items. Updates sync live with the POS billing screen.
        </p>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '14px 16px' }}>Item Name</th>
              <th style={{ padding: '14px 16px' }}>Category</th>
              <th style={{ padding: '14px 16px' }}>Price</th>
              <th style={{ padding: '14px 16px' }}>Current Stock</th>
              <th style={{ padding: '14px 16px' }}>Update Stock Qty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id || item._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0f172a' }}>
                  {item.name}
                </td>
                <td style={{ padding: '14px 16px', textTransform: 'capitalize', color: '#64748b' }}>
                  {item.category}
                </td>
                <td style={{ padding: '14px 16px', color: '#16a34a', fontWeight: 'bold' }}>
                  ₹{item.price}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      backgroundColor: item.stockQuantity > 0 ? '#dcfce7' : '#fee2e2',
                      color: item.stockQuantity > 0 ? '#15803d' : '#b91c1c'
                    }}
                  >
                    {item.stockQuantity !== undefined && item.stockQuantity !== null
                      ? `${item.stockQuantity} Units`
                      : 'Not Set'}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 20"
                      value={stockInputs[item.id || item._id] || ''}
                      onChange={(e) => handleStockChange(item.id || item._id, e.target.value)}
                      style={{
                        padding: '6px 10px',
                        width: '100px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                    <button
                      onClick={() => updateStock(item.id || item._id)}
                      style={{
                        padding: '6px 14px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px'
                      }}
                    >
                      Save
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}