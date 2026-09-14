import React from 'react';

export default function ThermalPrintReceipt({ order, type = 'BILL' }) {
  if (!order) return null;

  const isKOT = type === 'KOT';
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
  const items = order.items || [];
  const grandTotal = Number(order.grandTotal || order.subTotal || order.totalAmount || 0);

  return (
    <div id="thermal-printable-area" className="thermal-receipt">
      <style>{`
        @media screen {
          #thermal-printable-area {
            display: none;
          }
        }
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #thermal-printable-area, #thermal-printable-area * {
            visibility: visible;
          }
          #thermal-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 4mm;
            font-family: 'Courier New', Courier, monospace;
            color: #000;
            background: #fff;
            box-sizing: border-box;
            display: block !important;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .receipt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .receipt-table th { border-bottom: 1px dashed #000; padding: 4px 0; text-align: left; }
          .receipt-table td { padding: 4px 0; vertical-align: top; }
        }
      `}</style>

      {/* Header */}
      <div className="text-center">
        {isKOT ? (
          <>
            <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '900' }}>*** K.O.T. ***</h2>
            <p style={{ margin: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>KITCHEN ORDER TICKET</p>
          </>
        ) : (
          <>
            <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '900' }}>CAFEBAR DHABA</h2>
            <p style={{ margin: '2px 0', fontSize: '11px' }}>Near Highway Circle, City</p>
            <p style={{ margin: '0 0 4px 0', fontSize: '11px' }}>Ph: +91 98765 43210</p>
            <div className="divider"></div>
            <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold' }}>TAX INVOICE</p>
          </>
        )}
      </div>

      <div className="divider"></div>

      {/* Meta Info */}
      <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>Order:</strong> #{order.orderId || 'ORD-000'}</span>
          <span><strong>Token:</strong> #{order.tokenNumber || '101'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>Type:</strong> {order.orderType || 'DINE-IN'}</span>
          <span><strong>Table:</strong> {order.tableNo ? `#${order.tableNo}` : 'N/A'}</span>
        </div>
        <div><strong>Date:</strong> {orderDate}</div>
        {!isKOT && order.customerName && (
          <div><strong>Customer:</strong> {order.customerName}</div>
        )}
      </div>

      <div className="divider"></div>

      {/* Items Section */}
      <table className="receipt-table">
        <thead>
          <tr>
            <th style={{ width: '55%' }}>Item</th>
            <th className="text-center" style={{ width: '15%' }}>Qty</th>
            {!isKOT && <th className="text-right" style={{ width: '30%' }}>Price</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="bold">{item.name}</td>
              <td className="text-center bold" style={{ fontSize: isKOT ? '15px' : '13px' }}>
                {item.quantity}
              </td>
              {!isKOT && (
                <td className="text-right">
                  ₹{(Number(item.price) * Number(item.quantity)).toFixed(2)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bill Footer Calculations */}
      {!isKOT && (
        <>
          <div className="divider"></div>
          <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sub Total:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax (GST 0%):</span>
              <span>₹0.00</span>
            </div>
            <div className="double-divider"></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900' }}>
              <span>GRAND TOTAL:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
            <div className="divider"></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Mode of Payment:</span>
              <span className="bold">{order.paymentMethod || 'UPI'} ({order.paymentStatus || 'PAID'})</span>
            </div>
          </div>

          <div className="divider"></div>
          <div className="text-center" style={{ fontSize: '11px', marginTop: '6px' }}>
            <p style={{ margin: '0' }}>Thank You! Visit Again 😊</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#555' }}>Software: RestoManager POS</p>
          </div>
        </>
      )}
    
      {isKOT && (
        <div className="divider" style={{ marginTop: '12px' }}></div>
      )}
    </div>
  );
}