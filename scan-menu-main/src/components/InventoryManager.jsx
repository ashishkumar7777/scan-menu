import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function InventoryManager() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [stockInputs, setStockInputs] = useState({});

  // Category Manager Modal State
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCategorySlug, setEditingCategorySlug] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Form State for Items Add & Edit
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'mains',
    currentStock: 50,
    lowStockThreshold: 5,
    isAvailable: true,
  });
  const [editingId, setEditingId] = useState(null);

  // Fetch Items & Categories
  const fetchAllData = useCallback(async () => {
    try {
      const [itemsRes, catRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/items/all`),
        axios.get(`${API_BASE_URL}/api/categories/all`).catch(() => ({ data: [] })),
      ]);

      setItems(itemsRes.data || []);

      const fetchedCategories =
        catRes.data && catRes.data.length > 0
          ? catRes.data
          : [
              { name: 'Mains', slug: 'mains' },
              { name: 'Breakfast', slug: 'breakfast' },
              { name: 'Drinks', slug: 'drinks' },
              { name: 'Desserts', slug: 'desserts' },
            ];

      setCategories(fetchedCategories);

      // Default category for form dropdown
      setFormData((prev) => ({
        ...prev,
        category: prev.category || fetchedCategories[0]?.slug || 'mains',
      }));
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ---------------- CATEGORY ACTIONS ----------------
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return alert('Please enter a category name');

    try {
      const res = await axios.post(`${API_BASE_URL}/api/categories/add`, {
        name: newCatName.trim(),
      });
      if (res.data.success || res.status === 201) {
        alert('🎉 Category added successfully!');
        setNewCatName('');
        fetchAllData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add category');
    }
  };

  const handleUpdateCategory = async (oldSlug) => {
    if (!editCategoryName.trim()) return alert('Category name cannot be empty');

    try {
      const res = await axios.put(`${API_BASE_URL}/api/categories/update/${oldSlug}`, {
        name: editCategoryName.trim(),
      });
      if (res.data.success) {
        alert('🎉 Category updated!');
        setEditingCategorySlug(null);
        setEditCategoryName('');
        fetchAllData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (slug) => {
    if (!window.confirm(`Delete category "${slug}"? Existing items will remain.`)) return;

    try {
      const res = await axios.delete(`${API_BASE_URL}/api/categories/delete/${slug}`);
      if (res.data.success) {
        alert('Category deleted');
        if (activeCategory === slug) setActiveCategory('all');
        fetchAllData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category');
    }
  };

  // ---------------- ITEM ACTIONS ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      return alert('Please fill item name and price');
    }

    try {
      if (editingId) {
        const res = await axios.put(`${API_BASE_URL}/api/items/update/${editingId}`, formData);
        if (res.data.success) alert('🎉 Item updated successfully!');
      } else {
        const res = await axios.post(`${API_BASE_URL}/api/items/add`, formData);
        if (res.data.success) alert('🎉 Item added successfully!');
      }
      resetForm();
      fetchAllData();
    } catch (err) {
      console.error('Error saving item:', err);
      alert(err.response?.data?.message || 'Failed to save item');
    }
  };

  const startEdit = (item) => {
    const targetId = item._id || item.id;
    setEditingId(targetId);
    setFormData({
      name: item.name,
      price: item.price,
      category: item.category?.toLowerCase().trim() || categories[0]?.slug || 'mains',
      currentStock: item.currentStock !== undefined ? item.currentStock : 50,
      lowStockThreshold: item.lowStockThreshold || 5,
      isAvailable: item.isAvailable,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      price: '',
      category: categories[0]?.slug || 'mains',
      currentStock: 50,
      lowStockThreshold: 5,
      isAvailable: true,
    });
  };

  const handleToggleAvailability = async (id) => {
    try {
      const res = await axios.patch(`${API_BASE_URL}/api/items/${id}/toggle-availability`);
      if (res.data.success) {
        setItems((prev) =>
          prev.map((item) =>
            item._id === id || item.id === id ? { ...item, isAvailable: res.data.isAvailable } : item
          )
        );
      }
    } catch (err) {
      console.error('Error toggling availability:', err);
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this item?')) return;

    try {
      const res = await axios.delete(`${API_BASE_URL}/api/items/delete/${id}`);
      if (res.data.success) {
        setItems((prev) => prev.filter((item) => item._id !== id && item.id !== id));
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item');
    }
  };

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
        stockQuantity: Number(newStock),
      });
      if (res.data.success || res.status === 200) {
        alert('🎉 Stock updated successfully!');
        fetchAllData();
        setStockInputs((prev) => ({ ...prev, [id]: '' }));
      }
    } catch (err) {
      console.error('Error updating stock:', err);
      alert(err.response?.data?.message || 'Failed to update stock');
    }
  };

  // Category Filtering
  const filteredItems =
    activeCategory === 'all'
      ? items
      : items.filter(
          (it) => it.category?.toString().toLowerCase().trim() === activeCategory.toLowerCase().trim()
        );

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Connecting to inventory database...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#f8fafc',
        minHeight: 'calc(100vh - 60px)',
      }}
    >
      {/* Header with Manage Categories Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>📦 Stock & Category Management</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Add, update, or remove menu items and categories with live stock controls.
          </p>
        </div>
        <button
          onClick={() => setShowCatModal(!showCatModal)}
          style={{
            padding: '10px 18px',
            background: showCatModal ? '#64748b' : '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {showCatModal ? '✕ Close Panel' : '⚙️ Manage Categories'}
        </button>
      </div>

      {/* Category Manager Drawer / Panel */}
      {showCatModal && (
        <div
          style={{
            background: '#eef2ff',
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid #c7d2fe',
            marginBottom: '25px',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: '#3730a3', fontSize: '16px' }}>
            📂 Category Settings (Add / Rename / Delete)
          </h3>

          {/* Add Category Input */}
          <form
            onSubmit={handleAddCategory}
            style={{ display: 'flex', gap: '10px', marginBottom: '16px', maxWidth: '500px' }}
          >
            <input
              type="text"
              placeholder="e.g. Chinese, Tandoor, Beverages, Snacks"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              + Add Category
            </button>
          </form>

          {/* Category Chips List */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <div
                key={cat.slug}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#fff',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #c7d2fe',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                {editingCategorySlug === cat.slug ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      style={{
                        padding: '3px 6px',
                        borderRadius: '4px',
                        border: '1px solid #94a3b8',
                        fontSize: '12px',
                        width: '100px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateCategory(cat.slug)}
                      style={{
                        background: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategorySlug(null)}
                      style={{
                        background: '#64748b',
                        color: '#fff',
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>
                      {cat.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategorySlug(cat.slug);
                        setEditCategoryName(cat.name);
                      }}
                      style={{
                        background: '#e0e7ff',
                        color: '#4338ca',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.slug)}
                      style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                      title="Delete category"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Item Form */}
      <div
        style={{
          background: '#ffffff',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '25px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>
          {editingId ? '✏️ Edit Menu Item' : '➕ Add New Item'}
        </h3>
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '15px',
          }}
        >
          <div>
            <label style={labelStyle}>Item Name</label>
            <input
              type="text"
              placeholder="e.g. Kadhai Chaap"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Price (₹)</label>
            <input
              type="number"
              placeholder="e.g. 270"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={inputStyle}
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Current Stock Qty</label>
            <input
              type="number"
              value={formData.currentStock}
              onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '9px 16px',
                background: editingId ? '#2563eb' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {editingId ? 'Update Item' : 'Add Item'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '9px 14px',
                  background: '#64748b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Dynamic Category Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveCategory('all')}
          style={{
            padding: '8px 18px',
            borderRadius: '20px',
            border: 'none',
            background: activeCategory === 'all' ? '#2563eb' : '#e2e8f0',
            color: activeCategory === 'all' ? '#fff' : '#1e293b',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setActiveCategory(cat.slug)}
            style={{
              padding: '8px 18px',
              borderRadius: '20px',
              border: 'none',
              background: activeCategory === cat.slug ? '#2563eb' : '#e2e8f0',
              color: activeCategory === cat.slug ? '#fff' : '#1e293b',
              fontWeight: '600',
              textTransform: 'capitalize',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Inventory Items Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '14px 16px' }}>Item Name</th>
              <th style={{ padding: '14px 16px' }}>Category</th>
              <th style={{ padding: '14px 16px' }}>Price</th>
              <th style={{ padding: '14px 16px' }}>Status</th>
              <th style={{ padding: '14px 16px' }}>Current Stock</th>
              <th style={{ padding: '14px 16px' }}>Quick Update Stock</th>
              <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const targetId = item._id || item.id;
              const stockVal = item.currentStock !== undefined ? item.currentStock : item.stockQuantity;

              return (
                <tr key={targetId} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: item.isAvailable ? '#dcfce7' : '#fee2e2',
                        color: item.isAvailable ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {item.isAvailable ? 'IN STOCK' : 'DISABLED'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontWeight: 'bold', color: stockVal > 0 ? '#334155' : '#ef4444' }}>
                      {stockVal !== undefined && stockVal !== null ? `${stockVal} Units` : '0 Units'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 20"
                        value={stockInputs[targetId] || ''}
                        onChange={(e) => handleStockChange(targetId, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          width: '90px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => updateStock(targetId)}
                        style={{
                          padding: '6px 12px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '12px',
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleToggleAvailability(targetId)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '4px',
                          border: 'none',
                          background: item.isAvailable ? '#eab308' : '#22c55e',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        {item.isAvailable ? 'Disable' : 'Enable'}
                      </button>

                      <button
                        onClick={() => startEdit(item)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '4px',
                          border: 'none',
                          background: '#3b82f6',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(targetId)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '4px',
                          border: 'none',
                          background: '#ef4444',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#64748b',
  marginBottom: '4px',
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  boxSizing: 'border-box',
  fontSize: '13px',
};