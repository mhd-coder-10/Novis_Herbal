import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Users,
  ArrowUpRight,
  CheckCircle2,
  Package,
  Plus,
  Truck,
  Tag,
  CreditCard,
  TrendingUp,
  Activity,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Star,
  Settings
} from 'lucide-react';
import api from '../../services/api';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalCustomers: number;
  lowStockCount: number;
  totalReviews?: number;
  averageRating?: number;
  paymentDistribution: {
    online: number;
    cod: number;
  };
}

interface AdminDashboardProps {
  onNavigateToTab: (tab: string) => void;
  onNavigateToOrder?: (orderId: string) => void;
}

  export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateToTab, onNavigateToOrder }) => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchStats = async () => {
        try {
          const res = await api.get('/dashboard/stats');
          if (res.data?.success) {
            setStats(res.data.stats);
            setRecentOrders(res.data.recentOrders || []);
          }
        } catch (err) {
          console.error('Failed to load admin stats:', err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchStats();
    }, []);

    if (isLoading) {
      return (
        <div className="py-24 text-center space-y-3">
          <Activity className="w-8 h-8 animate-spin text-forest-900 mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Store Analytics & Reports...</p>
        </div>
      );
    }

    const revenue = stats?.totalRevenue || 0;
    const ordersCount = stats?.totalOrders || 0;
    const aov = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;
    const onlineCount = stats?.paymentDistribution?.online || 0;
    const codCount = stats?.paymentDistribution?.cod || 0;
    const totalPaymentOrders = onlineCount + codCount;
    const onlinePercent = totalPaymentOrders > 0 ? Math.round((onlineCount / totalPaymentOrders) * 100) : 50;

    return (
      <div className="space-y-8">

        {/* Welcome Banner & Quick Action Center */}
        <div className="bg-gradient-to-r from-[#07190F] via-[#0B2518] to-[#123824] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-forest-900 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-2 max-w-xl z-10">
            <div className="flex items-center">
              <span className="inline-flex items-center whitespace-nowrap px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-gold-400/20 text-gold-300 font-mono text-xs sm:text-sm font-black border border-gold-400/30 uppercase tracking-wider shadow-xs">
                Executive Dashboard
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-white tracking-wide">
              Novis Herbal Store Performance
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Monitor real-time sales revenue, logistics fulfillment, customer database, and stock inventory from a single command center.
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap gap-2.5 z-10 self-start md:self-auto">
            <button
              onClick={() => onNavigateToTab('products')}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-forest-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition transform hover:scale-[1.02]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>

            <button
              onClick={() => onNavigateToTab('orders')}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-forest-900/80 hover:bg-forest-900 text-white font-bold text-xs sm:text-sm rounded-xl border border-forest-800 transition cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-gold-400" />
              <span>Orders ({stats?.totalOrders || 0})</span>
            </button>

            <button
              onClick={() => onNavigateToTab('customers')}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-forest-900/80 hover:bg-forest-900 text-white font-bold text-xs sm:text-sm rounded-xl border border-forest-800 transition"
            >
              <Users className="w-3.5 h-3.5 text-gold-400" />
              <span>Customers ({stats?.totalCustomers || 0})</span>
            </button>
          </div>
        </div>

        {/* Primary KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* 1. Total Net Revenue */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Net Revenue</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 font-black text-base flex items-center justify-center">
                ₹
              </div>
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-forest-950">
                ₹{revenue.toLocaleString('en-IN')}
              </h3>
              <div className="flex items-center space-x-1 text-emerald-600 text-xs font-bold mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Paid & delivered orders</span>
              </div>
            </div>
          </div>

          {/* 2. Total Orders & AOV */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-forest-950">
                {ordersCount}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-bold text-forest-900">₹{aov}</span> Average Order Value (AOV)
              </p>
            </div>
          </div>

          {/* 3. Registered Customers */}
          <div
            onClick={() => onNavigateToTab('customers')}
            className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 cursor-pointer group hover:border-forest-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered Customers</span>
              <div className="w-10 h-10 rounded-2xl bg-forest-900/10 text-forest-900 flex items-center justify-center group-hover:scale-110 transition">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-forest-950">
                {stats?.totalCustomers || 0}
              </h3>
              <p className="text-xs text-forest-900 font-semibold mt-1 flex items-center space-x-1">
                <span>View user directory</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition" />
              </p>
            </div>
          </div>

          {/* 4. Customer Reviews & Rating */}
          <div
            onClick={() => onNavigateToTab('reviews')}
            className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 cursor-pointer group hover:border-amber-400"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Reviews & Rating</span>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
            </div>
            <div>
              {stats?.totalReviews && stats.totalReviews > 0 ? (
                <>
                  <div className="flex items-baseline space-x-1.5">
                    <h3 className="text-2xl sm:text-3xl font-black text-forest-950">
                      {typeof stats.averageRating === 'number' ? stats.averageRating.toFixed(1) : '0.0'}
                    </h3>
                    <span className="text-amber-500 text-sm font-bold">★ / 5.0</span>
                  </div>
                  <p className="text-xs text-amber-700 font-semibold mt-1 flex items-center space-x-1">
                    <span>{stats.totalReviews} Customer Review{stats.totalReviews > 1 ? 's' : ''}</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition" />
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline space-x-1.5">
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-400">
                      0.0
                    </h3>
                    <span className="text-slate-400 text-sm font-bold">★ / 5.0</span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-1 flex items-center space-x-1">
                    <span>0 Customer Reviews</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition" />
                  </p>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Two-Column Analytics Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">

          {/* Left Column: Recent Orders (8 cols) */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-serif text-lg font-bold text-forest-950">
                  Recent Customer Orders
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live stream of incoming orders awaiting packing and dispatch.
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('orders')}
                className="inline-flex items-center space-x-1 text-xs font-bold text-forest-900 hover:text-forest-950 bg-forest-50 px-3 py-1.5 rounded-xl transition"
              >
                <span>View All ({ordersCount})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-xs font-bold tracking-wider">
                    <th className="py-3 px-3.5 rounded-l-xl">Order ID</th>
                    <th className="py-3 px-3.5">Customer</th>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5">Total</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 rounded-r-xl text-right">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        No customer orders placed yet.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((o) => (
                      <tr
                        key={o._id}
                        onClick={() => {
                          if (onNavigateToOrder) {
                            onNavigateToOrder(o.orderId || o._id);
                          } else {
                            onNavigateToTab('orders');
                          }
                        }}
                        className="hover:bg-slate-50/80 cursor-pointer transition"
                        title={`Click to open order ${o.orderId}`}
                      >
                        <td className="py-3.5 px-3.5 font-mono font-bold text-forest-900">
                          {o.orderId}
                        </td>
                        <td className="py-3.5 px-3.5 font-semibold text-forest-950">
                          {o.customerDetails?.fullName}
                        </td>
                        <td className="py-3.5 px-3.5 text-slate-500 text-[11px]">
                          {new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-3.5 font-bold text-slate-900">
                          ₹{o.pricing?.totalAmount}
                        </td>
                        <td className="py-3.5 px-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.orderStatus === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.orderStatus === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                            {o.orderStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-mono font-semibold text-slate-600 text-[11px]">
                          {o.paymentInfo?.method}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Payment Split & Store Diagnostics (4 cols) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Payment Method Breakdown Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-forest-950">
                  Payment Distribution
                </h3>
                <CreditCard className="w-4 h-4 text-slate-400" />
              </div>

              {/* Split Bar */}
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-500"
                    style={{ width: `${onlinePercent}%` }}
                    title={`Online Payments: ${onlinePercent}%`}
                  ></div>
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${100 - onlinePercent}%` }}
                    title={`COD: ${100 - onlinePercent}%`}
                  ></div>
                </div>

                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-emerald-700 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>Online ({onlinePercent}%)</span>
                  </span>
                  <span className="text-amber-700 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>COD ({100 - onlinePercent}%)</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-slate-200/60 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Prepaid</span>
                  <span className="text-lg font-black text-forest-950 mt-0.5 block">{onlineCount}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Razorpay Online</span>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-slate-200/60 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Doorstep Pay</span>
                  <span className="text-lg font-black text-forest-950 mt-0.5 block">{codCount}</span>
                  <span className="text-[10px] text-amber-700 font-semibold">Cash On Delivery</span>
                </div>
              </div>
            </div>

            {/* Inventory & Quick Config Status */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <h3 className="font-serif text-base font-bold text-forest-950">
                Inventory & Store Config
              </h3>

              <div className="space-y-2.5 text-xs">
                <div
                  onClick={() => onNavigateToTab('products')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <Package className="w-4 h-4 text-forest-900" />
                    <span className="font-bold text-slate-800">Inventory Monitor</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stats?.lowStockCount ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                    {stats?.lowStockCount ? `${stats.lowStockCount} Low Items` : 'All In Stock'}
                  </span>
                </div>

                <div
                  onClick={() => onNavigateToTab('settings')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <Settings className="w-4 h-4 text-forest-900" />
                    <span className="font-bold text-slate-800">Store & Policy Settings</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                    Configure
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    );
  };
