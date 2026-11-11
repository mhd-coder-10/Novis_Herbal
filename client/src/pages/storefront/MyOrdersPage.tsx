import React, { useEffect, useState, useMemo } from 'react';
import { Order } from '../../types';
import api, { getFullImageUrl, getFallbackProductImage } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { appConfig } from '../../config/appConfig';
import { sanitizePhoneNumber, isValidIndianPhone, handlePhoneKeyDown } from '../../utils/phoneValidation';
import {
  Package,
  MapPin,
  Printer,
  AlertCircle,
  X,
  RotateCcw,
  Clock,
  Upload,
  CreditCard,
  ShieldAlert,
  Loader2,
  Calendar,
  CheckCircle2,
  Truck,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  Sparkles,
  ShoppingBag,
  User as UserIcon,
  ShieldCheck,
  ChevronRight,
  Heart,
  Video,
  Play,
  Film,
  Phone,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { toast } from '../../store/useToastStore';
import { StoreSelect } from '../../components/common/StoreSelect';

interface MyOrdersProps {
  onNavigate: (page: string, param?: string) => void;
}

export const MyOrdersPage: React.FC<MyOrdersProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const { items: wishlistItems } = useWishlistStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Ordered by Mistake');
  const [cancelDescription, setCancelDescription] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Exceptional Complaint Modal (Non-Returnable Products: Damaged, Defective, Wrong Product, Leakage)
  const [complaintModalOrder, setComplaintModalOrder] = useState<Order | null>(null);
  const [complaintReason, setComplaintReason] = useState('Damaged Product');
  const [customerPhone, setCustomerPhone] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintVideo, setComplaintVideo] = useState<{ url: string; publicId: string; duration?: number } | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoError, setVideoError] = useState('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Second ticker for live damage report countdown window
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to calculate time remaining in the damage report window (Default 2 hrs, dynamic from Store Settings)
  const getDamageReportRemaining = (order: Order) => {
    const windowHours = appConfig.orderSettings.damagedReportWindowHours || 2;
    const windowMs = windowHours * 60 * 60 * 1000;
    const deliveredAt = order.shipment?.deliveredAt || order.updatedAt || order.createdAt;
    const expiryTimestamp = new Date(deliveredAt).getTime() + windowMs;
    const remainingMs = expiryTimestamp - currentTime;

    if (remainingMs <= 0) {
      return { isExpired: true, text: 'Window Closed', remainingMs: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');

    return {
      isExpired: false,
      text: `${hours > 0 ? `${pad(hours)}h ` : ''}${pad(minutes)}m ${pad(seconds)}s`,
      remainingMs,
      hours,
      minutes,
      seconds
    };
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/my-orders');
      if (res.data?.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch user orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleLiveOrderUpdate = () => {
      fetchOrders();
    };

    const handleVisibilityRevalidate = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
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
  }, []);

  // Filter calculations
  const activeCount = useMemo(() =>
    orders.filter(o => ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPMENT_BOOKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'CANCELLATION_REQUESTED'].includes(o.orderStatus)).length
    , [orders]);

  const deliveredCount = useMemo(() =>
    orders.filter(o => o.orderStatus === 'DELIVERED').length
    , [orders]);

  const cancelledCount = useMemo(() =>
    orders.filter(o => ['CANCELLED', 'RTO_INITIATED', 'IN_TRANSIT_TO_SELLER', 'RTO_IN_TRANSIT', 'RETURNED_TO_SELLER', 'RTO_COMPLETED', 'RTO'].includes(o.orderStatus)).length
    , [orders]);

  const totalSpent = useMemo(() =>
    orders
      .filter(o => o.orderStatus !== 'CANCELLED' && (
        (o.paymentInfo?.method === 'ONLINE' && o.paymentInfo?.status === 'PAID') ||
        (o.paymentInfo?.method === 'COD' && o.orderStatus === 'DELIVERED') ||
        (!o.paymentInfo?.method && o.orderStatus === 'DELIVERED')
      ))
      .reduce((sum, o) => sum + (o.pricing?.totalAmount || o.pricing?.finalTotal || 0), 0)
    , [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Tab filter
      if (statusFilter === 'active') {
        if (!['PLACED', 'CONFIRMED', 'PACKED', 'SHIPMENT_BOOKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'CANCELLATION_REQUESTED'].includes(order.orderStatus)) {
          return false;
        }
      } else if (statusFilter === 'delivered') {
        if (order.orderStatus !== 'DELIVERED') return false;
      } else if (statusFilter === 'cancelled') {
        if (!['CANCELLED', 'RTO_INITIATED', 'IN_TRANSIT_TO_SELLER', 'RTO_IN_TRANSIT', 'RETURNED_TO_SELLER', 'RTO_COMPLETED', 'RTO'].includes(order.orderStatus)) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = order.orderId?.toLowerCase().includes(query);
        const matchesItem = order.items?.some(item => item.name?.toLowerCase().includes(query));
        if (!matchesId && !matchesItem) return false;
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // Fallback user display
  const displayName = user?.name || orders[0]?.customerDetails?.fullName || 'Valued Customer';
  const displayEmail = user?.email || orders[0]?.customerDetails?.email || '';

  // Open Cancel Modal
  const openCancelModal = (order: Order) => {
    setCancelModalOrder(order);
    setCancelReason('Ordered by Mistake');
    setCancelDescription('');
  };

  // Submit Cancellation
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;
    if (cancelReason === 'Other' && !cancelDescription.trim()) {
      toast.error('Please specify a description for "Other" reason');
      return;
    }

    setIsSubmittingCancel(true);
    try {
      const res = await api.post(`/orders/${cancelModalOrder.orderId || cancelModalOrder._id}/cancel`, {
        reason: cancelReason,
        description: cancelDescription.trim()
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Cancellation processed successfully!');
        setCancelModalOrder(null);
        fetchOrders();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process cancellation');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Open Complaint Page
  const openComplaintModal = (order: Order) => {
    const timeStatus = getDamageReportRemaining(order);
    if (timeStatus.isExpired) {
      toast.error(`Damage report window of ${appConfig.orderSettings.damagedReportWindowHours || 2} hours has expired for this delivery.`, 'Window Closed');
      return;
    }
    setComplaintModalOrder(order);
    setComplaintReason('Damaged Product');
    setCustomerPhone(order.customerDetails?.phone || user?.phone || '');
    setComplaintDescription('');
    setComplaintVideo(null);
    setVideoError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatVideoDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  // Upload Video Proof (Mandatory: 1 Video, dynamic max duration from Store Settings)
  const handleProofVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoError('');

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file (mp4, webm, mov, etc.)', 'Invalid Format');
      setVideoError('File must be a video format.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video file size must be less than 100MB', 'File Too Large');
      setVideoError('Video file exceeds 100MB limit.');
      return;
    }

    // Inspect video duration in browser
    const videoElem = document.createElement('video');
    videoElem.preload = 'metadata';
    const tempUrl = URL.createObjectURL(file);
    videoElem.src = tempUrl;

    videoElem.onloadedmetadata = async () => {
      URL.revokeObjectURL(tempUrl);
      const duration = videoElem.duration;
      const maxMins = appConfig.orderSettings.maxReportVideoMinutes || 3;
      const maxSecondsWithBuffer = maxMins * 60 + 15; // e.g. 3 mins + 15s grace buffer (195s)

      if (duration > maxSecondsWithBuffer) {
        toast.error(`Video duration is ${formatVideoDuration(duration)}. Maximum allowed is ${maxMins} minutes.`, 'Video Too Long');
        setVideoError(`Video duration is ${formatVideoDuration(duration)}. Please upload a video up to ${maxMins} minutes.`);
        return;
      }

      setIsUploadingVideo(true);
      setVideoUploadProgress(10);
      const formData = new FormData();
      formData.append('video', file);
      if (complaintModalOrder) {
        formData.append('orderId', complaintModalOrder.orderId || complaintModalOrder._id);
      }

      try {
        const res = await api.post('/upload/complaint-video', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const p = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setVideoUploadProgress(p);
            }
          }
        });

        if (res.data?.success && res.data.videoUrl) {
          setComplaintVideo({
            url: res.data.videoUrl,
            publicId: res.data.publicId,
            duration: res.data.duration || duration
          });
          toast.success('Video proof uploaded successfully!', 'Video Attached');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to upload video proof. Please try again.', 'Upload Failed');
        setVideoError(err.response?.data?.message || 'Video upload failed.');
      } finally {
        setIsUploadingVideo(false);
      }
    };

    videoElem.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      toast.error('Could not verify video. Please select a valid mp4, mov, or webm video file.', 'Invalid Video');
      setVideoError('Could not read video metadata.');
    };
  };

  const handleRemoveComplaintVideo = async () => {
    if (!complaintVideo) return;
    try {
      if (complaintVideo.publicId) {
        await api.delete('/upload/complaint-video', {
          data: { publicId: complaintVideo.publicId, url: complaintVideo.url }
        });
      }
      setComplaintVideo(null);
      toast.success('Video removed.');
    } catch {
      setComplaintVideo(null);
    }
  };

  // Submit Exceptional Complaint
  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintModalOrder) return;

    // Check timer expiration
    const timeStatus = getDamageReportRemaining(complaintModalOrder);
    if (timeStatus.isExpired) {
      toast.error('The damage report window has expired for this delivered order.', 'Time Limit Exceeded');
      setComplaintModalOrder(null);
      return;
    }

    // Phone validation
    const cleanPhone = sanitizePhoneNumber(customerPhone);
    if (!isValidIndianPhone(cleanPhone)) {
      toast.warning('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.', 'Invalid Phone');
      return;
    }

    // Mandatory video validation
    const maxMins = appConfig.orderSettings.maxReportVideoMinutes || 3;
    if (!complaintVideo?.url) {
      toast.warning(`Unboxing/damage proof video is required (up to ${maxMins} minutes).`, 'Video Proof Required');
      setVideoError(`Please attach 1 video proof (up to ${maxMins} minutes) to submit this report.`);
      return;
    }

    if (complaintReason === 'Other' && !complaintDescription.trim()) {
      toast.error('Please specify a description for "Other" reason');
      return;
    }

    setIsSubmittingComplaint(true);
    try {
      const res = await api.post(`/orders/${complaintModalOrder.orderId || complaintModalOrder._id}/complaint`, {
        reason: complaintReason,
        customerPhone: cleanPhone,
        description: complaintDescription.trim(),
        videoUrl: complaintVideo.url,
        videoPublicId: complaintVideo.publicId,
        videoDuration: complaintVideo.duration,
        resolutionPreference: 'REFUND'
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Damage report with video proof submitted successfully!', 'Report Submitted');
        setComplaintModalOrder(null);
        setComplaintVideo(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        fetchOrders();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // Helper format status badge
  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'PLACED':
      case 'CONFIRMED':
        return {
          label: status === 'PLACED' ? 'Order Placed' : 'Order Confirmed',
          badgeClass: 'bg-blue-50 text-blue-900 border-blue-200/90',
          dotClass: 'bg-blue-600',
          icon: CheckCircle2
        };
      case 'PACKED':
      case 'SHIPMENT_BOOKED':
        return {
          label: status === 'PACKED' ? 'Packed & Ready' : 'Shipment Booked',
          badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-200/90',
          dotClass: 'bg-indigo-600',
          icon: Package
        };
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return {
          label: status === 'IN_TRANSIT' ? 'In Transit' : 'Out for Delivery',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
          dotClass: 'bg-amber-600 animate-pulse',
          icon: Truck
        };
      case 'DELIVERED':
        return {
          label: 'Delivered',
          badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
          dotClass: 'bg-emerald-600',
          icon: CheckCircle2
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          badgeClass: 'bg-rose-50 text-rose-900 border-rose-300',
          dotClass: 'bg-rose-600',
          icon: AlertCircle
        };
      case 'CANCELLATION_REQUESTED':
        return {
          label: 'Cancellation Requested',
          badgeClass: 'bg-orange-50 text-orange-900 border-orange-300',
          dotClass: 'bg-orange-600 animate-pulse',
          icon: Clock
        };
      case 'RTO_INITIATED':
      case 'IN_TRANSIT_TO_SELLER':
      case 'RTO_IN_TRANSIT':
      case 'RETURNED_TO_SELLER':
      case 'RTO_COMPLETED':
      case 'RTO':
        return {
          label: 'Return to Origin (RTO)',
          badgeClass: 'bg-orange-50 text-orange-900 border-orange-300',
          dotClass: 'bg-orange-600',
          icon: RotateCcw
        };
      default:
        return {
          label: status.replace(/_/g, ' '),
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
          dotClass: 'bg-slate-500',
          icon: Package
        };
    }
  };

  const handleDownloadInvoice = (orderId: string) => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    window.open(`${apiBase}/orders/${orderId}/invoice`, '_blank');
  };

  // Dedicated Full Page View for Delivery Issue & Damage Report (Full-Width Responsive 12-Col Layout)
  if (complaintModalOrder) {
    return (
      <div className="py-6 sm:py-12 min-h-[85vh] animate-fadeIn">
        {/* Full width container matching ShopPage, WishlistPage & MyOrdersPage */}
        <div className="w-full px-3.5 sm:px-6 lg:px-10 space-y-6 sm:space-y-8">
          {/* Top Bar: Back to Orders & Live Countdown Timer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setComplaintModalOrder(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center space-x-2 text-xs sm:text-sm font-bold text-forest-900 hover:text-forest-950 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl shadow-2xs transition self-start cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Orders</span>
            </button>

            {/* Live Expiration Countdown Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-amber-50 text-amber-950 border border-amber-300 font-mono text-xs font-bold shadow-2xs self-start sm:self-auto">
              <Clock className="w-4 h-4 text-amber-700 animate-pulse" />
              <span>Report Window Closes in: {getDamageReportRemaining(complaintModalOrder).text}</span>
            </div>
          </div>

          {/* Page Heading Banner */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100/70 border border-amber-300 px-3.5 py-1 rounded-full">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              <span>Quality Guarantee & Delivery Issue Claim</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold text-forest-950">
              Report Damaged / Missing Item
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Order <strong className="font-mono text-slate-900 font-bold">#{complaintModalOrder.orderId}</strong> • Placed on {new Date(complaintModalOrder.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          {/* Symmetrical 12-Column Layout matching MyOrdersPage & ProfilePage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* ================================================================
                LEFT COLUMN: Delivered Items, Policy & Direct Support (5 cols)
                ================================================================ */}
            <div className="lg:col-span-5 space-y-5">
              {/* Delivered Package Products Card */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Items in This Delivery</span>
                  <span className="text-slate-500 font-mono text-xs">
                    {(complaintModalOrder.paymentInfo?.method || complaintModalOrder.paymentMethod) === 'COD' && complaintModalOrder.orderStatus !== 'DELIVERED'
                      ? 'Order Total (To Pay on Delivery):'
                      : 'Total Paid:'}{' '}
                    <strong className="text-slate-900 font-bold">₹{complaintModalOrder.pricing?.totalAmount || complaintModalOrder.pricing?.finalTotal}</strong> ({complaintModalOrder.paymentInfo?.method || complaintModalOrder.paymentMethod || 'COD'})
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {complaintModalOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-3.5 py-3 first:pt-1 last:pb-1">
                      <img
                        src={getFullImageUrl(item.image, item.name)}
                        alt={item.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-200 bg-slate-50 shrink-0 shadow-2xs"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getFallbackProductImage(item.name);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{item.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Quantity: <strong className="font-semibold text-slate-800">{item.quantity}</strong> • Unit Price: ₹{item.price}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-forest-950 shrink-0">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification Policy Notice */}
              <div className="p-5 bg-amber-50/80 rounded-3xl border border-amber-200 text-xs text-amber-950 flex items-start space-x-3 shadow-2xs">
                <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-bold text-amber-950 text-xs sm:text-sm">Strict Quality & Video Verification Policy:</strong>
                  <p className="text-amber-900/90 text-xs leading-relaxed">
                    Novise personal care and Ayurvedic formulations are sealed and strictly non-returnable. If your parcel arrived damaged, leaking, defective, or with missing items, you must upload <strong>1 unboxing/condition video proof (up to {appConfig.orderSettings.maxReportVideoMinutes || 3} minutes max)</strong>. Our team will verify the video and directly contact you on WhatsApp / Phone to provide an instant refund or replacement.
                  </p>
                </div>
              </div>

              {/* Direct Support & Easy Resolution Trust Notice */}
              <div className="p-5 bg-emerald-50/90 border border-emerald-200/90 rounded-3xl space-y-1.5 text-xs text-emerald-950 shadow-2xs">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-bold text-emerald-900 text-xs sm:text-sm">Direct Contact & Quick Resolution</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Once you submit this report with video proof, our store owner will directly contact you on your registered number (<strong className="font-mono text-emerald-950 font-bold">+91 {customerPhone || 'provided'}</strong>) via Call or WhatsApp to resolve your issue immediately.
                </p>
              </div>
            </div>

            {/* ================================================================
                RIGHT COLUMN: The Report Form & Video Upload (7 cols)
                ================================================================ */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
                <form onSubmit={handleComplaintSubmit} className="space-y-6">
                  {/* Row 1: Issue Category & Mobile Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <StoreSelect
                        label="Issue Category *"
                        value={complaintReason}
                        onChange={setComplaintReason}
                        options={[
                          { value: 'Damaged Product', label: 'Damaged Product' },
                          { value: 'Defective Product', label: 'Defective Product' },
                          { value: 'Wrong Product Delivered', label: 'Wrong Product Delivered' },
                          { value: 'Missing Product', label: 'Missing Product' },
                          { value: 'Product Leakage / Packaging Damage', label: 'Product Leakage / Packaging Damage' },
                          { value: 'Other', label: 'Other Issue' }
                        ]}
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block text-xs mb-1.5">
                        Mobile Number * <span className="text-slate-400 font-normal">(For owner to contact you)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+91</span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[6-9][0-9]{9}"
                          maxLength={10}
                          required
                          placeholder="9876543210"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(sanitizePhoneNumber(e.target.value))}
                          onKeyDown={handlePhoneKeyDown}
                          className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-1 focus:ring-forest-900 font-mono text-xs text-slate-900 font-bold transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: MANDATORY VIDEO PROOF (1 Video Only, dynamic max length) */}
                  <div className="p-5 bg-gradient-to-br from-amber-50/50 to-orange-50/30 rounded-3xl border-2 border-dashed border-amber-300 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center space-x-2">
                        <Video className="w-4 h-4 text-amber-700 shrink-0" />
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          Attach Video Proof <span className="text-rose-600">* (Mandatory • 1 Video Only • up to {appConfig.orderSettings.maxReportVideoMinutes || 3} mins)</span>
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 self-start sm:self-auto font-mono">
                        Max {appConfig.orderSettings.maxReportVideoMinutes || 3} Minutes
                      </span>
                    </div>

                    {complaintVideo ? (
                      <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:w-60 aspect-video rounded-xl overflow-hidden bg-black shrink-0 border border-slate-200">
                          <video src={complaintVideo.url} controls className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1 space-y-1.5 w-full text-left">
                          <div className="flex items-center space-x-1.5 text-emerald-700 text-xs sm:text-sm font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Video Uploaded Successfully</span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono">
                            {complaintVideo.duration ? `Duration: ~${formatVideoDuration(complaintVideo.duration)}` : 'Video ready for review'}
                          </p>
                          <button
                            type="button"
                            onClick={handleRemoveComplaintVideo}
                            className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-700 text-xs font-bold underline cursor-pointer pt-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Change / Remove Video</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="cursor-pointer block p-6 bg-white hover:bg-amber-50/50 border border-amber-200 rounded-2xl transition text-center group shadow-2xs">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                              {isUploadingVideo ? (
                                <Loader2 className="w-6 h-6 text-amber-700 animate-spin" />
                              ) : (
                                <Video className="w-6 h-6 text-amber-700" />
                              )}
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-slate-800">
                              {isUploadingVideo ? `Uploading Video (${videoUploadProgress}%)... Please wait` : 'Click to Select & Upload 1 Video Proof *'}
                            </div>
                            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                              Record a clear unboxing or damaged bottle video (duration: up to {appConfig.orderSettings.maxReportVideoMinutes || 3} minutes max, up to 100MB)
                            </p>
                          </div>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleProofVideoUpload}
                            disabled={isUploadingVideo}
                            className="hidden"
                          />
                        </label>
                        {isUploadingVideo && (
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                            <div
                              className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(10, videoUploadProgress)}%` }}
                            />
                          </div>
                        )}
                        {videoError && (
                          <p className="text-xs text-rose-600 font-semibold mt-2 flex items-center space-x-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{videoError}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 3: Describe Issue Details */}
                  <div>
                    <label className="font-bold text-slate-800 block text-xs mb-1.5">
                      Describe Issue {complaintReason === 'Other' ? '*' : '(Optional Details)'}
                    </label>
                    <textarea
                      rows={4}
                      required={complaintReason === 'Other'}
                      placeholder="Describe what was damaged, leaking, or missing in your parcel..."
                      value={complaintDescription}
                      onChange={(e) => setComplaintDescription(e.target.value)}
                      className="w-full p-3.5 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-forest-900 text-xs text-slate-900 resize-none transition"
                    />
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-500 self-start sm:self-auto">
                      {!complaintVideo ? (
                        <span className="text-amber-800 font-semibold flex items-center space-x-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>1 Video attachment is required before submitting</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Video proof ready for submission</span>
                        </span>
                      )}
                    </span>

                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setComplaintModalOrder(null);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex-1 sm:flex-initial px-5 py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingComplaint || isUploadingVideo || !complaintVideo}
                        className="flex-1 sm:flex-initial px-7 py-3 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-2xl disabled:opacity-50 flex items-center justify-center space-x-2 transition shadow-md cursor-pointer text-xs disabled:cursor-not-allowed"
                      >
                        {isSubmittingComplaint && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>Submit Damage Report & Video</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-14">
      {/* Full width container matching ShopPage, WishlistPage & ProfilePage */}
      <div className="w-full px-3.5 sm:px-6 lg:px-10 space-y-6 sm:space-y-10">

        {/* Luxury Centered Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-3">
          <div className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-forest-900 bg-forest-900/10 border border-forest-900/20 px-3.5 py-1 rounded-full shadow-xs">
            <Package className="w-3.5 h-3.5 text-forest-800" />
            <span>Order History & Deliveries ({orders.length})</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold text-forest-950">
            My Orders & Shipments
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Track real-time shipments with Shiprocket, download official GST tax invoices, manage delivery requests, or report parcel issues.
          </p>
        </div>

        {/* Symmetrical 12-Column Layout matching ProfilePage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* ================================================================
              LEFT COLUMN: Customer Card, Filter Sidebar & Assurance (4 cols)
              ================================================================ */}
          <div className="lg:col-span-4 space-y-5">

            {/* Customer & Order Stats Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-forest-900 via-gold-500 to-forest-900" />

              {/* Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gradient-to-br from-forest-900 to-forest-800 flex items-center justify-center text-gold-400 font-serif font-black text-2xl sm:text-3xl shadow-md border-4 border-white mx-auto mt-2 mb-3">
                {user?.avatar ? (
                  <img src={getFullImageUrl(user.avatar)} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-serif font-bold text-forest-950 leading-snug">
                {displayName}
              </h2>
              {displayEmail && <p className="text-xs text-slate-500 mt-0.5">{displayEmail}</p>}

              <div className="flex items-center justify-center space-x-2 mt-2.5">
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10.5px] font-bold rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Verified Buyer</span>
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-mono uppercase font-bold">
                  {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>

              {/* Order Stats Grid */}
              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100 text-center">
                <div className="bg-[#FAF8F5] p-2.5 rounded-2xl border border-slate-200/60">
                  <span className="block text-base sm:text-lg font-black text-forest-950">{orders.length}</span>
                  <span className="text-[9.5px] uppercase font-bold text-slate-500">Total Orders</span>
                </div>
                <div className="bg-[#FAF8F5] p-2.5 rounded-2xl border border-slate-200/60">
                  <span className="block text-base sm:text-lg font-black text-amber-600">{activeCount}</span>
                  <span className="text-[9.5px] uppercase font-bold text-slate-500">In Transit</span>
                </div>
                <div className="bg-[#FAF8F5] p-2.5 rounded-2xl border border-slate-200/60">
                  <span className="block text-base sm:text-lg font-black text-emerald-700">₹{totalSpent}</span>
                  <span className="text-[9.5px] uppercase font-bold text-slate-500">Total Paid</span>
                </div>
              </div>
            </div>

            {/* Filter Navigation Panel (Vertical list matching ProfilePage) */}
            <div className="bg-white rounded-3xl p-3.5 border border-slate-200/80 shadow-xs space-y-1.5">
              <div className="px-3 pt-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Filter Orders by Status
              </div>

              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition ${statusFilter === 'all'
                  ? 'bg-forest-900 text-gold-400 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <Package className="w-4 h-4" />
                  <span>All Orders</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${statusFilter === 'all' ? 'bg-gold-400/20 text-gold-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {orders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition ${statusFilter === 'active'
                  ? 'bg-forest-900 text-gold-400 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <Truck className="w-4 h-4" />
                  <span>Active & In Transit</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${statusFilter === 'active' ? 'bg-gold-400/20 text-gold-300' : 'bg-amber-100 text-amber-900'
                  }`}>
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('delivered')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition ${statusFilter === 'delivered'
                  ? 'bg-forest-900 text-gold-400 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Delivered Orders</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${statusFilter === 'delivered' ? 'bg-gold-400/20 text-gold-300' : 'bg-emerald-100 text-emerald-900'
                  }`}>
                  {deliveredCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('cancelled')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition ${statusFilter === 'cancelled'
                  ? 'bg-forest-900 text-gold-400 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-4 h-4" />
                  <span>Cancelled & RTO</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${statusFilter === 'cancelled' ? 'bg-gold-400/20 text-gold-300' : 'bg-rose-100 text-rose-900'
                  }`}>
                  {cancelledCount}
                </span>
              </button>
            </div>
          </div>

          {/* ================================================================
              RIGHT COLUMN: Search Bar & Orders Feed (8 cols)
              ================================================================ */}
          <div className="lg:col-span-8 space-y-5">

            {/* Search & Active Filter Bar */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">
                  Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
                {statusFilter !== 'all' && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-forest-900/10 text-forest-900 border border-forest-900/20 capitalize">
                    {statusFilter}
                  </span>
                )}
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-72 shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order ID or item..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-forest-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Orders Feed */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-white h-56 rounded-3xl border border-slate-200/80 shadow-xs" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              /* Empty State matching WishlistPage */
              <div className="py-16 sm:py-24 text-center bg-white rounded-3xl border border-slate-200/80 p-8 space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-forest-50 text-forest-900 flex items-center justify-center mx-auto shadow-inner">
                  <Package className="w-8 h-8" />
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                  No Orders Placed Yet
                </h2>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Explore our 100% pure botanical hair restore oil and revitalizing herbal shampoo. Place your first order to track it here!
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('shop')}
                    className="px-6 py-3.5 bg-forest-900 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-forest-800 transition shadow-md shadow-forest-900/10 inline-flex items-center space-x-2"
                  >
                    <span>Discover All Products</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3 shadow-xs">
                <Filter className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-serif text-lg font-bold text-slate-800">No Orders Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No orders matched your selected filter or search term. Try resetting your filter to see all orders.
                </p>
                <button
                  onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              /* Orders List */
              <div className="space-y-5">
                {filteredOrders.map((order) => {
                  const isDelivered = order.orderStatus === 'DELIVERED';
                  const canDirectCancel = ['PLACED', 'CONFIRMED'].includes(order.orderStatus);
                  const allowCancelAfterPacking = appConfig.orderSettings.allowCancellationAfterPacking !== false;
                  const canRequestCancel = allowCancelAfterPacking && ['PACKED', 'SHIPMENT_BOOKED'].includes(order.orderStatus);
                  const isPendingApprovalCancel = order.orderStatus === 'CANCELLATION_REQUESTED';
                  const isInTransit = ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(order.orderStatus);
                  const statusMeta = getStatusMeta(order.orderStatus);

                  const totalDisplay = order.pricing?.totalAmount || order.pricing?.finalTotal || 0;
                  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <div
                      key={order._id}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
                    >
                      {/* Card Top Strip */}
                      <div className="bg-gradient-to-r from-slate-50/90 via-emerald-50/20 to-slate-50/90 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center space-x-3 sm:space-x-4 flex-wrap gap-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Order</span>
                            <span className="font-mono font-extrabold text-forest-950 text-sm sm:text-base">
                              {order.orderId}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formattedDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          {/* Status Badge */}
                          <span className={`inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border shadow-2xs ${statusMeta.badgeClass}`}>
                            <span className={`w-2 h-2 rounded-full ${statusMeta.dotClass}`} />
                            <span>{statusMeta.label}</span>
                          </span>

                          {/* Payment Pill */}
                          <span className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 px-2.5 py-1 rounded-full shadow-2xs">
                            <CreditCard className="w-3 h-3 text-forest-900" />
                            <span>{order.paymentInfo?.method || order.paymentMethod || 'Online'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Items Content */}
                      <div className="p-4 sm:p-6 space-y-4">
                        <div className="divide-y divide-slate-100 space-y-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                              <div className="flex items-center space-x-3.5 sm:space-x-4 min-w-0">
                                {item.image ? (
                                  <img
                                    src={getFullImageUrl(item.image, item.name)}
                                    alt={item.name}
                                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-2xl bg-amber-50/40 border border-slate-200/80 shadow-2xs shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = getFallbackProductImage(item.name);
                                    }}
                                  />
                                ) : (
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-forest-900/5 border border-forest-900/10 flex items-center justify-center shrink-0 text-forest-900">
                                    <Package className="w-7 h-7" />
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <h4 className="font-serif font-bold text-forest-950 text-sm sm:text-base leading-snug truncate">
                                    {item.name}
                                  </h4>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Quantity: <span className="font-semibold text-slate-700">{item.quantity}</span> • Unit Price: <span className="font-semibold text-slate-700">₹{item.price}</span>
                                  </p>
                                  {item.sku && (
                                    <span className="inline-block mt-1 text-[10px] font-mono font-medium text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                                      SKU: {item.sku}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-serif font-black text-forest-950 text-sm sm:text-base block">
                                  ₹{item.price * item.quantity}
                                </span>
                                <span className="text-[10px] text-slate-400">Total</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Status Guidance Banners */}
                        {isPendingApprovalCancel && (
                          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start space-x-2.5">
                            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold">Cancellation Request Under Review: </strong>
                              You requested cancellation (Reason: {order.cancellation?.reason || 'Order cancellation'}). Our support team is reviewing the request since your order was already packed or booked with courier.
                            </div>
                          </div>
                        )}

                        {order.orderStatus === 'CANCELLED' && (
                          <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 flex items-start space-x-2.5">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold">Order Cancelled: </strong>
                              Reason: {order.cancellation?.reason || 'Cancelled'}.
                              {order.refundInfo?.status && order.refundInfo.status !== 'NONE' && (
                                <span className="ml-1 text-rose-950 font-semibold">
                                  Refund Status: <strong>{order.refundInfo.status.replace(/_/g, ' ')}</strong> (₹{order.refundInfo.amount})
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* RTO Status Banner */}
                        {['RTO_INITIATED', 'IN_TRANSIT_TO_SELLER', 'RTO_IN_TRANSIT', 'RETURNED_TO_SELLER', 'RTO_COMPLETED', 'RTO'].includes(order.orderStatus) && (
                          <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 text-xs text-orange-950 space-y-1">
                            <div className="flex items-center space-x-2 font-bold text-orange-900">
                              <RotateCcw className="w-4 h-4 text-orange-700" />
                              <span>Return to Origin (RTO): {order.orderStatus.replace(/_/g, ' ')}</span>
                            </div>
                            <p className="text-orange-900/90">
                              Reason: <strong className="font-semibold">{order.rtoDetails?.reason || 'Delivery refused or unreachable'}</strong>. Parcel is returning to the seller.
                            </p>
                            {order.refundInfo?.status && order.refundInfo.status !== 'NOT_APPLICABLE' && (
                              <p className="text-[11px] text-emerald-800 font-bold pt-1">
                                Refund Status: {order.refundInfo.status.replace(/_/g, ' ')} (₹{order.refundInfo.amount})
                              </p>
                            )}
                          </div>
                        )}

                        {/* Exceptional Complaint Banner if Submitted */}
                        {order.complaint?.hasComplaint && (
                          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-xs text-amber-950 space-y-2">
                            <div className="flex items-center justify-between font-bold">
                              <div className="flex items-center space-x-2">
                                <ShieldAlert className="w-4 h-4 text-amber-700" />
                                <span>Issue Claim: {order.complaint?.reason}</span>
                              </div>
                              <span className="text-[10px] bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                {order.complaint?.status || 'SUBMITTED'}
                              </span>
                            </div>
                            <p className="text-amber-900">
                              Description: "{order.complaint?.description || 'Damaged/Defective item reported'}"
                            </p>
                            {order.complaint.customerPhone && (
                              <p className="text-[11px] text-slate-600 font-mono">
                                Registered Mobile: <strong>+91 {order.complaint.customerPhone}</strong>
                              </p>
                            )}
                            {order.complaint.videoDeletedByAdmin ? (
                              <div className="flex items-center space-x-2 pt-1 text-xs">
                                <div className="flex items-center space-x-1.5 px-3 py-1 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 font-bold">
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Video Proof: Deleted by Admin</span>
                                </div>
                              </div>
                            ) : order.complaint.videoUrl ? (
                              <div className="flex items-center space-x-2 pt-1 text-xs">
                                <div className="flex items-center space-x-1 px-2.5 py-1 bg-white rounded-lg border border-amber-200 text-amber-900 font-bold">
                                  <Video className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Video Proof Uploaded</span>
                                  <span className="text-[10px] text-slate-400 font-mono">(Order_Report_Videos)</span>
                                </div>
                                <a
                                  href={order.complaint.videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-amber-800 text-gold-300 rounded-lg text-xs font-bold hover:bg-amber-900 transition flex items-center space-x-1"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Play Video</span>
                                </a>
                              </div>
                            ) : null}
                            {order.complaint?.status === 'RESOLVED' && (
                              <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-emerald-900 font-semibold">
                                Resolution: <strong>{order.complaint.resolutionType}</strong> — {order.complaint.resolutionNotes || 'Processed by store administrator.'}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Non-Returnable Policy Banner for Delivered orders */}
                        {isDelivered && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs p-3.5 rounded-2xl bg-[#FDFBF7] border border-amber-200/80">
                            <div className="flex items-center space-x-2">
                              <ShieldAlert className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span className="text-slate-700">
                                Policy: <strong className="text-forest-950">Non-Returnable Product</strong> (100% Authentic, Pure & Sealed)
                              </span>
                            </div>
                            {!order.complaint?.hasComplaint && (() => {
                              const reportStatus = getDamageReportRemaining(order);
                              if (reportStatus.isExpired) {
                                return (
                                  <span className="text-slate-400 font-medium text-[11px] flex items-center space-x-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Reporting window closed ({appConfig.orderSettings.damagedReportWindowHours || 2}h limit reached)</span>
                                  </span>
                                );
                              }
                              return (
                                <div className="flex items-center space-x-2">
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono text-[11px] font-bold border border-amber-300">
                                    <Clock className="w-3 h-3 text-amber-700 animate-pulse" />
                                    <span>Window: {reportStatus.text}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openComplaintModal(order)}
                                    className="text-amber-900 hover:text-amber-950 font-bold text-xs underline cursor-pointer"
                                  >
                                    Report Damaged / Missing Item?
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Courier In-Transit Refusal Notice */}
                        {isInTransit && (
                          <p className="text-[11px] text-slate-500 italic bg-[#FAF8F5] p-2.5 rounded-xl border border-slate-200/60">
                            Notice: Order is in transit with Shiprocket express courier. It cannot be cancelled directly. If you no longer wish to receive it, you may refuse delivery at your doorstep, and it will follow the automated RTO process.
                          </p>
                        )}
                      </div>

                      {/* Card Footer Bar */}
                      <div className="bg-slate-50/70 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="text-xs text-slate-500 font-medium">
                            {(order.paymentInfo?.method || order.paymentMethod) === 'COD' && order.orderStatus !== 'DELIVERED'
                              ? 'To Pay on Delivery (COD)'
                              : 'Total Paid'}
                          </div>
                          <div className="font-serif font-black text-forest-950 text-base sm:text-lg">
                            ₹{totalDisplay}
                            <span className="text-[10px] font-sans font-normal text-slate-400 ml-1.5">(Taxes & shipping included)</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                          {/* Cancellation Buttons */}
                          {canDirectCancel && (
                            <button
                              type="button"
                              onClick={() => openCancelModal(order)}
                              className="px-3.5 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl transition shadow-2xs"
                            >
                              Cancel Order
                            </button>
                          )}

                          {canRequestCancel && (
                            <button
                              type="button"
                              onClick={() => openCancelModal(order)}
                              className="px-3.5 py-2 border border-orange-300 text-orange-700 hover:bg-orange-50 font-bold text-xs rounded-xl transition shadow-2xs"
                            >
                              Request Cancellation
                            </button>
                          )}

                          {['PACKED', 'SHIPMENT_BOOKED'].includes(order.orderStatus) && !allowCancelAfterPacking && (
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 font-semibold text-[11px] rounded-xl border border-slate-200/80">
                              Packed for Courier (Cancellation Closed)
                            </span>
                          )}

                          {/* Report Issue / Damage Button for Delivered Orders with Live Timer */}
                          {isDelivered && !order.complaint?.hasComplaint && (() => {
                            const reportStatus = getDamageReportRemaining(order);
                            if (reportStatus.isExpired) {
                              return (
                                <span className="px-3 py-1.5 bg-slate-100 text-slate-400 font-medium text-[11px] rounded-xl border border-slate-200">
                                  Report Window Closed ({appConfig.orderSettings.damagedReportWindowHours || 2}h)
                                </span>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => openComplaintModal(order)}
                                className="px-3.5 py-2 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-950 border border-amber-300 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-2xs group cursor-pointer"
                              >
                                <Video className="w-3.5 h-3.5 text-amber-700 group-hover:scale-110 transition" />
                                <span>Report Damage (Video)</span>
                                <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded text-[10px] font-mono font-black ml-1">
                                  {reportStatus.text}
                                </span>
                              </button>
                            );
                          })()}

                          {/* Download Official Invoice */}
                          <button
                            type="button"
                            onClick={() => handleDownloadInvoice(order.orderId)}
                            className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
                            title="Download GST Tax Invoice PDF"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                            <span>Invoice</span>
                          </button>

                          {/* Track Shipment Button */}
                          <button
                            type="button"
                            onClick={() => onNavigate('track-order', order.orderId)}
                            className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-xs"
                          >
                            <MapPin className="w-3.5 h-3.5 text-gold-400" />
                            <span>Track Shipment</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
            }

          </div>

        </div>

      </div>

      {/* ====================================================================
         1. CANCELLATION MODAL
         ==================================================================== */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  {['PLACED', 'CONFIRMED'].includes(cancelModalOrder.orderStatus)
                    ? 'Cancel Order'
                    : 'Request Order Cancellation'}
                </h3>
              </div>
              <button onClick={() => setCancelModalOrder(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Order: <strong className="font-mono text-forest-950 font-bold">{cancelModalOrder.orderId}</strong>
            </p>

            {['PACKED', 'SHIPMENT_BOOKED'].includes(cancelModalOrder.orderStatus) && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                <strong className="font-bold">Fulfillment in progress: </strong>
                Your parcel is already packed or courier-assigned. This cancellation requires Seller/Admin review.
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
              <div>
                <StoreSelect
                  label="Reason for Cancellation *"
                  value={cancelReason}
                  onChange={setCancelReason}
                  size="sm"
                  options={[
                    { value: 'Ordered by Mistake', label: 'Ordered by Mistake' },
                    { value: 'Found a Better Price', label: 'Found a Better Price' },
                    { value: 'Delivery Taking Too Long', label: 'Delivery Taking Too Long' },
                    { value: 'Changed My Mind', label: 'Changed My Mind' },
                    { value: 'Ordered Wrong Product', label: 'Ordered Wrong Product' },
                    { value: 'Other', label: 'Other' }
                  ]}
                />
              </div>

              {cancelReason === 'Other' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Additional Details *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Please explain why you want to cancel..."
                    value={cancelDescription}
                    onChange={(e) => setCancelDescription(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-forest-900"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalOrder(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center space-x-1.5 transition"
                >
                  {isSubmittingCancel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Cancellation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
