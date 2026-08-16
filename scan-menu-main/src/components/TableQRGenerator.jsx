import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function TableQRGenerator() {
  const [cafeName, setCafeName] = useState('CAFEBAR DHABA');
  const [totalTables, setTotalTables] = useState(10);
  const [customUrlBase, setCustomUrlBase] = useState(window.location.origin);
  const printAreaRef = useRef(null);

  const tables = Array.from({ length: Number(totalTables) || 1 }, (_, i) => i + 1);

  // Generate target URL for a table
  const getTableUrl = (tableNum) => {
    const base = customUrlBase.replace(/\/+$/, '');
    return `${base}/scan/cafebar-dhaba?table=${tableNum}`;
  };

  // Download Individual QR Code as PNG
  const downloadSingleQR = (tableNum) => {
    const svgElement = document.getElementById(`qr-svg-table-${tableNum}`);
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 600;
    canvas.height = 600;

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 50, 50, 500, 500);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${cafeName.toLowerCase().replace(/\s+/g, '-')}-table-${tableNum}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  // Trigger Print Sheet for all Table Cards
  const handlePrintAllCards = () => {
    window.print();
  };

  return (
    <div style={{ padding: '24px 32px', minHeight: 'calc(100vh - 60px)', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-qr-grid, #printable-qr-grid * {
            visibility: visible;
          }
          #printable-qr-grid {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
            padding: 10px !important;
            background: #fff !important;
          }
          .qr-standee-card {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 2px solid #0f172a !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Control Banner (Hidden in Print) */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
              🪑 Table QR Standee Card Generator
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Generate, customize, and print digital QR menu cards for your restaurant tables.
            </p>
          </div>

          <button
            onClick={handlePrintAllCards}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 10px rgba(37,99,235,0.2)'
            }}
          >
            🖨️ Print All Table Cards (A4 / Standees)
          </button>
        </div>

        {/* Input Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              Restaurant Brand Name
            </label>
            <input
              type="text"
              value={cafeName}
              onChange={(e) => setCafeName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              Total Number of Tables
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={totalTables}
              onChange={(e) => setTotalTables(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              Domain Base URL
            </label>
            <input
              type="text"
              value={customUrlBase}
              onChange={(e) => setCustomUrlBase(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* QR Cards Display Grid */}
      <div
        id="printable-qr-grid"
        ref={printAreaRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px'
        }}
      >
        {tables.map((tableNum) => {
          const qrUrl = getTableUrl(tableNum);

          return (
            <div
              key={tableNum}
              className="qr-standee-card"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '18px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative'
              }}
            >
              {/* Standee Header */}
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '20px' }}>🍽️</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '900', color: '#0f172a', letterSpacing: '0.5px' }}>
                  {cafeName}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Contactless Digital Menu
                </p>
              </div>

              {/* Table Number Pill */}
              <div style={{ backgroundColor: '#0f172a', color: '#ffffff', fontSize: '13px', fontWeight: '800', padding: '5px 18px', borderRadius: '20px', marginBottom: '16px' }}>
                TABLE NO. {tableNum}
              </div>

              {/* QR Code Container */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px dashed #cbd5e1', marginBottom: '16px' }}>
                <QRCodeSVG
                  id={`qr-svg-table-${tableNum}`}
                  value={qrUrl}
                  size={160}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Instructions */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                  📲 Scan with Camera / GPay / Paytm
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                  Browse Dishes • Place Order • Pay Online
                </p>
              </div>

              {/* Card Action (Hidden in Print) */}
              <button
                onClick={() => downloadSingleQR(tableNum)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                📥 Download PNG
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}