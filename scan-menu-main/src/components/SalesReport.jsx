import React, { useState, useEffect, useCallback } from "react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SalesReport = () => {
  const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());

  const [reportData, setReportData] = useState({
    summary: { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
    paymentBreakdown: {
      CASH: { count: 0, total: 0 },
      UPI: { count: 0, total: 0 },
      CARD: { count: 0, total: 0 }
    },
    orderTypeBreakdown: {
      DINE_IN: { count: 0, total: 0 },
      TAKEAWAY: { count: 0, total: 0 },
      DELIVERY: { count: 0, total: 0 }
    },
    sourceBreakdown: {
      QR_MENU: { count: 0, total: 0 },
      POS_COUNTER: { count: 0, total: 0 }
    },
    bestSellers: []
  });
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reports/sales?startDate=${startDate}&endDate=${endDate}`
      );
      const result = await response.json();
      if (result.success && result.data) {
        setReportData({
          summary: {
            totalRevenue: result.data.summary?.totalRevenue || 0,
            totalOrders: result.data.summary?.totalOrders || 0,
            avgOrderValue: result.data.summary?.avgOrderValue || 0,
          },
          paymentBreakdown: result.data.paymentBreakdown || {
            CASH: { count: 0, total: 0 },
            UPI: { count: 0, total: 0 },
            CARD: { count: 0, total: 0 }
          },
          orderTypeBreakdown: result.data.orderTypeBreakdown || {
            DINE_IN: { count: 0, total: 0 },
            TAKEAWAY: { count: 0, total: 0 },
            DELIVERY: { count: 0, total: 0 }
          },
          sourceBreakdown: result.data.sourceBreakdown || {
            QR_MENU: { count: 0, total: 0 },
            POS_COUNTER: { count: 0, total: 0 }
          },
          bestSellers: Array.isArray(result.data.bestSellers) ? result.data.bestSellers : []
        });
      }
    } catch (err) {
      console.error("Failed to fetch sales report:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const { summary, paymentBreakdown, orderTypeBreakdown, sourceBreakdown, bestSellers } = reportData;

  return (
    <div style={{ padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif", background: "#f8fafc", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 6px 0", color: "#0f172a" }}>📊 Sales & Operations Analytics Report</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
          Track total collections, payment split (Cash vs UPI vs Card), Dine-in vs Takeaway, and QR vs POS orders.
        </p>
      </div>

      {/* Date Filter Bar */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "24px", alignItems: "center", background: "#ffffff", padding: "14px 18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
        <label style={{ fontSize: "14px", color: "#334155" }}>
          <strong>From: </strong>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputDateStyle}
          />
        </label>
        <label style={{ fontSize: "14px", color: "#334155" }}>
          <strong>To: </strong>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputDateStyle}
          />
        </label>
        <button
          onClick={fetchReport}
          style={{
            padding: "8px 16px",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "13px"
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#64748b", padding: "30px" }}>Loading report metrics...</p>
      ) : (
        <>
          {/* Top Level Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={cardStyle}>
              <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>Total Revenue</span>
              <p style={{ ...metricStyle, color: "#16a34a" }}>₹{(summary.totalRevenue || 0).toLocaleString()}</p>
            </div>
            <div style={cardStyle}>
              <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>Total Orders</span>
              <p style={{ ...metricStyle, color: "#2563eb" }}>{summary.totalOrders || 0}</p>
            </div>
            <div style={cardStyle}>
              <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>Avg. Order Value</span>
              <p style={{ ...metricStyle, color: "#8b5cf6" }}>₹{(summary.avgOrderValue || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Breakdown Grids: Payment Mode, Order Channels, and Ordering Source */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "24px" }}>
            
            {/* 1. Payment Methods Breakdown */}
            <div style={sectionBoxStyle}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#0f172a" }}>💳 Payment Method Breakdown</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={rowStyle}>
                  <div>
                    <strong style={{ color: "#1e293b", fontSize: "14px" }}>💵 Cash</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{paymentBreakdown.CASH?.count || 0} orders</div>
                  </div>
                  <div style={{ textAlign: "right", fontWeight: "700", color: "#16a34a", fontSize: "16px" }}>
                    ₹{(paymentBreakdown.CASH?.total || 0).toLocaleString()}
                  </div>
                </div>

                <div style={rowStyle}>
                  <div>
                    <strong style={{ color: "#1e293b", fontSize: "14px" }}>📱 UPI / Online</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{paymentBreakdown.UPI?.count || 0} orders</div>
                  </div>
                  <div style={{ textAlign: "right", fontWeight: "700", color: "#2563eb", fontSize: "16px" }}>
                    ₹{(paymentBreakdown.UPI?.total || 0).toLocaleString()}
                  </div>
                </div>

                <div style={rowStyle}>
                  <div>
                    <strong style={{ color: "#1e293b", fontSize: "14px" }}>💳 Card</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{paymentBreakdown.CARD?.count || 0} orders</div>
                  </div>
                  <div style={{ textAlign: "right", fontWeight: "700", color: "#8b5cf6", fontSize: "16px" }}>
                    ₹{(paymentBreakdown.CARD?.total || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Order Channels (Dine-In vs Takeaway vs Delivery) */}
            <div style={sectionBoxStyle}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#0f172a" }}>🍽️ Order Channels Breakdown</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={rowStyle}>
                  <div>
                    <strong style={{ color: "#1e293b", fontSize: "14px" }}>🍽️ Dine-in</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{orderTypeBreakdown.DINE_IN?.count || 0} orders</div>
                  </div>
                  <div style={{ textAlign: "right", fontWeight: "700", color: "#0f172a", fontSize: "16px" }}>
                    ₹{(orderTypeBreakdown.DINE_IN?.total || 0).toLocaleString()}
                  </div>
                </div>

                <div style={rowStyle}>
                  <div>
                    <strong style={{ color: "#1e293b", fontSize: "14px" }}>🥡 Takeaway</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{orderTypeBreakdown.TAKEAWAY?.count || 0} orders</div>
                  </div>
                  <div style={{ textAlign: "right", fontWeight: "700", color: "#0f172a", fontSize: "16px" }}>
                    ₹{(orderTypeBreakdown.TAKEAWAY?.total || 0).toLocaleString()}
                  </div>
                </div>

                <div style={rowStyle}>
                  <div>
                    <strong style={{ color: "#1e293b", fontSize: "14px" }}>🛵 Delivery</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{orderTypeBreakdown.DELIVERY?.count || 0} orders</div>
                  </div>
                  <div style={{ textAlign: "right", fontWeight: "700", color: "#0f172a", fontSize: "16px" }}>
                    ₹{(orderTypeBreakdown.DELIVERY?.total || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Ordering Source (QR Menu vs POS Counter) */}
            <div style={sectionBoxStyle}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#0f172a" }}>📱 Ordering Source Breakdown</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={rowStyle}>
                  <div>
                    <strong style={{ color: "#1e293b", fontSize: "14px" }}>📱 QR Digital Menu</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{sourceBreakdown.QR_MENU?.count || 0} scanned orders</div>
                  </div>
                  <div style={{ textAlign: "right", fontWeight: "700", color: "#2b7a43", fontSize: "16px" }}>
                    ₹{(sourceBreakdown.QR_MENU?.total || 0).toLocaleString()}
                  </div>
                </div>

                <div style={rowStyle}>
                  <div>
                    <strong style={{ color: "#1e293b", fontSize: "14px" }}>💻 POS Cashier Counter</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{sourceBreakdown.POS_COUNTER?.count || 0} counter orders</div>
                  </div>
                  <div style={{ textAlign: "right", fontWeight: "700", color: "#2563eb", fontSize: "16px" }}>
                    ₹{(sourceBreakdown.POS_COUNTER?.total || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Top Selling Items Table */}
          <div style={sectionBoxStyle}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#0f172a" }}>🏆 Top Selling Items</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                  <th style={tdStyle}>Item Name</th>
                  <th style={tdStyle}>Quantity Sold</th>
                  <th style={{ ...tdStyle, textAlign: "right" }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {bestSellers && bestSellers.length > 0 ? (
                  bestSellers.map((item, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ ...tdStyle, fontWeight: "600", color: "#0f172a" }}>{item._id || "Unnamed Item"}</td>
                      <td style={tdStyle}>{item.totalQuantitySold || 0} units</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: "700", color: "#16a34a" }}>
                        ₹{(item.totalRevenueGenerated || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                      No sales recorded for this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const cardStyle = {
  padding: "18px 20px",
  borderRadius: "12px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const sectionBoxStyle = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 14px",
  background: "#f8fafc",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const metricStyle = {
  fontSize: "26px",
  fontWeight: "800",
  margin: "8px 0 0 0",
};

const inputDateStyle = {
  marginLeft: "8px",
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  fontSize: "13px",
};

const tdStyle = {
  padding: "12px 14px",
};

export default SalesReport;