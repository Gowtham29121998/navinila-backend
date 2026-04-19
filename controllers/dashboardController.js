import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const { range = 'month', targetMonth, targetYear } = req.query;

    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'USER' });
    
    // Detailed stock stats
    const totalProducts = await Product.countDocuments();
    const outOfStockProducts = await Product.countDocuments({ countInStock: 0 });
    const inStockProducts = totalProducts - outOfStockProducts;

    // Total Revenue (excluding cancelled)
    const revenueData = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    // Sales Growth logic
    let groupBy = {};
    let startDate = new Date();
    let endDate = new Date();

    if (range === 'day') {
      if (targetMonth && targetYear) {
        // Start of selected month in IST
        startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0));
        startDate.setMinutes(startDate.getMinutes() - 330); // Move to 18:30 UTC previous day
        
        // End of selected month in IST
        endDate = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59));
        endDate.setMinutes(endDate.getMinutes() - 330);
      } else {
        startDate.setUTCHours(0, 0, 0, 0);
        startDate.setMinutes(startDate.getMinutes() - 330);
        startDate.setDate(startDate.getDate() - 6);
      }
      groupBy = {
        day: { $dayOfMonth: { date: '$createdAt', timezone: '+05:30' } },
        month: { $month: { date: '$createdAt', timezone: '+05:30' } },
        year: { $year: { date: '$createdAt', timezone: '+05:30' } }
      };
    } else if (range === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 4);
      startDate.setMonth(0, 1);
      startDate.setUTCHours(0, 0, 0, 0);
      startDate.setMinutes(startDate.getMinutes() - 330);
      groupBy = { year: { $year: { date: '$createdAt', timezone: '+05:30' } } };
    } else {
      if (targetYear) {
        // Full year from Jan 1st 00:00 IST to Dec 31st 23:59 IST
        startDate = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
        startDate.setMinutes(startDate.getMinutes() - 330);
        
        endDate = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59));
        endDate.setMinutes(endDate.getMinutes() - 330);
      } else {
        startDate.setMonth(startDate.getMonth() - 5);
        startDate.setDate(1);
        startDate.setUTCHours(0, 0, 0, 0);
        startDate.setMinutes(startDate.getMinutes() - 330);
      }
      groupBy = {
        month: { $month: { date: '$createdAt', timezone: '+05:30' } },
        year: { $year: { date: '$createdAt', timezone: '+05:30' } }
      };
    }

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$totalPrice' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Format data for frontend labels
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Fill in gaps with zero values for a continuous chart
    const fullSalesData = [];
    const tempDate = new Date(startDate);
    // If we are looking at a specific historical range, 'now' should be the end of that range
    const loopEnd = endDate > new Date() ? new Date() : endDate;

    while (tempDate <= loopEnd) {
      let label = "";
      let match = null;

      if (range === 'day') {
        label = `${tempDate.getDate()}/${tempDate.getMonth() + 1}`;
        match = salesData.find(d => d._id.day === tempDate.getDate() && d._id.month === (tempDate.getMonth() + 1));
        tempDate.setDate(tempDate.getDate() + 1);
      } else if (range === 'year') {
        label = `${tempDate.getFullYear()}`;
        match = salesData.find(d => d._id.year === tempDate.getFullYear());
        tempDate.setFullYear(tempDate.getFullYear() + 1);
      } else {
        label = `${monthNames[tempDate.getMonth()]} ${tempDate.getFullYear()}`;
        match = salesData.find(d => d._id.month === (tempDate.getMonth() + 1) && d._id.year === tempDate.getFullYear());
        tempDate.setMonth(tempDate.getMonth() + 1);
      }

      fullSalesData.push({
        name: label,
        revenue: match ? match.revenue : 0,
        orders: match ? match.orders : 0
      });
    }

    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'username email');

    res.json({
      stats: { 
        totalOrders, 
        totalUsers, 
        totalProducts, 
        totalRevenue,
        inStockProducts,
        outOfStockProducts
      },
      salesGrowth: fullSalesData,
      recentOrders
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export { getDashboardStats };
