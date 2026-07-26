import { useState } from 'react';

// Dynamic category list with proper flat icons matching image layout
const CATEGORIES = [
  { id: 'breakfast', name: 'Breakfast', icon: '🥞' },
  { id: 'mains', name: 'Mains', icon: '🍲' },
  { id: 'drinks', name: 'Drinks', icon: '🥤' },
  { id: 'desserts', name: 'Desserts', icon: '🍰' },
];

const MOCK_MENU = [
  { id: 'p1', name: 'Kadhai Paneer', price: 270, category: 'mains', img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=150&auto=format&fit=crop&q=60' },
  { id: 'p2', name: 'Cheese Garlic Bread', price: 140, category: 'breakfast', img: '' }, // Purposely empty to test fallback placeholder
  { id: 'p3', name: 'White Sauce Pasta', price: 220, category: 'mains', img: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=150&auto=format&fit=crop&q=60' },
  { id: 'p4', name: 'Chocolate Brownie', price: 90, category: 'desserts', img: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=150&auto=format&fit=crop&q=60' },
];

export default function App() {
  const pathParts = window.location.pathname.split('/');
  const cafeId = pathParts[2] || "cafebar-dhaba"; 
  
  const searchParams = new URLSearchParams(window.location.search);
  const tableNumber = searchParams.get('table') || "7";

  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('breakfast');

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
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

  const handleCheckoutWhatsApp = () => {
    if (cart.length === 0) return alert("Your cart is empty!");

    // Simulated unique order ID tracking link fallback
    const simulatedOrderId = `DC-${Math.floor(10000 + Math.random() * 90000)}`;

    let message = `*🎫 NEW ORDER - Table #${tableNumber}* \n`;
    message += `-----------------------------\n`;
    cart.forEach((item) => {
      message += `▪️ ${item.name} x ${item.quantity} = ₹${item.price * item.quantity}\n`;
    });
    message += `-----------------------------\n`;
    message += `*💰 GRAND TOTAL: ₹${grandTotalAmount}*\n\n`;
    message += `👇 *Order Tracking Panel (Live Update):*\n`;
    message += `https://digichakra.in/order/${simulatedOrderId}\n\n`;
    message += `Please confirm my order.`;

    const encodedText = encodeURIComponent(message);
    window.open(`https://wa.me/9871782063?text=${encodedText}`, '_blank');
    setCart([]);
  };

  // 🎯 Filtered Menu Items logic injected
  const filteredMenu = MOCK_MENU.filter((item) => item.category === activeCategory);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f7', display: 'flex', justifyContent: 'center', padding: '0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Container viewport */}
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#f9f9fb', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Dark Header */}
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

        {/* Product Items Loop (Filtered) */}
        <main style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '120px' }}>
          {filteredMenu.length > 0 ? (
            filteredMenu.map((item) => {
              const cartItem = cart.find((c) => c.id === item.id);
              return (
                <div key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: '18px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #efeff4', height: '88px' }}>
                  
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1c1c1e', margin: '0' }}>{item.name}</h3>
                      <p style={{ color: '#1c1c1e', fontSize: '16px', fontWeight: '700', margin: '0' }}>
                        ₹ {item.price}
                      </p>
                    </div>
                  </div>

                  {/* Plus / Minus Counter Node */}
                  <div>
                    {cartItem ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#2b7a43', color: '#ffffff', borderRadius: '20px', padding: '6px 16px', boxShadow: '0 4px 8px rgba(43,122,67,0.25)' }}>
                        <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                        <span style={{ fontWeight: '700', fontSize: '15px', minWidth: '12px', textAlign: 'center' }}>{cartItem.quantity}</span>
                        <button onClick={() => addToCart(item)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
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

        {/* Premium Floating Drawer Footer (Exact Image & Alignment Match) */}
{totalItemsCount > 0 && (
  <div style={{ 
    position: 'fixed', 
    bottom: '18px', 
    left: '50%', 
    transform: 'translateX(-50%)', 
    width: '100%', 
    maxWidth: '420px', // Container ke same size ka kiya
    padding: '0 16px', // Dono side se equal gap milega
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
        onClick={handleCheckoutWhatsApp}
        style={{ 
          backgroundColor: '#1e542e', 
          color: '#ffffff', 
          border: 'none', 
          padding: '8px 18px', 
          borderRadius: '25px', 
          fontWeight: '700', 
          fontSize: '13px', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
          flexShrink: 0 // Bada font hone par bhi button dabega nahi
        }}
      >
        Place Order ➔
      </button>
    </div>
  </div>
)}

      </div>
    </div>
  );
}