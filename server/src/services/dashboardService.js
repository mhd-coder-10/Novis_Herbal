import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Review from '../models/Review.js';

export class DashboardService {
  static async getStats() {
    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      revenueAggregate,
      totalCustomers,
      lowStockCount,
      totalReviews,
      ratingAggregate,
      recentOrders,
      onlineOrdersCount,
      codOrdersCount
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({
        orderStatus: { $in: ['PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED'] }
      }),
      Order.countDocuments({ orderStatus: 'DELIVERED' }),
      Order.countDocuments({ orderStatus: 'CANCELLED' }),
      Order.aggregate([
        {
          $match: {
            $or: [
              { 'paymentInfo.method': 'ONLINE', 'paymentInfo.status': 'PAID' },
              { 'paymentInfo.method': 'COD', orderStatus: 'DELIVERED' }
            ],
            orderStatus: { $ne: 'CANCELLED' }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$pricing.totalAmount' }
          }
        }
      ]),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments({
        $expr: { $lte: ['$stock', '$lowStockThreshold'] }
      }),
      Review.countDocuments(),
      Review.aggregate([
        { $match: { rating: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalCount: { $sum: 1 }
          }
        }
      ]),
      Order.find()
        .select('orderId createdAt customerDetails.fullName pricing.totalAmount orderStatus paymentInfo.status paymentInfo.method')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Order.countDocuments({ 'paymentInfo.method': 'ONLINE' }),
      Order.countDocuments({ 'paymentInfo.method': 'COD' })
    ]);

    const totalRevenue = revenueAggregate.length > 0 && revenueAggregate[0].totalRevenue
      ? revenueAggregate[0].totalRevenue
      : 0;

    const averageRating = ratingAggregate.length > 0 && ratingAggregate[0].avgRating
      ? Number(ratingAggregate[0].avgRating.toFixed(1))
      : 0;

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
