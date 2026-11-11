import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Review from '../models/Review.js';

export class DashboardService {
  static async getStats() {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({
      orderStatus: { $in: ['PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED'] }
    });
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'DELIVERED' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'CANCELLED' });

    const paidOrders = await Order.find({
      $or: [
        { 'paymentInfo.method': 'ONLINE', 'paymentInfo.status': 'PAID' },
        { 'paymentInfo.method': 'COD', orderStatus: 'DELIVERED' }
      ],
      orderStatus: { $ne: 'CANCELLED' }
    });
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.pricing?.totalAmount || 0), 0);

    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const lowStockCount = await Product.countDocuments({
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    });

    // Real Customer Reviews calculation from MongoDB
    const totalReviews = await Review.countDocuments();
    const ratingAggregate = await Review.aggregate([
      { $match: { rating: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalCount: { $sum: 1 }
        }
      }
    ]);
    const averageRating = ratingAggregate.length > 0 && ratingAggregate[0].avgRating
      ? Number(ratingAggregate[0].avgRating.toFixed(1))
      : 0;

    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);

    const onlineOrdersCount = await Order.countDocuments({ 'paymentInfo.method': 'ONLINE' });
    const codOrdersCount = await Order.countDocuments({ 'paymentInfo.method': 'COD' });

    return {
      stats: {
        totalRevenue,
        totalOrders,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        totalCustomers,
        lowStockCount,
        totalReviews,
        averageRating,
        paymentDistribution: {
          online: onlineOrdersCount,
          cod: codOrdersCount
        }
      },
      recentOrders
    };
  }
}
