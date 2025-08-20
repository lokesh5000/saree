import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

function ViewAnalytics() {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week'); // 'day', 'week', 'month'
  const [userId, setUserId] = useState('');
  const [storeId, setStoreId] = useState('');
  
  // New state for dropdowns
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);

  // Fetch stores on component mount
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoadingStores(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/analytics/stores', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setStores(response.data);
        
        // Auto-select first store if only one store (for admin users)
        if (response.data.length === 1) {
          setStoreId(response.data[0].id);
        }
      } catch (err) {
        console.error('Error fetching stores:', err);
        setError('Failed to fetch stores.');
      } finally {
        setLoadingStores(false);
      }
    };

    fetchStores();
  }, []);

  // Fetch users when store changes
  useEffect(() => {
    const fetchUsers = async () => {
      if (!storeId) {
        setUsers([]);
        return;
      }

      try {
        setLoadingUsers(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/analytics/users/${storeId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUsers(response.data);
        setUserId(''); // Reset user selection when store changes
      } catch (err) {
        console.error('Error fetching users:', err);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [storeId]);

  // Fetch analytics data and process for charts
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token'); 
        const params = { period };
        
        // Only add storeId and userId if they are selected
        if (storeId) params.storeId = storeId;
        if (userId) params.userId = userId;
        
        const response = await axios.get('http://localhost:5000/api/analytics/usage', {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: params
        });
        
        // Process data for charts
        const processedData = processAnalyticsForChart(response.data.rawData, period);
        setChartData(processedData);
        setTotalEvents(response.data.totalEvents || 0);
        setError(null);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to fetch analytics. Please ensure you are authorized and parameters are correct.');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch analytics if we have stores loaded
    if (!loadingStores) {
      fetchAnalytics();
    }
  }, [period, userId, storeId, loadingStores]);

  // Process raw analytics data into chart format
  const processAnalyticsForChart = (rawData, period) => {
    if (!rawData || rawData.length === 0) return [];

    // Group data by date
    const groupedData = {};
    const now = new Date();
    
    // Initialize date range based on period
    let days = 7; // default for week
    if (period === 'day') days = 1;
    if (period === 'month') days = 30;
    
    // Initialize all dates with 0 values
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      groupedData[dateKey] = {
        date: dateKey,
        displayDate: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        virtual_try_on: 0,
        image_upload: 0,
        user_login: 0,
        store_visit: 0,
        credit_used: 0,
        total: 0
      };
    }

    // Fill in actual data
    rawData.forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      if (groupedData[date]) {
        const eventType = item.event_type;
        groupedData[date][eventType] = (groupedData[date][eventType] || 0) + 1;
        groupedData[date].total += 1;
      }
    });

    return Object.values(groupedData).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  if (loading) return (
    <div className="analytics-loading">
      <div className="loading-spinner"></div>
      <p>Loading analytics...</p>
    </div>
  );
  
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="analytics-dashboard">
      <h3>Usage Analytics</h3>
      
      <div className="analytics-filters">
        <label>
          Period:
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </label>
        
        <label>
          Store:
          <select 
            value={storeId} 
            onChange={(e) => setStoreId(e.target.value)}
            disabled={loadingStores}
          >
            <option value="">All Stores</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name} ({store.credits} credits)
              </option>
            ))}
          </select>
        </label>
        
        <label>
          User:
          <select 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)}
            disabled={!storeId || loadingUsers}
          >
            <option value="">All Users in Store</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.role})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="analytics-summary-header">
        <div className="summary-card">
          <div className="summary-number">{totalEvents}</div>
          <div className="summary-label">Total Events</div>
        </div>
        {storeId && (
          <div className="summary-card">
            <div className="summary-number">{stores.find(s => s.id === storeId)?.credits || 0}</div>
            <div className="summary-label">Store Credits</div>
          </div>
        )}
        <div className="summary-card">
          <div className="summary-number">{chartData.length}</div>
          <div className="summary-label">Days Tracked</div>
        </div>
      </div>

      <div className="chart-container">
        <h4>Activity Over Time</h4>
        {chartData.length === 0 ? (
          <div className="no-data">
            <p>No data available for the selected period and filters.</p>
            <p>Try selecting a different time period or store.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="displayDate" 
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#667eea" 
                strokeWidth={3}
                dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
                name="Total Events"
              />
              <Line 
                type="monotone" 
                dataKey="virtual_try_on" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                name="Virtual Try-On"
              />
              <Line 
                type="monotone" 
                dataKey="image_upload" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                name="Image Upload"
              />
              <Line 
                type="monotone" 
                dataKey="user_login" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                name="User Login"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default ViewAnalytics;
