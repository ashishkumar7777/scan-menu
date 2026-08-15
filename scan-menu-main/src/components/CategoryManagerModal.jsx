import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function CategoryManagerModal({ isOpen, onClose, categories, onRefresh }) {
  const [newCatName, setNewCatName] = useState('');
  const [editingSlug, setEditingSlug] = useState(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  // Add Category
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await axios.post(`${API_BASE_URL}/api/categories/add`, { name: newCatName });
      if (res.data.success) {
        setNewCatName('');
        onRefresh();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding category');
    }
  };

  // Start Edit
  const startEdit = (cat) => {
    setEditingSlug(cat.slug);
    setEditName(cat.name);
  };

  // Save Edit (Rename)
  const handleSaveEdit = async (oldSlug) => {
    if (!editName.trim()) return;

    try {
      const res = await axios.put(`${API_BASE_URL}/api/categories/update/${oldSlug}`, {
        name: editName,
      });
      if (res.data.success) {
        setEditingSlug(null);
        setEditName('');
        onRefresh();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating category');
    }
  };

  // Delete
  const handleDelete = async (slug) => {
    if (!window.confirm(`Are you sure you want to delete "${slug}"?`)) return;

    try {
      const res = await axios.delete(`${API_BASE_URL}/api/categories/delete/${slug}`);
      if (res.data.success) {
        onRefresh();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting category');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '450px',
          maxWidth: '90%',
          padding: '24px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#0f172a' }}>📂 Manage Categories</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Add Category Input */}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="e.g. Chinese, Desserts, Beverages"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Add
          </button>
        </form>

        {/* Categories List */}
        <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.map((cat) => (
            <div
              key={cat.slug}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              {editingSlug === cat.slug ? (
                <div style={{ display: 'flex', gap: '6px', flex: 1, marginRight: '10px' }}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #94a3b8',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    onClick={() => handleSaveEdit(cat.slug)}
                    style={{
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingSlug(null)}
                    style={{
                      background: '#64748b',
                      color: '#fff',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{cat.name}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => startEdit(cat)}
                      style={{
                        background: '#e0e7ff',
                        color: '#4338ca',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(cat.slug)}
                      style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}