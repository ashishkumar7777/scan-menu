import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const CATEGORIES = ['all', 'mains', 'breakfast', 'drinks', 'desserts'];

export default function PosBilling() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/items/all`);
      setItems(res.data);
    } catch (err) {
      console.error('Database fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();

    const socket = io(API_BASE_URL);
    socket.on('new_order_received', fetchItems);
    socket.on('item_status_changed', fetchItems);

    return () => {
      socket.off('new_order_received', fetchItems);
      socket.off('item_status_changed', fetchItems);
      socket.disconnect();
    };
  }, [fetchItems]);

  const toggleAvailability = async (e, itemId) => {
    e.stopPropagation();

    setItems((prevItems) =>
      prevItems.map((item) =>
        (item._id === itemId || item.id === itemId) 
          ? { ...item, isAvailable: !item.isAvailable } 
          : item
      )
    );

    try {
      const res = await axios.patch(
        `${API_BASE_URL}/api/items/${itemId}/toggle-availability`
      );
      if (res.data.success) {
        setItems((prevItems) =>
          prevItems.map((item) =>
            (item._id === itemId || item.id === itemId) 
              ? { ...item, isAvailable: res.data.isAvailable } 
              : item
          )
        );
      }
    } catch (err) {
      console.error('Toggle availability error:', err);
      fetchItems();
    }
  };

  const addToCart = (item) => {
    if (!item.isAvailable || (item.trackStock && item.stockQuantity <= 0)) return;

    const itemId = item._id || item.id;

    setCart((prevCart) => {
      const existing = prevCart.find((c) => (c._id === itemId || c.id === itemId));
      if (existing) {
        if (item.trackStock && existing.quantity >= item.stockQuantity) {
          alert(`Max stock reached (${item.stockQuantity} available)`);
          return prevCart;
        }
        return prevCart.map((c) =>
          (c._id === itemId || c.id === itemId) ? { ...c, quantity: c.quantity + 1 } : c
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
            if (item.trackStock && delta > 0 && newQty > item.stockQuantity) {
              alert(`Max stock reached (${item.stockQuantity} available)`);
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
    setCart((prevCart) => prevCart.filter((item) => (item._id !== itemId && item.id !== itemId)));
  };

  const clearCart = () => setCart([]);

  const filteredItems =
    activeCategory === 'all'
      ? items
      : items.filter((item) => item.category === activeCategory);

  const subTotal = cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
    0
  );

  const handleCreateOrder = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    const generatedOrderId = `POS-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderData = {
      orderId: generatedOrderId,
      source: 'POS_COUNTER',
      orderType: 'TAKEAWAY',
      items: cart.map((i) => ({
        itemId: i._id || i.id,
        name: i.name || 'Item',
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 1,
      })),
      subTotal: Number(subTotal),
      discount: 0,
      grandTotal: Number(subTotal),
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/orders/create`,
        orderData
      );
      if (response.data.success || response.status === 201) {
        alert(`🎉 POS Order #${generatedOrderId} Placed Successfully!`);
        setCart([]);
        fetchItems();
      }
    } catch (error) {
      console.error('Error creating order:', error);
      const errorMsg =
        error.response?.data?.message || 'Failed to submit order. Please retry.';
      alert(errorMsg);
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

        <div style={{ margin: '15px 0', display: 'flex', gap: '10px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: activeCategory === cat ? '#2563eb' : '#e2e8f0',
                color: activeCategory === cat ? '#fff' : '#0f172a',
                cursor: 'pointer',
                fontWeight: '600',
                textTransform: 'capitalize',
              }}
            >
              {cat}
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
              const isDisabled =
                !item.isAvailable ||
                (item.trackStock && item.stockQuantity <= 0);

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
                    <p
                      style={{
                        margin: '0 0 10px 0',
                        color: '#16a34a',
                        fontWeight: 'bold',
                      }}
                    >
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
                        : item.trackStock
                        ? item.stockQuantity <= 0
                          ? 'SOLD OUT'
                          : `STOCK: ${item.stockQuantity}`
                        : 'IN STOCK'}
                    </span>

                    <button
                      onClick={(e) => toggleAvailability(e, itemId)}
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: item.isAvailable
                          ? '#ef4444'
                          : '#22c55e',
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
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

          {cart.length === 0 ? (
            <p
              style={{
                color: '#94a3b8',
                textAlign: 'center',
                margin: '40px 0',
              }}
            >
              Cart is empty. Tap an item to add it to the order.
            </p>
          ) : (
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {cart.map((i) => {
                const cartItemId = i._id || i.id;
                return (
                  <div
                    key={cartItemId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '14px' }}>{i.name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        ₹{i.price} each
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginRight: '12px',
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(cartItemId, -1)}
                        style={{
                          padding: '2px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {i.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(cartItemId, 1)}
                        style={{
                          padding: '2px 8px',
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
                      <div style={{ fontWeight: 'bold' }}>
                        ₹{i.price * i.quantity}
                      </div>
                      <button
                        onClick={() => removeFromCart(cartItemId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
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

        <div>
          <hr style={{ margin: '10px 0', borderColor: '#e2e8f0' }} />
          <h2
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              margin: '10px 0',
            }}
          >
            <span>Total:</span>
            <span style={{ color: '#2563eb' }}>₹{subTotal}</span>
          </h2>
          <button
            disabled={cart.length === 0 || isSubmitting}
            onClick={handleCreateOrder}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '10px',
              background: cart.length > 0 ? '#16a34a' : '#cbd5e1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            {isSubmitting ? 'Processing...' : 'Create Order & Print'}
          </button>
        </div>
      </div>
    </div>
  );
}