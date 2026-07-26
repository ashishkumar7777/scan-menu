import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PosBilling() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:5000/api/items')
      .then((res) => {
        setItems(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Database fetch error:", err);
        setLoading(false);
      });
  }, []);

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const filteredItems = activeCategory === 'all' 
    ? items 
    : items.filter(item => item.category === activeCategory);

  const subTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCreateOrder = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    const orderData = {
      source: 'POS_COUNTER',
      orderType: 'TAKEAWAY',
      items: cart.map(i => ({ itemId: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      subTotal: subTotal,
      discount: 0,
      grandTotal: subTotal,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID'
    };

    try {
      const response = await axios.post('http://localhost:5000/api/orders/create', orderData);
      if (response.data.success || response.status === 201) {
        alert('🎉 POS Order Created & Saved in Database!');
        setCart([]);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Order save karne mein problem aayi!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', fontFamily: 'sans-serif' }}>
      
      {/* Menu Grid Left */}
      <div style={{ flex: 2 }}>
        <h2>💻 FastPOS Counter Console</h2>

        <div style={{ margin: '15px 0', display: 'flex', gap: '10px' }}>
          {['all', 'mains', 'breakfast', 'drinks', 'desserts'].map(cat => (
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
                textTransform: 'capitalize'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p>Connecting to database...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => addToCart(item)}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '15px',
                  background: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                <h4 style={{ margin: '0 0 8px 0' }}>{item.name}</h4>
                <p style={{ margin: 0, color: '#16a34a', fontWeight: 'bold' }}>₹{item.price}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary Right */}
      <div style={{ flex: 1, background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3>🛒 Current Bill</h3>
          <hr style={{ margin: '10px 0', borderColor: '#e2e8f0' }} />
          
          {cart.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', margin: '40px 0' }}>Cart khali hai. Item add karne ke liye tap karein.</p>
          ) : (
            cart.map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <strong>{i.name}</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>₹{i.price} x {i.quantity}</div>
                </div>
                <div style={{ fontWeight: 'bold' }}>₹{i.price * i.quantity}</div>
              </div>
            ))
          )}
        </div>

        <div>
          <hr style={{ margin: '10px 0', borderColor: '#e2e8f0' }} />
          <h2 style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total:</span>
            <span style={{ color: '#2563eb' }}>₹{subTotal}</span>
          </h2>
          <button 
            disabled={cart.length === 0 || isSubmitting}
            onClick={handleCreateOrder}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '15px',
              background: cart.length > 0 ? '#16a34a' : '#cbd5e1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: cart.length > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            {isSubmitting ? 'Processing...' : 'Create Order & Print'}
          </button>
        </div>
      </div>

    </div>
  );
}