import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function TableManagement() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [switchTargetTable, setSwitchTargetTable] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTableStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/tables/status`);
      if (res.data?.success) {
        setTables(res.data.tables || []);
        // Update selected table view if modal is open
        if (selectedTable) {
          const updated = res.data.tables.find((t) => t.tableNo === selectedTable.tableNo);
          setSelectedTable(updated || null);
        }
      }
    } catch (err) {
      console.error('Error fetching table statuses:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTable]);

  useEffect(() => {
    fetchTableStatus();
    const socket = io(API_BASE_URL);

    socket.on('table_status_updated', fetchTableStatus);
    socket.on('new_order_received', fetchTableStatus);
    socket.on('order_status_updated', fetchTableStatus);

    return () => {
      socket.off('table_status_updated');
      socket.off('new_order_received');
      socket.off('order_status_updated');
      socket.disconnect();
    };
  }, [fetchTableStatus]);

  // 1-Click Vacate
  const handleVacateTable = async (table) => {
    if (!window.confirm(`Vacate Table #${table.tableNo} and settle order?`)) return;
    setActionLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/tables/vacate`, {
        tableNo: table.tableNo,
        orderId: table.order?.orderId
      });
      setSelectedTable(null);
      fetchTableStatus();
    } catch (err) {
      alert('Failed to vacate table.');
    } finally {
      setActionLoading(false);
    }
  };

  // Switch / Transfer Table
  const handleSwitchTable = async () => {
    if (!switchTargetTable) return alert('Select a vacant table to transfer to!');
    setActionLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/tables/switch`, {
        orderId: selectedTable.order?.orderId,
        fromTable: selectedTable.tableNo,
        toTable: switchTargetTable
      });
      setSelectedTable(null);
      setSwitchTargetTable('');
      fetchTableStatus();
    } catch (err) {
      alert('Failed to transfer table.');
    } finally {
      setActionLoading(false);
    }
  };

  const availableCount = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedCount = tables.filter((t) => t.status === 'OCCUPIED').length;
  const billedCount = tables.filter((t) => t.status === 'BILLED').length;

  return (
    <div style={{ padding: '24px 32px', minHeight: 'calc(100vh - 60px)', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            🍽️ Live Table Occupancy & Management
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Real-time floor layout, dining sessions, table switching, and instant vacancy settlement.
          </p>
        </div>

        {/* Legend Pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#15803d', padding: '6px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '13px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }}></span>
            Available ({availableCount})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#b91c1c', padding: '6px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '13px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626' }}></span>
            Occupied ({occupiedCount})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#b45309', padding: '6px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '13px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#d97706' }}></span>
            Billed / Served ({billedCount})
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading table layout...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {tables.map((table) => {
            const isAvailable = table.status === 'AVAILABLE';
            const isOccupied = table.status === 'OCCUPIED';
            const isBilled = table.status === 'BILLED';

            const cardBorder = isAvailable ? '#86efac' : isOccupied ? '#fca5a5' : '#fde047';
            const cardBg = isAvailable ? '#f0fdf4' : isOccupied ? '#fef2f2' : '#fffbeb';
            const badgeColor = isAvailable ? '#15803d' : isOccupied ? '#b91c1c' : '#b45309';

            return (
              <div
                key={table.tableNo}
                onClick={() => setSelectedTable(table)}
                style={{
                  backgroundColor: cardBg,
                  border: `2px solid ${cardBorder}`,
                  borderRadius: '16px',
                  padding: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '180px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Table Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                      Table #{table.tableNo}
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: badgeColor, textTransform: 'uppercase' }}>
                      {table.status}
                    </span>
                  </div>
                  <span style={{ fontSize: '24px' }}>
                    {isAvailable ? '🟢' : isOccupied ? '🔴' : '🟡'}
                  </span>
                </div>

                {/* Card Body Info */}
                <div style={{ margin: '14px 0' }}>
                  {isAvailable ? (
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                      Ready for next guests
                    </p>
                  ) : (
                    <div>
                      <div style={{ fontSize: '12px', color: '#334155', fontWeight: '700' }}>
                        Order: {table.order?.orderId}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Customer: {table.order?.customerName || 'Guest'}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: '#16a34a', marginTop: '4px' }}>
                        ₹{table.totalAmount}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Quick Action */}
                {!isAvailable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVacateTable(table);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ 1-Click Vacate
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Table Inspection / Switch Modal */}
      {selectedTable && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px rgba(0,0,0,0.15)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>
                Table #{selectedTable.tableNo} Details
              </h3>
              <button onClick={() => setSelectedTable(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            {selectedTable.status === 'AVAILABLE' ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '14px', color: '#64748b' }}>This table is currently free and available for dine-in guests.</p>
              </div>
            ) : (
              <div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
                  <div><strong>Active Order:</strong> {selectedTable.order?.orderId}</div>
                  <div><strong>Customer:</strong> {selectedTable.order?.customerName || 'Guest'}</div>
                  <div><strong>Items:</strong> {selectedTable.order?.items?.length} items ordered</div>
                  <div><strong>Total Amount:</strong> ₹{selectedTable.totalAmount}</div>
                </div>

                {/* Switch Table Tool */}
                <div style={{ marginBottom: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Transfer / Switch to Another Table:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={switchTargetTable}
                      onChange={(e) => setSwitchTargetTable(e.target.value)}
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="">Select Vacant Table</option>
                      {tables
                        .filter((t) => t.status === 'AVAILABLE')
                        .map((t) => (
                          <option key={t.tableNo} value={t.tableNo}>
                            Table #{t.tableNo} (Free)
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={handleSwitchTable}
                      disabled={actionLoading || !switchTargetTable}
                      style={{ padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Transfer
                    </button>
                  </div>
                </div>

                {/* 1-Click Vacate Button */}
                <button
                  onClick={() => handleVacateTable(selectedTable)}
                  disabled={actionLoading}
                  style={{ width: '100%', padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', marginBottom: '8px' }}
                >
                  ✓ Settle Bill & Vacate Table
                </button>
              </div>
            )}

            <button onClick={() => setSelectedTable(null)} style={{ width: '100%', padding: '10px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}