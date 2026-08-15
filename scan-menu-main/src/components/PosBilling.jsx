import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ORDER_TYPES = [
  { id: 'DINE_IN', label: '🍽️ Dine-in' },
  { id: 'TAKEAWAY', label: '🥡 Takeaway' },
  { id: 'DELIVERY', label: '🛵 Delivery' },
];

const PAYMENT_METHODS = [
  { id: 'CASH', label: '💵 Cash' },
  { id: 'UPI', label: '📱 UPI / QR' },
  { id: 'CARD', label: '💳 Card' },
];

export default function PosBilling() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [orderType, setOrderType] = useState('TAKEAWAY');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [tableNo, setTableNo] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      const [itemsRes, catRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/items/all`),
        axios.get(`${API_BASE_URL}/api/categories/all`).catch(() => ({ data: [] })),
      ]);

      setItems(itemsRes.data || []);

      const dynamicCats =
        catRes.data && catRes.data.length > 0
          ? catRes.data
          : [
              { name: 'Mains', slug: 'mains' },
              { name: 'Breakfast', slug: 'breakfast' },
              { name: 'Drinks', slug: 'drinks' },
              { name: 'Desserts', slug: 'desserts' },
            ];

      setCategories(dynamicCats);
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();

    const socket = io(API_BASE_URL);
    socket.on('new_order_received', fetchAllData);
    socket.on('item_status_changed', fetchAllData);
    socket.on('category_updated', fetchAllData);

    return () => {
      socket.off('new_order_received', fetchAllData);
      socket.off('item_status_changed', fetchAllData);
      socket.off('category_updated', fetchAllData);
      socket.disconnect();
    };
  }, [fetchAllData]);

  const toggleAvailability = async (e, itemId) => {
    e.stopPropagation();
    try {
      const res = await axios.patch(`${API_BASE_URL}/api/items/${itemId}/toggle-availability`);
      if (res.data.success) {
        fetchAllData();
      }
    } catch (err) {
      console.error('Toggle availability error:', err);
    }
  };

  const addToCart = (item) => {
    const stockCount = item.currentStock !== undefined ? item.currentStock : item.stockQuantity;
    const isOutOfStock = !item.isAvailable || (stockCount !== undefined && stockCount <= 0);

    if (isOutOfStock) return;

    const itemId = item._id || item.id;

    setCart((prevCart) => {
      const existing = prevCart.find((c) => c._id === itemId || c.id === itemId);
      const stockLimit = item.currentStock !== undefined ? item.currentStock : item.stockQuantity;

      if (existing) {
        if (stockLimit !== undefined && existing.quantity >= stockLimit) {
          alert(`Max stock reached (${stockLimit} available)`);
          return prevCart;
        }
        return prevCart.map((c) =>
          c._id === itemId || c.id === itemId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prevCart, { ...item, id: itemId, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item._id === itemId || item.id === itemId) {
            const newQty = item.quantity + delta;
            const stockLimit = item.currentStock !== undefined ? item.currentStock : item.stockQuantity;

            if (stockLimit !== undefined && delta > 0 && newQty > stockLimit) {
              alert(`Max stock reached (${stockLimit} available)`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (itemId) => {
    setCart((prevCart) => prevCart.filter((item) => item._id !== itemId && item.id !== itemId));
  };

  const clearCart = () => setCart([]);

  const filteredItems =
    activeCategory === 'all'
      ? items
      : items.filter(
          (item) =>
            item.category?.toString().toLowerCase().trim() ===
            activeCategory.toLowerCase().trim()
        );

  const subTotal = cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
    0
  );

  const handleCreateOrder = async () => {
    if (cart.length === 0) return;
    if (orderType === 'DINE_IN' && !tableNo.trim()) {
      alert('Please enter a Table Number for Dine-in orders.');
      return;
    }

    setIsSubmitting(true);
    const generatedOrderId = `POS-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderData = {
      orderId: generatedOrderId,
      source: 'POS_COUNTER',
      orderType,
      tableNo: orderType === 'DINE_IN' ? tableNo : '',
      items: cart.map((i) => ({
        itemId: i._id || i.id,
        name: i.name || 'Item',
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 1,
      })),
      subTotal: Number(subTotal),
      discount: 0,
      grandTotal: Number(subTotal),
      totalAmount: Number(subTotal),
      paymentMethod,
      paymentStatus: 'PAID',
      status: 'NEW', // Explicitly marked NEW so it enters active KDS queue
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/orders/create`, orderData);
      if (response.data.success || response.status === 201) {
        alert(`🎉 POS Order #${generatedOrderId} Placed Successfully!`);
        setCart([]);
        setTableNo('');
        fetchAllData();
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert(error.response?.data?.message || 'Failed to submit order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '20px',
        padding: '20px',
        background: '#f8fafc',
        minHeight: 'calc(100vh - 60px)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Menu Grid Left */}
      <div style={{ flex: 2 }}>
        <h2>💻 FastPOS Counter Console</h2>

        <div style={{ margin: '15px 0', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveCategory('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: activeCategory === 'all' ? '#2563eb' : '#e2e8f0',
              color: activeCategory === 'all' ? '#fff' : '#0f172a',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug || cat.id || cat.name}
              onClick={() => setActiveCategory(cat.slug || cat.id || cat.name)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: activeCategory === (cat.slug || cat.id || cat.name) ? '#2563eb' : '#e2e8f0',
                color: activeCategory === (cat.slug || cat.id || cat.name) ? '#fff' : '#0f172a',
                cursor: 'pointer',
                fontWeight: '600',
                textTransform: 'capitalize',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <p>Connecting to database...</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: '15px',
            }}
          >
            {filteredItems.map((item) => {
              const itemId = item._id || item.id;
              const stockCount = item.currentStock !== undefined ? item.currentStock : item.stockQuantity;
              const isDisabled = !item.isAvailable || (stockCount !== undefined && stockCount <= 0);

              return (
                <div
                  key={itemId}
                  onClick={() => addToCart(item)}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '15px',
                    background: item.isAvailable ? '#ffffff' : '#f1f5f9',
                    opacity: isDisabled ? 0.65 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 8px 0' }}>{item.name}</h4>
                    <p style={{ margin: '0 0 10px 0', color: '#16a34a', fontWeight: 'bold' }}>
                      ₹{item.price}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        backgroundColor: isDisabled ? '#fee2e2' : '#dcfce7',
                        color: isDisabled ? '#b91c1c' : '#15803d',
                      }}
                    >
                      {!item.isAvailable
                        ? 'DISABLED'
                        : stockCount !== undefined && stockCount <= 0
                        ? 'SOLD OUT'
                        : 'IN STOCK'}
                    </span>

                    <button
                      onClick={(e) => toggleAvailability(e, itemId)}
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: item.isAvailable ? '#ef4444' : '#22c55e',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      {item.isAvailable ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Summary Right */}
      <div
        style={{
          flex: 1,
          background: '#ffffff',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>🛒 Current Bill</h3>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                Clear All
              </button>
            )}
          </div>

          <hr style={{ margin: '10px 0', borderColor: '#e2e8f0' }} />

          {/* Order Channel Selector */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
              Order Channel
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {ORDER_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOrderType(t.id)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    fontWeight: '600',
                    background: orderType === t.id ? '#2563eb' : '#f8fafc',
                    color: orderType === t.id ? '#fff' : '#334155',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Input */}
          {orderType === 'DINE_IN' && (
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Table Number (e.g. 7)"
                value={tableNo}
                onChange={(e) => setTableNo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                  fontSize: '13px',
                }}
              />
            </div>
          )}

          {/* Cart Items */}
          {cart.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', margin: '30px 0' }}>
              Cart is empty. Tap an item to add it to the order.
            </p>
          ) : (
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {cart.map((i) => {
                const cartItemId = i._id || i.id;
                return (
                  <div
                    key={cartItemId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '13px' }}>{i.name}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>₹{i.price} each</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px' }}>
                      <button
                        onClick={() => updateQuantity(cartItemId, -1)}
                        style={{
                          padding: '2px 6px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{i.quantity}</span>
                      <button
                        onClick={() => updateQuantity(cartItemId, 1)}
                        style={{
                          padding: '2px 6px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>₹{i.price * i.quantity}</div>
                      <button
                        onClick={() => removeFromCart(cartItemId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '11px',
                          padding: 0,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment & Action */}
        <div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
              Payment Method
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {PAYMENT_METHODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPaymentMethod(p.id)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    fontWeight: '600',
                    background: paymentMethod === p.id ? '#16a34a' : '#f8fafc',
                    color: paymentMethod === p.id ? '#fff' : '#334155',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <hr style={{ margin: '10px 0', borderColor: '#e2e8f0' }} />
          <h2 style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0' }}>
            <span>Total:</span>
            <span style={{ color: '#2563eb' }}>₹{subTotal}</span>
          </h2>
          <button
            disabled={cart.length === 0 || isSubmitting}
            onClick={handleCreateOrder}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '5px',
              background: cart.length > 0 ? '#16a34a' : '#cbd5e1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            {isSubmitting ? 'Processing...' : `Create Order & Print (₹${subTotal})`}
          </button>
        </div>
      </div>
    </div>
  );
}