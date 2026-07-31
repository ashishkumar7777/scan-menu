import React, { useState, useEffect, useCallback } from "react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SalesReport = () => {
  // Get today's local date in YYYY-MM-DD format (prevents UTC timezone shift)
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

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Sales & Performance Report</h2>

      {/* Calendar Controls */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "20px", alignItems: "center" }}>
        <label>
          <strong>From: </strong>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          <strong>To: </strong>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <button
          onClick={fetchReport}
          style={{
            padding: "6px 12px",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          🔄 Refresh Report
        </button>
      </div>

      {loading ? (
        <p>Loading report data...</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
            <div style={cardStyle}>
              <h4>Total Revenue</h4>
              <p style={metricStyle}>
                ₹{(reportData.summary?.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
            <div style={cardStyle}>
              <h4>Total Orders</h4>
              <p style={metricStyle}>{reportData.summary?.totalOrders || 0}</p>
            </div>
            <div style={cardStyle}>
              <h4>Avg. Order Value</h4>
              <p style={metricStyle}>
                ₹{(reportData.summary?.avgOrderValue || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Best Selling Items Table */}
          <h3>Top Selling Items</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f4f4f4", borderBottom: "2px solid #ccc" }}>
                <th style={tdStyle}>Item Name</th>
                <th style={tdStyle}>Quantity Sold</th>
                <th style={tdStyle}>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {reportData.bestSellers && reportData.bestSellers.length > 0 ? (
                reportData.bestSellers.map((item, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={tdStyle}>{item._id || "Unnamed Item"}</td>
                    <td style={tdStyle}>{item.totalQuantitySold || 0}</td>
                    <td style={tdStyle}>₹{(item.totalRevenueGenerated || 0).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ padding: "15px", textAlign: "center", color: "#64748b" }}>
                    No sales recorded for this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

const cardStyle = {
  flex: 1,
  padding: "15px",
  borderRadius: "8px",
  background: "#f9f9f9",
  border: "1px solid #ddd",
  textAlign: "center"
};

const metricStyle = {
  fontSize: "24px",
  fontWeight: "bold",
  margin: "10px 0 0 0",
  color: "#2e7d32"
};

const tdStyle = {
  padding: "10px"
};

export default SalesReport;