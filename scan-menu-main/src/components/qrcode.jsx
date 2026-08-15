import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CATEGORY_ICONS = {
  breakfast: '🥞',
  mains: '🍲',
  drinks: '🥤',
  desserts: '🍰',
  special: '⭐',
  chinese: '🥡',
  tandoor: '🍢',
  beverages: '🧃',
  snacks: '🍟',
};

export default function ScanMenu() {
  const pathParts = window.location.pathname.split('/');
  const cafeId = pathParts[2] || 'cafebar-dhaba';

  const searchParams = new URLSearchParams(window.location.search);
  const tableNumber = searchParams.get('table') || '7';

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [successToken, setSuccessToken] = useState(null);

  // 1. Load Razorpay Checkout Script Dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const fetchLiveMenu = useCallback(async () => {
    try {
      const [itemsRes, catRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/items/all`),
        axios.get(`${API_BASE_URL}/api/categories/all`).catch(() => ({ data: [] })),
      ]);

      const allItems = itemsRes.data || [];
      const availableItems = allItems.filter((i) => i.isAvailable !== false);
      setMenuItems(availableItems);

      let fetchedCats = catRes.data || [];
      if (!fetchedCats || fetchedCats.length === 0) {
        const uniqueSlugs = Array.from(
          new Set(allItems.map((i) => i.category?.toLowerCase().trim()).filter(Boolean))
        );
        fetchedCats = uniqueSlugs.map((slug) => ({
          name: slug.charAt(0).toUpperCase() + slug.slice(1),
          slug,
        }));
      }

      setCategories(fetchedCats);
      setActiveCategory((prev) => prev || fetchedCats[0]?.slug || 'all');
    } catch (err) {
      console.error('Error fetching QR Menu:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveMenu();
    loadRazorpayScript();

    const socket = io(API_BASE_URL);
    socket.on('item_status_changed', fetchLiveMenu);
    socket.on('category_updated', fetchLiveMenu);

    return () => {
      socket.off('item_status_changed', fetchLiveMenu);
      socket.off('category_updated', fetchLiveMenu);
      socket.disconnect();
    };
  }, [fetchLiveMenu]);

  const addToCart = (product) => {
    const productId = product._id || product.id;
    const stockLimit = product.currentStock !== undefined ? product.currentStock : product.stockQuantity;

    setCart((prevCart) => {
      const existing = prevCart.find((c) => c._id === productId || c.id === productId);
      if (existing) {
        if (stockLimit !== undefined && existing.quantity >= stockLimit) {
          alert(`Max stock reached (${stockLimit} available)`);
          return prevCart;
        }
        return prevCart.map((c) =>
          c._id === productId || c.id === productId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prevCart, { ...product, id: productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => {
      const existing = prevCart.find((c) => c._id === productId || c.id === productId);
      if (!existing) return prevCart;
      if (existing.quantity === 1) {
        return prevCart.filter((c) => c._id !== productId && c.id !== productId);
      }
      return prevCart.map((c) =>
        c._id === productId || c.id === productId ? { ...c, quantity: c.quantity - 1 } : c
      );
    });
  };

  const totalItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const grandTotalAmount = cart.reduce((total, item) => total + Number(item.price) * item.quantity, 0);

  // 2. Razorpay Payment Trigger
  const handleRazorpayPayment = async () => {
    if (cart.length === 0) return alert('Your cart is empty!');

    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) return alert('Razorpay SDK failed to load. Check your internet connection.');

    setIsProcessingPayment(true);

    try {
      // Step A: Create order in backend & Razorpay
      const orderPayload = {
        amount: grandTotalAmount,
        tableNo: tableNumber,
        source: 'QR_MENU',
        items: cart.map((i) => ({
          itemId: i._id || i.id,
          name: i.name,
          price: Number(i.price),
          quantity: i.quantity,
        })),
      };

      const { data } = await axios.post(`${API_BASE_URL}/api/orders/create-razorpay-order`, orderPayload);
      const { razorpayOrder, token } = data;

      // Step B: Open Razorpay Gateway Popup
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: cafeId.replace('-', ' ').toUpperCase(),
        description: `Dine-in Order Table #${tableNumber}`,
        order_id: razorpayOrder.id,
        handler: async function (response) {
          try {
            // Step C: Verify signature
            const verifyRes = await axios.post(`${API_BASE_URL}/api/orders/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              setCart([]);
              setSuccessToken(verifyRes.data.token || token);
            } else {
              alert(verifyRes.data.message || 'Payment verification failed');
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            alert('Payment completed, but verification failed.');
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          },
        },
        theme: {
          color: '#2b7a43',
        },
      };

      const paymentGateway = new window.Razorpay(options);
      paymentGateway.open();
    } catch (err) {
      console.error('Razorpay initialization error:', err);
      alert(err.response?.data?.message || 'Could not initiate Razorpay payment.');
      setIsProcessingPayment(false);
    }
  };

  const filteredMenu = menuItems.filter((item) => {
    if (!activeCategory || activeCategory === 'all') return true;
    return item.category?.toString().toLowerCase().trim() === activeCategory.toLowerCase().trim();
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f7', display: 'flex', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#f9f9fb', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Header */}
        <header style={{ backgroundColor: '#1c1c1e', padding: '32px 20px 24px 20px', textTransform: 'uppercase', textAlign: 'center', color: '#ffffff' }}>
          <h1 style={{ fontSize: '30px', fontWeight: '900', margin: 0 }}>{cafeId.replace('-', ' ')}</h1>
          <hr style={{ width: '80%', border: 0, height: '1px', backgroundColor: '#ffffff', margin: '12px auto 8px auto', opacity: 0.4 }} />
          <p style={{ fontSize: '18px', letterSpacing: '8px', margin: 0, fontWeight: '400', color: '#eaeaea' }}>MENU</p>
        </header>

        {/* Table Badge */}
        <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '8px' }}>
          <div style={{ display: 'inline-block', backgroundColor: '#ffffff', color: '#1c1c1e', fontSize: '13px', fontWeight: '700', padding: '6px 22px', borderRadius: '20px', border: '1px solid #e5e5ea' }}>
            TABLE NO. {tableNumber}
          </div>
        </div>

        {/* Dynamic Category Circles */}
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '12px 20px', scrollbarWidth: 'none' }}>
          {categories.map((cat) => {
            const catSlug = cat.slug || cat.id || cat.name?.toLowerCase().trim();
            const icon = CATEGORY_ICONS[catSlug] || '🍽️';
            const isSelected = activeCategory?.toLowerCase().trim() === catSlug;

            return (
              <div 
                key={catSlug} 
                onClick={() => setActiveCategory(catSlug)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  backgroundColor: '#ffffff', 
                  border: isSelected ? '2.5px solid #2b7a43' : '1px solid #e5e5ea',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.04)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '26px'
                }}>
                  {icon}
                </div>
                <span style={{ fontSize: '12px', marginTop: '8px', color: isSelected ? '#2b7a43' : '#636366', fontWeight: isSelected ? '700' : '600' }}>
                  {cat.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Menu Items */}
        <main style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '120px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#8e8e93', marginTop: '30px' }}>Loading menu items...</div>
          ) : filteredMenu.length > 0 ? (
            filteredMenu.map((item) => {
              const itemId = item._id || item.id;
              const cartItem = cart.find((c) => c._id === itemId || c.id === itemId);

              return (
                <div key={itemId} style={{ backgroundColor: '#ffffff', borderRadius: '18px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '16px', border: '1px solid #efeff4', height: '88px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexGrow: 1, overflow: 'hidden', height: '100%' }}>
                    {item.img ? (
                      <img src={item.img} alt={item.name} style={{ width: '88px', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '88px', height: '100%', backgroundColor: '#f2f2f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8e8e93', padding: '4px' }}>
                        <span style={{ fontSize: '18px' }}>🍽️</span>
                        <span style={{ fontSize: '10px', fontWeight: '600' }}>Fresh Dish</span>
                      </div>
                    )}
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1c1c1e', margin: 0 }}>{item.name}</h3>
                      <p style={{ color: '#1c1c1e', fontSize: '16px', fontWeight: '700', margin: 0 }}>₹ {item.price}</p>
                    </div>
                  </div>

                  <div>
                    {cartItem ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#2b7a43', color: '#ffffff', borderRadius: '20px', padding: '6px 16px' }}>
                        <button onClick={() => removeFromCart(itemId)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                        <span style={{ fontWeight: '700', fontSize: '15px' }}>{cartItem.quantity}</span>
                        <button onClick={() => addToCart(item)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(item)} style={{ backgroundColor: '#2b7a43', color: '#ffffff', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', color: '#8e8e93', marginTop: '30px', fontSize: '14px' }}>
              No items available in this category.
            </div>
          )}
        </main>

        {/* Floating Cart Button -> Triggers Razorpay */}
        {totalItemsCount > 0 && (
          <div style={{ position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '420px', padding: '0 16px', zIndex: 99, boxSizing: 'border-box' }}>
            <div style={{ width: '100%', backgroundColor: '#2b7a43', color: '#ffffff', padding: '12px 18px', borderRadius: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px rgba(43,122,67,0.35)', boxSizing: 'border-box' }}>
              <div>
                <span style={{ fontSize: '10px', display: 'block', opacity: 0.8, textTransform: 'uppercase', fontWeight: '700' }}>{totalItemsCount} ITEMS ADDED</span>
                <span style={{ fontSize: '16px', fontWeight: '700' }}>Total • ₹{grandTotalAmount}</span>
              </div>
              <button 
                disabled={isProcessingPayment}
                onClick={handleRazorpayPayment}
                style={{ backgroundColor: '#1e542e', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '25px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                {isProcessingPayment ? 'Opening Gateway...' : 'Pay & Order ➔'}
              </button>
            </div>
          </div>
        )}

        {/* Token Success Popup Modal */}
        {successToken && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '20px', padding: '28px 24px', textAlign: 'center', width: '100%', maxWidth: '320px' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#15803d', margin: '0 0 8px 0' }}>Order Placed Successfully</h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px 0' }}>Payment confirmed & sent to kitchen</p>
              <div style={{ backgroundColor: '#f0fdf4', border: '2px dashed #86efac', borderRadius: '12px', padding: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>TOKEN NUMBER</span>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#15803d' }}>#{successToken}</div>
              </div>
              <button onClick={() => setSuccessToken(null)} style={{ width: '100%', padding: '12px', background: '#2b7a43', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}