import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Truck,
  Printer,
  Clock,
  MapPin,
  FileText,
  ArrowLeft,
  Package,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Eye,
  CheckCircle2,
  Lock,
  RotateCcw,
  X,
  Plus,
  Minus,
  Settings,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  Calendar,
  Check,
  Ban,
  PhoneOff,
  MapPinOff,
  Loader2,
  ChevronDown,
  Download,
  FileCheck2,
  ShoppingBag,
  TrendingUp,
  Trash2,
  Video,
  Play,
  MessageCircle,
  Phone,
  ExternalLink
} from 'lucide-react';
import { Order } from '../../types';
import api, { getFullImageUrl } from '../../services/api';
import { toast } from '../../store/useToastStore';
import { AdminPagination } from '../../components/common/AdminPagination';
import { AdminConfirmModal } from '../../components/common/AdminConfirmModal';
import { emitLiveEvent } from '../../services/realtimeSync';

export interface AdminOrdersProps {
  initialOrderId?: string | null;
  onSelectOrder?: (orderId: string) => void;
  onClearInitialOrder?: () => void;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  initialOrderId,
  onSelectOrder,
  onClearInitialOrder
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'CANCELLATIONS' | 'COMPLAINTS' | 'RTO' | 'DELIVERED' | 'CANCELLED'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Custom Dropdown Open States & Refs
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState(false);
  const [isPaymentStatusOpen, setIsPaymentStatusOpen] = useState(false);
  const [isRefundStatusOpen, setIsRefundStatusOpen] = useState(false);
  const [isRtoReasonDropdownOpen, setIsRtoReasonDropdownOpen] = useState(false);
  const orderStatusDropdownRef = useRef<HTMLDivElement>(null);
  const paymentStatusDropdownRef = useRef<HTMLDivElement>(null);
  const refundStatusDropdownRef = useRef<HTMLDivElement>(null);
  const rtoReasonDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orderStatusDropdownRef.current && !orderStatusDropdownRef.current.contains(event.target as Node)) {
        setIsOrderStatusOpen(false);
      }
      if (paymentStatusDropdownRef.current && !paymentStatusDropdownRef.current.contains(event.target as Node)) {
        setIsPaymentStatusOpen(false);
      }
      if (refundStatusDropdownRef.current && !refundStatusDropdownRef.current.contains(event.target as Node)) {
        setIsRefundStatusOpen(false);
      }
      if (rtoReasonDropdownRef.current && !rtoReasonDropdownRef.current.contains(event.target as Node)) {
        setIsRtoReasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Modal Dialog States
  // 1. Cancellation Rejection Modal
  const [showCancelRejectModal, setShowCancelRejectModal] = useState(false);
  const [cancelRejectionReason, setCancelRejectionReason] = useState('');

  // 2. Customer Complaint Action Modals (Strictly Non-Returnable Products)
  const [showComplaintResolveModal, setShowComplaintResolveModal] = useState(false);
  const [complaintResolutionType, setComplaintResolutionType] = useState<'REFUND'>('REFUND');
  const [complaintResolutionNotes, setComplaintResolutionNotes] = useState('');
  const [showComplaintRejectModal, setShowComplaintRejectModal] = useState(false);
  const [complaintRejectionReason, setComplaintRejectionReason] = useState('');
  const [isViewingComplaintPage, setIsViewingComplaintPage] = useState(false);
  const [isDeletingComplaintVideo, setIsDeletingComplaintVideo] = useState(false);

  // 3. RTO Initiation & Product Inspection Modals
  const [showRTOModal, setShowRTOModal] = useState(false);
  const [rtoReason, setRtoReason] = useState('Customer refused delivery at doorstep');
  const [showRTOInspectionModal, setShowRTOInspectionModal] = useState(false);
  const [rtoCondition, setRtoCondition] = useState<'SELLABLE' | 'DAMAGED_UNSELLABLE'>('SELLABLE');
  const [rtoNotes, setRtoNotes] = useState('');

  // 4. Refund Update Modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundStatus, setRefundStatus] = useState<'NOT_APPLICABLE' | 'PENDING_APPROVAL' | 'PROCESSING' | 'REFUNDED' | 'FAILED'>('PROCESSING');
  const [refundTransactionId, setRefundTransactionId] = useState('');
  const [refundNotes, setRefundNotes] = useState('');

  // 5. Date & Period Filter States
  type DatePeriod = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM';
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [orderSummary, setOrderSummary] = useState<{
    totalOrders: number;
    totalRevenue: number;
    deliveredCount: number;
    inTransitCount: number;
    cancelledCount: number;
    rtoCount: number;
    codCount: number;
    onlineCount: number;
  }>({
    totalOrders: 0,
    totalRevenue: 0,
    deliveredCount: 0,
    inTransitCount: 0,
    cancelledCount: 0,
    rtoCount: 0,
    codCount: 0,
    onlineCount: 0
  });

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'TODAY': return 'Today';
      case 'THIS_WEEK': return 'This Week';
      case 'THIS_MONTH': return 'This Month';
      case 'THIS_YEAR': return 'This Year';
      case 'CUSTOM':
        if (customStartDate && customEndDate) return `${customStartDate} to ${customEndDate}`;
        if (customStartDate) return `From ${customStartDate}`;
        if (customEndDate) return `Up to ${customEndDate}`;
        return 'Custom Range';
      case 'ALL':
      default:
        return 'All Time';
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const isAnyModalOpen = showCancelRejectModal || showComplaintRejectModal || showComplaintResolveModal || showRTOInspectionModal || showRTOModal || showRefundModal || showCustomDateModal;

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  const handleSelectOrder = (order: Order) => {
    setIsViewingComplaintPage(false);
    setSelectedOrder(order);
    if (onSelectOrder) {
      onSelectOrder(order.orderId || order._id);
    }
  };

  const fetchOrders = async (targetIdToSelect?: string) => {
    setIsLoading(true);
    try {
      const params: any = {
        limit: 500
      };
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (search.trim()) params.search = search.trim();
      if (selectedPeriod !== 'ALL' && selectedPeriod !== 'CUSTOM') {
        params.period = selectedPeriod;
      } else if (selectedPeriod === 'CUSTOM') {
        if (customStartDate) params.startDate = customStartDate;
        if (customEndDate) params.endDate = customEndDate;
      }

      const res = await api.get('/orders/admin/all', { params });
      if (res.data?.success) {
        const fetchedOrders: Order[] = res.data.orders || [];
        setOrders(fetchedOrders);

        if (res.data.summary) {
          setOrderSummary(res.data.summary);
        } else {
          // Fallback client-side calculation
          const totalRevenue = fetchedOrders.reduce((sum, o) => sum + (o.pricing?.totalAmount || 0), 0);
          const deliveredCount = fetchedOrders.filter(o => o.orderStatus === 'DELIVERED').length;
          const inTransitCount = fetchedOrders.filter(o => ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'SHIPMENT_BOOKED', 'PACKED', 'CONFIRMED', 'PICKED_UP'].includes(o.orderStatus)).length;
          const cancelledCount = fetchedOrders.filter(o => ['CANCELLED', 'CANCELLATION_REQUESTED'].includes(o.orderStatus)).length;
          const rtoCount = fetchedOrders.filter(o => ['RTO_INITIATED', 'IN_TRANSIT_TO_SELLER', 'RTO_IN_TRANSIT', 'RETURNED_TO_SELLER', 'RTO_COMPLETED'].includes(o.orderStatus)).length;
          const codCount = fetchedOrders.filter(o => o.paymentInfo?.method === 'COD').length;
          const onlineCount = fetchedOrders.filter(o => o.paymentInfo?.method === 'ONLINE').length;
          setOrderSummary({
            totalOrders: fetchedOrders.length,
            totalRevenue,
            deliveredCount,
            inTransitCount,
            cancelledCount,
            rtoCount,
            codCount,
            onlineCount
          });
        }

        const idToSelect = typeof targetIdToSelect === 'string' ? targetIdToSelect : initialOrderId;
        if (idToSelect) {
          const match = fetchedOrders.find(
            (o: Order) => o.orderId === idToSelect || o._id === idToSelect
          );
          if (match) {
            handleSelectOrder(match);
          } else {
            try {
              const singleRes = await api.get('/orders/admin/all', { params: { search: idToSelect } });
              if (singleRes.data?.success && singleRes.data.orders?.length > 0) {
                const found = singleRes.data.orders.find(
                  (o: Order) => o.orderId === idToSelect || o._id === idToSelect
                ) || singleRes.data.orders[0];
                handleSelectOrder(found);
              }
            } catch (err) {
              console.error('Target order lookup error:', err);
            }
          }
        } else if (selectedOrder) {
          const updated = fetchedOrders.find((o: Order) => o._id === selectedOrder._id);
          if (updated) {
            setSelectedOrder(updated);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleLiveOrder = () => {
      fetchOrders();
    };
    window.addEventListener('novise:order-updated', handleLiveOrder);
    return () => {
      window.removeEventListener('novise:order-updated', handleLiveOrder);
    };
  }, [selectedStatus, search, selectedPeriod, customStartDate, customEndDate]);

  useEffect(() => {
    if (initialOrderId) {
      fetchOrders(initialOrderId);
    } else {
      setSelectedOrder(null);
    }
  }, [initialOrderId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, selectedStatus, selectedPeriod, customStartDate, customEndDate]);

  // Custom Delete Order Confirmation Modal State
  const [orderToDelete, setOrderToDelete] = useState<{ id: string; displayId: string } | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  // Action Confirmation Modal State
  const [actionConfirm, setActionConfirm] = useState<{
    title: string;
    message: string;
    itemBadge?: string;
    itemName?: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    action: () => Promise<void>;
  } | null>(null);
  const [isExecutingActionConfirm, setIsExecutingActionConfirm] = useState(false);

  const handleExecuteActionConfirm = async () => {
    if (!actionConfirm) return;
    setIsExecutingActionConfirm(true);
    try {
      await actionConfirm.action();
      setActionConfirm(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setIsExecutingActionConfirm(false);
    }
  };

  const handleDeleteOrder = (orderId: string, displayId: string) => {
    setOrderToDelete({ id: orderId, displayId });
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeletingOrder(true);
    try {
      const res = await api.delete(`/orders/admin/${orderToDelete.id}`);
      if (res.data?.success) {
        toast.success(res.data.message || `Order ${orderToDelete.displayId} deleted successfully!`, 'Order Deleted');
        if (selectedOrder?._id === orderToDelete.id) {
          setIsViewingComplaintPage(false);
          setSelectedOrder(null);
        }
        setOrderToDelete(null);
        await fetchOrders();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete order', 'Delete Error');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const handleBackToOrders = () => {
    setIsViewingComplaintPage(false);
    setSelectedOrder(null);
    if (onClearInitialOrder) {
      onClearInitialOrder();
    }
  };

  // CANCELLATION ACTIONS (Approve / Reject)
  const handleApproveCancellation = (order: Order) => {
    setActionConfirm({
      title: 'Approve Cancellation Request',
      itemBadge: order.orderId,
      itemName: `Order #${order.orderId}`,
      message: `Approve cancellation for order ${order.orderId}? This will permanently cancel the order, restore inventory, cancel any booked courier shipment, and initiate a refund if prepaid.`,
      confirmLabel: 'Approve Cancellation',
      variant: 'warning',
      action: async () => {
        setIsProcessingAction(true);
        try {
          const res = await api.put(`/orders/admin/${order._id}/cancellation`, {
            action: 'APPROVE'
          });
          if (res.data?.success) {
            toast.success('Cancellation approved. Order is cancelled and inventory restored.', 'Cancellation Approved');
            setSelectedOrder(res.data.order);
            fetchOrders();
          }
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to approve cancellation');
        } finally {
          setIsProcessingAction(false);
        }
      }
    });
  };

  const handleRejectCancellation = async () => {
    if (!selectedOrder) return;
    if (!cancelRejectionReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await api.put(`/orders/admin/${selectedOrder._id}/cancellation`, {
        action: 'REJECT',
        rejectionReason: cancelRejectionReason.trim()
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Cancellation rejected.', 'Request Rejected');
        setSelectedOrder(res.data.order);
        setShowCancelRejectModal(false);
        setCancelRejectionReason('');
        fetchOrders();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject cancellation');
    } finally {
      setIsProcessingAction(false);
    }
  };


  // =========================================================================
  // CUSTOMER COMPLAINT ACTIONS (Strictly Non-Returnable Products)
  // Workflow: SUBMITTED -> UNDER_REVIEW -> APPROVED / REJECTED -> RESOLVED
  // =========================================================================
  const handleReviewComplaint = async (action: 'UNDER_REVIEW' | 'REJECT' | 'RESOLVE') => {
    if (!selectedOrder) return;
    setIsProcessingAction(true);
    try {
      const payload: any = { action };
      if (action === 'REJECT') {
        payload.rejectionReason = complaintRejectionReason.trim();
      }
      if (action === 'RESOLVE') {
        payload.resolutionType = complaintResolutionType;
        payload.resolutionNotes = complaintResolutionNotes.trim();
      }

      const res = await api.put(`/orders/admin/${selectedOrder._id}/complaint`, payload);
      if (res.data?.success) {
        toast.success(res.data.message || `Complaint status updated to ${action}`);
        setSelectedOrder(res.data.order);
        setShowComplaintResolveModal(false);
        setShowComplaintRejectModal(false);
        setComplaintResolutionNotes('');
        setComplaintRejectionReason('');
        fetchOrders();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update complaint');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteComplaintVideo = async () => {
    if (!selectedOrder?._id) return;
    if (!window.confirm('Are you sure you want to delete this complaint video proof? It will be permanently removed from Cloudinary folder "Order_Report_Videos".')) {
      return;
    }
    setIsDeletingComplaintVideo(true);
    try {
      const res = await api.delete(`/orders/admin/${selectedOrder._id}/complaint/video`);
      if (res.data?.success) {
        toast.success('Video proof successfully deleted from Cloudinary folder Order_Report_Videos!', 'Video Deleted');
        setSelectedOrder(res.data.order);
        fetchOrders();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete video from Cloudinary', 'Delete Failed');
    } finally {
      setIsDeletingComplaintVideo(false);
    }
  };

  // Generate personalized WhatsApp message with order details and report
  const getComplaintWhatsAppUrl = (order: Order | null) => {
    if (!order) return '#';
    const rawPhone = order.complaint?.customerPhone || order.shippingAddress?.phone || order.customerDetails?.phone || '';
    const phone = rawPhone.replace(/\D/g, '').slice(-10);
    if (!phone) return '#';

    const customerName = order.shippingAddress?.fullName || order.customerDetails?.fullName || 'Customer';
    const orderId = order.orderId || order._id;
    const issueReason = order.complaint?.reason || 'Delivery / Product Issue';
    const issueDescription = order.complaint?.description ? order.complaint.description.trim() : '';
    const itemsList = order.items && order.items.length > 0
      ? order.items.map(it => `${it.name} (Qty: ${it.quantity})`).join(', ')
      : 'Novis Herbal Formulation';

    const messageLines = [
      `Hello ${customerName},`,
      ``,
      `This is the Novis Herbal Care Team reaching out regarding your report for Order #${orderId}.`,
      ``,
      `*Order Details:*`,
      `• *Order ID:* #${orderId}`,
      `• *Product(s):* ${itemsList}`,
      `• *Issue Reported:* ${issueReason}`,
      ...(issueDescription ? [`• *Your Note:* "${issueDescription}"`] : []),
      ``,
      `We have reviewed your report and video proof. We want to help resolve this for you as quickly as possible.`,
      ``,
      `Please reply to this message so we can discuss and finalize the best solution for you (direct refund or replacement).`,
      ``,
      `Best regards,`,
      `Novis Herbal Care Team`
    ];

    return `https://wa.me/91${phone}?text=${encodeURIComponent(messageLines.join('\n'))}`;
  };

  // =========================================================================
  // RTO (RETURN TO ORIGIN) WORKFLOW ACTIONS
  // Workflow: RTO Initiated -> In Transit to Seller -> Returned to Seller -> RTO Completed
  // =========================================================================
  const handleInitiateRTO = async () => {
    if (!selectedOrder) return;
    setIsProcessingAction(true);
    try {
      const res = await api.put(`/orders/admin/${selectedOrder._id}/rto`, {
        action: 'INITIATE',
        reason: rtoReason.trim()
      });
      if (res.data?.success) {
        toast.success('RTO process initiated.');
        setSelectedOrder(res.data.order);
        setShowRTOModal(false);
        fetchOrders();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initiate RTO');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleProgressRTO = (step: 'IN_TRANSIT_TO_SELLER' | 'RETURNED_TO_SELLER') => {
    if (!selectedOrder) return;
    const action = step === 'IN_TRANSIT_TO_SELLER' ? 'IN_TRANSIT' : 'RETURNED_TO_SELLER';
    const isStep1 = step === 'IN_TRANSIT_TO_SELLER';
    setActionConfirm({
      title: isStep1 ? 'Progress RTO: In Transit' : 'Progress RTO: Returned to Warehouse',
      itemBadge: selectedOrder.orderId,
      itemName: `Order #${selectedOrder.orderId}`,
      message: isStep1
        ? 'Move RTO status to "In Transit to Seller"? This confirms that the courier is returning the shipment back to your warehouse.'
        : 'Mark that the courier has delivered the returned parcel back to your warehouse?',
      confirmLabel: isStep1 ? 'Update to In Transit' : 'Confirm Warehouse Delivery',
      variant: 'info',
      action: async () => {
        setIsProcessingAction(true);
        try {
          const res = await api.put(`/orders/admin/${selectedOrder._id}/rto`, { action });
          if (res.data?.success) {
            toast.success(res.data.message || `RTO status updated`);
            setSelectedOrder(res.data.order);
            fetchOrders();
          }
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to update RTO');
        } finally {
          setIsProcessingAction(false);
        }
      }
    });
  };

  const handleCompleteRTO = async () => {
    if (!selectedOrder) return;
    setIsProcessingAction(true);
    try {
      const res = await api.put(`/orders/admin/${selectedOrder._id}/rto`, {
        action: 'COMPLETE',
        condition: rtoCondition,
        notes: rtoNotes.trim()
      });
      if (res.data?.success) {
        toast.success(`RTO completed! ${rtoCondition === 'SELLABLE' ? 'Inventory stock restored.' : 'Damaged product recorded (stock not restored).'}`);
        setSelectedOrder(res.data.order);
        setShowRTOInspectionModal(false);
        setRtoNotes('');
        fetchOrders();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete RTO');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // =========================================================================
  // REFUND MANAGEMENT ACTIONS (Not Applicable / Pending / Processing / Refunded / Failed)
  // =========================================================================
  const handleUpdateRefundDirect = async (newRefundStatus: string) => {
    if (!selectedOrder) return;
    if (selectedOrder.refundInfo?.status === newRefundStatus) return;

    const isCod = selectedOrder.paymentInfo?.method === 'COD' || selectedOrder.paymentMethod === 'COD';
    const isCancelledBeforeDel = ['CANCELLED', 'CANCELLATION_REQUESTED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'].includes(selectedOrder.orderStatus);
    if (isCod && (isCancelledBeforeDel || selectedOrder.orderStatus !== 'DELIVERED') && newRefundStatus !== 'NOT_APPLICABLE') {
      toast.error('Refund cannot be processed for COD orders cancelled before delivery. Zero cash was collected from customer.', 'Action Prohibited');
      return;
    }

    const executeRefund = async () => {
      setIsProcessingAction(true);
      try {
        const res = await api.put(`/orders/admin/${selectedOrder._id}/refund`, {
          action: newRefundStatus,
          refundMethod: selectedOrder.paymentInfo?.method === 'COD' ? 'BANK_TRANSFER' : 'ORIGINAL_SOURCE'
        });
        if (res.data?.success) {
          toast.success(`Refund status updated to ${newRefundStatus}.`);
          setSelectedOrder(res.data.order);
          fetchOrders();
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to update refund');
      } finally {
        setIsProcessingAction(false);
      }
    };

    if (newRefundStatus === 'REFUNDED') {
      setActionConfirm({
        title: 'Confirm Refund Settlement',
        itemBadge: selectedOrder.orderId,
        itemName: `Order #${selectedOrder.orderId}`,
        message: `Mark refund for order ${selectedOrder.orderId} as REFUNDED? This will confirm that money has been returned to the customer and update Payment Status to REFUNDED.`,
        confirmLabel: 'Confirm Refund',
        variant: 'warning',
        action: executeRefund
      });
      return;
    }

    await executeRefund();
  };

  const handleUpdateRefund = async () => {
    if (!selectedOrder) return;

    const isCod = selectedOrder.paymentInfo?.method === 'COD' || selectedOrder.paymentMethod === 'COD';
    const isCancelledBeforeDel = ['CANCELLED', 'CANCELLATION_REQUESTED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'].includes(selectedOrder.orderStatus);
    if (isCod && (isCancelledBeforeDel || selectedOrder.orderStatus !== 'DELIVERED') && refundStatus !== 'NOT_APPLICABLE') {
      toast.error('Refund cannot be processed for COD orders cancelled before delivery. Zero cash was collected.', 'Action Prohibited');
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await api.put(`/orders/admin/${selectedOrder._id}/refund`, {
        action: refundStatus,
        transactionId: refundTransactionId.trim(),
        failureReason: refundNotes.trim(),
        notes: refundNotes.trim(),
        refundMethod: selectedOrder.paymentInfo?.method === 'COD' ? 'BANK_TRANSFER' : 'ORIGINAL_SOURCE'
      });
      if (res.data?.success) {
        toast.success(`Refund status updated to ${refundStatus}.`);
        setSelectedOrder(res.data.order);
        setShowRefundModal(false);
        setRefundTransactionId('');
        setRefundNotes('');
        fetchOrders();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update refund');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Order Lifecycle Status Update with Strict E-Commerce Validation
  const handleOrderStatusUpdate = async (order: Order, newStatus: string) => {
    if (order.orderStatus === newStatus) return;

    if (order.orderStatus === 'CANCELLED' || order.orderStatus === 'RTO_COMPLETED') {
      toast.warning('Closed orders (Cancelled or RTO) are permanently closed and cannot be re-opened.', 'Order Locked');
      return;
    }

    if (order.orderStatus === 'DELIVERED' && ['PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'SHIPMENT_BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'CANCELLED'].includes(newStatus)) {
      toast.warning('Delivered orders cannot be reverted back to active fulfillment. Products once delivered are strictly non-returnable and non-replaceable.', 'Order Completed');
      return;
    }

    const executeStatusUpdate = async () => {
      setIsProcessingAction(true);
      try {
        let note = `Order status updated to ${newStatus}`;
        if (newStatus === 'CONFIRMED') note = 'Order verified and confirmed by store owner';
        if (newStatus === 'PACKED') note = 'Parcel packed with invoice, awaiting courier handover';
        if (newStatus === 'DELIVERED') note = 'Order marked as Delivered to customer';

        const res = await api.put(`/orders/admin/${order._id}/status`, { status: newStatus, note });
        if (res.data?.success) {
          toast.success(`Order status updated to ${formatStatusName(newStatus)}.`, 'Status Updated');
          if (selectedOrder && selectedOrder._id === order._id) {
            setSelectedOrder(res.data.order);
          }
          fetchOrders();
          emitLiveEvent('ORDER_UPDATED', {
            orderId: order.orderId,
            mongoId: order._id,
            status: newStatus,
            order: res.data.order
          });
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to update order status', 'Update Error');
      } finally {
        setIsProcessingAction(false);
      }
    };

    if (newStatus === 'CANCELLED') {
      setActionConfirm({
        title: 'Cancel Order Permanently',
        itemBadge: order.orderId,
        itemName: `Order #${order.orderId}`,
        message: `Are you sure you want to cancel order ${order.orderId}? This will permanently cancel the order and automatically restore the product quantities back to warehouse inventory.`,
        confirmLabel: 'Yes, Cancel Order',
        variant: 'danger',
        action: executeStatusUpdate
      });
      return;
    }

    await executeStatusUpdate();
  };

  // Payment Status Update
  const handlePaymentStatusUpdate = async (order: Order, newPaymentStatus: string) => {
    if (order.paymentInfo?.status === newPaymentStatus) return;

    const isCod = order.paymentInfo?.method === 'COD' || order.paymentMethod === 'COD';
    const isCancelledBeforeDel = ['CANCELLED', 'CANCELLATION_REQUESTED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'].includes(order.orderStatus);

    if (isCod && isCancelledBeforeDel) {
      if (newPaymentStatus === 'REFUNDED') {
        toast.error('Cannot set status to REFUNDED for cancelled COD orders. Zero payment was collected from customer.', 'Action Prohibited');
        return;
      }
      if (newPaymentStatus === 'PAID') {
        toast.error('Cannot set status to PAID for cancelled COD orders. Delivery did not occur.', 'Action Prohibited');
        return;
      }
    }

    if (isCod && order.orderStatus !== 'DELIVERED') {
      if (newPaymentStatus === 'REFUNDED') {
        toast.error('Cannot refund a COD order before delivery. No payment was collected.', 'Action Prohibited');
        return;
      }
      if (newPaymentStatus === 'PAID') {
        toast.error('Cannot mark a Cash on Delivery (COD) order as PAID before delivery. Cash is only collected upon doorstep delivery to customer.', 'Action Prohibited');
        return;
      }
    }

    const executePaymentUpdate = async () => {
      setIsProcessingAction(true);
      try {
        const res = await api.put(`/orders/admin/${order._id}/payment-status`, {
          paymentStatus: newPaymentStatus,
          note: `Payment status marked as ${newPaymentStatus}`
        });
        if (res.data?.success) {
          toast.success(`Payment status updated to ${newPaymentStatus}.`, 'Payment Updated');
          if (selectedOrder && selectedOrder._id === order._id) {
            setSelectedOrder(res.data.order);
          }
          fetchOrders();
          emitLiveEvent('ORDER_UPDATED', {
            orderId: order.orderId,
            mongoId: order._id,
            paymentStatus: newPaymentStatus,
            order: res.data.order
          });
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to update payment status', 'Update Error');
      } finally {
        setIsProcessingAction(false);
      }
    };

    if (newPaymentStatus === 'REFUNDED') {
      setActionConfirm({
        title: 'Confirm Refund Payment',
        itemBadge: order.orderId,
        itemName: `Order #${order.orderId}`,
        message: `Mark payment for order ${order.orderId} as REFUNDED? Ensure that the refund has been processed in your payment gateway or bank account.`,
        confirmLabel: 'Mark as Refunded',
        variant: 'warning',
        action: executePaymentUpdate
      });
      return;
    }

    await executePaymentUpdate();
  };

  // Courier Shipment Booking
  const handleBookShipment = async (order: Order) => {
    setIsProcessingAction(true);
    try {
      const res = await api.post(`/shipping/book/${order.orderId}`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Courier shipment booked successfully with Shiprocket!', 'Shipment Booked');
        fetchOrders();
        emitLiveEvent('ORDER_UPDATED', {
          orderId: order.orderId,
          mongoId: order._id,
          order: res.data.order
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Courier booking failed', 'Logistics Error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Helper format name (Strict Non-Returnable Lifecycle)
  const formatStatusName = (status: string) => {
    switch (status) {
      case 'PLACED': return 'Placed';
      case 'CONFIRMED': return 'Confirmed';
      case 'PACKED': return 'Packed';
      case 'SHIPMENT_BOOKED': return 'Shipment Booked (AWB Assigned)';
      case 'IN_TRANSIT': return 'In Transit';
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLATION_REQUESTED': return 'Cancellation Requested';
      case 'CANCELLED': return 'Cancelled';
      case 'RTO_INITIATED': return 'RTO Initiated';
      case 'IN_TRANSIT_TO_SELLER': return 'In Transit to Seller';
      case 'RTO_IN_TRANSIT': return 'In Transit to Seller';
      case 'RETURNED_TO_SELLER': return 'Returned to Seller';
      case 'RTO_COMPLETED': return 'RTO Completed';
      case 'RTO': return 'RTO (Returned to Origin)';
      default: return status.replace(/_/g, ' ');
    }
  };

  const getOrderStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PLACED': return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'PACKED': return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'SHIPMENT_BOOKED': return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'IN_TRANSIT': return 'bg-cyan-100 text-cyan-900 border-cyan-300';
      case 'OUT_FOR_DELIVERY': return 'bg-teal-100 text-teal-900 border-teal-300';
      case 'DELIVERED': return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'CANCELLATION_REQUESTED': return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'CANCELLED': return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'RTO_INITIATED': return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'IN_TRANSIT_TO_SELLER':
      case 'RTO_IN_TRANSIT': return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'RETURNED_TO_SELLER': return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'RTO_COMPLETED': return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getPaymentStatusBadgeClass = (status: string | undefined) => {
    switch (status) {
      case 'PAID': return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'PENDING': return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'FAILED': return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'REFUNDED': return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'NOT_APPLICABLE':
      case 'CANCELLED': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getRefundStatusBadgeClass = (status: string | undefined) => {
    switch (status) {
      case 'NOT_APPLICABLE': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'PENDING_APPROVAL': return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'PROCESSING': return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'REFUNDED': return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'FAILED': return 'bg-rose-100 text-rose-900 border-rose-300';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case 'PLACED': return 'bg-amber-500';
      case 'CONFIRMED': return 'bg-blue-500';
      case 'PACKED': return 'bg-indigo-500';
      case 'SHIPMENT_BOOKED': return 'bg-purple-500';
      case 'IN_TRANSIT': return 'bg-cyan-500';
      case 'OUT_FOR_DELIVERY': return 'bg-teal-500';
      case 'DELIVERED': return 'bg-emerald-500';
      case 'CANCELLED': return 'bg-rose-500';
      case 'RTO_INITIATED': return 'bg-orange-500';
      case 'IN_TRANSIT_TO_SELLER': return 'bg-amber-500';
      case 'RETURNED_TO_SELLER': return 'bg-purple-500';
      case 'RTO_COMPLETED': return 'bg-emerald-600';
      default: return 'bg-slate-400';
    }
  };

  const getPaymentStatusDot = (status: string | undefined) => {
    switch (status) {
      case 'PAID': return 'bg-emerald-500';
      case 'PENDING': return 'bg-amber-500';
      case 'FAILED': return 'bg-rose-500';
      case 'REFUNDED': return 'bg-purple-500';
      case 'NOT_APPLICABLE':
      case 'CANCELLED': return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  // All 12 Order Lifecycle Statuses (Non-Returnable Products)
  const ALL_ORDER_STATUSES = [
    { value: 'PLACED', label: 'Placed', dot: 'bg-amber-500', stage: '1. Placed' },
    { value: 'CONFIRMED', label: 'Confirmed', dot: 'bg-blue-500', stage: '2. Confirmed' },
    { value: 'PACKED', label: 'Packed', dot: 'bg-indigo-500', stage: '3. Packed' },
    { value: 'SHIPMENT_BOOKED', label: 'Shipment Booked (AWB)', dot: 'bg-purple-500', stage: '4. AWB Assigned' },
    { value: 'IN_TRANSIT', label: 'In Transit', dot: 'bg-cyan-500', stage: '5. In Transit' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', dot: 'bg-teal-500', stage: '6. Out for Delivery' },
    { value: 'DELIVERED', label: 'Delivered', dot: 'bg-emerald-500', stage: '7. Delivered (Non-Returnable)' },
    { value: 'CANCELLED', label: 'Cancelled', dot: 'bg-rose-500', stage: 'Cancelled' },
    { value: 'RTO_INITIATED', label: 'RTO Initiated', dot: 'bg-orange-500', stage: 'RTO Initiated' },
    { value: 'IN_TRANSIT_TO_SELLER', label: 'In Transit to Seller', dot: 'bg-amber-500', stage: 'In Transit to Seller' },
    { value: 'RETURNED_TO_SELLER', label: 'Returned to Seller', dot: 'bg-purple-500', stage: 'Returned to Seller' },
    { value: 'RTO_COMPLETED', label: 'RTO Completed', dot: 'bg-emerald-600', stage: 'RTO Completed' }
  ];

  // RTO Reason Options for Initiate RTO Modal
  const RTO_REASONS = [
    {
      value: 'Customer refused delivery at doorstep',
      label: 'Customer refused delivery at doorstep',
      badge: 'Refused at Doorstep',
      short: 'Doorstep Refusal',
      desc: 'Customer explicitly declined package acceptance upon courier delivery attempt.',
      icon: Ban,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      iconBg: 'bg-rose-100 text-rose-700',
      borderActiveClass: 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
    },
    {
      value: 'Customer unavailable after courier attempts',
      label: 'Customer unavailable after courier attempts',
      badge: 'Unreachable Recipient',
      short: 'Non-Contactable',
      desc: 'Customer premises locked or mobile phone unreachable across repeated courier delivery attempts.',
      icon: PhoneOff,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: 'bg-amber-100 text-amber-700',
      borderActiveClass: 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
    },
    {
      value: 'Incorrect or incomplete address',
      label: 'Incorrect or incomplete address',
      badge: 'Address Untraceable',
      short: 'Bad Address',
      desc: 'Missing house/flat number, untraceable landmark, or courier pin code mismatch.',
      icon: MapPinOff,
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      iconBg: 'bg-purple-100 text-purple-700',
      borderActiveClass: 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20'
    },
    {
      value: 'Courier operational delay / delivery failed',
      label: 'Courier operational delay / delivery failed',
      badge: 'Logistics Exception',
      short: 'Transit Failure',
      desc: 'Courier hub operational delay, parcel transit damage, or delivery executive failed to attempt.',
      icon: Truck,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      iconBg: 'bg-blue-100 text-blue-700',
      borderActiveClass: 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
    }
  ];

  // Refund Status Options for Refund Modal
  const REFUND_STATUS_OPTIONS = [
    {
      value: 'NOT_APPLICABLE',
      label: 'Not Applicable',
      desc: 'No refund required (COD order or zero transaction)',
      dot: 'bg-slate-400',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    {
      value: 'PENDING_APPROVAL',
      label: 'Pending Approval',
      desc: 'Refund request awaiting management / finance sign-off',
      dot: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    {
      value: 'PROCESSING',
      label: 'Processing',
      desc: 'Sent to payment gateway (Razorpay / Bank) for disbursement',
      dot: 'bg-blue-500',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200'
    },
    {
      value: 'REFUNDED',
      label: 'Refunded (Completed)',
      desc: 'Disbursement confirmed by gateway / UTR reference generated',
      dot: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    },
    {
      value: 'FAILED',
      label: 'Failed',
      desc: 'Gateway or beneficiary account rejected transfer',
      dot: 'bg-rose-500',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200'
    }
  ];

  // Lifecycle transition validator (Enforces document rules)
  const checkStatusTransition = (currentStatus: string, targetStatus: string): { allowed: boolean; reason?: string } => {
    if (currentStatus === targetStatus) {
      return { allowed: false, reason: 'Current Status' };
    }

    if (['CANCELLED', 'RTO_COMPLETED'].includes(currentStatus)) {
      return { allowed: false, reason: 'Order Closed' };
    }

    if (currentStatus === 'DELIVERED') {
      return { allowed: false, reason: 'Delivered (Non-Returnable)' };
    }

    switch (currentStatus) {
      case 'PLACED':
        if (['CONFIRMED', 'CANCELLED'].includes(targetStatus)) return { allowed: true };
        return { allowed: false, reason: 'Confirm order first' };

      case 'CONFIRMED':
        if (['PACKED', 'CANCELLED'].includes(targetStatus)) return { allowed: true };
        return { allowed: false, reason: 'Pack parcel first' };

      case 'PACKED':
        if (['SHIPMENT_BOOKED', 'CANCELLED'].includes(targetStatus)) return { allowed: true };
        return { allowed: false, reason: 'Book courier shipment first' };

      case 'SHIPMENT_BOOKED':
        if (['IN_TRANSIT', 'CANCELLED'].includes(targetStatus)) return { allowed: true };
        return { allowed: false, reason: 'Awaiting courier pickup' };

      case 'IN_TRANSIT':
        if (['OUT_FOR_DELIVERY', 'RTO_INITIATED'].includes(targetStatus)) return { allowed: true };
        return { allowed: false, reason: 'Cannot cancel after courier pickup' };

      case 'OUT_FOR_DELIVERY':
        if (['DELIVERED', 'RTO_INITIATED'].includes(targetStatus)) return { allowed: true };
        return { allowed: false, reason: 'Pending delivery attempt' };

      case 'RTO_INITIATED':
        if (['IN_TRANSIT_TO_SELLER'].includes(targetStatus)) return { allowed: true };
        return { allowed: false, reason: 'Must move in transit to seller' };

      case 'IN_TRANSIT_TO_SELLER':
      case 'RTO_IN_TRANSIT':
        if (['RETURNED_TO_SELLER'].includes(targetStatus)) return { allowed: true };
        return { allowed: false, reason: 'Awaiting arrival at seller warehouse' };

      case 'RETURNED_TO_SELLER':
        if (['RTO_COMPLETED'].includes(targetStatus)) return { allowed: true };
        return { allowed: false, reason: 'Perform inspection to complete RTO' };

      default:
        return { allowed: false, reason: 'Locked' };
    }
  };

  // Payment Status options
  const ALL_PAYMENT_STATUSES = [
    { value: 'PENDING', label: 'Pending Payment', dot: 'bg-amber-500', desc: 'Awaiting customer or gateway clearance' },
    { value: 'PAID', label: 'Paid / Settled', dot: 'bg-emerald-500', desc: 'Funds received & verified' },
    { value: 'FAILED', label: 'Payment Failed', dot: 'bg-rose-500', desc: 'Transaction declined or timed out' },
    { value: 'REFUNDED', label: 'Refunded', dot: 'bg-purple-500', desc: 'Amount refunded to customer' },
    { value: 'NOT_APPLICABLE', label: 'Not Applicable', dot: 'bg-slate-400', desc: 'Cancelled COD order / zero money collected' },
  ];

  // Refund Status options (Section 8)
  const ALL_REFUND_STATUSES = [
    { value: 'NOT_APPLICABLE', label: 'Not Applicable', dot: 'bg-slate-400', desc: 'COD or non-refundable order' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval', dot: 'bg-amber-500', desc: 'Awaiting admin review' },
    { value: 'PROCESSING', label: 'Processing', dot: 'bg-blue-500', desc: 'Refund under payment gateway processing' },
    { value: 'REFUNDED', label: 'Refunded', dot: 'bg-emerald-500', desc: 'Refund successfully settled' },
    { value: 'FAILED', label: 'Failed', dot: 'bg-rose-500', desc: 'Gateway failure or manual retry required' }
  ];

  // Filter orders by activeTab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'CANCELLATIONS') {
      return order.orderStatus === 'CANCELLATION_REQUESTED' || order.cancellation?.requiresApproval;
    }
    if (activeTab === 'COMPLAINTS') {
      return order.complaint?.hasComplaint;
    }
    if (activeTab === 'RTO') {
      return ['RTO_INITIATED', 'IN_TRANSIT_TO_SELLER', 'RTO_IN_TRANSIT', 'RETURNED_TO_SELLER', 'RTO_COMPLETED', 'RTO'].includes(order.orderStatus);
    }
    if (activeTab === 'DELIVERED') {
      return order.orderStatus === 'DELIVERED';
    }
    if (activeTab === 'CANCELLED') {
      return order.orderStatus === 'CANCELLED';
    }
    return true;
  });

  // Paginated orders slice
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 w-full">
      {isReportModalOpen ? (
        /* DEDICATED FULL-PAGE REPORT VIEW */
        <div className="space-y-6 w-full animate-fadeIn pb-12">
          {/* Top Action Nav Bar with Back Button */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="flex items-center space-x-3.5 sm:space-x-4">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                title="Return to orders"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Orders</span>
              </button>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 rounded-xl bg-forest-900/10 text-forest-900 flex items-center justify-center font-serif text-sm font-bold">
                    <FileCheck2 className="w-4 h-4 text-forest-900" />
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-black text-forest-950">
                    Order Fulfillment & Logistics Audit Report
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Period: <strong className="text-forest-900">{getPeriodLabel()}</strong> &bull; Total Orders: <strong className="font-mono">{orders.length}</strong> Records
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrintReport}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-forest-900/15 cursor-pointer"
                title="Download and save formatted report directly to your PC"
              >
                <Download className="w-4 h-4 text-gold-400" />
                <span>Download / Print PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>

          {/* PRINTABLE REPORT PREVIEW CONTAINER */}
          <div className="p-6 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xs bg-white text-slate-900 font-serif space-y-6 printable-report">
            {/* Document Header */}
            <div className="border-b-2 border-forest-950 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-serif text-2xl font-black text-forest-950 tracking-wider">NOVISE HERBAL</span>
                  <span className="text-xs bg-forest-950 text-gold-400 px-2 py-0.5 rounded font-mono font-bold">
                    PVT. LTD.
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-sans mt-0.5">
                  100% Ayurvedic & Botanical Care &bull; Official Order & Logistics Fulfillment Audit
                </p>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  GSTIN: 24AAACN1234F1Z5 &bull; Warehouse: Sidhpur, Gujarat - 384151 &bull; support@noviseherbal.com
                </p>
              </div>

              <div className="text-right font-sans text-xs space-y-0.5">
                <p className="font-bold text-forest-950 uppercase tracking-wide">
                  STATEMENT: <span className="text-forest-900 font-black">ORDER LOGISTICS REPORT</span>
                </p>
                <p className="text-slate-600">Period: <strong className="text-slate-900">{getPeriodLabel()}</strong></p>
                <p className="text-slate-400 text-[11px] font-mono">Generated: {new Date().toLocaleString('en-IN')}</p>
                <p className="text-slate-500 text-[11px]">Authorized Signatory: <strong className="text-slate-700">Novise Admin</strong></p>
              </div>
            </div>

            {/* Executive KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-sans text-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Orders</span>
                <span className="font-mono font-bold text-lg text-slate-900 block mt-0.5">
                  {orderSummary.totalOrders}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                  ₹{orderSummary.totalRevenue.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Delivered</span>
                <span className="font-mono font-bold text-lg text-emerald-700 block mt-0.5">
                  {orderSummary.deliveredCount}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  {orderSummary.totalOrders > 0 ? `${Math.round((orderSummary.deliveredCount / orderSummary.totalOrders) * 100)}% Fulfilled` : '0%'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">In Logistics</span>
                <span className="font-mono font-bold text-lg text-blue-700 block mt-0.5">
                  {orderSummary.inTransitCount}
                </span>
                <span className="text-[10px] text-blue-600 font-medium block mt-0.5">
                  Active Shipments
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Cancelled</span>
                <span className="font-mono font-bold text-lg text-rose-700 block mt-0.5">
                  {orderSummary.cancelledCount}
                </span>
                <span className="text-[10px] text-rose-600 font-medium block mt-0.5">
                  {orderSummary.totalOrders > 0 ? `${Math.round((orderSummary.cancelledCount / orderSummary.totalOrders) * 100)}% Cancelled` : '0%'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">RTO / Failed</span>
                <span className="font-mono font-bold text-lg text-orange-700 block mt-0.5">
                  {orderSummary.rtoCount}
                </span>
                <span className="text-[10px] text-orange-600 font-medium block mt-0.5">
                  Courier Exceptions
                </span>
              </div>
            </div>

            {/* Payment Split Banner */}
            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs font-sans text-slate-700 gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900">Payment Breakdown:</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                  Online Prepaid: {orderSummary.onlineCount} Orders
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[11px]">
                  Cash on Delivery (COD): {orderSummary.codCount} Orders
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Report Scope: {orders.length} order items listed below
              </div>
            </div>

            {/* Detailed Orders Breakdown Table */}
            <div>
              <h4 className="font-serif font-bold text-sm text-forest-950 mb-2">
                Itemized Order Records ({orders.length})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden font-sans">
                <table className="w-full text-left divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Order ID</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Customer & City</th>
                      <th className="p-2.5">Items</th>
                      <th className="p-2.5">Payment</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Carrier & AWB</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {orders.map((o, idx) => (
                      <tr key={o._id || o.orderId} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900">{o.orderId}</td>
                        <td className="p-2.5 text-slate-600 whitespace-nowrap text-[11px]">
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                        </td>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900">{o.customerDetails?.fullName || 'N/A'}</p>
                          <p className="text-[10px] text-slate-500">
                            {o.shippingAddress?.city || ''}{o.shippingAddress?.pincode ? `, ${o.shippingAddress.pincode}` : ''}
                          </p>
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-700 max-w-[200px] truncate">
                          {o.items?.map(it => `${it.quantity}x ${it.name}`).join(', ') || 'N/A'}
                        </td>
                        <td className="p-2.5">
                          <span className="font-bold text-slate-800 text-[11px]">
                            {o.paymentInfo?.method || o.paymentMethod || 'PREPAID'}
                          </span>
                          {(() => {
                            const isCod = o.paymentInfo?.method === 'COD' || o.paymentMethod === 'COD';
                            const isCancelled = ['CANCELLED', 'CANCELLATION_REQUESTED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'].includes(o.orderStatus);
                            let payStat = o.paymentInfo?.status || o.paymentStatus || 'PENDING';
                            if (isCod) {
                              if (isCancelled && o.orderStatus !== 'DELIVERED') payStat = 'NOT_APPLICABLE';
                              else if (o.orderStatus !== 'DELIVERED') payStat = 'PENDING';
                            }
                            return (
                              <span className={`block text-[10px] font-bold ${payStat === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {payStat}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                            {formatStatusName(o.orderStatus)}
                          </span>
                        </td>
                        <td className="p-2.5 text-[11px]">
                          {o.shipment?.awbCode ? (
                            <>
                              <p className="font-mono font-bold text-slate-800">{o.shipment.awbCode}</p>
                              <p className="text-[10px] text-slate-500">{o.shipment.courierName || 'Shiprocket'}</p>
                            </>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Pending AWB</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          ₹{o.pricing?.totalAmount || 0}
                        </td>
                      </tr>
                    ))}

                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          No orders found for the selected date range ({getPeriodLabel()}).
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={4} className="p-2.5 text-slate-700 uppercase text-[10px]">
                        Total Aggregate ({orders.length} Orders)
                      </td>
                      <td className="p-2.5 text-slate-800 text-[11px]">
                        {orders.reduce((acc, o) => acc + (o.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 0), 0)} Units Sold
                      </td>
                      <td colSpan={3}></td>
                      <td className="p-2.5 text-right font-mono text-sm text-forest-950 font-black">
                        ₹{orders.reduce((acc, o) => acc + (o.pricing?.totalAmount || 0), 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Official Sign-off & Non-Returnable Compliance Footer */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 font-sans text-xs">
              <div className="max-w-md space-y-1 text-slate-500 text-[10px] leading-relaxed">
                <p className="font-bold text-slate-700 uppercase">Non-Returnable Botanical Care Compliance</p>
                <p>
                  All Novise Herbal personal care formulations are tamper-evident sealed and strictly non-returnable upon doorstep delivery acceptance in compliance with Indian healthcare and cosmetic hygiene standards. Return to Origin (RTO) entries represent undelivered courier logistics exceptions prior to customer handover.
                </p>
              </div>

              <div className="text-right space-y-3 shrink-0">
                <div className="border-b border-slate-400 w-48 pb-1">
                  <p className="text-[10px] text-slate-400">Authorized Signatory & Seal</p>
                </div>
                <p className="font-serif font-bold text-slate-900 text-sm">NOVISE HERBAL PVT. LTD.</p>
              </div>
            </div>
          </div>
        </div>
      ) : selectedOrder ? (
        isViewingComplaintPage && selectedOrder.complaint?.hasComplaint ? (
          /* ====================================================================
             DEDICATED FULL-PAGE CUSTOMER COMPLAINT & VIDEO PROOF INSPECTION VIEW
             ==================================================================== */
          <div className="space-y-6 w-full animate-fadeIn">
            {/* Header Bar */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5 flex-wrap gap-y-2">
                <button
                  type="button"
                  onClick={() => setIsViewingComplaintPage(false)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-forest-950 font-bold text-xs border border-slate-200/80 transition shadow-xs group cursor-pointer"
                  title="Return to order details"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" />
                  <span>Back to Order Details</span>
                </button>

                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900">
                        Delivery Issue & Video Proof
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-amber-100 text-amber-900 border border-amber-300">
                        {selectedOrder.complaint.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Order <strong className="font-mono text-slate-800">#{selectedOrder.orderId || selectedOrder._id}</strong> • Placed by {selectedOrder.shippingAddress?.fullName || 'Customer'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Inspection Card Body */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6">
              {/* Top Banner Notice */}
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Strict Non-Returnable & Non-Replaceable Policy Verification</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Personal care and Ayurvedic formulations are sealed and strictly non-returnable. Please inspect the customer's unboxing video proof below to verify whether transit damage, broken seal, or incorrect bottle dispatch occurred before issuing a direct refund.
                  </p>
                </div>
              </div>

              {/* Grid: Left Video / Photos - Right Customer & Claim Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Video & Media Section */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                        <Video className="w-4 h-4 text-forest-700" />
                        <span>Customer Video Proof</span>
                      </label>
                      {selectedOrder.complaint.videoUrl && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                          Order_Report_Videos
                        </span>
                      )}
                    </div>

                    {selectedOrder.complaint.videoDeletedByAdmin ? (
                      <div className="p-8 rounded-2xl bg-rose-50/80 border-2 border-dashed border-rose-200 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                          <Trash2 className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                          <span className="inline-block px-3 py-0.5 rounded-full text-xs font-extrabold bg-rose-200 text-rose-900 uppercase tracking-wide">
                            Deleted by Admin
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-rose-900">
                          Video proof permanently deleted from Cloudinary folder & database
                        </p>
                        {selectedOrder.complaint.videoDeletedAt && (
                          <p className="text-[11px] text-rose-700/80 font-mono">
                            Deleted on: {new Date(selectedOrder.complaint.videoDeletedAt).toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    ) : selectedOrder.complaint.videoUrl ? (
                      <div className="space-y-2">
                        <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-md aspect-video max-h-[320px] flex items-center justify-center">
                          <video
                            src={selectedOrder.complaint.videoUrl}
                            controls
                            className="w-full h-full object-contain"
                            playsInline
                            preload="metadata"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                          <span>
                            {selectedOrder.complaint.videoDuration
                              ? `Duration: ~${Math.round(selectedOrder.complaint.videoDuration)}s`
                              : '1 Video Attached'}
                          </span>
                          <a
                            href={selectedOrder.complaint.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-forest-800 hover:text-forest-950 font-bold inline-flex items-center space-x-1 underline"
                          >
                            <span>Open In New Tab</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {/* Admin Delete Video Proof from Cloudinary */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={handleDeleteComplaintVideo}
                            disabled={isDeletingComplaintVideo}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[11px] rounded-xl transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            {isDeletingComplaintVideo ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            )}
                            <span>Delete Video</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-center space-y-2">
                        <Video className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">No Video Proof Available</p>
                        <p className="text-[11px] text-slate-400">
                          Video proof has not been uploaded or was permanently removed from Cloudinary folder "NOVISE_HERBAL/Order_Report_Videos".
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Photo Proofs */}
                  {selectedOrder.complaint.images && selectedOrder.complaint.images.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                        Additional Photo Proof ({selectedOrder.complaint.images.length})
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedOrder.complaint.images.map((img, i) => (
                          <a
                            key={i}
                            href={img}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs block"
                          >
                            <img src={img} alt="proof" className="w-full h-full object-cover group-hover:scale-110 transition duration-200" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <ExternalLink className="w-4 h-4 text-white" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Customer Info, Issue details, and Refund details */}
                <div className="space-y-4">
                  {/* Customer Contact Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Customer Contact Details
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Name:</span>
                        <strong className="text-slate-900">{selectedOrder.shippingAddress?.fullName || 'N/A'}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Report Mobile:</span>
                        <strong className="font-mono text-slate-900">
                          {selectedOrder.complaint.customerPhone || selectedOrder.shippingAddress?.phone || 'N/A'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Delivery City:</span>
                        <strong className="text-slate-900">
                          {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}
                        </strong>
                      </div>
                    </div>

                    {/* Quick Call & WhatsApp Action Buttons */}
                    {(selectedOrder.complaint.customerPhone || selectedOrder.shippingAddress?.phone) && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                        <a
                          href={getComplaintWhatsAppUrl(selectedOrder)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href={`tel:${selectedOrder.complaint.customerPhone || selectedOrder.shippingAddress?.phone}`}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Direct Call</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Claim Details Card */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2 text-xs">
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Claim Specification
                    </h4>
                    <div>
                      <span className="text-amber-800 block text-[11px]">Issue Category:</span>
                      <strong className="text-slate-900 font-bold">{selectedOrder.complaint.reason}</strong>
                    </div>
                    <div>
                      <span className="text-amber-800 block text-[11px]">Customer Explanation:</span>
                      <p className="p-2.5 rounded-xl bg-white border border-amber-200 text-slate-800 text-xs italic mt-1 leading-relaxed">
                        "{selectedOrder.complaint.description || 'No detailed note provided.'}"
                      </p>
                    </div>
                    {selectedOrder.complaint.reportedAt && (
                      <div className="flex justify-between text-[11px] text-amber-800 pt-1">
                        <span>Reported At:</span>
                        <strong className="text-slate-900">
                          {new Date(selectedOrder.complaint.reportedAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Bank / UPI Details for Direct Refund (or Direct Contact Info) */}
                  {(selectedOrder.complaint.bankDetails?.accountNumber || selectedOrder.complaint.bankDetails?.upiId) ? (
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2 text-xs">
                      <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Customer Refund Details
                      </h4>
                      {selectedOrder.complaint.bankDetails?.accountNumber && (
                        <div className="space-y-1 text-[11px]">
                          <p><span className="text-slate-500">Beneficiary:</span> <strong>{selectedOrder.complaint.bankDetails.beneficiaryName}</strong></p>
                          <p><span className="text-slate-500">Account:</span> <strong className="font-mono">{selectedOrder.complaint.bankDetails.accountNumber}</strong></p>
                          <p><span className="text-slate-500">IFSC Code:</span> <strong className="font-mono">{selectedOrder.complaint.bankDetails.ifscCode}</strong></p>
                          {selectedOrder.complaint.bankDetails.bankName && (
                            <p><span className="text-slate-500">Bank:</span> <strong>{selectedOrder.complaint.bankDetails.bankName}</strong></p>
                          )}
                        </div>
                      )}
                      {selectedOrder.complaint.bankDetails?.upiId && (
                        <div className="pt-1 text-[11px]">
                          <span className="text-slate-500">UPI ID:</span>{' '}
                          <strong className="font-mono text-emerald-900 font-bold">{selectedOrder.complaint.bankDetails.upiId}</strong>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5 text-xs text-emerald-950">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                        <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          Direct Contact Resolution Mode
                        </h4>
                      </div>
                      <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                        Customer has securely submitted issue details and video proof without disclosing sensitive bank account details. Click <strong>WhatsApp (Auto-Report Msg)</strong> or <strong>Direct Call</strong> above to coordinate with customer directly and finalize refund or replacement.
                      </p>
                    </div>
                  )}

                  {/* Current Resolution State if already resolved */}
                  {selectedOrder.complaint.status === 'RESOLVED' && (
                    <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-xs text-emerald-950 space-y-1">
                      <p className="font-bold">Claim Resolved</p>
                      <p className="text-[11px]">Resolution: <strong>{selectedOrder.complaint.resolutionType}</strong></p>
                      {selectedOrder.complaint.resolutionNotes && (
                        <p className="text-[11px] text-emerald-800">"{selectedOrder.complaint.resolutionNotes}"</p>
                      )}
                    </div>
                  )}
                  {selectedOrder.complaint.status === 'REJECTED' && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-1">
                      <p className="font-bold">Claim Rejected</p>
                      {selectedOrder.complaint.rejectionReason && (
                        <p className="text-[11px] text-rose-800">Reason: "{selectedOrder.complaint.rejectionReason}"</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Inspection Footer with Action Buttons */}
              <div className="p-5 border-t border-slate-100 bg-slate-50/80 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsViewingComplaintPage(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition text-xs cursor-pointer"
                >
                  Close Inspection
                </button>

                {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedOrder.complaint.status || '') && (
                  <div className="flex items-center space-x-2">
                    {selectedOrder.complaint.status === 'SUBMITTED' && (
                      <button
                        type="button"
                        onClick={() => handleReviewComplaint('UNDER_REVIEW')}
                        disabled={isProcessingAction}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                      >
                        Mark Under Review
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowComplaintRejectModal(true)}
                      disabled={isProcessingAction}
                      className="px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Reject Claim
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowComplaintResolveModal(true)}
                      disabled={isProcessingAction}
                      className="px-5 py-2.5 bg-forest-900 hover:bg-forest-800 text-gold-400 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Approve & Issue Refund
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // DEDICATED FULL-PAGE ORDER DETAILS VIEW

          <div className="space-y-6 w-full animate-fadeIn">
            {/* Header Bar */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5 flex-wrap gap-y-2">
                <button
                  onClick={handleBackToOrders}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-forest-950 font-bold text-xs border border-slate-200/80 transition shadow-xs group"
                  title="Return to order list"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" />
                  <span>Back to Orders</span>
                </button>

                <div className="flex items-center space-x-2.5">
                  <h2 className="font-serif text-xl sm:text-2xl font-black text-forest-950 font-mono tracking-tight">
                    {selectedOrder.orderId}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getOrderStatusBadgeClass(selectedOrder.orderStatus)}`}>
                    {formatStatusName(selectedOrder.orderStatus)}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
                <button
                  onClick={() => window.open(`http://localhost:5000/api/orders/${selectedOrder.orderId}/invoice`, '_blank')}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-xs"
                  title="Download Tax Invoice"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Tax Invoice</span>
                </button>

                {selectedOrder.shipment?.awbCode && (
                  <button
                    onClick={() => window.open(`http://localhost:5000/api/shipping/label/${selectedOrder.orderId}`, '_blank')}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-xs"
                    title="Print Shipping Label"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    <span>Shipping Label</span>
                  </button>
                )}

                {!selectedOrder.shipment?.awbCode && !['CANCELLED', 'DELIVERED', 'RETURNED'].includes(selectedOrder.orderStatus) && (
                  <button
                    onClick={() => handleBookShipment(selectedOrder)}
                    disabled={isProcessingAction}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-forest-950 font-black text-xs rounded-xl shadow-md transition transform hover:scale-[1.02]"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Book Shiprocket Courier</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteOrder(selectedOrder._id, selectedOrder.orderId)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 font-bold text-xs transition shadow-xs cursor-pointer"
                  title="Delete Order Record"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Delete Order</span>
                </button>
              </div>
            </div>

            {/* ================================================================
             WORKFLOW ACTION BANNERS (Cancellation, Return, RTO)
             ================================================================ */}

            {/* A. CANCELLATION REQUESTED BANNER */}
            {selectedOrder.orderStatus === 'CANCELLATION_REQUESTED' && (
              <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 shadow-sm space-y-3 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Customer Requested Order Cancellation</h3>
                      <p className="text-xs text-amber-800">
                        Reason: <strong className="font-semibold text-slate-900">{selectedOrder.cancellation?.reason || 'Cancelled by customer'}</strong>
                        {selectedOrder.cancellation?.description ? ` • "${selectedOrder.cancellation.description}"` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleApproveCancellation(selectedOrder)}
                      disabled={isProcessingAction}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Cancellation</span>
                    </button>
                    <button
                      onClick={() => setShowCancelRejectModal(true)}
                      disabled={isProcessingAction}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition flex items-center space-x-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* B. EXCEPTIONAL CUSTOMER COMPLAINT BANNER (Non-Returnable Products: Damage/Defect/Leakage - Compact Summary Bar) */}
            {selectedOrder.complaint?.hasComplaint && (
              <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 shadow-sm animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5 text-amber-900" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Customer Issue Claim: {selectedOrder.complaint.reason}
                      </h3>
                      <p className="text-xs text-amber-800">
                        Description: <strong className="font-semibold text-slate-900">"{selectedOrder.complaint.description || 'No description'}"</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-bold font-mono uppercase self-start sm:self-auto">
                      {selectedOrder.complaint.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsViewingComplaintPage(true)}
                      className="px-3.5 py-1.5 bg-forest-900 hover:bg-forest-800 text-gold-400 font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 shrink-0 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5 text-gold-300" />
                      <span>Review Video Proof & Details</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* C. RTO WORKFLOW BANNER (Non-Returnable Products) */}
            {['RTO_INITIATED', 'IN_TRANSIT_TO_SELLER', 'RTO_IN_TRANSIT', 'RETURNED_TO_SELLER', 'RTO_COMPLETED'].includes(selectedOrder.orderStatus) && (
              <div className="p-5 rounded-3xl bg-orange-50 border-2 border-orange-300 shadow-sm space-y-3 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-200 text-orange-900 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Return to Origin (RTO) Tracking</h3>
                      <p className="text-xs text-orange-800">
                        Reason: <strong className="font-semibold">{selectedOrder.rtoDetails?.reason || 'Delivery refused / unreachable'}</strong>
                        {selectedOrder.rtoDetails?.inspectionNotes ? ` • "${selectedOrder.rtoDetails.inspectionNotes}"` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {selectedOrder.orderStatus === 'RTO_INITIATED' && (
                      <button
                        onClick={() => handleProgressRTO('IN_TRANSIT_TO_SELLER')}
                        disabled={isProcessingAction}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                      >
                        Mark In Transit to Seller
                      </button>
                    )}
                    {['IN_TRANSIT_TO_SELLER', 'RTO_IN_TRANSIT'].includes(selectedOrder.orderStatus) && (
                      <button
                        onClick={() => handleProgressRTO('RETURNED_TO_SELLER')}
                        disabled={isProcessingAction}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                      >
                        Mark Returned to Seller Warehouse
                      </button>
                    )}
                    {selectedOrder.orderStatus === 'RETURNED_TO_SELLER' && (
                      <button
                        onClick={() => setShowRTOInspectionModal(true)}
                        disabled={isProcessingAction}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Inspect Product & Complete RTO</span>
                      </button>
                    )}
                    {selectedOrder.orderStatus === 'RTO_COMPLETED' && (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                        RTO Completed ({selectedOrder.rtoDetails?.condition === 'SELLABLE' ? 'Restocked' : 'Damaged / Not Restocked'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Two-Column Responsive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left / Main Details Column (2 spans) */}
              <div className="lg:col-span-2 space-y-6">

                {/* 1. ORDER LIFECYCLE & FORWARD STATUS CONTROLLER */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Order Fulfillment Status
                      </span>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">
                        Current Status: <span className="font-bold text-forest-950">{formatStatusName(selectedOrder.orderStatus)}</span>
                      </p>
                    </div>

                    {/* Custom Luxury Order Status Dropdown */}
                    <div className="flex items-center space-x-2.5">
                      <span className="text-xs font-bold text-slate-500">Update Status:</span>

                      {['CANCELLED', 'RTO_COMPLETED'].includes(selectedOrder.orderStatus) ? (
                        <div className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatStatusName(selectedOrder.orderStatus)} (Closed)</span>
                        </div>
                      ) : (
                        <div className="relative" ref={orderStatusDropdownRef}>
                          <button
                            type="button"
                            onClick={() => !isProcessingAction && setIsOrderStatusOpen(!isOrderStatusOpen)}
                            disabled={isProcessingAction}
                            className={`inline-flex items-center justify-between space-x-3 px-4 py-2 rounded-2xl border transition-all shadow-xs hover:shadow-sm cursor-pointer min-w-[210px] bg-white ${isOrderStatusOpen
                              ? 'border-forest-900 ring-2 ring-forest-900/10'
                              : 'border-slate-200 hover:border-slate-300'
                              }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className={`w-2.5 h-2.5 rounded-full ${getStatusDotClass(selectedOrder.orderStatus)} shrink-0 shadow-xs`}></span>
                              <span className="font-serif font-bold text-xs text-forest-950 truncate tracking-tight">
                                {formatStatusName(selectedOrder.orderStatus)}
                              </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOrderStatusOpen ? 'rotate-180 text-forest-900' : ''}`} />
                          </button>

                          {isOrderStatusOpen && (
                            <div className="absolute right-0 mt-2 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 animate-fadeIn overflow-hidden">
                              <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Lifecycle Progression</span>
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                                  Select Valid Step
                                </span>
                              </div>

                              <div className="max-h-80 overflow-y-auto no-scrollbar py-1 divide-y divide-slate-50">
                                {ALL_ORDER_STATUSES.map((item) => {
                                  const isCurrent = selectedOrder.orderStatus === item.value;
                                  const { allowed, reason } = checkStatusTransition(selectedOrder.orderStatus, item.value);

                                  return (
                                    <button
                                      key={item.value}
                                      type="button"
                                      disabled={!allowed || isProcessingAction}
                                      onClick={() => {
                                        if (allowed) {
                                          setIsOrderStatusOpen(false);
                                          handleOrderStatusUpdate(selectedOrder, item.value);
                                        }
                                      }}
                                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition ${isCurrent
                                        ? 'bg-forest-900/5 text-forest-950 font-bold border-l-4 border-forest-900 cursor-default'
                                        : allowed
                                          ? 'hover:bg-[#FAF8F5] text-slate-800 hover:text-forest-950 font-medium cursor-pointer group'
                                          : 'opacity-40 text-slate-400 cursor-not-allowed bg-slate-50/40'
                                        }`}
                                    >
                                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                                        <span className={`w-2 h-2 rounded-full ${item.dot} shrink-0`}></span>
                                        <div className="truncate">
                                          <p className={`truncate ${isCurrent ? 'font-bold text-forest-950' : 'font-medium text-slate-800'}`}>
                                            {item.label}
                                          </p>
                                          <p className="text-[10px] text-slate-400 truncate">{item.stage}</p>
                                        </div>
                                      </div>

                                      <div className="shrink-0 flex items-center space-x-1.5">
                                        {isCurrent && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest-900 text-gold-400">
                                            Current
                                          </span>
                                        )}
                                        {!isCurrent && allowed && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 group-hover:bg-emerald-200 transition">
                                            Allowed
                                          </span>
                                        )}
                                        {!isCurrent && !allowed && (
                                          <span className="flex items-center space-x-1 text-[10px] text-slate-400 font-medium">
                                            <Lock className="w-2.5 h-2.5" />
                                            <span>{reason || 'Locked'}</span>
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Action trigger for RTO if in transit / out for delivery */}
                  {['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(selectedOrder.orderStatus) && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setShowRTOModal(true)}
                        className="px-3.5 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold text-xs rounded-xl border border-orange-300 transition flex items-center space-x-1.5"
                      >
                        <Truck className="w-3.5 h-3.5 text-orange-700" />
                        <span>Initiate RTO (Customer Refused / Delivery Failed)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. ORDERED PRODUCTS & FINANCIAL BREAKDOWN */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Package className="w-5 h-5 text-forest-900" />
                      <h3 className="font-serif text-lg font-bold text-forest-950">
                        Ordered Products ({selectedOrder.items?.length || 0})
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(selectedOrder.createdAt).toLocaleDateString()} at {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                        <div className="flex items-center space-x-3.5 min-w-0">
                          <img
                            src={getFullImageUrl(item.image)}
                            alt={item.name}
                            className="w-14 h-14 rounded-2xl object-cover bg-slate-50 border border-slate-100 shrink-0 shadow-xs"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                            }}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              SKU: {item.sku || 'N/A'} • Qty: {item.quantity} × ₹{item.price}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-forest-950 text-base">₹{item.price * item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculation Breakdown */}
                  <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-700">₹{selectedOrder.pricing?.subtotal}</span>
                    </div>
                    {selectedOrder.pricing?.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Discount</span>
                        <span>-₹{selectedOrder.pricing?.discountAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>Shipping & Packaging</span>
                      <span className="font-medium text-slate-700">
                        {selectedOrder.pricing?.shippingFee === 0 ? 'FREE' : `₹${selectedOrder.pricing?.shippingFee}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-forest-950 pt-2 border-t border-slate-100">
                      <span>Total Amount</span>
                      <span className="text-lg text-forest-950 font-black">₹{selectedOrder.pricing?.totalAmount || selectedOrder.pricing?.finalTotal}</span>
                    </div>
                  </div>
                </div>

                {/* 4. SHIPROCKET LOGISTICS */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/80">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-bold text-forest-950">Shiprocket Logistics</h3>
                        <p className="text-xs text-slate-500">Live courier tracking & AWB lifecycle events</p>
                      </div>
                    </div>

                    {selectedOrder.shipment?.awbCode ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>AWB Assigned</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                        Awaiting Courier Booking
                      </span>
                    )}
                  </div>

                  {selectedOrder.shipment?.awbCode ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold block text-[10px] uppercase">AWB Tracking Code</span>
                        <span className="font-mono font-bold text-forest-950 text-sm mt-0.5 block">
                          {selectedOrder.shipment.awbCode}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block text-[10px] uppercase">Courier Partner</span>
                        <span className="font-bold text-amber-900 text-sm mt-0.5 block">
                          {selectedOrder.shipment.courierName || 'Shiprocket Surface'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block text-[10px] uppercase">Estimated Delivery</span>
                        <span className="font-bold text-forest-950 text-sm mt-0.5 block">
                          {selectedOrder.shipment.estimatedDeliveryDate
                            ? new Date(selectedOrder.shipment.estimatedDeliveryDate).toLocaleDateString()
                            : '3-5 Business Days'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <p className="text-slate-600">
                        Order is ready for logistics pickup. Generate courier shipment label via Shiprocket API.
                      </p>
                      <button
                        onClick={() => handleBookShipment(selectedOrder)}
                        disabled={isProcessingAction || ['CANCELLED', 'DELIVERED'].includes(selectedOrder.orderStatus)}
                        className="px-4 py-2 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-forest-950 font-black rounded-xl shadow-sm transition disabled:opacity-50 shrink-0"
                      >
                        Book Courier Now
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. AUDIT & TRACKING TIMELINE */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-serif text-lg font-bold text-forest-950">Audit & Tracking Timeline</h3>
                    <span className="text-xs text-slate-400 font-mono">
                      {((selectedOrder.trackingTimeline?.length || 0) + (selectedOrder.timeline?.length || 0))} events recorded
                    </span>
                  </div>

                  <div className="space-y-4 max-h-80 overflow-y-auto no-scrollbar pr-2">
                    {((selectedOrder.timeline && selectedOrder.timeline.length > 0)
                      ? selectedOrder.timeline
                      : (selectedOrder.trackingTimeline || [])
                    ).map((t: any, idx: number) => (
                      <div key={idx} className="flex items-start space-x-3 text-xs">
                        <div className="w-6 h-6 rounded-full bg-forest-50 border border-forest-200 text-forest-900 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                          {idx + 1}
                        </div>
                        <div className="flex-1 pb-3 border-b border-slate-100 last:border-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-forest-950 text-sm">{t.title}</span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {new Date(t.timestamp || t.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {t.description && (
                            <p className="text-slate-600 mt-1">{t.description}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-400">
                            <span>Author: <strong className="text-slate-600">{t.updatedBy || t.author || 'SYSTEM'}</strong></span>
                            {t.location && <span>• Location: {t.location}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column / Sidebar (Payment, Refund, Customer, Address) */}
              <div className="space-y-6">

                {/* PAYMENT STATUS & CONTROLLER */}
                {(() => {
                  const isSelectedOrderCod = selectedOrder.paymentInfo?.method === 'COD' || selectedOrder.paymentMethod === 'COD';
                  const isSelectedOrderCancelledBeforeDel = ['CANCELLED', 'CANCELLATION_REQUESTED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'].includes(selectedOrder.orderStatus);
                  const isSelectedOrderCodCancelled = isSelectedOrderCod && isSelectedOrderCancelledBeforeDel && selectedOrder.orderStatus !== 'DELIVERED';
                  
                  let currentPayStatus = selectedOrder.paymentInfo?.status || selectedOrder.paymentStatus || 'PENDING';
                  if (isSelectedOrderCod) {
                    if (isSelectedOrderCodCancelled) {
                      currentPayStatus = 'NOT_APPLICABLE';
                    } else if (selectedOrder.orderStatus !== 'DELIVERED') {
                      currentPayStatus = 'PENDING';
                    }
                  }

                  return (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-4 h-4 text-forest-900" />
                          <h4 className="font-serif text-base font-bold text-forest-950">Payment Status</h4>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${getPaymentStatusBadgeClass(currentPayStatus)}`}>
                          {currentPayStatus.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="border-t border-slate-100 pt-3 space-y-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 font-semibold shrink-0">Update Payment:</span>

                          {isSelectedOrderCodCancelled ? (
                            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-semibold text-xs shadow-2xs">
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Not Applicable (₹0 Collected)</span>
                            </div>
                          ) : (
                            /* Custom Luxury Payment Dropdown */
                            <div className="relative" ref={paymentStatusDropdownRef}>
                              <button
                                type="button"
                                onClick={() => !isProcessingAction && setIsPaymentStatusOpen(!isPaymentStatusOpen)}
                                disabled={isProcessingAction}
                                className={`inline-flex items-center justify-between space-x-2 px-3.5 py-1.5 rounded-xl border transition-all shadow-xs hover:shadow-sm cursor-pointer min-w-[130px] bg-white ${isPaymentStatusOpen
                                  ? 'border-forest-900 ring-2 ring-forest-900/10'
                                  : 'border-slate-200 hover:border-slate-300'
                                  }`}
                              >
                                <div className="flex items-center space-x-2 truncate">
                                  <span className={`w-2 h-2 rounded-full ${getPaymentStatusDot(currentPayStatus)} shrink-0`}></span>
                                  <span className="font-serif font-bold text-xs text-forest-950 truncate tracking-tight">
                                    {currentPayStatus}
                                  </span>
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isPaymentStatusOpen ? 'rotate-180 text-forest-900' : ''}`} />
                              </button>

                              {isPaymentStatusOpen && (
                                <div className="absolute right-0 mt-2 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 animate-fadeIn overflow-hidden">
                                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Select Payment Status
                                  </div>
                                  <div className="py-1">
                                    {ALL_PAYMENT_STATUSES.map((opt) => {
                                      const isCurrent = currentPayStatus === opt.value;
                                      const isPaidLockedForCod = isSelectedOrderCod && selectedOrder.orderStatus !== 'DELIVERED' && opt.value === 'PAID';
                                      const isRefundLockedForCod = isSelectedOrderCod && selectedOrder.orderStatus !== 'DELIVERED' && opt.value === 'REFUNDED';
                                      const isOptionDisabled = isProcessingAction || isPaidLockedForCod || isRefundLockedForCod;

                                      return (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          disabled={isOptionDisabled}
                                          onClick={() => {
                                            if (!isOptionDisabled) {
                                              setIsPaymentStatusOpen(false);
                                              handlePaymentStatusUpdate(selectedOrder, opt.value);
                                            }
                                          }}
                                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition ${
                                            isCurrent
                                              ? 'bg-forest-900/5 text-forest-950 font-bold border-l-4 border-forest-900 cursor-default'
                                              : isOptionDisabled
                                                ? 'opacity-40 text-slate-400 bg-slate-50/50 cursor-not-allowed'
                                                : 'hover:bg-[#FAF8F5] text-slate-700 hover:text-forest-950 font-medium cursor-pointer'
                                          }`}
                                        >
                                          <div className="space-y-0.5 min-w-0 pr-2">
                                            <div className="flex items-center space-x-2">
                                              <span className={`w-2 h-2 rounded-full ${opt.dot} shrink-0`}></span>
                                              <span className="font-bold text-slate-900">{opt.label}</span>
                                              {isPaidLockedForCod && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">
                                                  Upon Delivery
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-[10px] text-slate-400 truncate pl-4">
                                              {isPaidLockedForCod ? 'Only available when order is Delivered' : opt.desc}
                                            </p>
                                          </div>
                                          {isCurrent && <Check className="w-4 h-4 text-forest-900 shrink-0" />}
                                          {isOptionDisabled && !isCurrent && <Lock className="w-3 h-3 text-slate-400 shrink-0" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {isSelectedOrderCod && selectedOrder.orderStatus !== 'DELIVERED' && !isSelectedOrderCancelledBeforeDel && (
                          <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-[11px] leading-relaxed flex items-start space-x-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                            <span><strong>Cash on Delivery (Pending):</strong> Payment status remains <strong>Pending</strong> until courier delivers parcel at doorstep and collects cash.</span>
                          </div>
                        )}

                        {isSelectedOrderCodCancelled && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 text-[11px] leading-relaxed">
                            <strong>Cash on Delivery (₹0 Collected):</strong> This order was cancelled before doorstep delivery. Since no payment was collected from the customer, payment status is locked to <strong>Not Applicable</strong>.
                          </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Method</span>
                            <span className="font-bold text-forest-950">
                              {selectedOrder.paymentInfo?.method === 'COD' || selectedOrder.paymentMethod === 'COD' ? 'Cash On Delivery' : 'Online Prepaid (Razorpay)'}
                            </span>
                          </div>
                          {selectedOrder.paymentInfo?.razorpayPaymentId && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Payment ID</span>
                              <span className="font-mono text-slate-700 text-[11px]">{selectedOrder.paymentInfo.razorpayPaymentId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* DEDICATED REFUND MANAGEMENT CARD */}
                {(() => {
                  const isSelectedOrderCod = selectedOrder.paymentInfo?.method === 'COD' || selectedOrder.paymentMethod === 'COD';
                  const isSelectedOrderCancelledBeforeDel = ['CANCELLED', 'CANCELLATION_REQUESTED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'].includes(selectedOrder.orderStatus);
                  const isSelectedOrderCodCancelled = isSelectedOrderCod && isSelectedOrderCancelledBeforeDel && selectedOrder.orderStatus !== 'DELIVERED';

                  return (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-emerald-700" />
                          <h4 className="font-serif text-base font-bold text-forest-950">Refund Tracking</h4>
                        </div>
                        {isSelectedOrderCodCancelled ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                            NOT APPLICABLE
                          </span>
                        ) : selectedOrder.refundInfo?.status && selectedOrder.refundInfo.status !== 'NONE' ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${getRefundStatusBadgeClass(selectedOrder.refundInfo.status)}`}>
                            {selectedOrder.refundInfo.status.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No active refund</span>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-3 space-y-3 text-xs">
                        {isSelectedOrderCodCancelled ? (
                          <div className="space-y-3">
                            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                              <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                                <span>No Refund Applicable (Cash on Delivery)</span>
                              </div>
                              <p className="text-[11px] text-amber-800 leading-relaxed">
                                This order was cancelled before doorstep delivery. Because the order was Cash on Delivery, <strong>no cash was collected (₹0)</strong>. Customer paid ₹0, so no refund is due or permitted.
                              </p>
                            </div>
                            <div className="flex justify-between text-slate-500 pt-1">
                              <span>Amount Collected from Customer</span>
                              <span className="font-bold text-slate-800">₹0</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Refund Amount Required</span>
                              <span className="font-bold text-slate-800">₹0 (Not Applicable)</span>
                            </div>
                            <div className="pt-1">
                              <button
                                disabled
                                className="w-full py-2 bg-slate-100 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed flex items-center justify-center space-x-1.5"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Refund Locked (₹0 Collected)</span>
                              </button>
                            </div>
                          </div>
                        ) : selectedOrder.refundInfo && selectedOrder.refundInfo.status !== 'NONE' ? (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Refund Amount</span>
                              <span className="font-bold text-forest-950">₹{selectedOrder.refundInfo.amount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Settlement Destination</span>
                              <span className="font-semibold text-slate-800">
                                {selectedOrder.refundInfo.method || (selectedOrder.paymentMethod === 'COD' ? 'Bank Account / UPI' : 'Original Source')}
                              </span>
                            </div>
                            {selectedOrder.refundInfo.transactionId && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Transaction Ref</span>
                                <span className="font-mono text-slate-800">{selectedOrder.refundInfo.transactionId}</span>
                              </div>
                            )}
                            {selectedOrder.refundInfo.failureReason && (
                              <p className="text-rose-700 bg-rose-50 p-2 rounded-lg text-[11px]">
                                Failure: {selectedOrder.refundInfo.failureReason}
                              </p>
                            )}
                            <div className="pt-2">
                              <button
                                onClick={() => setShowRefundModal(true)}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition"
                              >
                                Update Refund Status / Reference
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-slate-500 text-[11px]">
                              Refunds are automatically triggered upon Order Cancellation or approved transit damage claim.
                            </p>
                            <div className="pt-2">
                              <button
                                onClick={() => setShowRefundModal(true)}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition"
                              >
                                Update Refund Status / Reference
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Customer Profile Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-forest-900 text-gold-400 font-bold flex items-center justify-center text-sm shadow-xs border border-gold-500/30">
                      {selectedOrder.customerDetails?.fullName?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      <h4 className="font-serif text-base font-bold text-forest-950">Customer Profile</h4>
                      <p className="text-xs text-slate-400 font-mono">Verified Customer</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Full Name</span>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedOrder.customerDetails?.fullName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Email Address</span>
                      <p className="font-medium text-slate-700 mt-0.5">{selectedOrder.customerDetails?.email}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Phone Number</span>
                      <p className="font-medium text-slate-700 mt-0.5 font-mono">{selectedOrder.customerDetails?.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Delivery Address Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200/80">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <h4 className="font-serif text-base font-bold text-forest-950">Delivery Destination</h4>
                  </div>

                  <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3 text-slate-700">
                    <p className="font-bold text-slate-900 text-sm">
                      {selectedOrder.shippingAddress?.fullName}
                    </p>
                    <p className="text-slate-500 text-[11px] font-mono">
                      Phone: {selectedOrder.shippingAddress?.phone}
                    </p>
                    <p className="text-slate-600 leading-relaxed mt-1">
                      {selectedOrder.shippingAddress?.addressLine1}
                      {selectedOrder.shippingAddress?.addressLine2 && `, ${selectedOrder.shippingAddress.addressLine2}`}
                      {selectedOrder.shippingAddress?.landmark && ` (Near ${selectedOrder.shippingAddress.landmark})`}
                    </p>
                    <p className="font-bold text-forest-950">
                      {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}
                    </p>
                    <p className="text-slate-400 text-[11px]">{selectedOrder.shippingAddress?.country || 'India'}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )
      ) : (
        /* ====================================================================
           ORDERS TABLE LIST VIEW
           ==================================================================== */
        <>
          {/* Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-800">
                Order Lifecycle & Logistics Fulfillment
              </h2>
              <p className="text-xs text-slate-500">
                Manage order workflow, courier tracking, cancellation reviews, customer damage claims & refunds, and RTO processing.
              </p>
            </div>
          </div>

          {/* 1. Date & Time Selection Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar text-xs">
              <span className="text-slate-400 font-bold text-[11px] uppercase mr-1 hidden sm:inline">Time Range:</span>
              {(
                [
                  { id: 'ALL', label: 'All Time' },
                  { id: 'TODAY', label: 'Today' },
                  { id: 'THIS_WEEK', label: 'This Week' },
                  { id: 'THIS_MONTH', label: 'This Month' },
                  { id: 'THIS_YEAR', label: 'This Year' },
                ] as { id: DatePeriod; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedPeriod(tab.id);
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer text-xs ${selectedPeriod === tab.id
                    ? 'bg-forest-900 text-gold-400 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                >
                  {tab.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowCustomDateModal(true)}
                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer text-xs ${selectedPeriod === 'CUSTOM'
                  ? 'bg-forest-900 text-gold-400 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {selectedPeriod === 'CUSTOM' && (customStartDate || customEndDate)
                    ? `${customStartDate || '...'} - ${customEndDate || '...'}`
                    : 'Custom Range'}
                </span>
              </button>
            </div>

            {/* Global Actions: Download PDF Report & Refresh */}
            <div className="flex items-center space-x-2 shrink-0 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 bg-gradient-to-r from-forest-900 to-forest-950 hover:from-forest-950 hover:to-black text-gold-400 font-bold text-xs rounded-xl shadow-xs transition group cursor-pointer border border-gold-400/20"
                title="Generate & Download Formatted PDF Report"
              >
                <Download className="w-4 h-4 text-gold-300 group-hover:scale-110 transition" />
                <span>Download PDF Report</span>
              </button>

              <button
                type="button"
                onClick={() => fetchOrders()}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                title="Refresh Orders Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 2. Top Metric / Stat KPI Small Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Card 1: Total Orders */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
                <div className="w-8 h-8 rounded-xl bg-forest-900/10 text-forest-900 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <p className="font-serif text-2xl font-black text-forest-950">
                {orderSummary.totalOrders}
              </p>
              <p className="text-[11px] font-semibold text-emerald-700 mt-1 truncate">
                ₹{orderSummary.totalRevenue.toLocaleString('en-IN')} gross sales
              </p>
            </div>

            {/* Card 2: Delivered */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Delivered</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="font-serif text-2xl font-black text-emerald-900">
                {orderSummary.deliveredCount}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">
                {orderSummary.totalOrders > 0
                  ? `${Math.round((orderSummary.deliveredCount / orderSummary.totalOrders) * 100)}% Fulfilled`
                  : '0% Fulfilled'}
              </p>
            </div>

            {/* Card 3: In Logistics / In Transit */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">In Logistics</span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <p className="font-serif text-2xl font-black text-blue-900">
                {orderSummary.inTransitCount}
              </p>
              <p className="text-[11px] font-semibold text-blue-600 mt-1">
                In Transit & Delivery
              </p>
            </div>

            {/* Card 4: Cancelled */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cancelled</span>
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Ban className="w-4 h-4" />
                </div>
              </div>
              <p className="font-serif text-2xl font-black text-rose-900">
                {orderSummary.cancelledCount}
              </p>
              <p className="text-[11px] font-semibold text-rose-600 mt-1">
                {orderSummary.totalOrders > 0
                  ? `${Math.round((orderSummary.cancelledCount / orderSummary.totalOrders) * 100)}% Cancelled`
                  : '0% Cancelled'}
              </p>
            </div>

            {/* Card 5: RTO (Return to Origin) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">RTO / Failed</span>
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
              </div>
              <p className="font-serif text-2xl font-black text-orange-900">
                {orderSummary.rtoCount}
              </p>
              <p className="text-[11px] font-semibold text-orange-600 mt-1">
                Courier delivery failed
              </p>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1 text-xs">
            <button
              onClick={() => { setActiveTab('ALL'); setSelectedStatus('ALL'); }}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition ${activeTab === 'ALL'
                ? 'bg-forest-900 text-gold-400 shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              All Orders ({orders.length})
            </button>

            <button
              onClick={() => { setActiveTab('CANCELLATIONS'); setSelectedStatus('CANCELLATION_REQUESTED'); }}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${activeTab === 'CANCELLATIONS'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cancellation Requests</span>
            </button>

            <button
              onClick={() => { setActiveTab('COMPLAINTS'); setSelectedStatus('ALL'); }}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${activeTab === 'COMPLAINTS'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Customer Damage Claims</span>
            </button>

            <button
              onClick={() => { setActiveTab('RTO'); setSelectedStatus('ALL'); }}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${activeTab === 'RTO'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>RTO (Return to Origin)</span>
            </button>

            <button
              onClick={() => { setActiveTab('DELIVERED'); setSelectedStatus('DELIVERED'); }}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition ${activeTab === 'DELIVERED'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              Delivered
            </button>

            <button
              onClick={() => { setActiveTab('CANCELLED'); setSelectedStatus('CANCELLED'); }}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition ${activeTab === 'CANCELLED'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              Cancelled
            </button>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Order ID, AWB, Customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-forest-900"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <span className="text-slate-500 font-semibold">Filter Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 bg-[#FAF8F5] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-forest-900 cursor-pointer"
              >
                <option value="ALL">All Statuses (12 Lifecycle Steps)</option>
                <option value="PLACED">Placed</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PACKED">Packed</option>
                <option value="SHIPMENT_BOOKED">Shipment Booked (AWB)</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="DELIVERED">Delivered (Terminal)</option>
                <option value="CANCELLED">Cancelled (Terminal)</option>
                <option value="RTO_INITIATED">RTO Initiated</option>
                <option value="IN_TRANSIT_TO_SELLER">In Transit to Seller</option>
                <option value="RETURNED_TO_SELLER">Returned to Seller Warehouse</option>
                <option value="RTO_COMPLETED">RTO Completed (Terminal)</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FAF8F5] text-slate-500 uppercase text-xs font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4">Order ID / Date</th>
                    <th className="p-4">Customer Details</th>
                    <th className="p-4">Amount / Payment</th>
                    <th className="p-4">Delivery Status</th>
                    <th className="p-4">Carrier & AWB</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">Loading orders...</td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">No matching orders found.</td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => (
                      <tr
                        key={order._id}
                        onClick={() => handleSelectOrder(order)}
                        className="hover:bg-slate-50/80 transition cursor-pointer group"
                      >
                        <td className="p-4">
                          <p className="font-mono font-bold text-forest-900 group-hover:text-gold-600 transition flex items-center space-x-1.5">
                            <span>{order.orderId}</span>
                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-forest-900" />
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </td>

                        <td className="p-4">
                          <p className="font-bold text-slate-800">{order.customerDetails?.fullName}</p>
                          <p className="text-[10px] text-slate-400">{order.shippingAddress?.city}, {order.shippingAddress?.pincode}</p>
                        </td>

                        <td className="p-4">
                          <p className="font-bold text-slate-900">₹{order.pricing?.totalAmount || order.pricing?.finalTotal}</p>
                          <div className="flex items-center space-x-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-semibold text-slate-500">
                              {order.paymentInfo?.method || order.paymentMethod || 'ONLINE'}:
                            </span>
                            {(() => {
                              const isCod = order.paymentInfo?.method === 'COD' || order.paymentMethod === 'COD';
                              const isCancelledBeforeDelivery = ['CANCELLED', 'CANCELLATION_REQUESTED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'].includes(order.orderStatus);
                              const isCodCancelled = isCod && isCancelledBeforeDelivery && order.orderStatus !== 'DELIVERED';
                              let displayStatus = order.paymentInfo?.status || order.paymentStatus || 'PENDING';
                              if (isCod) {
                                if (isCodCancelled) {
                                  displayStatus = 'NOT_APPLICABLE';
                                } else if (order.orderStatus !== 'DELIVERED') {
                                  displayStatus = 'PENDING';
                                }
                              }
                              return (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPaymentStatusBadgeClass(displayStatus)}`}>
                                  {displayStatus.replace(/_/g, ' ')}
                                </span>
                              );
                            })()}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getOrderStatusBadgeClass(order.orderStatus)}`}>
                            {formatStatusName(order.orderStatus)}
                          </span>
                        </td>

                        <td className="p-4 font-mono">
                          {order.shipment?.awbCode ? (
                            <div>
                              <p className="font-bold text-forest-900 text-xs">{order.shipment.awbCode}</p>
                              <p className="text-[10px] text-slate-400">{order.shipment.courierName}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Awaiting Booking</span>
                          )}
                        </td>

                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-2">
                            {order.orderStatus === 'CANCELLATION_REQUESTED' ? (
                              <button
                                onClick={() => handleSelectOrder(order)}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition"
                              >
                                Review Cancel
                              </button>
                            ) : order.complaint?.hasComplaint && order.complaint?.status === 'SUBMITTED' ? (
                              <button
                                onClick={() => handleSelectOrder(order)}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition"
                              >
                                Review Claim
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSelectOrder(order)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition"
                              >
                                Manage
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteOrder(order._id, order.orderId)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Order Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredOrders.length > 0 && (
              <AdminPagination
                currentPage={currentPage}
                totalItems={filteredOrders.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="orders"
              />
            )}
          </div>
        </>
      )
      }

      {/* ====================================================================
         MODALS & DIALOGS
         ==================================================================== */}

      {/* 1. Cancellation Rejection Modal */}
      {showCancelRejectModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-serif text-lg font-bold text-slate-900">Reject Cancellation Request</h3>
              <button onClick={() => setShowCancelRejectModal(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600">
              The order will revert to its fulfillment status (Packed / Shipment Booked) and continue forward.
            </p>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Reason for Rejection *</label>
              <textarea
                rows={3}
                placeholder="e.g. Parcel has already been handed over to courier dispatch..."
                value={cancelRejectionReason}
                onChange={(e) => setCancelRejectionReason(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-forest-900"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCancelRejectModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectCancellation}
                disabled={isProcessingAction}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. Customer Damage Claim Rejection Modal */}
      {showComplaintRejectModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-serif text-lg font-bold text-slate-900">Reject Customer Claim</h3>
              <button onClick={() => setShowComplaintRejectModal(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600">
              Explain why this damage/defect claim is being rejected (e.g. proof images indicate user mishandling, seal was broken post-delivery, or report exceeded 48-hour window).
            </p>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Reason for Rejection *</label>
              <textarea
                rows={3}
                placeholder="State rejection reason clearly for customer..."
                value={complaintRejectionReason}
                onChange={(e) => setComplaintRejectionReason(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-forest-900"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowComplaintRejectModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReviewComplaint('REJECT')}
                disabled={isProcessingAction}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. Customer Damage Claim Resolution Modal */}
      {showComplaintResolveModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-serif text-lg font-bold text-slate-900">Resolve Customer Claim</h3>
              <button onClick={() => setShowComplaintResolveModal(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Resolution *</label>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-950 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Approved Direct Refund (Items are strictly Non-Returnable & Non-Replaceable)</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Resolution Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved 100% refund for verified transit leakage..."
                  value={complaintResolutionNotes}
                  onChange={(e) => setComplaintResolutionNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowComplaintResolveModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReviewComplaint('RESOLVE')}
                disabled={isProcessingAction}
                className="px-5 py-2 bg-forest-900 hover:bg-forest-800 text-gold-400 font-bold rounded-xl"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}



      {/* 4. RTO Product Warehouse Inspection Modal */}
      {showRTOInspectionModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-700" />
                <h3 className="font-serif text-lg font-bold text-slate-900">Inspect Returned RTO Parcel</h3>
              </div>
              <button onClick={() => setShowRTOInspectionModal(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600">
              Verify the condition of the personal care products in this returned parcel. Personal care items may only be restocked if sealed and undamaged.
            </p>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Product Condition *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRtoCondition('SELLABLE')}
                    className={`p-3 rounded-xl border text-left transition ${rtoCondition === 'SELLABLE'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <p className="font-bold text-emerald-900">Sellable Condition</p>
                    <p className="text-[10px] text-emerald-700 mt-0.5">Seals intact. Automatically restock inventory.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRtoCondition('DAMAGED_UNSELLABLE')}
                    className={`p-3 rounded-xl border text-left transition ${rtoCondition === 'DAMAGED_UNSELLABLE'
                      ? 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <p className="font-bold text-rose-900">Damaged / Unsellable</p>
                    <p className="text-[10px] text-rose-700 mt-0.5">Broken seal or leaked. Do NOT restock.</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Inspection Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Outer cardboard box bent, bottles intact with tamper seal..."
                  value={rtoNotes}
                  onChange={(e) => setRtoNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRTOInspectionModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteRTO}
                disabled={isProcessingAction}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
              >
                Complete RTO & Finalize
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. RTO Initiation Modal */}
      {showRTOModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-200 text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Initiate Return to Origin (RTO)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Order #{selectedOrder?.orderId} &bull; Non-deliverable shipment return
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRTOModal(false);
                  setIsRtoReasonDropdownOpen(false);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown Selector Area */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Reason for Return to Origin (RTO) *</span>
                <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
                  Required for Courier
                </span>
              </label>

              {/* Luxury Custom Dropdown */}
              <div className="relative" ref={rtoReasonDropdownRef}>
                {(() => {
                  const activeReason = RTO_REASONS.find(r => r.value === rtoReason) || RTO_REASONS[0];
                  const ActiveIcon = activeReason.icon;
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsRtoReasonDropdownOpen(!isRtoReasonDropdownOpen)}
                        className={`w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all shadow-xs cursor-pointer bg-white text-left ${isRtoReasonDropdownOpen
                          ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-md'
                          : 'border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${activeReason.iconBg}`}>
                            <ActiveIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                              {activeReason.label}
                            </p>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${activeReason.badgeClass}`}>
                                {activeReason.badge}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                                {activeReason.short}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center pl-2">
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isRtoReasonDropdownOpen ? 'rotate-180 text-orange-600' : ''}`} />
                        </div>
                      </button>

                      {/* Dropdown Options Popover */}
                      {isRtoReasonDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 animate-fadeIn overflow-hidden">
                          <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Select Exact Failure Reason</span>
                            <span className="text-[10px] text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full font-semibold">
                              4 Options Available
                            </span>
                          </div>

                          <div className="max-h-64 sm:max-h-72 overflow-y-auto no-scrollbar py-1 divide-y divide-slate-50">
                            {RTO_REASONS.map((item) => {
                              const isSelected = rtoReason === item.value;
                              const ItemIcon = item.icon;
                              return (
                                <button
                                  key={item.value}
                                  type="button"
                                  onClick={() => {
                                    setRtoReason(item.value);
                                    setIsRtoReasonDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3.5 py-2.5 sm:py-3 flex items-start justify-between text-xs transition cursor-pointer ${isSelected
                                    ? 'bg-orange-50/70 border-l-4 border-orange-600 text-orange-950 font-medium'
                                    : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                                    }`}
                                >
                                  <div className="flex items-start space-x-3 min-w-0 pr-2">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item.iconBg}`}>
                                      <ItemIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center space-x-2">
                                        <p className={`text-xs ${isSelected ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                                          {item.label}
                                        </p>
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border shrink-0 ${item.badgeClass}`}>
                                          {item.badge}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                        {item.desc}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="shrink-0 pt-1">
                                    {isSelected ? (
                                      <div className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-xs">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      </div>
                                    ) : (
                                      <div className="w-4 h-4 rounded-full border border-slate-300" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Quick-Select Cards (Responsive 2x2 grid for instant 1-tap switching) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Select Reason</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {RTO_REASONS.map((item) => {
                  const isSelected = rtoReason === item.value;
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setRtoReason(item.value);
                        setIsRtoReasonDropdownOpen(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2.5 cursor-pointer ${isSelected
                        ? item.borderActiveClass
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}>
                        <ItemIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-bold truncate ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {item.short}
                        </p>
                        <p className="text-[9px] text-slate-400 truncate">
                          {item.badge}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Summary / Info Note */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start space-x-2.5 text-[11px] text-amber-900 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Automated RTO Reverse Logistics</p>
                <p className="text-amber-800/90 mt-0.5">
                  Order status will move to <strong className="font-semibold text-amber-950">RTO_INITIATED</strong>. When parcel returns to warehouse, quality inspection will allow restocking sellable items.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowRTOModal(false);
                  setIsRtoReasonDropdownOpen(false);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInitiateRTO}
                disabled={isProcessingAction}
                className="px-5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-xl shadow-md shadow-orange-600/20 flex items-center space-x-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isProcessingAction ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Initiating...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5" />
                    <span>Confirm & Initiate RTO</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 6. Refund Update Modal */}
      {showRefundModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 leading-tight">Update Refund Status</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Order #{selectedOrder?.orderId}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setIsRefundStatusOpen(false);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Refund Status *</label>
                <div className="relative" ref={refundStatusDropdownRef}>
                  {(() => {
                    const activeRefund = REFUND_STATUS_OPTIONS.find(r => r.value === refundStatus) || REFUND_STATUS_OPTIONS[2];
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsRefundStatusOpen(!isRefundStatusOpen)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all shadow-xs cursor-pointer bg-white text-left ${isRefundStatusOpen
                            ? 'border-purple-600 ring-2 ring-purple-600/20'
                            : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${activeRefund.dot} shrink-0`}></span>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                              {activeRefund.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border hidden sm:inline-block ${activeRefund.badgeClass}`}>
                              {activeRefund.value}
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isRefundStatusOpen ? 'rotate-180 text-purple-600' : ''}`} />
                        </button>

                        {isRefundStatusOpen && (
                          <div className="absolute left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 animate-fadeIn overflow-hidden">
                            <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <span>Select Refund State</span>
                              <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-semibold">
                                5 States
                              </span>
                            </div>

                            <div className="max-h-60 overflow-y-auto no-scrollbar py-1 divide-y divide-slate-50">
                              {REFUND_STATUS_OPTIONS.map((item) => {
                                const isSelected = refundStatus === item.value;
                                return (
                                  <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => {
                                      setRefundStatus(item.value as any);
                                      setIsRefundStatusOpen(false);
                                    }}
                                    className={`w-full text-left px-3.5 py-2.5 flex items-start justify-between text-xs transition cursor-pointer ${isSelected
                                      ? 'bg-purple-50/70 border-l-4 border-purple-600 text-purple-950 font-medium'
                                      : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                                      }`}
                                  >
                                    <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                                      <span className={`w-2 h-2 rounded-full ${item.dot} shrink-0 mt-1.5`}></span>
                                      <div className="min-w-0">
                                        <div className="flex items-center space-x-2">
                                          <p className={`text-xs ${isSelected ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                                            {item.label}
                                          </p>
                                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border shrink-0 ${item.badgeClass}`}>
                                            {item.value}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                          {item.desc}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="shrink-0 pt-1">
                                      {isSelected ? (
                                        <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                          <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                      ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-300" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {refundStatus === 'REFUNDED' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bank / Gateway Transaction Reference ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. RZPY_REF_84920492 or UTR..."
                    value={refundTransactionId}
                    onChange={(e) => setRefundTransactionId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/20"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {refundStatus === 'FAILED' ? 'Failure Reason *' : 'Resolution Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder={refundStatus === 'FAILED' ? 'e.g. Beneficiary IFSC invalid or bank account closed...' : 'Internal notes...'}
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowRefundModal(false);
                  setIsRefundStatusOpen(false);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRefund}
                disabled={isProcessingAction}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Update Refund
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 7. Custom Date Range Selection Modal */}
      {showCustomDateModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-forest-900/10 text-forest-900 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-slate-900">Custom Date Range Filter</h3>
                  <p className="text-[11px] text-slate-500">Filter orders & analytics by custom dates</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Presets
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Last 7 Days', days: 7 },
                  { label: 'Last 30 Days', days: 30 },
                  { label: 'Last 90 Days', days: 90 },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(end.getDate() - preset.days);
                      setCustomStartDate(start.toISOString().split('T')[0]);
                      setCustomEndDate(end.toISOString().split('T')[0]);
                      setSelectedPeriod('CUSTOM');
                      setShowCustomDateModal(false);
                    }}
                    className="p-2 rounded-xl border border-slate-200 hover:border-forest-900 bg-slate-50 hover:bg-forest-900/5 text-slate-700 font-semibold text-[11px] transition text-center cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Inputs */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Start Date (From) *</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest-900/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">End Date (To) *</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest-900/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setSelectedPeriod('ALL');
                  setShowCustomDateModal(false);
                }}
                className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
              >
                Reset to All Time
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCustomDateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!customStartDate && !customEndDate}
                  onClick={() => {
                    setSelectedPeriod('CUSTOM');
                    setShowCustomDateModal(false);
                  }}
                  className="px-5 py-2 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}



      {/* Centered Luxury Delete Order Confirmation Modal */}
      <AdminConfirmModal
        isOpen={!!orderToDelete}
        title="Delete Order Permanently"
        itemBadge={orderToDelete?.displayId}
        itemName={orderToDelete ? `Order #${orderToDelete.displayId}` : undefined}
        message="Are you sure you want to permanently delete this order record? This will remove the order from the database and automatically restore warehouse product inventory for active orders."
        confirmLabel="Yes, Delete Order"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeletingOrder}
        onClose={() => setOrderToDelete(null)}
        onConfirm={handleConfirmDeleteOrder}
      />

      {/* Centered Luxury Action Confirmation Modal */}
      <AdminConfirmModal
        isOpen={!!actionConfirm}
        title={actionConfirm?.title || 'Confirm Action'}
        itemBadge={actionConfirm?.itemBadge}
        itemName={actionConfirm?.itemName}
        message={actionConfirm?.message || 'Are you sure you want to proceed with this action?'}
        confirmLabel={actionConfirm?.confirmLabel || 'Confirm'}
        cancelLabel="Cancel"
        variant={actionConfirm?.variant || 'warning'}
        isLoading={isExecutingActionConfirm}
        onClose={() => setActionConfirm(null)}
        onConfirm={handleExecuteActionConfirm}
      />

    </div >
  );
};
