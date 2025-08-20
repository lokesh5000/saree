const express = require('express');
const supabase = require('../supabaseService');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Helper to record analytics events
const recordAnalyticsEvent = async (userId, storeId, eventType, eventData = {}) => {
  try {
    const { error } = await supabase
      .from('analytics')
      .insert([
        { user_id: userId, store_id: storeId, event_type: eventType, event_data: eventData }
      ]);

    if (error) {
      console.error('Error recording analytics event:', error.message);
    }
  } catch (err) {
    console.error('Caught error recording analytics event:', err.message);
  }
};

// @route   POST /api/analytics/record
// @desc    Record an analytics event
// @access  Private (Authenticated Users)
router.post('/record', protect, async (req, res) => {
  const { eventType, eventData } = req.body;
  const userId = req.user.id;
  const storeId = req.user.storeId; // Assuming storeId is available in req.user

  if (!userId) {
    return res.status(400).json({ msg: 'User ID is required to record analytics' });
  }

  // Super-admin users don't have a storeId, so we allow null for them
  if (!storeId && req.user.role !== 'super-admin') {
    return res.status(400).json({ msg: 'Store ID is required for non-super-admin users' });
  }

  await recordAnalyticsEvent(userId, storeId, eventType, eventData);
  res.status(200).json({ msg: 'Analytics event recorded' });
});

// @route   GET /api/analytics/usage
// @desc    Get usage analytics
// @access  Private (Admin, Super-Admin)
router.get('/usage', protect, authorizeRoles('admin', 'super-admin'), async (req, res) => {
  const { period, userId, storeId } = req.query; // period: 'day', 'week', 'month', 'all_time'

  try {
    let query = supabase.from('analytics').select('event_type, created_at, users(username), stores(name)');

    // Filter by store for admins
    if (req.user.role === 'admin') {
      if (!req.user.storeId) {
        return res.status(400).json({ msg: 'Admin user must have a store ID' });
      }
      query = query.eq('store_id', req.user.storeId);
    } else if (req.user.role === 'super-admin' && storeId) { 
      // Super-admin can filter by any store if specified
      query = query.eq('store_id', storeId);
    }
    // If super-admin doesn't specify storeId, they get all data

    // Filter by specific user
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Filter by time period
    const now = new Date();
    let startDate;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); // Start of the current week (Sunday)
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all_time':
      default:
        // No date filter needed
        break;
    }

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: analyticsData, error } = await query;

    if (error) {
      console.error('Supabase fetch analytics error:', error.message);
      return res.status(500).json({ msg: 'Server error fetching analytics', error: error.message });
    }

    // Basic aggregation (can be more complex depending on frontend needs)
    const aggregatedData = analyticsData.reduce((acc, curr) => {
      acc[curr.event_type] = (acc[curr.event_type] || 0) + 1;
      return acc;
    }, {});

    // Also provide chart-ready data
    const chartData = processDataForChart(analyticsData, period);

    res.json({ 
      rawData: analyticsData, 
      aggregatedData,
      chartData,
      totalEvents: analyticsData.length,
      userRole: req.user.role,
      storeId: req.user.storeId 
    });
  } catch (err) {
    console.error('Analytics usage error:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Helper function to process data for charts
function processDataForChart(rawData, period) {
  if (!rawData || rawData.length === 0) return [];

  const now = new Date();
  let days = 7; // default for week
  if (period === 'day') days = 1;
  if (period === 'month') days = 30;

  // Initialize date range
  const chartData = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    
    chartData.push({
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
    });
  }

  // Fill in actual data
  rawData.forEach(item => {
    const itemDate = new Date(item.created_at).toISOString().split('T')[0];
    const dayData = chartData.find(d => d.date === itemDate);
    
    if (dayData) {
      const eventType = item.event_type;
      dayData[eventType] = (dayData[eventType] || 0) + 1;
      dayData.total += 1;
    }
  });

  return chartData;
}

// @route   GET /api/analytics/stores
// @desc    Get stores for analytics dropdown
// @access  Private (Admin, Super-Admin)
router.get('/stores', protect, authorizeRoles('admin', 'super-admin'), async (req, res) => {
  try {
    let query = supabase.from('stores').select('id, name, credits');

    // Admin can only see their own store
    if (req.user.role === 'admin') {
      if (!req.user.storeId) {
        return res.status(400).json({ msg: 'Admin user must have a store ID' });
      }
      query = query.eq('id', req.user.storeId);
    }
    // Super-admin can see all stores

    const { data: stores, error } = await query;

    if (error) {
      console.error('Supabase fetch stores error:', error.message);
      return res.status(500).json({ msg: 'Server error fetching stores', error: error.message });
    }

    res.json(stores);
  } catch (err) {
    console.error('Analytics stores error:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// @route   GET /api/analytics/users/:storeId
// @desc    Get users for a specific store for analytics dropdown
// @access  Private (Admin, Super-Admin)
router.get('/users/:storeId', protect, authorizeRoles('admin', 'super-admin'), async (req, res) => {
  try {
    const { storeId } = req.params;

    // Admin can only see users from their own store
    if (req.user.role === 'admin' && req.user.storeId !== storeId) {
      return res.status(403).json({ msg: 'Admin can only view users from their own store' });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role')
      .eq('store_id', storeId);

    if (error) {
      console.error('Supabase fetch users error:', error.message);
      return res.status(500).json({ msg: 'Server error fetching users', error: error.message });
    }

    res.json(users);
  } catch (err) {
    console.error('Analytics users error:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// @route   GET /api/analytics/test
// @desc    Test analytics access and user info
// @access  Private (Admin, Super-Admin)
router.get('/test', protect, authorizeRoles('admin', 'super-admin'), async (req, res) => {
  try {
    res.json({
      message: 'Analytics access successful',
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        storeId: req.user.storeId
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Analytics test error:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = { router, recordAnalyticsEvent };
