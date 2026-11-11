import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Search,
  Package,
  CheckCircle2,
  Truck,
  Clock,
  MapPin,
  AlertCircle,
  ExternalLink,
  Calendar,
  CreditCard,
  Printer,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Headphones,
  ShoppingBag,
  Loader2
} from 'lucide-react';
import { Order } from '../../types';
import api, { getFullImageUrl } from '../../services/api';
import { toast } from '../../store/useToastStore';
import { appConfig } from '../../config/appConfig';

interface TrackOrderProps {
  initialOrderId?: string;
  onNavigate: (page: string, param?: string) => void;
}

export const TrackOrderPage: React.FC<TrackOrderProps> = ({ initialOrderId = '', onNavigate }) => {
  const { orderId: routeOrderId } = useParams<{ orderId?: string }>();
  const effectiveId = initialOrderId || routeOrderId || '';

  const [orderIdInput, setOrderIdInput] = useState(effectiveId);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasCopiedAwb, setHasCopiedAwb] = useState(false);

  const fetchTracking = async (idToSearch: string) => {
    if (!idToSearch.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get(`/orders/track/${idToSearch.trim()}`);
      if (res.data?.success && res.data.order) {
        setOrder(res.data.order);
      } else {
        setError('Order reference not found. Please verify the Order ID.');
        setOrder(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not locate order with this ID. Please double check.');
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveId) {
      setOrderIdInput(effectiveId);
      fetchTracking(effectiveId);
    }
  }, [effectiveId]);

  // Realtime Live Order Status & Tab Switch Sync
  useEffect(() => {
    const handleLiveOrderUpdate = (e: any) => {
      const targetId = (orderIdInput || effectiveId || order?.orderId || '').trim().toUpperCase();
      if (!targetId) return;

      const eventPayload = e?.detail;
      const updatedOrder = eventPayload?.order;
      const eventOrderId = (eventPayload?.orderId || updatedOrder?.orderId || '').toString().toUpperCase();
      const eventMongoId = (eventPayload?.mongoId || updatedOrder?._id || '').toString();

      // If the event specifically targets this order, update state immediately (0ms!)
      if (
        (eventOrderId && eventOrderId === targetId) ||
        (eventMongoId && (eventMongoId === targetId || (order && String(order._id) === eventMongoId)))
      ) {
        if (updatedOrder) {
          setOrder(updatedOrder);
          return;
        }
      }

      // Quietly re-fetch in background without showing a disruptive loading spinner
      api.get(`/orders/track/${targetId}`)
        .then((res) => {
          if (res.data?.success && res.data.order) {
            setOrder(res.data.order);
          }
        })
        .catch(() => { });
    };

    const handleVisibilityRevalidate = () => {
      if (document.visibilityState === 'visible') {
        const targetId = (orderIdInput || effectiveId || order?.orderId || '').trim();
        if (targetId) {
          api.get(`/orders/track/${targetId}`)
            .then((res) => {
              if (res.data?.success && res.data.order) {
                setOrder(res.data.order);
              }
            })
            .catch(() => { });
        }
      }
    };

    window.addEventListener('novise:order-updated', handleLiveOrderUpdate);
    document.addEventListener('visibilitychange', handleVisibilityRevalidate);
    window.addEventListener('focus', handleVisibilityRevalidate);

    return () => {
      window.removeEventListener('novise:order-updated', handleLiveOrderUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityRevalidate);
      window.removeEventListener('focus', handleVisibilityRevalidate);
    };
  }, [orderIdInput, effectiveId, order?.orderId, order?._id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(orderIdInput);
  };

  const copyAwbToClipboard = (awb: string) => {
    if (!awb) return;
    navigator.clipboard.writeText(awb);
    setHasCopiedAwb(true);
    toast.success(`AWB Tracking Code "${awb}" copied!`, 'Copied to Clipboard');
    setTimeout(() => setHasCopiedAwb(false), 2500);
  };

  const handleDownloadInvoice = (orderId: string) => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    window.open(`${apiBase}/orders/${orderId}/invoice`, '_blank');
  };

  const statusSteps = [
    { key: 'PLACED', label: 'Order Placed', desc: 'Received & verified' },
    { key: 'CONFIRMED', label: 'Confirmed', desc: 'Approved by dispatch' },
    { key: 'PACKED', label: 'Packed', desc: 'Sealed with invoice' },
    { key: 'SHIPMENT_BOOKED', label: 'Courier Assigned', desc: 'AWB allocated' },
    { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Moving between hubs' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'With local driver' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Handed over safely' }
  ];

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    const sequence = ['PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPMENT_BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentIdx = sequence.indexOf(currentStatus);
    const stepIdx = sequence.indexOf(stepKey);

    if (currentStatus === 'CANCELLED') return 'cancelled';
    if (currentIdx >= stepIdx) return 'completed';
    if (currentIdx === stepIdx - 1) return 'active';
    return 'pending';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLACED':
      case 'CONFIRMED':
        return 'bg-blue-50 text-blue-900 border-blue-200';
      case 'PACKED':
      case 'SHIPMENT_BOOKED':
        return 'bg-indigo-50 text-indigo-900 border-indigo-200';
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return 'bg-amber-50 text-amber-900 border-amber-300';
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-900 border-emerald-300';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-900 border-rose-300';
      case 'CANCELLATION_REQUESTED':
        return 'bg-orange-50 text-orange-900 border-orange-300';
      case 'RTO_INITIATED':
      case 'IN_TRANSIT_TO_SELLER':
      case 'RTO_IN_TRANSIT':
      case 'RETURNED_TO_SELLER':
      case 'RTO_COMPLETED':
      case 'RTO':
        return 'bg-orange-50 text-orange-900 border-orange-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="py-6 sm:py-14 w-full px-3.5 sm:px-6 lg:px-10 space-y-6 sm:space-y-10">

      {/* Editorial Header Banner matching PolicyPage & About Us */}
      <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-3">
        <div className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-forest-900 bg-forest-900/10 border border-forest-900/20 px-3.5 py-1 rounded-full shadow-xs">
          <Truck className="w-3.5 h-3.5 text-forest-800" />
          <span>Shiprocket Courier Network • Live Dispatch Telemetry</span>
        </div>

        <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold text-forest-950">
          Live Shipment & Order Tracking
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          Enter your Order ID (e.g. NOV-2026-01009) to view real-time courier milestones, delivery location, and live transit events.
        </p>
      </div>

      {/* Prominent Search Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-3 sm:p-4 shadow-xs max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Package className="w-4 h-4 text-forest-900 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="Enter Order ID (e.g. NOV-2026-01009)"
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm uppercase font-mono font-bold tracking-wider border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-forest-900 transition"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !orderIdInput.trim()}
            className="px-6 py-3 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-2xl transition shadow-md shadow-forest-900/15 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{isLoading ? 'Searching...' : 'Track Order'}</span>
          </button>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2.5 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ====================================================================
          STATE 1: ORDER FOUND — FULL WIDTH 12-COLUMN DASHBOARD LAYOUT
          ==================================================================== */}
      {order ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start animate-fadeIn">

          {/* ================================================================
              LEFT COLUMN: Order Record, Courier Details & Items (4 cols)
              ================================================================ */}
          <div className="lg:col-span-4 space-y-5">

            {/* Order Identity Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-forest-900 via-gold-500 to-forest-900" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mt-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Order ID</span>
                  <h3 className="font-mono font-extrabold text-forest-950 text-base sm:text-lg">
                    {order.orderId}
                  </h3>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border shadow-2xs ${getStatusBadge(order.orderStatus)}`}>
                  {order.orderStatus.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="py-3 space-y-2.5 text-xs border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Order Date</span>
                  </span>
                  <span className="font-semibold text-slate-800">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center space-x-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Payment</span>
                  </span>
                  {(() => {
                    const isCod = (order.paymentInfo?.method || order.paymentMethod) === 'COD';
                    const isDelivered = order.orderStatus === 'DELIVERED';
                    const isCancelled = ['CANCELLED', 'CANCELLATION_REQUESTED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'].includes(order.orderStatus);
                    let statusLabel: string = order.paymentInfo?.status || order.paymentStatus || (isCod ? 'PENDING' : 'PAID');
                    if (isCod) {
                      if (isCancelled && !isDelivered) statusLabel = 'NOT_APPLICABLE';
                      else if (!isDelivered) statusLabel = 'PENDING (ON DELIVERY)';
                      else statusLabel = 'PAID (CASH COLLECTED)';
                    }
                    return (
                      <span className="font-semibold text-slate-800">
                        {isCod ? 'Cash on Delivery' : (order.paymentInfo?.method || order.paymentMethod || 'Online')} •{' '}
                        <span className={statusLabel.includes('PAID') ? 'text-emerald-700' : 'text-amber-700'}>
                          {statusLabel}
                        </span>
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Destination</span>
                  </span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {order.shippingAddress.city}, {order.shippingAddress.state}
                  </span>
                </div>
              </div>

              {/* Courier & AWB Code */}
              <div className="pt-3.5 space-y-2">
                <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-slate-200/70 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Courier Partner</span>
                    <span className="font-bold text-forest-950 flex items-center space-x-1">
                      <Truck className="w-3.5 h-3.5 text-forest-900" />
                      <span>{order.shipment?.courierName || 'Shiprocket Express'}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">AWB Tracking</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-extrabold text-forest-900 text-xs">
                        {order.shipment?.awbCode || 'Pending Assignment'}
                      </span>
                      {order.shipment?.awbCode && (
                        <button
                          type="button"
                          onClick={() => copyAwbToClipboard(order.shipment?.awbCode || '')}
                          className="p-1 text-slate-400 hover:text-forest-950 hover:bg-slate-200/60 rounded-md transition"
                          title="Copy AWB Code"
                        >
                          {hasCopiedAwb ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delivery Address Pill */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-600 space-y-0.5">
                  <span className="font-bold text-slate-800 block">{order.shippingAddress.fullName}</span>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {order.shippingAddress.addressLine1}
                    {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
                    {order.shippingAddress.landmark ? ` (Near ${order.shippingAddress.landmark})` : ''}
                    , {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(order.orderId)}
                  className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('my-orders')}
                  className="flex-1 py-2 px-3 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>My Orders</span>
                </button>
              </div>
            </div>

            {/* Items in this Parcel Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-sm text-forest-950">Items in this Parcel</h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {order.items.length} {order.items.length === 1 ? 'Product' : 'Products'}
                </span>
              </div>

              <div className="divide-y divide-slate-100 space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {item.image ? (
                        <img
                          src={getFullImageUrl(item.image)}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-xl bg-amber-50/40 border border-slate-200/80 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-forest-900/5 flex items-center justify-center text-forest-900 shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate">{item.name}</span>
                        <span className="text-[11px] text-slate-400">Qty: {item.quantity} × ₹{item.price}</span>
                      </div>
                    </div>
                    <span className="font-serif font-bold text-forest-950 shrink-0">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">
                  {(order.paymentInfo?.method || order.paymentMethod) === 'COD' && order.orderStatus !== 'DELIVERED'
                    ? 'To Pay on Delivery (COD)'
                    : 'Total Paid (Taxes incl.)'}
                </span>
                <span className="font-serif font-black text-forest-950 text-base">
                  ₹{order.pricing?.totalAmount || order.pricing?.finalTotal || 0}
                </span>
              </div>
            </div>
          </div>

          {/* ================================================================
              RIGHT COLUMN: Milestones & Real-Time Tracking Telemetry (8 cols)
              ================================================================ */}
          <div className="lg:col-span-8 space-y-6">

            {/* Status Workflow Notice Banners */}
            {order.orderStatus === 'CANCELLED' && (
              <div className="p-4 sm:p-5 rounded-3xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5 shadow-xs">
                <div className="flex items-center space-x-2 font-bold text-sm text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Order Cancelled</span>
                </div>
                <p className="leading-relaxed">
                  Reason: <strong>{order.cancellation?.reason || 'Cancelled'}</strong>
                  {order.cancellation?.description ? ` (${order.cancellation.description})` : ''}.
                </p>
                {order.refundInfo?.status && order.refundInfo.status !== 'NONE' && (
                  <p className="font-bold text-rose-950 pt-1">
                    Refund Status: <span className="underline">{order.refundInfo.status.replace(/_/g, ' ')}</span> (₹{order.refundInfo.amount})
                  </p>
                )}
              </div>
            )}

            {order.orderStatus === 'CANCELLATION_REQUESTED' && (
              <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 shadow-xs">
                <div className="flex items-center space-x-2 font-bold text-sm text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Cancellation Under Review</span>
                </div>
                <p className="leading-relaxed">
                  Reason: <strong>{order.cancellation?.reason || 'Cancellation requested'}</strong>. Our fulfillment team is reviewing your cancellation request before courier pickup.
                </p>
              </div>
            )}

            {order.complaint?.hasComplaint && (
              <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2 shadow-xs">
                <div className="flex items-center justify-between font-bold text-sm">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Issue Claim: {order.complaint.reason}</span>
                  </div>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {order.complaint.status}
                  </span>
                </div>
                <p className="text-amber-800">"{order.complaint.description}"</p>
                {order.complaint.status === 'RESOLVED' && (
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-emerald-900 font-semibold">
                    Resolution: <strong>{order.complaint.resolutionType}</strong> — {order.complaint.resolutionNotes || 'Processed'}
                  </div>
                )}
              </div>
            )}

            {['RTO_INITIATED', 'IN_TRANSIT_TO_SELLER', 'RTO_IN_TRANSIT', 'RETURNED_TO_SELLER', 'RTO_COMPLETED', 'RTO'].includes(order.orderStatus) && (
              <div className="p-4 sm:p-5 rounded-3xl bg-orange-50 border border-orange-200 text-xs text-orange-950 space-y-1.5 shadow-xs">
                <div className="flex items-center space-x-2 font-bold text-sm text-orange-900">
                  <RotateCcw className="w-4 h-4 text-orange-700 shrink-0" />
                  <span>Return to Origin (RTO): {order.orderStatus.replace(/_/g, ' ')}</span>
                </div>
                <p className="leading-relaxed">
                  Delivery could not be completed or was refused at doorstep. The sealed package is securely returning to the Novise warehouse hub.
                </p>
                {order.refundInfo?.status && order.refundInfo.status !== 'NOT_APPLICABLE' && (
                  <p className="font-bold text-emerald-800 pt-1">
                    Refund Status: {order.refundInfo.status.replace(/_/g, ' ')} (₹{order.refundInfo.amount})
                  </p>
                )}
              </div>
            )}

            {/* Visual Milestone Stepper Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-serif font-bold text-base text-forest-950">
                  Milestone Progress
                </h3>
                <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live 0ms Telemetry</span>
                </span>
              </div>

              {/* 7-Step Milestones */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {statusSteps.map((step, idx) => {
                  const state = getStepStatus(step.key, order.orderStatus);
                  const isCompleted = state === 'completed';
                  const isActive = state === 'active';

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${isCompleted
                        ? 'bg-emerald-50/50 border-emerald-200/90 text-emerald-950 shadow-2xs'
                        : isActive
                          ? 'bg-amber-50/70 border-amber-300 text-amber-950 shadow-sm ring-2 ring-amber-300/50'
                          : 'bg-slate-50/60 border-slate-200/60 text-slate-400'
                        }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 font-bold text-xs transition-all ${isCompleted
                          ? 'bg-forest-900 text-gold-400 shadow-xs'
                          : isActive
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-slate-200 text-slate-500'
                          }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`text-xs font-bold leading-tight ${isCompleted || isActive ? 'text-forest-950' : 'text-slate-500'}`}>
                        {step.label}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                        {step.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Real-Time Tracking Events Timeline */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-serif font-bold text-base text-forest-950">
                  Real-Time Tracking Events
                </h3>
                <span className="text-xs text-slate-400 font-medium">Chronological Movement</span>
              </div>

              <div className="space-y-5 border-l-2 border-forest-900/20 ml-3 pl-5 py-1">
                {((order.trackingTimeline && order.trackingTimeline.length > 0)
                  ? order.trackingTimeline
                  : (order.timeline || []).map((t: any) => ({
                    title: t.title,
                    description: t.description,
                    timestamp: t.timestamp || t.createdAt,
                    updatedBy: t.author || 'SYSTEM',
                    location: t.location || ''
                  }))
                ).length > 0 ? (
                  ((order.trackingTimeline && order.trackingTimeline.length > 0)
                    ? order.trackingTimeline
                    : (order.timeline || []).map((t: any) => ({
                      title: t.title,
                      description: t.description,
                      timestamp: t.timestamp || t.createdAt,
                      updatedBy: t.author || 'SYSTEM',
                      location: t.location || ''
                    }))
                  ).map((item, i) => (
                    <div key={i} className="relative space-y-1">
                      <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-forest-900 border-2 border-white shadow-2xs" />
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs sm:text-sm font-bold text-forest-950">{item.title}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono font-bold">
                          {item.updatedBy}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                      )}
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-0.5">
                        <span>{new Date(item.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        {item.location && <span>&bull; Location: <strong className="text-slate-600">{item.location}</strong></span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    Your order is confirmed and scheduled for express dispatch. Tracking events will appear here once picked up by Shiprocket.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* ====================================================================
            STATE 2: NO ORDER SEARCHED YET — FULL WIDTH ASSURANCE CARDS
            ==================================================================== */
        <div className="space-y-6 sm:space-y-8 animate-fadeIn">

          {/* 3 Full-Width Dispatch & Delivery Assurance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-forest-900/10 text-forest-900 flex items-center justify-center font-bold">
                <Truck className="w-6 h-6 text-forest-900" />
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-forest-950">
                24-Hour Express Dispatch
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Handcrafted botanical batches are packaged and handed over to premier express couriers within 24 working hours.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6 text-amber-700" />
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-forest-950">
                Tamper-Proof & Sealed
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Every bottle features multi-layer tamper-evident induction seals, leak-proof caps, and protective luxury boxes.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-800 flex items-center justify-center font-bold">
                <Sparkles className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-forest-950">
                Live Courier Telemetry
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automated status updates synchronize directly from Shiprocket national hub networks to your smartphone.
              </p>
            </div>

          </div>

          {/* Quick Shortcuts Banner */}
          <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-serif font-bold text-lg sm:text-xl text-gold-300">
                Already have a customer account?
              </h3>
              <p className="text-xs text-slate-300">
                View all your active deliveries, download tax invoices, and track shipments in one unified dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('my-orders')}
              className="px-6 py-3.5 bg-gold-500 hover:bg-gold-400 text-forest-950 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition shadow-md flex items-center space-x-2 shrink-0"
            >
              <span>View My Orders</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
