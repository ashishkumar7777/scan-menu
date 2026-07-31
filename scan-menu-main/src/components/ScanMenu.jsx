import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const CATEGORIES = [
  { id: 'breakfast', name: 'Breakfast', icon: '🥞' },
  { id: 'mains', name: 'Mains', icon: '🍲' },
  { id: 'drinks', name: 'Drinks', icon: '🥤' },
  { id: 'desserts', name: 'Desserts', icon: '🍰' },
];

export default function ScanMenu() {
  const pathParts = window.location.pathname.split('/');
  const cafeId = pathParts[2] || "cafebar-dhaba"; 
  
  const searchParams = new URLSearchParams(window.location.search);
  const tableNumber = searchParams.get('table') || "7";

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('breakfast');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMenu = () => {
    axios.get('http://localhost:5000/api/items')
      .then((res) => {
        setMenuItems(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching MongoDB menu:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMenu();

    // 🟢 Real-time Socket sync for Inventory & Order Changes
    const socket = io('http://localhost:5000');
    socket.on('new_order_received', () => fetchMenu());
    socket.on('item_status_changed', () => fetchMenu());

    return () => socket.disconnect();
  }, []);

  const addToCart = (product) => {
    // Prevent adding if out of stock
    if (!product.isAvailable || (product.trackStock && product.stockQuantity <= 0)) return;

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        // Prevent exceeding available stock
        if (product.trackStock && existingItem.quantity >= product.stockQuantity) {
          alert(`Only ${product.stockQuantity} available in stock!`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === productId);
      if (!existingItem) return prevCart;
      if (existingItem.quantity === 1) {
        return prevCart.filter((item) => item.id !== productId);
      }
      return prevCart.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  };

  const totalItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const grandTotalAmount = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Your cart is empty!");

    setIsSubmitting(true);
    const simulatedOrderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderPayload = {
      orderId: simulatedOrderId,
      source: 'QR_SCAN',
      orderType: 'DINE_IN',
      tableNumber: String(tableNumber),
      items: cart.map(i => ({
        id: i.id,
        itemId: i.id,
        name: i.name,
        price: Number(i.price),
        quantity: Number(i.quantity)
      })),
      subTotal: Number(grandTotalAmount),
      grandTotal: Number(grandTotalAmount),
      paymentMethod: 'UPI',
      paymentStatus: 'PENDING'
    };

    try {
      const response = await axios.post('http://localhost:5000/api/orders/create', orderPayload);
      
      if (response.data.success || response.status === 201) {
        setCart([]);
        alert(`🎉 Order #${simulatedOrderId} Placed Successfully! Sent to kitchen.`);
        fetchMenu();
      }
    } catch (err) {
      console.error("Order submit detailed error:", err.response?.data || err.message);
      const errorMsg = err.response?.data?.message || err.message;
      alert(`Order process hone mein issue aaya!\nDetails: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMenu = menuItems.filter((item) => item.category === activeCategory);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f7', display: 'flex', justifyContent: 'center', padding: '0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#f9f9fb', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Header */}
        <header style={{ backgroundColor: '#1c1c1e', padding: '32px 20px 24px 20px', textTransform: 'uppercase', textAlign: 'center', color: '#ffffff' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '900', margin: '0', letterSpacing: '0.5px' }}>
            {cafeId.replace('-', ' ')}
          </h1>
          <hr style={{ width: '80%', border: '0', height: '1px', backgroundColor: '#ffffff', margin: '12px auto 8px auto', opacity: '0.4' }} />
          <p style={{ fontSize: '22px', letterSpacing: '8px', margin: '0', fontWeight: '400', paddingLeft: '8px', color: '#eaeaea' }}>MENU</p>
        </header>

        {/* Table Badge */}
        <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '8px' }}>
          <div style={{ display: 'inline-block', backgroundColor: '#ffffff', color: '#1c1c1e', fontSize: '13px', fontWeight: '700', padding: '6px 22px', borderRadius: '20px', border: '1px solid #e5e5ea', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            TABLE NO. {tableNumber}
          </div>
        </div>

        {/* Categories Track */}
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '12px 20px', scrollbarWidth: 'none' }}>
          {CATEGORIES.map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => setActiveCategory(cat.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                backgroundColor: '#ffffff', 
                border: activeCategory === cat.id ? '2.5px solid #2b7a43' : '1px solid #e5e5ea',
                boxShadow: '0 4px 8px rgba(0,0,0,0.04)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '26px'
              }}>
                {cat.icon}
              </div>
              <span style={{ fontSize: '12px', marginTop: '8px', color: activeCategory === cat.id ? '#2b7a43' : '#636366', fontWeight: activeCategory === cat.id ? '700' : '600' }}>
                {cat.name}
              </span>
            </div>
          ))}
        </div>

        {/* Items Grid */}
        <main style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '120px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#8e8e93', marginTop: '30px' }}>
              Fetching Live Menu...
            </div>
          ) : filteredMenu.length > 0 ? (
            filteredMenu.map((item) => {
              const cartItem = cart.find((c) => c.id === item.id);
              const isSoldOut = !item.isAvailable || (item.trackStock && item.stockQuantity <= 0);

              return (
                <div key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: '18px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #efeff4', height: '88px', opacity: isSoldOut ? 0.7 : 1 }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexGrow: 1, overflow: 'hidden', height: '100%' }}>
                    {item.img ? (
                      <img 
                        src={item.img} 
                        alt={item.name} 
                        style={{ width: '88px', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={{ width: '88px', height: '100%', backgroundColor: '#f2f2f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8e8e93', padding: '4px', textAlign: 'center' }}>
                        <span style={{ fontSize: '18px' }}>🍽️</span>
                        <span style={{ fontSize: '10px', fontWeight: '600', marginTop: '2px', lineHeight: '1.1' }}>Fresh Dish</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1c1c1e', margin: '0' }}>{item.name}</h3>
                      <p style={{ color: '#1c1c1e', fontSize: '15px', fontWeight: '700', margin: '0' }}>
                        ₹ {item.price}
                      </p>

                      {/* Stock Badge */}
                      {item.trackStock && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          width: 'fit-content',
                          backgroundColor: isSoldOut ? '#fee2e2' : item.stockQuantity <= 5 ? '#ffedd5' : '#dcfce7',
                          color: isSoldOut ? '#b91c1c' : item.stockQuantity <= 5 ? '#c2410c' : '#15803d'
                        }}>
                          {isSoldOut ? 'SOLD OUT' : item.stockQuantity <= 5 ? `ONLY ${item.stockQuantity} LEFT!` : `STOCK: ${item.stockQuantity}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Counter Node */}
                  <div>
                    {isSoldOut ? (
                      <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold', padding: '6px 10px', backgroundColor: '#fee2e2', borderRadius: '12px' }}>
                        Sold Out
                      </span>
                    ) : cartItem ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#2b7a43', color: '#ffffff', borderRadius: '20px', padding: '6px 14px', boxShadow: '0 4px 8px rgba(43,122,67,0.25)' }}>
                        <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                        <span style={{ fontWeight: '700', fontSize: '15px', minWidth: '12px', textAlign: 'center' }}>{cartItem.quantity}</span>
                        <button 
                          onClick={() => addToCart(item)} 
                          style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '18px', fontWeight: 'bold', cursor: item.trackStock && cartItem.quantity >= item.stockQuantity ? 'not-allowed' : 'pointer', opacity: item.trackStock && cartItem.quantity >= item.stockQuantity ? 0.4 : 1 }}
                        >+</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCart(item)} 
                        style={{ backgroundColor: '#2b7a43', color: '#ffffff', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(43,122,67,0.2)' }}
                      >
                        +
                      </button>
                    )}
                  </div>

                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', color: '#8e8e93', marginTop: '20px', fontSize: '14px', fontWeight: '500' }}>
              No items available in this category.
            </div>
          )}
        </main>

        {/* Floating Drawer Footer */}
        {totalItemsCount > 0 && (
          <div style={{ 
            position: 'fixed', 
            bottom: '18px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: '100%', 
            maxWidth: '420px',
            padding: '0 16px',
            zIndex: 99 
          }}>
            <div style={{ 
              width: '100%', 
              backgroundColor: '#2b7a43', 
              color: '#ffffff', 
              padding: '12px 18px', 
              borderRadius: '35px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              boxShadow: '0 10px 25px rgba(43,122,67,0.35)' 
            }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '10px', display: 'block', opacity: 0.8, textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>{totalItemsCount} ITEMS ADDED</span>
                <span style={{ fontSize: '16px', fontWeight: '700' }}>View Cart • ₹{grandTotalAmount}</span>
              </div>
              <button 
                onClick={handleCheckout}
                disabled={isSubmitting}
                style={{ 
                  backgroundColor: '#1e542e', 
                  color: '#ffffff', 
                  border: 'none', 
                  padding: '8px 18px', 
                  borderRadius: '25px', 
                  fontWeight: '700', 
                  fontSize: '13px', 
                  cursor: isSubmitting ? 'wait' : 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                  flexShrink: 0
                }}
              >
                {isSubmitting ? 'Sending...' : 'Place Order ➔'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}