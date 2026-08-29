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
      status: 'NEW',
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
        gap: '24px',
        padding: '24px',
        background: '#f8fafc',
        minHeight: 'calc(100vh - 64px)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* Left Column: Menu Catalog (White Theme) */}
      <div style={{ flex: 1.8 }}>
        {/* Header Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              }}
            >
              💻
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                FastPOS Counter Console
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Tap item to add to bill • Total {filteredItems.length} items available
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter Pills (Light Container) */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            padding: '5px 6px',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            style={{
              padding: '7px 18px',
              borderRadius: '9999px',
              border: 'none',
              background: activeCategory === 'all' ? '#0f172a' : 'transparent',
              color: activeCategory === 'all' ? '#ffffff' : '#64748b',
              cursor: 'pointer',
              fontWeight: '800',
              fontSize: '13px',
              boxShadow: activeCategory === 'all' ? '0 4px 12px rgba(15,23,42,0.18)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            All Items
          </button>
          {categories.map((cat) => {
            const catKey = cat.slug || cat.id || cat.name;
            const isCatActive = activeCategory === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setActiveCategory(catKey)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: isCatActive ? '#0f172a' : 'transparent',
                  color: isCatActive ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  fontWeight: '800',
                  fontSize: '13px',
                  textTransform: 'capitalize',
                  boxShadow: isCatActive ? '0 4px 12px rgba(15,23,42,0.18)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Item Cards Grid (Clean White Cards) */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Connecting to database...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: '14px',
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
                    background: isDisabled ? '#f8fafc' : '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '16px',
                    opacity: isDisabled ? 0.6 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '130px',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 18px rgba(0,0,0,0.06)';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  {/* Name & Price */}
                  <div>
                    <h4
                      style={{
                        margin: '0 0 4px 0',
                        fontSize: '15px',
                        fontWeight: '800',
                        color: '#0f172a',
                        letterSpacing: '-0.2px',
                        lineHeight: '1.3',
                      }}
                    >
                      {item.name}
                    </h4>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: '900',
                        color: '#16a34a',
                        letterSpacing: '-0.4px',
                      }}
                    >
                      ₹{item.price}
                    </div>
                  </div>

                  {/* Stock Status & Quick Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '14px',
                      paddingTop: '10px',
                      borderTop: '1px solid #f1f5f9',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        letterSpacing: '0.4px',
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        backgroundColor: isDisabled ? '#fee2e2' : '#dcfce7',
                        color: isDisabled ? '#b91c1c' : '#15803d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: isDisabled ? '#ef4444' : '#16a34a',
                        }}
                      />
                      {!item.isAvailable
                        ? 'DISABLED'
                        : stockCount !== undefined && stockCount <= 0
                        ? 'SOLD OUT'
                        : 'IN STOCK'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => toggleAvailability(e, itemId)}
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: '1px solid #e2e8f0',
                        fontWeight: '700',
                        backgroundColor: item.isAvailable ? '#fef2f2' : '#f0fdf4',
                        color: item.isAvailable ? '#ef4444' : '#16a34a',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
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

      {/* Right Column: Clean White Bento Cart Console */}
      <div
        style={{
          flex: 1.1,
          maxWidth: '430px',
          background: '#ffffff',
          borderRadius: '26px',
          padding: '22px 18px',
          color: '#0f172a',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '620px',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Segment */}
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Invoice Details
              </span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '19px', fontWeight: '900', letterSpacing: '-0.4px', color: '#0f172a' }}>
                {orderType === 'DINE_IN' && tableNo ? `Table #${tableNo}` : 'Quick POS Bill'}
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '5px 12px', borderRadius: '9999px', border: '1px solid #e2e8f0' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a' }} />
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>Active Draft</span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  style={{
                    background: '#fee2e2',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '800',
                    borderRadius: '9999px',
                    padding: '5px 12px',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Order Channel Selector Pills */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '9999px',
              marginBottom: '14px',
            }}
          >
            {ORDER_TYPES.map((channel) => {
              const isSelected = orderType === channel.id;
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setOrderType(channel.id)}
                  style={{
                    padding: '8px 0',
                    borderRadius: '9999px',
                    border: 'none',
                    background: isSelected ? '#0f172a' : 'transparent',
                    color: isSelected ? '#ffffff' : '#64748b',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(15,23,42,0.15)' : 'none',
                  }}
                >
                  {channel.label}
                </button>
              );
            })}
          </div>

          {/* Table Input for Dine-in */}
          {orderType === 'DINE_IN' && (
            <div style={{ marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="Enter Table Number (e.g. 7)"
                value={tableNo}
                onChange={(e) => setTableNo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Cart Items List */}
          <div style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '4px', marginBottom: '14px' }}>
            {cart.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 16px',
                  background: '#f8fafc',
                  borderRadius: '18px',
                  border: '1px dashed #e2e8f0',
                }}
              >
                <div style={{ fontSize: '26px', marginBottom: '6px' }}>🛒</div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
                  Cart is empty. Tap items to add.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cart.map((item) => {
                  const cartItemId = item._id || item.id;
                  return (
                    <div
                      key={cartItemId}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                          {item.name}
                        </h4>
                        <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '800' }}>
                          ₹{item.price} × {item.quantity}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(cartItemId, -1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontWeight: '900',
                            cursor: 'pointer',
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '800', minWidth: '16px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(cartItemId, 1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontWeight: '900',
                            cursor: 'pointer',
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Segment */}
        <div>
          {/* Payment Method Selector */}
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
              Select Payment Method
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    style={{
                      padding: '9px 0',
                      borderRadius: '12px',
                      border: isSelected ? '1px solid #0f172a' : '1px solid #e2e8f0',
                      background: isSelected ? '#0f172a' : '#f8fafc',
                      color: isSelected ? '#ffffff' : '#64748b',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {pm.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Financial Summary Bento Grid (Light) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              background: '#f8fafc',
              padding: '12px 10px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              marginBottom: '14px',
            }}
          >
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>Subtotal</span>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                ₹{subTotal}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>Tax (0%)</span>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                ₹0
              </div>
            </div>

            <div>
              <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '800', textTransform: 'uppercase' }}>Total Due</span>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#16a34a', marginTop: '2px' }}>
                ₹{subTotal}
              </div>
            </div>
          </div>

          {/* Pay Out Action Button */}
          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={cart.length === 0 || isSubmitting}
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: '9999px',
              border: 'none',
              background: cart.length > 0 && !isSubmitting ? '#0f172a' : '#e2e8f0',
              color: cart.length > 0 && !isSubmitting ? '#ffffff' : '#94a3b8',
              fontSize: '14px',
              fontWeight: '900',
              cursor: cart.length > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: cart.length > 0 && !isSubmitting ? '0 8px 20px -4px rgba(15, 23, 42, 0.25)' : 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚡</span> {isSubmitting ? 'Processing...' : 'Pay out now'}
            </span>
            <span
              style={{
                background: cart.length > 0 && !isSubmitting ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
                color: cart.length > 0 && !isSubmitting ? '#a3e635' : '#64748b',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '900',
              }}
            >
              ₹{subTotal}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}