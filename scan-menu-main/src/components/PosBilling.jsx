import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import ThermalPrintReceipt from './ThermalPrintReceipt';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://resto-backend-rete.onrender.com';

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
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Printing state for desktop receipt fallback
  const [printData, setPrintData] = useState({ order: null, type: 'KOT' });

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

  const totalCartQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Trigger Local Printing (Universal: RawBT for Android, window.print for Desktop)
  const triggerPrint = (orderData, printType) => {
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      let printContent = '';
      const itemsFormatted = (orderData.items || []).map((i) => {
        if (printType === 'KOT') {
          return `${i.quantity}x  ${i.name}`;
        }
        return `${i.name.padEnd(18).slice(0, 18)} ${String(i.quantity).padStart(2)} ${String(i.price * i.quantity).padStart(6)}`;
      }).join('\n');

      if (printType === 'KOT') {
        printContent = 
          `--------------------------------\n` +
          `           KOT TICKET           \n` +
          `--------------------------------\n` +
          `Order : ${orderData.orderId}\n` +
          `Type  : ${orderData.orderType}${orderData.tableNo ? ` (Table #${orderData.tableNo})` : ''}\n` +
          `Time  : ${new Date().toLocaleTimeString()}\n` +
          `--------------------------------\n` +
          `ITEMS:\n` +
          itemsFormatted + '\n' +
          `--------------------------------\n\n\n\n`;
      } else {
        printContent = 
          `================================\n` +
          `        CAFEBAR DHABA           \n` +
          `       TAX INVOICE / BILL       \n` +
          `================================\n` +
          `Order : ${orderData.orderId}\n` +
          `Type  : ${orderData.orderType}${orderData.tableNo ? ` (Table #${orderData.tableNo})` : ''}\n` +
          `Pay   : ${orderData.paymentMethod} (PAID)\n` +
          `Date  : ${new Date().toLocaleString()}\n` +
          `--------------------------------\n` +
          `ITEM               QTY  AMOUNT  \n` +
          `--------------------------------\n` +
          itemsFormatted + '\n' +
          `--------------------------------\n` +
          `TOTAL AMOUNT:         ₹${orderData.grandTotal}\n` +
          `================================\n` +
          `     Thank you! Visit again!    \n\n\n\n`;
      }

      const link = document.createElement('a');
      link.href = 'rawbt:data=' + encodeURIComponent(printContent);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Desktop / PC print
      setPrintData({ order: orderData, type: printType });
      setTimeout(() => {
        window.print();
      }, 150);
    }
  };

  // Common order creation handling both KOT and BILL actions
  const handleCreateOrder = async (printActionType = 'KOT') => {
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
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/orders/create`, orderData);
      if (response.data.success || response.status === 201) {
        // Trigger KOT or Bill Print
        triggerPrint(orderData, printActionType);

        setCart([]);
        setTableNo('');
        setMobileCartOpen(false);
        fetchAllData();
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert(error.response?.data?.message || 'Failed to submit order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCartConsole = () => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '18px 16px',
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Top Fixed Area */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Invoice Details
            </span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
              {orderType === 'DINE_IN' && tableNo ? `Table #${tableNo}` : 'Quick POS Bill'}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #e2e8f0' }}>
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
                  padding: '4px 10px',
                  fontFamily: 'inherit',
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Order Channel Selector */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '9999px',
            marginBottom: '10px',
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
                  padding: '6px 0',
                  borderRadius: '9999px',
                  border: 'none',
                  background: isSelected ? '#0f172a' : 'transparent',
                  color: isSelected ? '#ffffff' : '#64748b',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(15,23,42,0.15)' : 'none',
                }}
              >
                {channel.label}
              </button>
            );
          })}
        </div>

        {orderType === 'DINE_IN' && (
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Enter Table Number (e.g. 7)"
              value={tableNo}
              onChange={(e) => setTableNo(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                boxSizing: 'border-box',
                fontSize: '12px',
                fontWeight: '600',
                fontFamily: 'inherit',
              }}
            />
          </div>
        )}
      </div>

      {/* Middle Scrollable Area for Cart Items */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          paddingRight: '2px',
          margin: '4px 0 10px 0',
        }}
      >
        {cart.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px 10px',
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1px dashed #e2e8f0',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🛒</div>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
              Cart is empty. Tap items to add.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {cart.map((item) => {
              const cartItemId = item._id || item.id;
              return (
                <div
                  key={cartItemId}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ flex: 1, marginRight: '8px' }}>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>
                      {item.name}
                    </h4>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '800' }}>
                      ₹{item.price} × {item.quantity}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(cartItemId, -1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontWeight: '900',
                        cursor: 'pointer',
                        padding: 0,
                        fontFamily: 'inherit',
                      }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '12px', fontWeight: '800', minWidth: '14px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(cartItemId, 1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontWeight: '900',
                        cursor: 'pointer',
                        padding: 0,
                        fontFamily: 'inherit',
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

      {/* Bottom Fixed Checkout Area */}
      <div style={{ flexShrink: 0 }}>
        {/* Payment Selector */}
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>
            Payment Method
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
                    padding: '7px 0',
                    borderRadius: '10px',
                    border: isSelected ? '1px solid #0f172a' : '1px solid #e2e8f0',
                    background: isSelected ? '#0f172a' : '#f8fafc',
                    color: isSelected ? '#ffffff' : '#64748b',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {pm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Totals Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            background: '#f8fafc',
            padding: '8px 10px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '10px',
          }}
        >
          <div>
            <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>Subtotal</span>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>₹{subTotal}</div>
          </div>
          <div>
            <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>Tax</span>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>₹0</div>
          </div>
          <div>
            <span style={{ fontSize: '9px', color: '#16a34a', fontWeight: '800', textTransform: 'uppercase' }}>Total</span>
            <div style={{ fontSize: '13px', fontWeight: '900', color: '#16a34a' }}>₹{subTotal}</div>
          </div>
        </div>

        {/* Dual Action Buttons: Print KOT & Print Bill */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {/* Button 1: Kitchen KOT */}
          <button
            type="button"
            onClick={() => handleCreateOrder('KOT')}
            disabled={cart.length === 0 || isSubmitting}
            style={{
              padding: '11px 8px',
              borderRadius: '9999px',
              border: '1px solid #f59e0b',
              background: cart.length > 0 && !isSubmitting ? '#fffbeb' : '#f1f5f9',
              color: cart.length > 0 && !isSubmitting ? '#b45309' : '#94a3b8',
              fontSize: '12px',
              fontWeight: '900',
              cursor: cart.length > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🍳</span>
            <span>{isSubmitting ? 'Processing...' : 'Place & KOT'}</span>
          </button>

          {/* Button 2: Customer Bill */}
          <button
            type="button"
            onClick={() => handleCreateOrder('BILL')}
            disabled={cart.length === 0 || isSubmitting}
            style={{
              padding: '11px 8px',
              borderRadius: '9999px',
              border: 'none',
              background: cart.length > 0 && !isSubmitting ? '#0f172a' : '#e2e8f0',
              color: cart.length > 0 && !isSubmitting ? '#ffffff' : '#94a3b8',
              fontSize: '12px',
              fontWeight: '900',
              cursor: cart.length > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontFamily: 'inherit',
              boxShadow: cart.length > 0 && !isSubmitting ? '0 4px 12px rgba(15,23,42,0.18)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🧾</span>
            <span>{isSubmitting ? 'Processing...' : `Bill (₹${subTotal})`}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 60px)',
        background: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        paddingBottom: '30px',
      }}
    >
      {/* Hidden Thermal Receipt Render Component for PC/Desktop fallback */}
      <ThermalPrintReceipt order={printData.order} type={printData.type} />

      <style>{`
        .pos-container {
          display: flex;
          gap: 20px;
          padding: 20px;
          box-sizing: border-box;
          align-items: flex-start;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .desktop-cart-panel {
          flex: 1;
          width: 360px;
          max-width: 380px;
          height: calc(100vh - 100px);
          position: sticky;
          top: 80px;
          display: block;
        }
        .mobile-floating-cart-bar {
          display: none !important;
        }

        @media (max-width: 960px) {
          .pos-container {
            flex-direction: column;
            padding: 14px;
            padding-bottom: 90px;
          }
          .desktop-cart-panel {
            display: none !important;
          }
          .mobile-floating-cart-bar {
            display: flex !important;
          }
        }
      `}</style>

      <div className="pos-container">
        {/* Left Column: Menu Catalog */}
        <div style={{ flex: 1, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              border: '1px solid #e2e8f0',
            }}>
              💻
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                FastPOS Counter Console
              </h2>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                Tap item to add to bill • Total {filteredItems.length} items
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            padding: '4px 6px',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0',
            marginBottom: '16px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}>
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                background: activeCategory === 'all' ? '#0f172a' : 'transparent',
                color: activeCategory === 'all' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                fontWeight: '800',
                fontSize: '12px',
                flexShrink: 0,
                fontFamily: 'inherit',
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
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: isCatActive ? '#0f172a' : 'transparent',
                    color: isCatActive ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    fontWeight: '800',
                    fontSize: '12px',
                    textTransform: 'capitalize',
                    flexShrink: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Items Grid */}
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              Loading items...
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '12px',
            }}>
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
                      borderRadius: '16px',
                      padding: '14px',
                      opacity: isDisabled ? 0.6 : 1,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '120px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>
                        {item.name}
                      </h4>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a' }}>
                        ₹{item.price}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '9999px',
                        backgroundColor: isDisabled ? '#fee2e2' : '#dcfce7',
                        color: isDisabled ? '#b91c1c' : '#15803d',
                      }}>
                        {!item.isAvailable ? 'DISABLED' : 'IN STOCK'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => toggleAvailability(e, itemId)}
                        style={{
                          fontSize: '10px',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          border: '1px solid #e2e8f0',
                          fontWeight: '700',
                          backgroundColor: item.isAvailable ? '#fef2f2' : '#f0fdf4',
                          color: item.isAvailable ? '#ef4444' : '#16a34a',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
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

        {/* Right Column: Desktop Cart Panel */}
        <div className="desktop-cart-panel">
          {renderCartConsole()}
        </div>
      </div>

      {/* Floating Bottom Cart Bar for Mobile */}
      <div
        className="mobile-floating-cart-bar"
        onClick={() => setMobileCartOpen(true)}
        style={{
          position: 'fixed',
          bottom: '14px',
          left: '14px',
          right: '14px',
          background: '#090d16',
          color: '#ffffff',
          borderRadius: '9999px',
          padding: '12px 20px',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
          cursor: 'pointer',
          zIndex: 900,
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              background: '#a3e635',
              color: '#090d16',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: '900',
            }}
          >
            {totalCartQty}
          </span>
          <span style={{ fontSize: '13px', fontWeight: '800' }}>View Active Cart</span>
        </div>
        <span style={{ fontSize: '14px', fontWeight: '900', color: '#a3e635' }}>
          ₹{subTotal} →
        </span>
      </div>

      {/* Mobile Cart Modal */}
      {mobileCartOpen && (
        <div
          onClick={() => setMobileCartOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            fontFamily: 'inherit',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '16px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {renderCartConsole()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}