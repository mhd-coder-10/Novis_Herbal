import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  DollarSign,
  ShoppingBag,
  Factory,
  Receipt,
  FileText,
  Calendar,
  Filter,
  RefreshCw,
  Plus,
  Trash2,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Download,
  Printer,
  X,
  CreditCard,
  Building2,
  Zap,
  Coffee,
  Package,
  Boxes,
  RotateCcw,
  Search,
  Check,
  Percent,
  FileCheck2,
  Store,
  Globe,
  Layers,
  MapPin,
  Phone,
  User,
  Edit2,
  Eye,
  Archive,
  History,
  ShieldAlert,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';
import { sanitizePhoneNumber, isValidIndianPhone, handlePhoneKeyDown } from '../../utils/phoneValidation';
import { AdminPagination } from '../../components/common/AdminPagination';
import { AdminSelect, SelectOption } from '../../components/common/AdminSelect';
import { AdminConfirmModal } from '../../components/common/AdminConfirmModal';

type FinanceTab = 'overview' | 'sales' | 'manufacturing' | 'operating' | 'audit_logs';
type PeriodType = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

// Standard Options for AdminSelect Dropdowns
const OPERATING_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'RENT', label: 'Office & Warehouse Rent', badge: 'Rent' },
  { value: 'ELECTRICITY_BILL', label: 'Electricity & Utilities', badge: 'Bills' },
  { value: 'STAFF_SALARY', label: 'Staff Salaries & Helpers', badge: 'Payroll' },
  { value: 'FOOD_REFRESHMENTS', label: 'Pantry, Tea & Snacks', badge: 'Petty' },
  { value: 'PACKAGING_MATERIALS', label: 'Packaging Boxes & Tape', badge: 'Packing' },
  { value: 'INTERNET_SOFTWARE', label: 'Internet & SaaS Software', badge: 'Tools' },
  { value: 'LOGISTICS_SUPPLIES', label: 'Logistics Supplies & Labels', badge: 'Dispatch' },
  { value: 'MAINTENANCE_REPAIRS', label: 'Maintenance & Repairs', badge: 'Ops' },
  { value: 'MARKETING_ADS', label: 'Marketing & Ad Spend', badge: 'Growth' },
  { value: 'MISCELLANEOUS', label: 'Miscellaneous Expense', badge: 'General' },
  { value: 'OTHER', label: 'Other', badge: 'Other' }
];

const OPERATING_CATEGORY_FILTER_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Overhead Categories' },
  ...OPERATING_CATEGORY_OPTIONS
];

const PAYMENT_MODE_OPTIONS: SelectOption[] = [
  { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)', badge: 'Instant' },
  { value: 'CASH', label: 'Cash', badge: 'Cash' },
];

const OFFLINE_PAYMENT_MODE_OPTIONS: SelectOption[] = [
  { value: 'CASH', label: 'Cash in Hand', badge: 'Cash' },
  { value: 'UPI', label: 'UPI (Google Pay / PhonePe)', badge: 'Online' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT / IMPS)', badge: 'Bank' },
  { value: 'CREDIT_UDHAAR', label: 'Credit / Udhaar (Khata)', badge: 'Due' }
];

const OFFLINE_STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Payment Statuses' },
  { value: 'PAID', label: 'Fully Paid', badge: 'Settled' },
  { value: 'PARTIAL', label: 'Partially Paid', badge: 'Partial' },
  { value: 'PENDING', label: 'Pending', badge: 'Due' }
];

const SETTLE_OFFLINE_PAYMENT_OPTIONS: SelectOption[] = [
  { value: 'UPI', label: 'UPI (Google Pay / PhonePe / Paytm)', badge: 'Instant' },
  { value: 'CASH', label: 'Cash in Hand', badge: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT / IMPS)', badge: 'Bank' }
];


export const AdminFinance: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');

  // Time Selection State (All Time, Today, This Week, This Month, This Year, Custom)
  const [period, setPeriod] = useState<PeriodType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [isLoading, setIsLoading] = useState(false);

  // Tab 1: Overview Data
  const [overviewData, setOverviewData] = useState<any>(null);

  // Tab 2: Sales Data & Sub-tabs ('overall' | 'online' | 'offline')
  const [salesData, setSalesData] = useState<any>(null);
  const [sellingSubTab, setSellingSubTab] = useState<'overall' | 'online' | 'offline'>('overall');
  const [salesSearch, setSalesSearch] = useState('');
  const [offlineSearch, setOfflineSearch] = useState('');
  const [offlineStatusFilter, setOfflineStatusFilter] = useState('ALL');

  // Products catalog for offline order entry
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);

  // Offline Sales Modals & Form
  const [isAddOfflineModalOpen, setIsAddOfflineModalOpen] = useState(false);
  const [isRecordOfflinePaymentModalOpen, setIsRecordOfflinePaymentModalOpen] = useState(false);
  const [selectedOfflineSaleForPayment, setSelectedOfflineSaleForPayment] = useState<any>(null);
  const [offlinePaymentAmount, setOfflinePaymentAmount] = useState<number>(0);
  const [offlinePaymentMode, setOfflinePaymentMode] = useState<string>('UPI');
  const [offlinePaymentNotes, setOfflinePaymentNotes] = useState<string>('');

  const [newOfflineSale, setNewOfflineSale] = useState({
    customerName: '',
    customerPhone: '',
    locationArea: '',
    productId: '',
    productName: '',
    productSku: '',
    quantity: 1 as number | string,
    unitPrice: 0 as number | string,
    totalAmount: 0,
    amountPaid: 0,
    paymentMode: 'CASH',
    billNumber: '',
    saleDate: new Date().toISOString().split('T')[0],
    deductStock: true,
    notes: ''
  });

  // Tab 3: Manufacturing Data
  const [mfgData, setMfgData] = useState<any>(null);
  const [mfgSearch, setMfgSearch] = useState('');

  // Tab 4: Operating Data
  const [operatingData, setOperatingData] = useState<any>(null);
  const [operatingCategoryFilter, setOperatingCategoryFilter] = useState('ALL');

  // Modals
  const [isAddMfgModalOpen, setIsAddMfgModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [selectedMfgForPayment, setSelectedMfgForPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');

  const [isRecordReturnModalOpen, setIsRecordReturnModalOpen] = useState(false);
  const [selectedMfgForReturn, setSelectedMfgForReturn] = useState<any>(null);
  const [returnQty, setReturnQty] = useState<number>(1);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [returnReason, setReturnReason] = useState('');

  const [isAddOperatingModalOpen, setIsAddOperatingModalOpen] = useState(false);

  // Report Preview Modal (IMP NOTE)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);


  // View & Edit Modals State for Offline Sales
  const [selectedOfflineSaleForView, setSelectedOfflineSaleForView] = useState<any>(null);
  const [editingOfflineSale, setEditingOfflineSale] = useState<any>(null);
  const [isUpdatingOfflineSale, setIsUpdatingOfflineSale] = useState(false);

  // View & Edit Modals State for Manufacturing Batches
  const [selectedMfgForView, setSelectedMfgForView] = useState<any>(null);
  const [editingMfg, setEditingMfg] = useState<any>(null);
  const [isUpdatingMfg, setIsUpdatingMfg] = useState(false);

  // View & Edit Modals State for Operating Expenses
  const [selectedOperatingForView, setSelectedOperatingForView] = useState<any>(null);
  const [editingOperating, setEditingOperating] = useState<any>(null);
  const [isUpdatingOperating, setIsUpdatingOperating] = useState(false);

  // Tab 5: Audit & Deletion Logs State
  const [auditData, setAuditData] = useState<{
    metrics: {
      totalDeletions: number;
      offlineSalesDeleted: number;
      onlineOrdersDeleted: number;
      mfgBatchesDeleted: number;
      operatingExpensesDeleted: number;
      totalDeletedValue: number;
    };
    logs: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      pageSize: number;
    };
  } | null>(null);
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'OFFLINE_SALE' | 'ONLINE_ORDER' | 'MANUFACTURING' | 'OPERATING'>('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [selectedSnapshotForView, setSelectedSnapshotForView] = useState<any>(null);

  // Active full-page action indicator
  const isAnyActionPageActive = Boolean(
    editingOfflineSale ||
    selectedOfflineSaleForView ||
    isAddOfflineModalOpen ||
    (isRecordOfflinePaymentModalOpen && selectedOfflineSaleForPayment) ||
    editingMfg ||
    selectedMfgForView ||
    isAddMfgModalOpen ||
    (isRecordPaymentModalOpen && selectedMfgForPayment) ||
    (isRecordReturnModalOpen && selectedMfgForReturn) ||
    editingOperating ||
    selectedOperatingForView ||
    isAddOperatingModalOpen ||
    selectedSnapshotForView ||
    isReportModalOpen
  );

  // Action pages scroll naturally without body lock

  // Global Escape key handler to close active modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedOfflineSaleForView) setSelectedOfflineSaleForView(null);
        if (editingOfflineSale) setEditingOfflineSale(null);
        if (selectedMfgForView) setSelectedMfgForView(null);
        if (editingMfg) setEditingMfg(null);
        if (selectedOperatingForView) setSelectedOperatingForView(null);
        if (editingOperating) setEditingOperating(null);
        if (selectedSnapshotForView) setSelectedSnapshotForView(null);
        if (isAddMfgModalOpen) setIsAddMfgModalOpen(false);
        if (isRecordPaymentModalOpen) setIsRecordPaymentModalOpen(false);
        if (isRecordReturnModalOpen) setIsRecordReturnModalOpen(false);
        if (isAddOperatingModalOpen) setIsAddOperatingModalOpen(false);
        if (isAddOfflineModalOpen) setIsAddOfflineModalOpen(false);
        if (isRecordOfflinePaymentModalOpen) setIsRecordOfflinePaymentModalOpen(false);
        if (isReportModalOpen) setIsReportModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [
    selectedOfflineSaleForView,
    editingOfflineSale,
    selectedMfgForView,
    editingMfg,
    selectedOperatingForView,
    editingOperating,
    selectedSnapshotForView,
    isAddMfgModalOpen,
    isRecordPaymentModalOpen,
    isRecordReturnModalOpen,
    isAddOperatingModalOpen,
    isAddOfflineModalOpen,
    isRecordOfflinePaymentModalOpen,
    isReportModalOpen
  ]);

  // Form States for Add Manufacturing Batch
  const [newMfg, setNewMfg] = useState({
    productName: '',
    batchNumber: '',
    vendorName: '',
    vendorContact: '',
    quantity: 100,
    unitCost: 100,
    amountPaid: 0,
    paymentMode: 'BANK_TRANSFER',
    invoiceNumber: '',
    expenseDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Form States for Add Operating Expense
  const [newOperating, setNewOperating] = useState({
    category: 'RENT',
    title: '',
    amount: '',
    paymentMode: 'UPI',
    paidTo: '',
    expenseDate: new Date().toISOString().split('T')[0],
    billNumber: '',
    notes: ''
  });

  // Fetch data based on activeTab and period
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params: any = { period };
      if (period === 'custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }

      if (activeTab === 'overview') {
        const res = await api.get('/finance/overview', { params });
        if (res.data?.success) setOverviewData(res.data);
      } else if (activeTab === 'sales') {
        const res = await api.get('/finance/sales', { params });
        if (res.data?.success) setSalesData(res.data);
      } else if (activeTab === 'manufacturing') {
        const res = await api.get('/finance/manufacturing', { params });
        if (res.data?.success) setMfgData(res.data);
      } else if (activeTab === 'operating') {
        const res = await api.get('/finance/operating', { params });
        if (res.data?.success) setOperatingData(res.data);
      } else if (activeTab === 'audit_logs') {
        fetchAuditLogs();
      }
    } catch (err: any) {
      console.error('Failed to load finance data:', err);
      // Only toast on unexpected server errors (500+); avoid false alarms on normal empty or aborted states
      if (err.response?.status && err.response.status >= 500 && err.response?.data?.message) {
        toast.error(err.response.data.message, 'Finance Error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const params: any = {
        page: auditPage,
        limit: auditPageSize,
        entityType: auditFilter,
        search: auditSearch.trim(),
        period
      };
      if (period === 'custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
      const res = await api.get('/finance/audit-logs', { params });
      if (res.data?.success) {
        setAuditData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit_logs') {
      fetchAuditLogs();
    }
  }, [activeTab, period, auditFilter, auditSearch, auditPage, auditPageSize]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditFilter, auditSearch, period]);

  useEffect(() => {
    fetchData();
  }, [activeTab, period]);

  const fetchCatalog = async () => {
    try {
      const res = await api.get('/products?includeUnpublished=true&limit=100');
      if (res.data?.success && Array.isArray(res.data.products)) {
        setAvailableProducts(res.data.products);
      }
    } catch (err) {
      console.error('Failed to load products for offline sales:', err);
    }
  };

  useEffect(() => {
    fetchCatalog();
    const handleProductUpdated = () => {
      fetchCatalog();
    };
    window.addEventListener('novise:product-updated', handleProductUpdated);
    return () => {
      window.removeEventListener('novise:product-updated', handleProductUpdated);
    };
  }, []);

  const handleApplyCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    setPeriod('custom');
    fetchData();
  };

  // Add Manufacturing Batch
  const handleCreateMfg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMfg.productName.trim() || !newMfg.vendorName.trim() || !newMfg.quantity || !newMfg.unitCost) {
      toast.warning('Please fill in required batch details', 'Form Incomplete');
      return;
    }

    if (newMfg.vendorContact.trim()) {
      const cleanVendorPhone = sanitizePhoneNumber(newMfg.vendorContact);
      if (!isValidIndianPhone(cleanVendorPhone)) {
        toast.warning('Please enter a valid 10-digit vendor mobile number starting with 6, 7, 8, or 9', 'Invalid Vendor Contact');
        return;
      }
    }

    try {
      const res = await api.post('/finance/manufacturing', newMfg);
      if (res.data?.success) {
        toast.success('Manufacturing procurement batch recorded!', 'Batch Created');
        setIsAddMfgModalOpen(false);
        setNewMfg({
          productName: '',
          batchNumber: '',
          vendorName: '',
          vendorContact: '',
          quantity: 100,
          unitCost: 100,
          amountPaid: 0,
          paymentMode: 'BANK_TRANSFER',
          invoiceNumber: '',
          expenseDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record batch', 'Error');
    }
  };

  // Record Payment to Supplier
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMfgForPayment || paymentAmount <= 0) return;

    try {
      const res = await api.put(`/finance/manufacturing/${selectedMfgForPayment._id}/payment`, {
        paymentAmount,
        paymentMode,
        notes: `Recorded installment via ${paymentMode}`
      });
      if (res.data?.success) {
        toast.success(`Payment of ₹${paymentAmount} recorded successfully!`, 'Supplier Paid');
        setIsRecordPaymentModalOpen(false);
        setSelectedMfgForPayment(null);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payment recording failed', 'Error');
    }
  };

  // Record Product Return to Supplier with Refund
  const handleRecordReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMfgForReturn || returnQty <= 0) return;

    try {
      const res = await api.post(`/finance/manufacturing/${selectedMfgForReturn._id}/return`, {
        quantity: returnQty,
        refundAmount: refundAmount || returnQty * selectedMfgForReturn.unitCost,
        reason: returnReason || 'Returned to supplier'
      });
      if (res.data?.success) {
        toast.success(`${returnQty} items returned to supplier. Refund credited: ₹${refundAmount}`, 'Return Processed');
        setIsRecordReturnModalOpen(false);
        setSelectedMfgForReturn(null);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Return processing failed', 'Error');
    }
  };

  // Add Operating Expense
  const handleCreateOperating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOperating.title.trim() || !newOperating.amount) {
      toast.warning('Please enter expense title and amount', 'Form Incomplete');
      return;
    }

    try {
      const res = await api.post('/finance/operating', newOperating);
      if (res.data?.success) {
        toast.success('Operating expense logged successfully!', 'Expense Recorded');
        setIsAddOperatingModalOpen(false);
        setNewOperating({
          category: 'RENT',
          title: '',
          amount: '',
          paymentMode: 'UPI',
          paidTo: '',
          expenseDate: new Date().toISOString().split('T')[0],
          billNumber: '',
          notes: ''
        });
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record expense', 'Error');
    }
  };

  // Offline Sales Handlers
  const handleSelectOfflineProduct = (productId: string) => {
    const prod = availableProducts.find(p => p._id === productId);
    if (prod) {
      const price = Number(prod.sellingPrice ?? prod.price) || 0;
      const qty = Number(newOfflineSale.quantity) || 1;
      const total = qty * price;
      setNewOfflineSale(prev => ({
        ...prev,
        productId: prod._id,
        productName: prod.name,
        productSku: prod.sku || '',
        unitPrice: price,
        totalAmount: total,
        amountPaid: prev.paymentMode === 'CREDIT_UDHAAR' ? 0 : total
      }));
    } else {
      setNewOfflineSale(prev => ({
        ...prev,
        productId: '',
        productName: '',
        productSku: '',
        unitPrice: 0,
        totalAmount: 0,
        amountPaid: 0
      }));
    }
  };

  const handleOfflineQuantityChange = (val: string | number) => {
    if (val === '') {
      setNewOfflineSale(prev => ({
        ...prev,
        quantity: '',
        totalAmount: 0,
        amountPaid: 0
      }));
      return;
    }
    const num = parseInt(String(val), 10);
    const safeQty = isNaN(num) ? '' : Math.max(0, num);
    const price = Number(newOfflineSale.unitPrice) || 0;
    const total = (typeof safeQty === 'number' ? safeQty : 0) * price;
    setNewOfflineSale(prev => ({
      ...prev,
      quantity: safeQty,
      totalAmount: total,
      amountPaid: prev.paymentMode === 'CREDIT_UDHAAR' ? 0 : total
    }));
  };

  const handleOfflineUnitPriceChange = (val: string | number) => {
    if (val === '') {
      setNewOfflineSale(prev => ({
        ...prev,
        unitPrice: '',
        totalAmount: 0,
        amountPaid: 0
      }));
      return;
    }
    const num = parseFloat(String(val));
    const safePrice = isNaN(num) ? '' : Math.max(0, num);
    const qty = Number(newOfflineSale.quantity) || 1;
    const total = (typeof safePrice === 'number' ? safePrice : 0) * qty;
    setNewOfflineSale(prev => ({
      ...prev,
      unitPrice: safePrice,
      totalAmount: total,
      amountPaid: prev.paymentMode === 'CREDIT_UDHAAR' ? 0 : total
    }));
  };

  const handleOfflinePaymentModeChange = (mode: string) => {
    setNewOfflineSale(prev => ({
      ...prev,
      paymentMode: mode,
      amountPaid: mode === 'CREDIT_UDHAAR' ? 0 : prev.totalAmount
    }));
  };

  const handleCreateOfflineSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfflineSale.customerName.trim()) {
      toast.warning('Please enter customer or retailer name', 'Missing Name');
      return;
    }
    if (!newOfflineSale.productName.trim() || newOfflineSale.totalAmount <= 0) {
      toast.warning('Please select a product and enter a valid quantity/price', 'Missing Product');
      return;
    }

    if (newOfflineSale.customerPhone.trim()) {
      const cleanPhone = sanitizePhoneNumber(newOfflineSale.customerPhone);
      if (!isValidIndianPhone(cleanPhone)) {
        toast.warning('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9', 'Invalid Phone Number');
        return;
      }
    }

    try {
      const qty = Math.max(1, Number(newOfflineSale.quantity) || 1);
      const unitPrice = Math.max(0, Number(newOfflineSale.unitPrice) || 0);
      const totalAmount = Number(newOfflineSale.totalAmount) || (qty * unitPrice);

      const payload = {
        customerName: newOfflineSale.customerName.trim(),
        customerPhone: sanitizePhoneNumber(newOfflineSale.customerPhone),
        locationArea: newOfflineSale.locationArea.trim(),
        billNumber: newOfflineSale.billNumber.trim(),
        saleDate: newOfflineSale.saleDate,
        paymentMode: newOfflineSale.paymentMode,
        totalAmount,
        amountPaid: Number(newOfflineSale.amountPaid) || 0,
        deductStock: newOfflineSale.deductStock,
        notes: newOfflineSale.notes.trim(),
        items: [
          {
            product: newOfflineSale.productId || undefined,
            name: newOfflineSale.productName,
            sku: newOfflineSale.productSku,
            quantity: qty,
            unitPrice,
            totalPrice: totalAmount
          }
        ]
      };

      const res = await api.post('/finance/offline-sales', payload);
      if (res.data?.success) {
        toast.success(`Offline sale recorded! Bill: ${res.data.sale?.saleId || ''}`, 'Sale Logged');
        setIsAddOfflineModalOpen(false);
        setNewOfflineSale({
          customerName: '',
          customerPhone: '',
          locationArea: '',
          productId: '',
          productName: '',
          productSku: '',
          quantity: 1,
          unitPrice: 0,
          totalAmount: 0,
          amountPaid: 0,
          paymentMode: 'CASH',
          billNumber: '',
          saleDate: new Date().toISOString().split('T')[0],
          deductStock: true,
          notes: ''
        });
        fetchData();
      }
    } catch (err: any) {
      console.error('Failed to create offline sale:', err);
      toast.error(err.response?.data?.message || 'Failed to record offline sale', 'Error');
    }
  };

  const handleOpenOfflinePayment = (sale: any) => {
    setSelectedOfflineSaleForPayment(sale);
    setOfflinePaymentAmount(sale.amountDue || 0);
    setOfflinePaymentMode('UPI');
    setOfflinePaymentNotes('');
    setIsRecordOfflinePaymentModalOpen(true);
  };

  const handleUpdateOfflinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfflineSaleForPayment?._id) return;
    if (offlinePaymentAmount <= 0) {
      toast.warning('Payment amount must be greater than 0', 'Invalid Amount');
      return;
    }

    try {
      const res = await api.put(`/finance/offline-sales/${selectedOfflineSaleForPayment._id}/payment`, {
        paymentAmount: Number(offlinePaymentAmount),
        paymentMode: offlinePaymentMode,
        notes: offlinePaymentNotes.trim()
      });
      if (res.data?.success) {
        toast.success('Offline payment recorded successfully!', 'Payment Updated');
        setIsRecordOfflinePaymentModalOpen(false);
        setSelectedOfflineSaleForPayment(null);
        fetchData();
      }
    } catch (err: any) {
      console.error('Failed to update offline payment:', err);
      toast.error(err.response?.data?.message || 'Failed to update payment', 'Error');
    }
  };

  // Open Edit & View for Offline Sales
  const handleOpenEditOfflineSale = (sale: any) => {
    const firstItem = sale.items?.[0] || {};
    const qty = Math.max(1, Number(firstItem.quantity) || 1);
    const unitPrice = Number(firstItem.unitPrice) || Math.round((Number(sale.totalAmount) || 0) / qty) || 0;
    setEditingOfflineSale({
      _id: sale._id,
      saleId: sale.saleId,
      customerName: sale.customerName || '',
      customerPhone: sale.customerPhone || '',
      locationArea: sale.locationArea || '',
      billNumber: sale.billNumber || '',
      saleDate: sale.saleDate ? new Date(sale.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      paymentMode: sale.paymentMode || 'CASH',
      productId: firstItem.product?._id || firstItem.product || '',
      productName: firstItem.productName || 'Novise Product',
      productSku: firstItem.sku || '',
      quantity: qty,
      unitPrice: unitPrice,
      totalAmount: sale.totalAmount || 0,
      amountPaid: sale.amountPaid || 0,
      notes: sale.notes || '',
      inventoryDeducted: sale.inventoryDeducted !== false
    });
  };

  const handleUpdateOfflineSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfflineSale?._id) return;
    if (!editingOfflineSale.customerName.trim()) {
      toast.warning('Customer name is required', 'Form Incomplete');
      return;
    }
    if (editingOfflineSale.customerPhone?.trim()) {
      const cleanPhone = sanitizePhoneNumber(editingOfflineSale.customerPhone);
      if (!isValidIndianPhone(cleanPhone)) {
        toast.warning('Please enter a valid 10-digit Indian mobile number', 'Invalid Phone');
        return;
      }
    }

    setIsUpdatingOfflineSale(true);
    try {
      const qty = Math.max(1, Number(editingOfflineSale.quantity) || 1);
      const unitPrice = Math.max(0, Number(editingOfflineSale.unitPrice) || 0);
      const totalAmount = Number(editingOfflineSale.totalAmount) || (qty * unitPrice);

      const res = await api.put(`/finance/offline-sales/${editingOfflineSale._id}`, {
        customerName: editingOfflineSale.customerName.trim(),
        customerPhone: editingOfflineSale.customerPhone ? sanitizePhoneNumber(editingOfflineSale.customerPhone) : '',
        locationArea: editingOfflineSale.locationArea.trim(),
        billNumber: editingOfflineSale.billNumber.trim(),
        saleDate: editingOfflineSale.saleDate,
        paymentMode: editingOfflineSale.paymentMode,
        productId: editingOfflineSale.productId || undefined,
        productName: editingOfflineSale.productName,
        productSku: editingOfflineSale.productSku,
        quantity: qty,
        unitPrice: unitPrice,
        totalAmount: totalAmount,
        amountPaid: Number(editingOfflineSale.amountPaid) || 0,
        notes: editingOfflineSale.notes.trim(),
        items: [
          {
            product: editingOfflineSale.productId || undefined,
            productName: editingOfflineSale.productName,
            sku: editingOfflineSale.productSku,
            unitPrice: unitPrice,
            totalPrice: totalAmount
          }
        ]
      });

      if (res.data?.success) {
        setEditingOfflineSale(null);
        fetchData();
        if (selectedOfflineSaleForView?._id === editingOfflineSale._id) {
          setSelectedOfflineSaleForView(res.data.sale);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update sale record', 'Update Error');
    } finally {
      setIsUpdatingOfflineSale(false);
    }
  };

  // Open Edit & View for Manufacturing Batches
  const handleOpenEditMfg = (entry: any) => {
    setEditingMfg({
      _id: entry._id,
      productName: entry.productName || '',
      batchNumber: entry.batchNumber || '',
      vendorName: entry.vendorName || '',
      vendorContact: entry.vendorContact || '',
      quantity: entry.quantity || 1,
      unitCost: entry.unitCost || 0,
      totalCost: entry.totalCost || 0,
      amountPaid: entry.amountPaid || 0,
      paymentMode: entry.paymentMode || 'BANK_TRANSFER',
      invoiceNumber: entry.invoiceNumber || '',
      expenseDate: entry.expenseDate ? new Date(entry.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: entry.notes || ''
    });
  };

  const handleUpdateMfg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMfg?._id) return;
    if (!editingMfg.productName.trim() || !editingMfg.vendorName.trim()) {
      toast.warning('Product name and vendor name are required', 'Form Incomplete');
      return;
    }
    if (editingMfg.vendorContact?.trim()) {
      const cleanPhone = sanitizePhoneNumber(editingMfg.vendorContact);
      if (!isValidIndianPhone(cleanPhone)) {
        toast.warning('Please enter a valid 10-digit vendor mobile number', 'Invalid Contact');
        return;
      }
    }

    setIsUpdatingMfg(true);
    try {
      const res = await api.put(`/finance/manufacturing/${editingMfg._id}`, {
        productName: editingMfg.productName.trim(),
        batchNumber: editingMfg.batchNumber.trim(),
        vendorName: editingMfg.vendorName.trim(),
        vendorContact: editingMfg.vendorContact ? sanitizePhoneNumber(editingMfg.vendorContact) : '',
        quantity: Number(editingMfg.quantity) || 1,
        unitCost: Number(editingMfg.unitCost) || 0,
        amountPaid: Number(editingMfg.amountPaid) || 0,
        paymentMode: editingMfg.paymentMode,
        invoiceNumber: editingMfg.invoiceNumber.trim(),
        expenseDate: editingMfg.expenseDate,
        notes: editingMfg.notes.trim()
      });

      if (res.data?.success) {
        toast.success('Procurement batch updated & change log preserved!', 'Batch Updated');
        setEditingMfg(null);
        fetchData();
        if (selectedMfgForView?._id === editingMfg._id) {
          setSelectedMfgForView(res.data.entry);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update procurement batch', 'Update Error');
    } finally {
      setIsUpdatingMfg(false);
    }
  };

  // Open Edit & View for Operating Expenses
  const handleOpenEditOperating = (entry: any) => {
    setEditingOperating({
      _id: entry._id,
      category: entry.category || 'RENT',
      title: entry.title || '',
      amount: entry.amount || 0,
      paymentMode: entry.paymentMode || 'UPI',
      paidTo: entry.paidTo || '',
      expenseDate: entry.expenseDate ? new Date(entry.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      billNumber: entry.billNumber || '',
      notes: entry.notes || ''
    });
  };

  const handleUpdateOperating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOperating?._id) return;
    if (!editingOperating.title.trim() || Number(editingOperating.amount) <= 0) {
      toast.warning('Title and positive amount are required', 'Form Incomplete');
      return;
    }

    setIsUpdatingOperating(true);
    try {
      const res = await api.put(`/finance/operating/${editingOperating._id}`, {
        category: editingOperating.category,
        title: editingOperating.title.trim(),
        amount: Number(editingOperating.amount),
        paymentMode: editingOperating.paymentMode,
        paidTo: editingOperating.paidTo.trim(),
        expenseDate: editingOperating.expenseDate,
        billNumber: editingOperating.billNumber.trim(),
        notes: editingOperating.notes.trim()
      });

      if (res.data?.success) {
        toast.success('Operating expense updated & change log recorded!', 'Expense Updated');
        setEditingOperating(null);
        fetchData();
        if (selectedOperatingForView?._id === editingOperating._id) {
          setSelectedOperatingForView(res.data.entry);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update expense', 'Update Error');
    } finally {
      setIsUpdatingOperating(false);
    }
  };

  // Custom Delete Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'offline' | 'mfg' | 'operating';
    id: string;
    title: string;
    itemBadge?: string;
    itemName?: string;
    message: string;
  } | null>(null);
  const [isDeletingFinanceItem, setIsDeletingFinanceItem] = useState(false);

  const handleDeleteOfflineSale = (id: string, saleId: string) => {
    setDeleteConfirmation({
      type: 'offline',
      id,
      title: 'Delete Offline Sale Bill',
      itemBadge: saleId,
      itemName: `Offline Invoice #${saleId}`,
      message: 'Are you sure you want to delete this offline retail sale record? If inventory was deducted, warehouse stock will be automatically restored.'
    });
  };

  const handleDeleteMfg = (id: string, batchNumber?: string) => {
    setDeleteConfirmation({
      type: 'mfg',
      id,
      title: 'Delete Procurement Batch',
      itemBadge: batchNumber,
      itemName: `Batch ${batchNumber || id}`,
      message: 'Are you sure you want to delete this manufacturing procurement batch record? This will remove the sourcing entry from the production ledger.'
    });
  };

  const handleDeleteOperating = (id: string, title?: string) => {
    setDeleteConfirmation({
      type: 'operating',
      id,
      title: 'Delete Operating Expense',
      itemName: title || 'Expense Entry',
      message: `Are you sure you want to delete the operating overhead expense voucher "${title || 'this entry'}"?`
    });
  };

  const handleConfirmDeleteFinanceItem = async () => {
    if (!deleteConfirmation) return;
    setIsDeletingFinanceItem(true);
    try {
      if (deleteConfirmation.type === 'offline') {
        const res = await api.delete(`/finance/offline-sales/${deleteConfirmation.id}`);
        if (res.data?.success) {
          toast.success(`Sale ${deleteConfirmation.itemBadge || ''} deleted successfully!`, 'Deleted');
          fetchData();
        }
      } else if (deleteConfirmation.type === 'mfg') {
        const res = await api.delete(`/finance/manufacturing/${deleteConfirmation.id}`);
        if (res.data?.success) {
          toast.success('Procurement batch record deleted successfully!', 'Deleted');
          fetchData();
        }
      } else if (deleteConfirmation.type === 'operating') {
        const res = await api.delete(`/finance/operating/${deleteConfirmation.id}`);
        if (res.data?.success) {
          toast.success('Operating expense deleted successfully!', 'Deleted');
          fetchData();
        }
      }
      setDeleteConfirmation(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete record', 'Delete Error');
    } finally {
      setIsDeletingFinanceItem(false);
    }
  };

  // Pagination States for all finance tables
  const [consolidatedPage, setConsolidatedPage] = useState(1);
  const [consolidatedPageSize, setConsolidatedPageSize] = useState(10);

  const [onlineSalesPage, setOnlineSalesPage] = useState(1);
  const [onlineSalesPageSize, setOnlineSalesPageSize] = useState(10);

  const [offlineSalesPage, setOfflineSalesPage] = useState(1);
  const [offlineSalesPageSize, setOfflineSalesPageSize] = useState(10);

  const [mfgPage, setMfgPage] = useState(1);
  const [mfgPageSize, setMfgPageSize] = useState(10);

  const [operatingPage, setOperatingPage] = useState(1);
  const [operatingPageSize, setOperatingPageSize] = useState(10);

  useEffect(() => {
    setConsolidatedPage(1);
  }, [salesSearch, period, customStartDate, customEndDate]);

  useEffect(() => {
    setOnlineSalesPage(1);
  }, [salesSearch, period, customStartDate, customEndDate]);

  useEffect(() => {
    setOfflineSalesPage(1);
  }, [offlineSearch, offlineStatusFilter, period, customStartDate, customEndDate]);

  useEffect(() => {
    setMfgPage(1);
  }, [mfgSearch, period, customStartDate, customEndDate]);

  useEffect(() => {
    setOperatingPage(1);
  }, [operatingCategoryFilter, period, customStartDate, customEndDate]);

  // Consolidated activity stream for Overall sub-tab
  const consolidatedLedger = React.useMemo(() => {
    const onlineOrders = (salesData?.online?.orders || salesData?.orders || []).map((o: any) => ({
      _id: o._id,
      id: o.orderId,
      date: o.createdAt,
      type: 'ONLINE',
      customer: o.customerDetails?.fullName || 'Online Customer',
      phone: o.customerDetails?.phone || '',
      subtitle: o.shippingAddress?.city ? `${o.shippingAddress.city}, ${o.shippingAddress.state || ''}` : 'E-Commerce Website',
      paymentMethod: o.paymentInfo?.method || 'ONLINE',
      paymentStatus: o.paymentInfo?.status || 'PENDING',
      orderStatus: o.orderStatus,
      amount: o.pricing?.totalAmount || 0,
      due: o.paymentInfo?.status === 'PAID' ? 0 : (o.pricing?.totalAmount || 0)
    }));

    const offlineRecords = (salesData?.offline?.sales || salesData?.offlineSales || []).map((s: any) => ({
      _id: s._id,
      id: s.saleId,
      billNumber: s.billNumber,
      date: s.saleDate,
      type: 'OFFLINE',
      customer: s.customerName,
      phone: s.customerPhone || '',
      subtitle: s.locationArea ? `${s.locationArea} (Local Area)` : 'Direct / Retail Counter',
      paymentMethod: s.paymentMode,
      paymentStatus: s.paymentStatus,
      orderStatus: 'DELIVERED',
      amount: s.totalAmount || 0,
      due: s.amountDue || 0
    }));

    return [...onlineOrders, ...offlineRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [salesData]);

  // Filtered offline sales list
  const filteredOfflineSales = React.useMemo(() => {
    const list = salesData?.offline?.sales || salesData?.offlineSales || [];
    return list.filter((s: any) => {
      const matchSearch =
        !offlineSearch.trim() ||
        s.saleId?.toLowerCase().includes(offlineSearch.toLowerCase()) ||
        s.customerName?.toLowerCase().includes(offlineSearch.toLowerCase()) ||
        s.customerPhone?.toLowerCase().includes(offlineSearch.toLowerCase()) ||
        s.locationArea?.toLowerCase().includes(offlineSearch.toLowerCase()) ||
        s.billNumber?.toLowerCase().includes(offlineSearch.toLowerCase()) ||
        s.items?.some((it: any) => it.name?.toLowerCase().includes(offlineSearch.toLowerCase()));

      const matchStatus =
        offlineStatusFilter === 'ALL' || s.paymentStatus === offlineStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [salesData, offlineSearch, offlineStatusFilter]);

  const filteredConsolidated = React.useMemo(() => {
    return consolidatedLedger.filter((item: any) =>
      !salesSearch.trim() ||
      item.id?.toLowerCase().includes(salesSearch.toLowerCase()) ||
      item.customer?.toLowerCase().includes(salesSearch.toLowerCase()) ||
      item.phone?.includes(salesSearch) ||
      item.subtitle?.toLowerCase().includes(salesSearch.toLowerCase()) ||
      item.paymentMethod?.toLowerCase().includes(salesSearch.toLowerCase())
    );
  }, [consolidatedLedger, salesSearch]);

  const paginatedConsolidated = React.useMemo(() => {
    return filteredConsolidated.slice(
      (consolidatedPage - 1) * consolidatedPageSize,
      consolidatedPage * consolidatedPageSize
    );
  }, [filteredConsolidated, consolidatedPage, consolidatedPageSize]);

  const filteredOnlineOrders = React.useMemo(() => {
    const list = salesData?.online?.orders || salesData?.orders || [];
    return list.filter((o: any) =>
      !salesSearch.trim() ||
      o.orderId?.toLowerCase().includes(salesSearch.toLowerCase()) ||
      o.customerDetails?.fullName?.toLowerCase().includes(salesSearch.toLowerCase()) ||
      o.paymentInfo?.method?.toLowerCase().includes(salesSearch.toLowerCase())
    );
  }, [salesData, salesSearch]);

  const paginatedOnlineOrders = React.useMemo(() => {
    return filteredOnlineOrders.slice(
      (onlineSalesPage - 1) * onlineSalesPageSize,
      onlineSalesPage * onlineSalesPageSize
    );
  }, [filteredOnlineOrders, onlineSalesPage, onlineSalesPageSize]);

  const paginatedOfflineSales = React.useMemo(() => {
    return filteredOfflineSales.slice(
      (offlineSalesPage - 1) * offlineSalesPageSize,
      offlineSalesPage * offlineSalesPageSize
    );
  }, [filteredOfflineSales, offlineSalesPage, offlineSalesPageSize]);

  const filteredMfgEntries = React.useMemo(() => {
    const list = mfgData?.entries || [];
    return list.filter((e: any) =>
      !mfgSearch.trim() ||
      e.productName?.toLowerCase().includes(mfgSearch.toLowerCase()) ||
      e.vendorName?.toLowerCase().includes(mfgSearch.toLowerCase()) ||
      e.batchNumber?.toLowerCase().includes(mfgSearch.toLowerCase())
    );
  }, [mfgData, mfgSearch]);

  const paginatedMfgEntries = React.useMemo(() => {
    return filteredMfgEntries.slice(
      (mfgPage - 1) * mfgPageSize,
      mfgPage * mfgPageSize
    );
  }, [filteredMfgEntries, mfgPage, mfgPageSize]);

  const filteredOperatingEntries = React.useMemo(() => {
    const list = operatingData?.entries || [];
    return list.filter((e: any) =>
      operatingCategoryFilter === 'ALL' || e.category === operatingCategoryFilter
    );
  }, [operatingData, operatingCategoryFilter]);

  const paginatedOperatingEntries = React.useMemo(() => {
    return filteredOperatingEntries.slice(
      (operatingPage - 1) * operatingPageSize,
      operatingPage * operatingPageSize
    );
  }, [filteredOperatingEntries, operatingPage, operatingPageSize]);

  // Format Helper
  const formatCurrency = (val: number | undefined | null) => {
    const num = typeof val === 'number' && !isNaN(val) ? val : 0;
    return '₹' + num.toLocaleString('en-IN');
  };

  const formatDate = (val: any) => {
    if (!val) return 'N/A';
    try {
      return new Date(val).toLocaleDateString('en-IN');
    } catch {
      return String(val);
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'all': return 'All Time (Full Ledger)';
      case 'today': return 'Today';
      case 'week': return 'This Week (Past 7 Days)';
      case 'month': return 'This Month';
      case 'year': return 'This Year (FY 2026)';
      case 'custom': return `${customStartDate} to ${customEndDate}`;
      default: return 'All Time (Full Ledger)';
    }
  };

  // Format Category Names
  const formatCategory = (cat: string) => {
    switch (cat) {
      case 'RENT': return 'Office & Warehouse Rent';
      case 'ELECTRICITY_BILL': return 'Electricity & Utilities';
      case 'STAFF_SALARY': return 'Staff & Helper Salary';
      case 'FOOD_REFRESHMENTS': return 'Pantry, Tea & Snacks';
      case 'PACKAGING_MATERIALS': return 'Packaging Boxes & Tape';
      case 'INTERNET_SOFTWARE': return 'Internet & Software Tools';
      case 'LOGISTICS_SUPPLIES': return 'Logistics Supplies';
      case 'MAINTENANCE_REPAIRS': return 'Maintenance & Repairs';
      case 'MARKETING_ADS': return 'Marketing & Ad Spend';
      case 'MISCELLANEOUS': return 'Miscellaneous Expense';
      case 'OTHER': return 'Other';
      default: return cat;
    }
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn pb-12">



      {/* MAIN FINANCE DASHBOARD (HIDDEN WHEN ANY FULL-PAGE ACTION IS ACTIVE) */}
      {!isAnyActionPageActive && (
        <div className="space-y-6 animate-fadeIn">
          {/* TOP HEADER & CONTROLS */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-forest-900/10 text-forest-900 rounded-xl">
                  <Wallet className="w-5 h-5 text-forest-900" />
                </span>
                <h2 className="font-serif text-2xl font-black text-forest-950">
                  Finance & Business Accounting
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time D2C cash flow, sales revenue, product manufacturing sourcing expenses, and shop overhead accounting.
              </p>
            </div>

            {/* Global Action: Generate Report */}
            <div className="flex items-center space-x-2.5 self-start lg:self-auto flex-wrap">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs transition shadow-sm group cursor-pointer"
                title="Generate & Review Audit Report"
              >
                <FileText className="w-4 h-4 text-gold-300 group-hover:scale-110 transition" />
                <span>Generate Report</span>
              </button>

              <button
                onClick={fetchData}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                title="Refresh Finance Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* TIME SELECTION BAR (Every tab has time selection filter) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10.5px] shrink-0 mr-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Period:</span>
              </span>

              {
                (['all', 'today', 'week', 'month', 'year'] as const).map((p) => {
                  const labels: Record<string, string> = {
                    all: 'All Time',
                    today: 'Today',
                    week: 'This Week',
                    month: 'This Month',
                    year: 'This Year'
                  };
                  const isSelected = period === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${isSelected
                        ? 'bg-forest-900 text-gold-400 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                    >
                      {labels[p]}
                    </button>
                  );
                })
              }

              <button
                onClick={() => setPeriod('custom')}
                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${period === 'custom'
                  ? 'bg-forest-900 text-gold-400 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
              >
                Custom Range
              </button>
            </div>

            {/* Custom Date Range Picker */}
            {period === 'custom' && (
              <form onSubmit={handleApplyCustomDate} className="flex items-center space-x-2 w-full md:w-auto">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl text-xs transition"
                >
                  Apply
                </button>
              </form>
            )}

            <div className="text-[11px] text-slate-500 font-medium hidden md:block">
              Active: <strong className="text-forest-950 font-bold">{getPeriodLabel()}</strong>
            </div>
          </div>

          {/* 4 MAIN MODULE TABS */}
          <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${activeTab === 'overview'
                ? 'border-forest-900 text-forest-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>1. Overall Financial Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${activeTab === 'sales'
                ? 'border-forest-900 text-forest-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>2. Selling & Revenue</span>
            </button>

            <button
              onClick={() => setActiveTab('manufacturing')}
              className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${activeTab === 'manufacturing'
                ? 'border-forest-900 text-forest-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
            >
              <Factory className="w-4 h-4" />
              <span>3. Manufacturing & Sourcing</span>
            </button>

            <button
              onClick={() => setActiveTab('operating')}
              className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${activeTab === 'operating'
                ? 'border-forest-900 text-forest-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
            >
              <Receipt className="w-4 h-4" />
              <span>4. Shop & Overhead</span>
            </button>

            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${activeTab === 'audit_logs'
                ? 'border-forest-900 text-forest-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>5. Audit & Deletion Logs</span>
              {auditData?.metrics?.totalDeletions ? (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-mono font-bold">
                  {auditData.metrics.totalDeletions}
                </span>
              ) : null}
            </button>
          </div>

          {/* ====================================================================
          TAB 1: OVERALL FINANCIAL OVERVIEW & CONSOLIDATED P&L
          ==================================================================== */}
          {
            activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Executive P&L Scorecard Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                  {/* Card 1: Total Inflow (Revenue from Selling) */}
                  <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Total Sales Inflow
                      </span>
                      <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl sm:text-3xl font-black text-forest-950 font-mono">
                        {formatCurrency(overviewData?.summary?.netSalesInflow)}
                      </span>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center space-x-1">
                        <span>
                          {(overviewData?.summary?.sellingSummary?.offlineSalesCount || 0) > 0
                            ? `From ${overviewData?.summary?.sellingSummary?.totalOrdersCount || 0} online + ${overviewData?.summary?.sellingSummary?.offlineSalesCount} offline sales`
                            : `From ${overviewData?.summary?.sellingSummary?.totalOrdersCount || 0} customer orders`}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Total COGS (Manufacturing Outflow) */}
                  <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        COGS (Manufacturing)
                      </span>
                      <span className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                        <Factory className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                        {formatCurrency(overviewData?.summary?.manufacturingSummary?.netManufacturingExpense)}
                      </span>
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">
                        Net sourcing for {overviewData?.summary?.manufacturingSummary?.totalBatches || 0} production batches
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Total Operating Overhead */}
                  <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Operating Overhead
                      </span>
                      <span className="p-2 bg-rose-50 text-rose-700 rounded-xl">
                        <Receipt className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                        {formatCurrency(overviewData?.summary?.operatingSummary?.totalOperatingExpense)}
                      </span>
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">
                        Rent, power bills, salaries & tea/pantry
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Net Business Profit */}
                  <div className={`p-5 rounded-3xl border shadow-xs relative overflow-hidden ${(overviewData?.summary?.netProfit || 0) >= 0
                    ? 'bg-gradient-to-br from-[#07190F] to-forest-900 text-white border-forest-800'
                    : 'bg-rose-900 text-white border-rose-800'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gold-300 uppercase tracking-wider font-mono">
                        Net Business Profit
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-gold-400 text-forest-950">
                        {overviewData?.summary?.netProfitMargin || 0}% Margin
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl sm:text-3xl font-black text-gold-400 font-mono">
                        {formatCurrency(overviewData?.summary?.netProfit)}
                      </span>
                      <p className="text-[11px] text-slate-200 font-medium mt-1">
                        Inflow minus manufacturing & overhead
                      </p>
                    </div>
                  </div>

                </div>

                {/* Outstanding Receivables vs Payables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Pending Due: Customer COD in-transit */}
                  <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                        Outstanding Receivables (Pending COD)
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-1 block">
                        {formatCurrency(overviewData?.summary?.pendingReceivables)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Awaiting courier delivery & cash collection from buyers
                      </span>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/60">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>

                  {/* Outstanding Payables: Due to Suppliers */}
                  <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                        Outstanding Payables (Due to Suppliers)
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-1 block">
                        {formatCurrency(overviewData?.summary?.outstandingPayables)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Balance payment due for raw materials & product batches
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200/60">
                      <AlertCircle className="w-6 h-6 text-rose-600" />
                    </div>
                  </div>

                </div>

                {/* Consolidated P&L Breakdown Table */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-forest-950">
                      Consolidated Profit & Loss Statement
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      {getPeriodLabel()}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs font-medium">
                    <div className="p-3.5 bg-slate-50 font-bold flex justify-between text-slate-600 uppercase tracking-wider text-[11px]">
                      <span>Ledger Component</span>
                      <span>Amount (₹)</span>
                    </div>

                    {/* 1. Gross Sales Revenue (Combined Online + Offline) */}
                    <div className="p-3.5 flex justify-between items-center hover:bg-slate-50/60 transition">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="font-semibold text-slate-800">1. Gross Order Revenue (Customer Sales)</span>
                      </div>
                      <span className="font-bold font-mono text-emerald-700">
                        +{formatCurrency(
                          overviewData?.summary?.sellingSummary?.combinedGrossSales ??
                          ((overviewData?.summary?.sellingSummary?.grossSalesValue || 0) + (overviewData?.summary?.sellingSummary?.offlineGrossValue || 0))
                        )}
                      </span>
                    </div>

                    {/* Online Realized Cash */}
                    <div className="p-3.5 pl-7 flex justify-between items-center text-slate-500 text-[11px] bg-slate-50/30">
                      <div className="flex items-center space-x-2">
                        <span>• Online Prepaid & Delivered COD Cash Collected</span>
                        {(overviewData?.summary?.sellingSummary?.totalOrdersCount || 0) > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-mono text-[9px] font-bold rounded">
                            {overviewData?.summary?.sellingSummary?.totalOrdersCount} Orders
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-emerald-600">
                        {formatCurrency(overviewData?.summary?.sellingSummary?.realizedRevenue)}
                      </span>
                    </div>

                    {/* Offline Retail Store Counter Sales Cash */}
                    <div className="p-3.5 pl-7 flex justify-between items-center text-slate-500 text-[11px] bg-slate-50/30">
                      <div className="flex items-center space-x-2">
                        <span>• Offline Retail Store Counter Cash Collected</span>
                        {(overviewData?.summary?.sellingSummary?.offlineSalesCount || 0) > 0 && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[9px] font-bold rounded">
                            {overviewData?.summary?.sellingSummary?.offlineSalesCount} Bills
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-emerald-600">
                        {formatCurrency(overviewData?.summary?.sellingSummary?.offlineRealizedRevenue)}
                      </span>
                    </div>

                    {/* Offline Direct Counter Outstanding Due (Udhaar) - if any */}
                    {(overviewData?.summary?.sellingSummary?.offlinePendingDue || 0) > 0 && (
                      <div className="p-3.5 pl-7 flex justify-between items-center text-slate-500 text-[11px] bg-slate-50/30">
                        <span>• Offline Store Pending Receivables (Customer Credit)</span>
                        <span className="font-mono font-bold text-amber-700">
                          {formatCurrency(overviewData?.summary?.sellingSummary?.offlinePendingDue)}
                        </span>
                      </div>
                    )}

                    {/* Refunded */}
                    <div className="p-3.5 pl-7 flex justify-between items-center text-slate-500 text-[11px] bg-slate-50/30">
                      <span>• Cancelled & Returned Orders Value</span>
                      <span className="font-mono text-rose-600">
                        -{formatCurrency(overviewData?.summary?.sellingSummary?.totalRefundedValue)}
                      </span>
                    </div>

                    {/* 2. Manufacturing & Sourcing Costs (COGS) */}
                    <div className="p-3.5 flex justify-between items-center hover:bg-slate-50/60 transition">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="font-semibold text-slate-800">2. Cost of Goods Sold (Product Manufacturing & Procurement)</span>
                      </div>
                      <span className="font-bold font-mono text-rose-700">
                        -{formatCurrency(overviewData?.summary?.manufacturingSummary?.netManufacturingExpense)}
                      </span>
                    </div>

                    {/* Supplier returns */}
                    <div className="p-3.5 pl-7 flex justify-between items-center text-slate-500 text-[11px] bg-slate-50/30">
                      <span>• Supplier Returns & Defect Refunds Credited Back</span>
                      <span className="font-mono text-emerald-600">
                        +{formatCurrency(overviewData?.summary?.manufacturingSummary?.totalSupplierReturnsRefunded)}
                      </span>
                    </div>

                    {/* Gross Profit */}
                    <div className="p-3.5 flex justify-between items-center bg-slate-100/80 font-bold text-slate-900">
                      <span>Gross Profit (Sales Inflow - Sourcing COGS)</span>
                      <span className="font-mono font-black text-forest-950">
                        {formatCurrency(overviewData?.summary?.grossProfit)}
                      </span>
                    </div>

                    {/* 3. Operating Overhead Expenses */}
                    <div className="p-3.5 flex justify-between items-center hover:bg-slate-50/60 transition">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="font-semibold text-slate-800">3. Shop & Fulfillment Operational Overhead (Rent, Light, Salary, Tea)</span>
                      </div>
                      <span className="font-bold font-mono text-rose-700">
                        -{formatCurrency(overviewData?.summary?.operatingSummary?.totalOperatingExpense)}
                      </span>
                    </div>

                    {/* Net Profit Final */}
                    <div className="p-4 flex justify-between items-center bg-forest-900 text-white font-bold text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-serif text-base text-gold-400 font-black">NET BUSINESS PROFIT / LOSS</span>
                        <span className="text-[10px] bg-gold-400 text-forest-950 px-2 py-0.5 rounded font-mono uppercase font-black">
                          {overviewData?.summary?.netProfitMargin || 0}% MARGIN
                        </span>
                      </div>
                      <span className="font-serif text-lg text-gold-400 font-mono font-black">
                        {formatCurrency(overviewData?.summary?.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {/* ====================================================================
          TAB 2: SELLING & REVENUE (3 SUB-TABS: OVERALL, ONLINE, OFFLINE)
          ==================================================================== */}
          {
            activeTab === 'sales' && (
              <div className="space-y-6">
                {/* 3 Sub-tabs Navigation Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setSellingSubTab('overall')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${sellingSubTab === 'overall'
                        ? 'bg-forest-900 text-gold-400 shadow-sm'
                        : 'text-slate-600 hover:text-forest-950 hover:bg-slate-100'
                        }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>1. Overall Consolidated</span>
                    </button>

                    <button
                      onClick={() => setSellingSubTab('online')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${sellingSubTab === 'online'
                        ? 'bg-forest-900 text-gold-400 shadow-sm'
                        : 'text-slate-600 hover:text-forest-950 hover:bg-slate-100'
                        }`}
                    >
                      <Globe className="w-4 h-4" />
                      <span>2. Online Selling</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${sellingSubTab === 'online' ? 'bg-gold-400 text-forest-950' : 'bg-slate-200 text-slate-700'
                        }`}>
                        {salesData?.online?.orders?.length || salesData?.orders?.length || 0}
                      </span>
                    </button>

                    <button
                      onClick={() => setSellingSubTab('offline')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${sellingSubTab === 'offline'
                        ? 'bg-forest-900 text-gold-400 shadow-sm'
                        : 'text-slate-600 hover:text-forest-950 hover:bg-slate-100'
                        }`}
                    >
                      <Store className="w-4 h-4" />
                      <span>3. Offline Selling</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${sellingSubTab === 'offline' ? 'bg-gold-400 text-forest-950' : 'bg-slate-200 text-slate-700'
                        }`}>
                        {salesData?.offline?.sales?.length || salesData?.offlineSales?.length || 0}
                      </span>
                    </button>
                  </div>

                  {sellingSubTab === 'offline' && (
                    <button
                      onClick={() => setIsAddOfflineModalOpen(true)}
                      className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs rounded-xl transition shadow-xs cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Record Offline Sale</span>
                    </button>
                  )}
                </div>

                {/* ==========================================
                SUB-TAB 1: OVERALL CONSOLIDATED
                ========================================== */}
                {sellingSubTab === 'overall' && (
                  <div className="space-y-6">
                    {/* Consolidated Scorecards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                          Total Combined Gross Sales
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-forest-950 font-mono mt-1 block">
                          {formatCurrency(salesData?.overall?.combinedGross ?? salesData?.metrics?.grossSales)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Online Web + Offline Retail</span>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                          Realized Cashflow (Paid)
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1 block">
                          {formatCurrency(salesData?.overall?.combinedRealized ?? salesData?.metrics?.realizedEarning)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">In Hand & Bank Inflow</span>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                          Total Pending Receivables
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-1 block">
                          {formatCurrency(salesData?.overall?.combinedPendingDue ?? salesData?.metrics?.pendingDue)}
                        </span>
                        <span className="text-[10px] text-amber-600 font-semibold">COD In-Transit + Udhaar</span>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                          Total Transactions
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-forest-950 font-mono mt-1 block">
                          {salesData?.overall?.totalTransactions || 0}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {salesData?.overall?.onlineOrdersCount || 0} Online + {salesData?.overall?.offlineSalesCount || 0} Offline
                        </span>
                      </div>
                    </div>

                    {/* Channel Comparison Cards (Online vs Offline) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Online Channel Card */}
                      <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                              <Globe className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-serif font-bold text-forest-950 text-sm">Online E-Commerce Channel</h4>
                              <p className="text-[11px] text-slate-400">Direct Store Orders & Courier Logistics</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-black font-mono rounded-lg">
                            {salesData?.overall?.onlineSharePercent ?? 0}% Share
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 uppercase font-mono block font-bold">Gross Sales</span>
                            <span className="font-mono font-black text-sm text-forest-950 block mt-0.5">
                              ₹{salesData?.overall?.onlineGross || 0}
                            </span>
                          </div>
                          <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                            <span className="text-[10px] text-emerald-600 uppercase font-mono block font-bold">Realized Cash</span>
                            <span className="font-mono font-black text-sm text-emerald-800 block mt-0.5">
                              ₹{salesData?.overall?.onlineRealized || 0}
                            </span>
                          </div>
                          <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                            <span className="text-[10px] text-amber-600 uppercase font-mono block font-bold">Pending COD</span>
                            <span className="font-mono font-black text-sm text-amber-800 block mt-0.5">
                              ₹{salesData?.overall?.onlinePendingDue || 0}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span>Orders Placed: <strong className="text-forest-950 font-mono">{salesData?.overall?.onlineOrdersCount || 0}</strong></span>
                          <button
                            onClick={() => setSellingSubTab('online')}
                            className="text-forest-900 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <span>View Online Orders</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Offline Channel Card */}
                      <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                              <Store className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-serif font-bold text-forest-950 text-sm">Offline Local Retail & Direct</h4>
                              <p className="text-[11px] text-slate-400">Local Area, Counter Sales & Retailers</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black font-mono rounded-lg">
                            {salesData?.overall?.offlineSharePercent ?? 0}% Share
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 uppercase font-mono block font-bold">Gross Sales</span>
                            <span className="font-mono font-black text-sm text-forest-950 block mt-0.5">
                              ₹{salesData?.overall?.offlineGross || 0}
                            </span>
                          </div>
                          <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                            <span className="text-[10px] text-emerald-600 uppercase font-mono block font-bold">Cash/UPI Paid</span>
                            <span className="font-mono font-black text-sm text-emerald-800 block mt-0.5">
                              ₹{salesData?.overall?.offlineRealized || 0}
                            </span>
                          </div>
                          <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100">
                            <span className="text-[10px] text-rose-600 uppercase font-mono block font-bold">Pending / Due</span>
                            <span className="font-mono font-black text-sm text-rose-800 block mt-0.5">
                              ₹{salesData?.overall?.offlineDue || 0}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span>Offline Bills: <strong className="text-forest-950 font-mono">{salesData?.overall?.offlineSalesCount || 0}</strong></span>
                          <button
                            onClick={() => setSellingSubTab('offline')}
                            className="text-forest-900 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <span>View Offline Sales</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Consolidated Activity Stream / Combined Ledger Table */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="font-serif text-sm font-bold text-forest-950 flex items-center space-x-1.5">
                            <Layers className="w-4 h-4 text-forest-800" />
                            <span>Combined Sales Ledger ({consolidatedLedger.length} Total Records)</span>
                          </h3>
                          <p className="text-[11px] text-slate-400">Consolidated chronological timeline of Online and Offline sales</p>
                        </div>
                        <div className="relative w-full sm:w-72">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search combined transactions..."
                            value={salesSearch}
                            onChange={(e) => setSalesSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-900"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#FAF8F5] text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Transaction ID & Date</th>
                              <th className="py-3 px-4">Channel</th>
                              <th className="py-3 px-4">Customer & Location</th>
                              <th className="py-3 px-4">Payment Method</th>
                              <th className="py-3 px-4">Payment Status</th>
                              <th className="py-3 px-4 text-right">Amount</th>
                              <th className="py-3 px-4 text-right">Due / Udhaar</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredConsolidated.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-10 text-center text-slate-400 italic">
                                  No sales transactions recorded during {getPeriodLabel().toLowerCase()}.
                                </td>
                              </tr>
                            ) : (
                              paginatedConsolidated.map((item: any) => (
                                <tr key={`${item.type}-${item._id}`} className="hover:bg-slate-50/80 transition">
                                  <td className="py-3.5 px-4">
                                    <span className="font-mono font-bold text-forest-950 block">{item.id}</span>
                                    <span className="text-[10.5px] text-slate-400">
                                      {new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {item.type === 'ONLINE' ? (
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                        <Globe className="w-3 h-3" />
                                        <span>ONLINE</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <Store className="w-3 h-3" />
                                        <span>OFFLINE</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                                    {item.customer}
                                    <span className="block text-[10px] text-slate-400 font-sans">{item.subtitle}</span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                                    {item.paymentMethod}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${item.paymentStatus === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : item.paymentStatus === 'PARTIAL'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : item.paymentStatus === 'REFUNDED'
                                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                                          : 'bg-rose-50 text-rose-800 border-rose-200'
                                      }`}>
                                      {item.paymentStatus}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-forest-950">
                                    ₹{item.amount}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-xs">
                                    {item.due > 0 ? (
                                      <span className="text-rose-700">₹{item.due}</span>
                                    ) : (
                                      <span className="text-slate-400">₹0</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    {item.type === 'OFFLINE' ? (
                                      <button
                                        onClick={() => handleDeleteOfflineSale(item._id, item.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                        title="Delete offline sale record"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded border border-slate-200">Order Locked</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {filteredConsolidated.length > 0 && (
                        <AdminPagination
                          currentPage={consolidatedPage}
                          totalItems={filteredConsolidated.length}
                          pageSize={consolidatedPageSize}
                          onPageChange={setConsolidatedPage}
                          onPageSizeChange={setConsolidatedPageSize}
                          itemLabel="transactions"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* ==========================================
                SUB-TAB 2: ONLINE SELLING (WEBSITE ORDERS)
                ========================================== */}
                {sellingSubTab === 'online' && (
                  <div className="space-y-6">
                    {/* Selling Scorecard */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                          Total Orders Placed
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-forest-950 font-mono mt-1 block">
                          {salesData?.online?.metrics?.totalOrdersCount ?? salesData?.metrics?.totalOrdersCount ?? 0}
                        </span>
                        <span className="text-[10px] text-slate-500">Gross: {formatCurrency(salesData?.online?.metrics?.grossSales ?? salesData?.metrics?.grossSales)}</span>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                          Realized Earning (Paid)
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1 block">
                          {formatCurrency(salesData?.online?.metrics?.realizedEarning ?? salesData?.metrics?.realizedEarning)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">Online & Delivered COD</span>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                          Pending Due (In Transit)
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-1 block">
                          {formatCurrency(salesData?.online?.metrics?.pendingDue ?? salesData?.metrics?.pendingDue)}
                        </span>
                        <span className="text-[10px] text-amber-600 font-semibold">Awaiting Courier COD Cash</span>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                          Refunded
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-1 block">
                          {formatCurrency(salesData?.online?.metrics?.returnedValue ?? salesData?.metrics?.returnedValue)}
                        </span>
                        <span className="text-[10px] text-rose-600 font-semibold">Returned orders</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                      <div className="relative w-full sm:w-96">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search orders in online sales ledger..."
                          value={salesSearch}
                          onChange={(e) => setSalesSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-900"
                        />
                      </div>
                    </div>

                    {/* Customer Orders Sales Ledger Table */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-serif text-sm font-bold text-forest-950 flex items-center space-x-1.5">
                          <ShoppingBag className="w-4 h-4 text-forest-800" />
                          <span>Online Sales Ledger ({salesData?.online?.orders?.length || salesData?.orders?.length || 0} Orders)</span>
                        </h3>
                        <span className="text-xs text-slate-400 font-mono">{getPeriodLabel()}</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#FAF8F5] text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Order ID & Date</th>
                              <th className="py-3 px-4">Customer Details</th>
                              <th className="py-3 px-4">Payment Method</th>
                              <th className="py-3 px-4">Payment Status</th>
                              <th className="py-3 px-4">Order Status</th>
                              <th className="py-3 px-4 text-right">Order Amount</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredOnlineOrders.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-10 text-center text-slate-400 italic">
                                  No customer orders placed during {getPeriodLabel().toLowerCase()}.
                                </td>
                              </tr>
                            ) : (
                              paginatedOnlineOrders.map((order: any) => (
                                <tr key={order._id} className="hover:bg-slate-50/80 transition">
                                  <td className="py-3.5 px-4">
                                    <span className="font-mono font-bold text-forest-950 block">{order.orderId}</span>
                                    <span className="text-[10.5px] text-slate-400">
                                      {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                                    {order.customerDetails?.fullName}
                                    <span className="block text-[10px] text-slate-400 font-mono">+91 {order.customerDetails?.phone}</span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                                    {order.paymentInfo?.method}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${order.paymentInfo?.status === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : order.paymentInfo?.status === 'REFUNDED'
                                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                      }`}>
                                      {order.paymentInfo?.status}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold">
                                    <span className={`px-2 py-0.5 rounded-md text-[10.5px] ${order.orderStatus === 'DELIVERED'
                                      ? 'bg-emerald-100 text-emerald-900'
                                      : order.orderStatus === 'CANCELLED'
                                        ? 'bg-rose-100 text-rose-900'
                                        : order.orderStatus === 'RETURNED'
                                          ? 'bg-orange-100 text-orange-900'
                                          : 'bg-slate-100 text-slate-800'
                                      }`}>
                                      {order.orderStatus}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-forest-950">
                                    ₹{order.pricing?.totalAmount || 0}
                                  </td>
                                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded border border-slate-200">GST Locked</span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {filteredOnlineOrders.length > 0 && (
                        <AdminPagination
                          currentPage={onlineSalesPage}
                          totalItems={filteredOnlineOrders.length}
                          pageSize={onlineSalesPageSize}
                          onPageChange={setOnlineSalesPage}
                          onPageSizeChange={setOnlineSalesPageSize}
                          itemLabel="online orders"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* ==========================================
                SUB-TAB 3: OFFLINE SELLING (LOCAL RETAIL)
                ========================================== */}
                {sellingSubTab === 'offline' && (
                  <div className="space-y-6">
                    {/* Offline Scorecard */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                          Total Offline Gross Sales
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-forest-950 font-mono mt-1 block">
                          {formatCurrency(salesData?.offline?.metrics?.grossSales || 0)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Local Area Retail Counter</span>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                          Realized Inflow (Collected)
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1 block">
                          {formatCurrency(salesData?.offline?.metrics?.realizedEarning || 0)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          Cash: ₹{salesData?.offline?.metrics?.cashCollected || 0} • UPI: ₹{salesData?.offline?.metrics?.upiCollected || 0}
                        </span>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                          Pending(Due)
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-1 block">
                          {formatCurrency(salesData?.offline?.metrics?.pendingDue || 0)}
                        </span>
                        <span className="text-[10px] text-rose-600 font-semibold">Pending Local Credit Khata</span>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                          Total Offline Bills
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-forest-950 font-mono mt-1 block">
                          {salesData?.offline?.metrics?.totalSalesCount || 0}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Customer & Retail Invoices</span>
                      </div>
                    </div>

                    {/* Filter and Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-80">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search by Bill ID, Customer, Phone, Area..."
                            value={offlineSearch}
                            onChange={(e) => setOfflineSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-900"
                          />
                        </div>

                        <div className="w-full sm:w-auto">
                          <AdminSelect
                            value={offlineStatusFilter}
                            onChange={setOfflineStatusFilter}
                            options={OFFLINE_STATUS_FILTER_OPTIONS}
                            icon={Filter}
                            size="sm"
                            className="w-full sm:w-56"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => setIsAddOfflineModalOpen(true)}
                        className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Record Offline Sale</span>
                      </button>
                    </div>

                    {/* Offline Sales Ledger Table */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-serif text-sm font-bold text-forest-950 flex items-center space-x-1.5">
                          <Store className="w-4 h-4 text-emerald-700" />
                          <span>Offline Sales & Retail Ledger ({filteredOfflineSales.length} Invoices)</span>
                        </h3>
                        <span className="text-xs text-slate-400 font-mono">{getPeriodLabel()}</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#FAF8F5] text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Sale ID & Date</th>
                              <th className="py-3 px-4">Customer / Retailer</th>
                              <th className="py-3 px-4">Items Sold</th>
                              <th className="py-3 px-4">Payment Mode</th>
                              <th className="py-3 px-4">Payment Status</th>
                              <th className="py-3 px-4 text-right">Total Amount</th>
                              <th className="py-3 px-4 text-right">Paid</th>
                              <th className="py-3 px-4 text-right">Pending / Due</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredOfflineSales.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-10 text-center text-slate-400 italic">
                                  No offline sales recorded matching your criteria.
                                </td>
                              </tr>
                            ) : (
                              paginatedOfflineSales.map((sale: any) => (
                                <tr key={sale._id} className="hover:bg-slate-50/80 transition">
                                  <td className="py-3.5 px-4">
                                    <span className="font-mono font-bold text-forest-950 block">{sale.saleId}</span>
                                    {sale.billNumber && (
                                      <span className="text-[10px] text-slate-500 font-mono block">Bill: #{sale.billNumber}</span>
                                    )}
                                    <span className="text-[10.5px] text-slate-400 font-sans">
                                      {new Date(sale.saleDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                                    {sale.customerName}
                                    {sale.customerPhone && (
                                      <span className="block text-[10px] text-slate-400 font-mono">+91 {sale.customerPhone}</span>
                                    )}
                                    {sale.locationArea && (
                                      <span className="inline-flex items-center space-x-1 text-[10px] text-forest-800 bg-forest-50 px-1.5 py-0.5 rounded mt-0.5 font-sans font-medium">
                                        <MapPin className="w-2.5 h-2.5 text-forest-700" />
                                        <span>{sale.locationArea}</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {sale.items?.map((it: any, idx: number) => (
                                      <div key={idx} className="text-slate-700">
                                        <span className="font-bold">{it.name}</span>
                                        <span className="text-slate-500 font-mono text-[10.5px] ml-1">× {it.quantity} (@ ₹{it.unitPrice})</span>
                                      </div>
                                    ))}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                                    {sale.paymentMode === 'CREDIT_UDHAAR' ? 'CREDIT / UDHAAR' : sale.paymentMode}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sale.paymentStatus === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : sale.paymentStatus === 'PARTIAL'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-rose-50 text-rose-800 border-rose-200'
                                      }`}>
                                      {sale.paymentStatus === 'PENDING' ? 'UDHAAR' : sale.paymentStatus}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-forest-950">
                                    ₹{sale.totalAmount || 0}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-emerald-700">
                                    ₹{sale.amountPaid || 0}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-xs">
                                    {sale.amountDue > 0 ? (
                                      <span className="text-rose-700 font-black">₹{sale.amountDue}</span>
                                    ) : (
                                      <span className="text-slate-400">₹0</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                                    <button
                                      onClick={() => setSelectedOfflineSaleForView(sale)}
                                      className="p-1.5 text-slate-400 hover:text-forest-950 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                      title="View Invoice & Audit Change History"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditOfflineSale(sale)}
                                      className="p-1.5 text-slate-400 hover:text-forest-950 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                      title="Edit Sale Details & Record Changes"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    {sale.amountDue > 0 && (
                                      <button
                                        onClick={() => handleOpenOfflinePayment(sale)}
                                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10.5px] transition cursor-pointer"
                                        title="Settle pending udhaar or record partial payment"
                                      >
                                        Collect
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteOfflineSale(sale._id, sale.saleId)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      title="Delete record and restore inventory"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {filteredOfflineSales.length > 0 && (
                        <AdminPagination
                          currentPage={offlineSalesPage}
                          totalItems={filteredOfflineSales.length}
                          pageSize={offlineSalesPageSize}
                          onPageChange={setOfflineSalesPage}
                          onPageSizeChange={setOfflineSalesPageSize}
                          itemLabel="offline bills"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          {/* ====================================================================
          TAB 3: PRODUCT MANUFACTURING & SOURCING
          ==================================================================== */}
          {
            activeTab === 'manufacturing' && (
              <div className="space-y-6">
                {/* Manufacturing Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                      Total Sourcing Cost
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1 block">
                      {formatCurrency(mfgData?.metrics?.totalCost)}
                    </span>
                    <span className="text-[10px] text-slate-500">{mfgData?.metrics?.totalBatches || 0} production batches</span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                      Total Paid to Vendors
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1 block">
                      {formatCurrency(mfgData?.metrics?.totalPaid)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Cleared via bank & UPI</span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                      Pending Due to Vendors
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-1 block">
                      {formatCurrency(mfgData?.metrics?.totalDue)}
                    </span>
                    <span className="text-[10px] text-rose-600 font-semibold">Outstanding Accounts Payable</span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                      Supplier Returns & Refunds
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-purple-700 font-mono mt-1 block">
                      {formatCurrency(mfgData?.metrics?.totalRefunded)}
                    </span>
                    <span className="text-[10px] text-purple-600 font-semibold">Refunded for defective/returned batches</span>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search vendor, batch number, product..."
                      value={mfgSearch}
                      onChange={(e) => setMfgSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>

                  <button
                    onClick={() => setIsAddMfgModalOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Manufacturing Procurement Batch</span>
                  </button>
                </div>

                {/* Manufacturing Ledger Table */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-serif text-sm font-bold text-forest-950 flex items-center space-x-1.5">
                      <Factory className="w-4 h-4 text-forest-800" />
                      <span>Manufacturing Procurement Batches ({mfgData?.entries?.length || 0})</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">{getPeriodLabel()}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8F5] text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Batch & Date</th>
                          <th className="py-3 px-4">Product & Quantity</th>
                          <th className="py-3 px-4">Vendor / Manufacturer</th>
                          <th className="py-3 px-4">Cost (Unit & Total)</th>
                          <th className="py-3 px-4">Paid & Due</th>
                          <th className="py-3 px-4">Status & Returns</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredMfgEntries.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-slate-400 italic">
                              No manufacturing procurement batches recorded for this period.
                            </td>
                          </tr>
                        ) : (
                          paginatedMfgEntries.map((entry: any) => (
                            <tr key={entry._id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-bold text-forest-950 block">{entry.batchNumber}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(entry.expenseDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                {entry.invoiceNumber && (
                                  <span className="text-[10px] text-slate-500 block font-mono">Inv: {entry.invoiceNumber}</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-900">
                                {entry.productName}
                                <span className="block text-[11px] text-forest-900 font-bold">
                                  {entry.quantity} units manufactured
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-700">
                                {entry.vendorName}
                                {entry.vendorContact && (
                                  <span className="block text-[10.5px] text-slate-400 font-mono">{entry.vendorContact}</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono">
                                <span className="font-bold text-slate-900 block">₹{entry.totalCost}</span>
                                <span className="text-[10.5px] text-slate-400">@ ₹{entry.unitCost}/unit</span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11.5px]">
                                <span className="text-emerald-700 font-bold block">Paid: ₹{entry.amountPaid}</span>
                                <span className={`font-bold block ${entry.amountDue > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                                  Due: ₹{entry.amountDue}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${entry.paymentStatus === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : entry.paymentStatus === 'PARTIAL'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                  }`}>
                                  {entry.paymentStatus}
                                </span>

                                {entry.totalRefundedFromReturns > 0 && (
                                  <span className="block text-[10px] text-purple-700 font-bold mt-1">
                                    ↺ ₹{entry.totalRefundedFromReturns} Refunded
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end space-x-1">
                                  <button
                                    onClick={() => setSelectedMfgForView(entry)}
                                    className="p-1.5 text-slate-400 hover:text-forest-950 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                    title="View Batch Details & Modification History"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenEditMfg(entry)}
                                    className="p-1.5 text-slate-400 hover:text-forest-950 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                    title="Edit Procurement Batch Details"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {entry.amountDue > 0 && (
                                    <button
                                      onClick={() => {
                                        setSelectedMfgForPayment(entry);
                                        setPaymentAmount(entry.amountDue);
                                        setIsRecordPaymentModalOpen(true);
                                      }}
                                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10.5px] transition"
                                      title="Pay supplier balance"
                                    >
                                      Pay Due
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setSelectedMfgForReturn(entry);
                                      setReturnQty(1);
                                      setRefundAmount(entry.unitCost);
                                      setReturnReason('');
                                      setIsRecordReturnModalOpen(true);
                                    }}
                                    className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-lg text-[10.5px] transition"
                                    title="Record defective/unsold return to supplier"
                                  >
                                    Return Batch
                                  </button>

                                  <button
                                    onClick={() => handleDeleteMfg(entry._id, entry.batchNumber)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                    title="Delete batch entry"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {filteredMfgEntries.length > 0 && (
                    <AdminPagination
                      currentPage={mfgPage}
                      totalItems={filteredMfgEntries.length}
                      pageSize={mfgPageSize}
                      onPageChange={setMfgPage}
                      onPageSizeChange={setMfgPageSize}
                      itemLabel="batches"
                    />
                  )}
                </div>
              </div>
            )
          }

          {/* ====================================================================
          TAB 4: SHOP & OVERHEAD OPERATIONAL EXPENSES
          ==================================================================== */}
          {
            activeTab === 'operating' && (
              <div className="space-y-6">
                {/* Operating Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                      Total Operating Expenses
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1 block">
                      {formatCurrency(operatingData?.metrics?.totalOperatingExpense)}
                    </span>
                    <span className="text-[10px] text-slate-500">{operatingData?.metrics?.totalEntries || 0} logged vouchers</span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                      Rent & Facilities
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-forest-950 font-mono mt-1 block">
                      {formatCurrency(operatingData?.metrics?.categoryBreakdown?.RENT)}
                    </span>
                    <span className="text-[10px] text-slate-500">Warehouse & fulfillment space</span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                      Electricity & Utilities
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-1 block">
                      {formatCurrency(operatingData?.metrics?.categoryBreakdown?.ELECTRICITY_BILL)}
                    </span>
                    <span className="text-[10px] text-slate-500">Light bills & power backup</span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                      Pantry & Refreshments
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono mt-1 block">
                      {formatCurrency(operatingData?.metrics?.categoryBreakdown?.FOOD_REFRESHMENTS)}
                    </span>
                    <span className="text-[10px] text-slate-500">Staff tea, breakfast & snacks</span>
                  </div>
                </div>

                {/* Action & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                    <span className="text-slate-500 font-bold text-xs shrink-0">Filter Category:</span>
                    <AdminSelect
                      value={operatingCategoryFilter}
                      onChange={setOperatingCategoryFilter}
                      options={OPERATING_CATEGORY_FILTER_OPTIONS}
                      icon={Filter}
                      size="sm"
                      searchable={true}
                      className="w-full sm:w-64"
                    />
                  </div>

                  <button
                    onClick={() => setIsAddOperatingModalOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Expense (Rent, Bill, Tea/Snacks)</span>
                  </button>
                </div>

                {/* Operating Expenses Table */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-serif text-sm font-bold text-forest-950 flex items-center space-x-1.5">
                      <Receipt className="w-4 h-4 text-forest-800" />
                      <span>Operating Expense Ledger ({operatingData?.entries?.length || 0})</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">{getPeriodLabel()}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8F5] text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Date & Category</th>
                          <th className="py-3 px-4">Expense Title & Description</th>
                          <th className="py-3 px-4">Paid To</th>
                          <th className="py-3 px-4">Payment Mode</th>
                          <th className="py-3 px-4 text-right">Amount (₹)</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredOperatingEntries.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                              No operating overhead expenses logged for this period.
                            </td>
                          </tr>
                        ) : (
                          paginatedOperatingEntries.map((entry: any) => (
                            <tr key={entry._id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 block w-max">
                                  {entry.category}
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  {new Date(entry.expenseDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-slate-900 block">{entry.title}</span>
                                {entry.notes && (
                                  <span className="text-[10.5px] text-slate-400">{entry.notes}</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-700">
                                {entry.paidTo || 'N/A'}
                                {entry.billNumber && (
                                  <span className="block text-[10px] text-slate-400 font-mono">Bill #{entry.billNumber}</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                                {entry.paymentMode}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-forest-950">
                                ₹{entry.amount}
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedOperatingForView(entry)}
                                  className="p-1.5 text-slate-400 hover:text-forest-950 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title="View Voucher Details & Modification History"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditOperating(entry)}
                                  className="p-1.5 text-slate-400 hover:text-forest-950 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title="Edit Expense Voucher"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOperating(entry._id, entry.title)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                  title="Delete expense entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {filteredOperatingEntries.length > 0 && (
                    <AdminPagination
                      currentPage={operatingPage}
                      totalItems={filteredOperatingEntries.length}
                      pageSize={operatingPageSize}
                      onPageChange={setOperatingPage}
                      onPageSizeChange={setOperatingPageSize}
                      itemLabel="expenses"
                    />
                  )}
                </div>
              </div>
            )
          }

          {/* ====================================================================
          TAB 5: AUDIT & DELETION LOGS
          Comprehensive audit trail of records deleted across all 4 finance tabs
          ==================================================================== */}
          {
            activeTab === 'audit_logs' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Summary Metric Ribbon */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Total Purged Records
                      </span>
                      <Archive className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-forest-950 font-mono mt-1 block">
                      {auditData?.metrics?.totalDeletions ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-500">Across all finance modules</span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Deleted Sales Records
                      </span>
                      <Store className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1 block">
                      {(auditData?.metrics?.offlineSalesDeleted ?? 0) + (auditData?.metrics?.onlineOrdersDeleted ?? 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Offline: {auditData?.metrics?.offlineSalesDeleted ?? 0} • Online: {auditData?.metrics?.onlineOrdersDeleted ?? 0}
                    </span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Deleted Sourcing & Overhead
                      </span>
                      <Factory className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-purple-700 font-mono mt-1 block">
                      {(auditData?.metrics?.mfgBatchesDeleted ?? 0) + (auditData?.metrics?.operatingExpensesDeleted ?? 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Mfg: {auditData?.metrics?.mfgBatchesDeleted ?? 0} • Overhead: {auditData?.metrics?.operatingExpensesDeleted ?? 0}
                    </span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-2xs bg-rose-50/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider font-mono">
                        Purged Financial Value
                      </span>
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono mt-1 block">
                      ₹{Number(auditData?.metrics?.totalDeletedValue || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-rose-500">Cumulative value of deleted entries</span>
                  </div>
                </div>

                {/* Controls: Filter by Module, Search & Refresh */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                      {[
                        { key: 'ALL', label: 'All Purged Records' },
                        { key: 'OFFLINE_SALE', label: 'Offline Sales' },
                        { key: 'ONLINE_ORDER', label: 'Online Orders' },
                        { key: 'MANUFACTURING', label: 'Manufacturing Batches' },
                        { key: 'OPERATING', label: 'Operating Expenses' }
                      ].map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => {
                            setAuditFilter(tab.key as any);
                            setAuditPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${auditFilter === tab.key
                            ? 'bg-forest-900 text-gold-400 shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="relative min-w-[220px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search logs by ID, title, admin..."
                          value={auditSearch}
                          onChange={(e) => {
                            setAuditSearch(e.target.value);
                            setAuditPage(1);
                          }}
                          className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-900"
                        />
                        {auditSearch && (
                          <button
                            onClick={() => setAuditSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={fetchAuditLogs}
                        disabled={isLoadingAudit}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                        title="Refresh Audit Logs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin text-forest-900' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Audit Logs Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-[#FAF8F5] border-b border-slate-200/90 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Deletion Date & Time</th>
                          <th className="py-3 px-4">Source Category</th>
                          <th className="py-3 px-4">Deleted Record Title / ID</th>
                          <th className="py-3 px-4 text-right">Financial Value</th>
                          <th className="py-3 px-4">Audit Reason & Consequence</th>
                          <th className="py-3 px-4 text-center">Snapshot</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {isLoadingAudit ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400">
                              <div className="inline-flex items-center space-x-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-forest-900" />
                                <span>Loading audit records...</span>
                              </div>
                            </td>
                          </tr>
                        ) : !auditData?.logs || auditData.logs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400">
                              <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="font-medium text-slate-600">No deleted entries found in this view</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Whenever an entry is deleted from any finance tab, its snapshot is permanently archived here.</p>
                            </td>
                          </tr>
                        ) : (
                          auditData.logs.map((log: any) => {
                            const getCategoryBadge = (type: string) => {
                              switch (type) {
                                case 'OFFLINE_SALE':
                                  return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold text-[10px]">Offline Sale</span>;
                                case 'ONLINE_ORDER':
                                case 'ORDER':
                                  return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">Online Order</span>;
                                case 'MANUFACTURING':
                                  return <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md font-bold text-[10px]">Mfg Sourcing</span>;
                                case 'OPERATING':
                                  return <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-bold text-[10px]">Shop Overhead</span>;
                                default:
                                  return <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-bold text-[10px]">{type}</span>;
                              }
                            };

                            return (
                              <tr key={log._id} className="hover:bg-slate-50/80 transition">
                                <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                  <div>{new Date(log.createdAt).toLocaleDateString('en-IN')}</div>
                                  <div className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  {getCategoryBadge(log.entityType)}
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-800">
                                  <span className="block font-bold text-forest-950">{log.entityTitle || 'Untitled Record'}</span>
                                  <span className="block text-[10px] text-slate-400 font-mono">ID: {log.entityId}</span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-xs text-rose-600 whitespace-nowrap">
                                  ₹{Number(log.amount || 0).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs">
                                  <p className="line-clamp-2">{log.reason || 'Record deleted from system'}</p>
                                </td>
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <button
                                    onClick={() => setSelectedSnapshotForView(log)}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-forest-50 hover:bg-forest-100 text-forest-900 font-bold text-[11px] transition cursor-pointer"
                                    title="Inspect saved snapshot"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Snapshot</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {auditData?.pagination && auditData.pagination.totalItems > 0 && (
                    <AdminPagination
                      currentPage={auditPage}
                      totalItems={auditData.pagination.totalItems}
                      pageSize={auditPageSize}
                      onPageChange={setAuditPage}
                      onPageSizeChange={setAuditPageSize}
                      itemLabel="logs"
                    />
                  )}
                </div>
              </div>
            )
          }
        </div>
      )}

      {/* ====================================================================
          MODAL 1: ADD MANUFACTURING PROCUREMENT BATCH
          ==================================================================== */}
      {
        isAddMfgModalOpen && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setIsAddMfgModalOpen(false)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{'Back to Manufacturing'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <Factory className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {'Record Manufacturing Procurement'}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{'Log vendor sourcing batches, production quantities, unit pricing, and supplier settlements.'}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-white rounded-3xl w-full p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Factory className="w-5 h-5 text-forest-900" />
                  <h3 className="font-serif text-lg font-bold text-forest-950">Record Manufacturing Procurement</h3>
                </div>
                <button
                  onClick={() => setIsAddMfgModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateMfg} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Novise Ayurvedic Hair Growth Oil (200ml)"
                    value={newMfg.productName}
                    onChange={(e) => setNewMfg({ ...newMfg, productName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Manufacturer / Vendor *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aayush Herbals Ltd."
                      value={newMfg.vendorName}
                      onChange={(e) => setNewMfg({ ...newMfg, vendorName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Batch Number</label>
                    <input
                      type="text"
                      placeholder="e.g. BATCH-2026-NOV01"
                      value={newMfg.batchNumber}
                      onChange={(e) => setNewMfg({ ...newMfg, batchNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quantity (Units) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newMfg.quantity}
                      onChange={(e) => setNewMfg({ ...newMfg, quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit Cost (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={newMfg.unitCost}
                      onChange={(e) => setNewMfg({ ...newMfg, unitCost: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                </div>

                {/* Auto Total */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Calculated Total Sourcing Cost:</span>
                  <span className="font-mono font-black text-forest-950 text-sm">
                    ₹{(newMfg.quantity * newMfg.unitCost).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Amount Paid Now (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={newMfg.amountPaid}
                      onChange={(e) => setNewMfg({ ...newMfg, amountPaid: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                    <AdminSelect
                      value={newMfg.paymentMode}
                      onChange={(val) => setNewMfg({ ...newMfg, paymentMode: val })}
                      options={PAYMENT_MODE_OPTIONS}
                      size="md"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-bold text-slate-700">Vendor Contact Phone</label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {newMfg.vendorContact ? `${newMfg.vendorContact.length}/10 digits` : '10 digits'}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[6-9][0-9]{9}"
                        maxLength={10}
                        placeholder="9876543210"
                        value={newMfg.vendorContact}
                        onChange={(e) => setNewMfg({ ...newMfg, vendorContact: sanitizePhoneNumber(e.target.value) })}
                        onKeyDown={handlePhoneKeyDown}
                        className="w-full pl-11 pr-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-forest-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Invoice / Bill Number</label>
                    <input
                      type="text"
                      placeholder="INV-2026-90"
                      value={newMfg.invoiceNumber}
                      onChange={(e) => setNewMfg({ ...newMfg, invoiceNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Quality Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. QC passed, bottle caps verified, batch expiry 2028."
                    value={newMfg.notes}
                    onChange={(e) => setNewMfg({ ...newMfg, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddMfgModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl"
                  >
                    Save Batch
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          MODAL 2: RECORD SUPPLIER PAYMENT
          ==================================================================== */}
      {
        isRecordPaymentModalOpen && selectedMfgForPayment && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => { setIsRecordPaymentModalOpen(false); setSelectedMfgForPayment(null); }}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{'Back to Manufacturing'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <CreditCard className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {'Record Supplier Payment'}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedMfgForPayment ? `Vendor: ${selectedMfgForPayment.vendorName} • Batch: #${selectedMfgForPayment.batchNumber}` : ''}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-white rounded-3xl w-full p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-serif text-base font-bold text-forest-950">Record Supplier Payment</h3>
                <button onClick={() => setIsRecordPaymentModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-800">{selectedMfgForPayment.productName}</p>
                <p className="text-[11px] text-slate-500 font-mono">Batch: {selectedMfgForPayment.batchNumber} • Vendor: {selectedMfgForPayment.vendorName}</p>
                <p className="text-xs font-bold text-rose-700 font-mono">Current Outstanding Due: ₹{selectedMfgForPayment.amountDue}</p>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedMfgForPayment.amountDue}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono text-sm font-bold text-forest-950 focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                  <AdminSelect
                    value={paymentMode}
                    onChange={setPaymentMode}
                    options={PAYMENT_MODE_OPTIONS}
                    size="md"
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRecordPaymentModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          MODAL 3: RECORD SUPPLIER RETURN & REFUND
          ==================================================================== */}
      {
        isRecordReturnModalOpen && selectedMfgForReturn && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => { setIsRecordReturnModalOpen(false); setSelectedMfgForReturn(null); }}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{'Back to Manufacturing'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <RotateCcw className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {'Return Batch to Supplier'}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedMfgForReturn ? `Vendor: ${selectedMfgForReturn.vendorName} • Batch: #${selectedMfgForReturn.batchNumber}` : ''}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-white rounded-3xl w-full p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-serif text-base font-bold text-forest-950">Return Batch to Supplier</h3>
                <button onClick={() => setIsRecordReturnModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                <p className="font-bold text-purple-950">{selectedMfgForReturn.productName}</p>
                <p className="text-[11px] text-purple-700">Unit Cost: ₹{selectedMfgForReturn.unitCost} • Vendor: {selectedMfgForReturn.vendorName}</p>
              </div>

              <form onSubmit={handleRecordReturn} className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Return Quantity (Units) *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedMfgForReturn.quantity}
                    required
                    value={returnQty}
                    onChange={(e) => {
                      const q = Number(e.target.value);
                      setReturnQty(q);
                      setRefundAmount(q * selectedMfgForReturn.unitCost);
                    }}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Refund Amount Credited (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono text-sm font-bold text-purple-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reason for Return *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Cap leakage detected, bottle label defect, batch QC rejection"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRecordReturnModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl"
                  >
                    Process Return & Credit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          MODAL 4: RECORD OPERATING OVERHEAD EXPENSE
          ==================================================================== */}
      {
        isAddOperatingModalOpen && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setIsAddOperatingModalOpen(false)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{'Back to Shop & Overhead'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <Store className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {'Record Shop & Overhead Expense'}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{'Log shop and warehouse operational expenses, utilities, payroll, packaging, or petty cash.'}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-white rounded-3xl w-full p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-forest-900" />
                  <h3 className="font-serif text-lg font-bold text-forest-950">Record Shop & Overhead Expense</h3>
                </div>
                <button
                  onClick={() => setIsAddOperatingModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOperating} className="space-y-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expense Category *</label>
                  <AdminSelect
                    value={newOperating.category}
                    onChange={(val) => setNewOperating({ ...newOperating, category: val })}
                    options={OPERATING_CATEGORY_OPTIONS}
                    size="md"
                    searchable={true}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expense Title / Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Torrent Power October Bill, Staff Morning Tea"
                    value={newOperating.title}
                    onChange={(e) => setNewOperating({ ...newOperating, title: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="2500"
                      value={newOperating.amount}
                      onChange={(e) => setNewOperating({ ...newOperating, amount: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono text-sm font-bold text-forest-950 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                    <AdminSelect
                      value={newOperating.paymentMode}
                      onChange={(val) => setNewOperating({ ...newOperating, paymentMode: val })}
                      options={PAYMENT_MODE_OPTIONS}
                      size="md"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Paid To (Vendor/Person)</label>
                    <input
                      type="text"
                      placeholder="e.g. Torrent Power Ltd., Local Canteen"
                      value={newOperating.paidTo}
                      onChange={(e) => setNewOperating({ ...newOperating, paidTo: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bill / Voucher Number</label>
                    <input
                      type="text"
                      placeholder="ELE-90218"
                      value={newOperating.billNumber}
                      onChange={(e) => setNewOperating({ ...newOperating, billNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Optional billing details or ledger notes"
                    value={newOperating.notes}
                    onChange={(e) => setNewOperating({ ...newOperating, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddOperatingModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl"
                  >
                    Record Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          MODAL 5: RECORD OFFLINE SALE (LOCAL RETAIL / DIRECT SALE)
          ==================================================================== */}
      {
        isAddOfflineModalOpen && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setIsAddOfflineModalOpen(false)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{'Back to Offline Sales'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <Store className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {'Record Offline Retail Sale'}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{'Direct Store Counter Point of Sale (POS) Billing & Customer Receipt'}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-white rounded-3xl w-full p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-sm font-bold text-forest-950">Record Offline Sale</h3>
                    <p className="text-[11px] text-slate-400">Log local counter order, retail bill or direct udhaar</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddOfflineModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOfflineSale} className="space-y-4">
                {/* Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Customer / Shop Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Bhai Patel / Shreenath Store"
                      value={newOfflineSale.customerName}
                      onChange={(e) => setNewOfflineSale(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-bold text-slate-600">
                        Phone Number
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {newOfflineSale.customerPhone ? `${newOfflineSale.customerPhone.length}/10 digits` : '10 digits'}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[6-9][0-9]{9}"
                        maxLength={10}
                        placeholder="9876543210"
                        value={newOfflineSale.customerPhone}
                        onChange={(e) => setNewOfflineSale(prev => ({
                          ...prev,
                          customerPhone: sanitizePhoneNumber(e.target.value)
                        }))}
                        onKeyDown={handlePhoneKeyDown}
                        className="w-full pl-11 pr-3 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-forest-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Area / Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sidhpur Station Road, Ahmedabad"
                      value={newOfflineSale.locationArea}
                      onChange={(e) => setNewOfflineSale(prev => ({ ...prev, locationArea: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Physical Bill / Invoice # (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BILL-102"
                      value={newOfflineSale.billNumber}
                      onChange={(e) => setNewOfflineSale(prev => ({ ...prev, billNumber: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                </div>

                {/* Product Selection */}
                <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-forest-950 text-xs flex items-center space-x-1">
                      <Package className="w-3.5 h-3.5 text-forest-700" />
                      <span>Product Sold</span>
                    </span>
                    <span className="text-[10.5px] text-slate-400">Select catalog item or enter name</span>
                  </div>

                  {availableProducts.length > 0 && (
                    <div>
                      <AdminSelect
                        value={newOfflineSale.productId}
                        onChange={handleSelectOfflineProduct}
                        placeholder="-- Choose from Botanical Catalog --"
                        options={[
                          { value: '', label: '-- Choose from Botanical Catalog --' },
                          ...availableProducts.map(p => ({
                            value: p._id,
                            label: `${p.name} (₹${p.sellingPrice ?? p.price ?? 0})`,
                            badge: `Stock: ${p.stock ?? p.stockQuantity ?? 0}`
                          }))
                        ]}
                        size="md"
                        searchable={true}
                        className="w-full"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Product Name</label>
                    <input
                      type="text"
                      value={newOfflineSale.productName}
                      onChange={(e) => setNewOfflineSale(prev => ({ ...prev, productName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newOfflineSale.quantity}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleOfflineQuantityChange(e.target.value)}
                        onBlur={() => {
                          if (!newOfflineSale.quantity || Number(newOfflineSale.quantity) < 1) {
                            handleOfflineQuantityChange(1);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Unit Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={newOfflineSale.unitPrice}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleOfflineUnitPriceChange(e.target.value)}
                        onBlur={() => {
                          if (newOfflineSale.unitPrice === '' || Number(newOfflineSale.unitPrice) < 0) {
                            handleOfflineUnitPriceChange(0);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Total Bill (₹)</label>
                      <input
                        type="number"
                        readOnly
                        value={newOfflineSale.totalAmount}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-black text-forest-950 focus:outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="deductStockCheckbox"
                      checked={newOfflineSale.deductStock}
                      onChange={(e) => setNewOfflineSale(prev => ({ ...prev, deductStock: e.target.checked }))}
                      className="rounded text-forest-900 focus:ring-forest-900 cursor-pointer"
                    />
                    <label htmlFor="deductStockCheckbox" className="text-[11px] text-slate-600 font-medium cursor-pointer">
                      Auto-deduct items from warehouse inventory stock
                    </label>
                  </div>
                </div>

                {/* Payment Mode & Amount Paid */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Payment Mode
                      </label>
                      <AdminSelect
                        value={newOfflineSale.paymentMode}
                        onChange={handleOfflinePaymentModeChange}
                        options={OFFLINE_PAYMENT_MODE_OPTIONS}
                        size="md"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Amount Received Now (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={newOfflineSale.totalAmount}
                        value={newOfflineSale.amountPaid}
                        onChange={(e) => setNewOfflineSale(prev => ({ ...prev, amountPaid: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Remaining Pending / Due:</span>
                    <span className={`font-mono font-bold ${(newOfflineSale.totalAmount - newOfflineSale.amountPaid) > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                      ₹{Math.max(0, newOfflineSale.totalAmount - newOfflineSale.amountPaid)}
                    </span>
                  </div>
                </div>

                {/* Date & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Date of Sale</label>
                    <input
                      type="date"
                      value={newOfflineSale.saleDate}
                      onChange={(e) => setNewOfflineSale(prev => ({ ...prev, saleDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Notes / Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. Sent via courier or counter pickup"
                      value={newOfflineSale.notes}
                      onChange={(e) => setNewOfflineSale(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddOfflineModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl cursor-pointer shadow-sm transition"
                  >
                    Record Offline Sale
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          MODAL 6: SETTLE OFFLINE PAYMENT / RECORD UDHAAR PAYMENT
          ==================================================================== */}
      {
        isRecordOfflinePaymentModalOpen && selectedOfflineSaleForPayment && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => { setIsRecordOfflinePaymentModalOpen(false); setSelectedOfflineSaleForPayment(null); }}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{'Back to Offline Sales'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <CreditCard className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {'Collect Payment / Settle Udhaar'}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedOfflineSaleForPayment ? `Invoice: #${selectedOfflineSaleForPayment.invoiceNumber} • Customer: ${selectedOfflineSaleForPayment.customer?.name || 'Walk-in'}` : ''}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-white rounded-3xl w-full p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-sm font-bold text-forest-950">Collect Payment / Settle Udhaar</h3>
                    <p className="text-[10.5px] text-slate-400">{selectedOfflineSaleForPayment.saleId}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRecordOfflinePaymentModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-800">{selectedOfflineSaleForPayment.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bill Amount:</span>
                  <span className="font-mono font-bold text-slate-800">₹{selectedOfflineSaleForPayment.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Paid:</span>
                  <span className="font-mono font-bold text-emerald-700">₹{selectedOfflineSaleForPayment.amountPaid}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                  <span className="text-rose-700">Outstanding Due:</span>
                  <span className="font-mono text-rose-700">₹{selectedOfflineSaleForPayment.amountDue}</span>
                </div>
              </div>

              <form onSubmit={handleUpdateOfflinePayment} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Amount Paid Now (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedOfflineSaleForPayment.amountDue}
                    required
                    value={offlinePaymentAmount}
                    onChange={(e) => setOfflinePaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-black text-emerald-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Payment Mode
                  </label>
                  <AdminSelect
                    value={offlinePaymentMode}
                    onChange={setOfflinePaymentMode}
                    options={SETTLE_OFFLINE_PAYMENT_OPTIONS}
                    size="md"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Payment Notes / Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via GPay, settled full khata"
                    value={offlinePaymentNotes}
                    onChange={(e) => setOfflinePaymentNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRecordOfflinePaymentModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl cursor-pointer shadow-sm transition"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          MODAL 7: VIEW OFFLINE SALE DETAILS & AUDIT CHANGE LOG
          ==================================================================== */}
      {
        selectedOfflineSaleForView && !editingOfflineSale && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setSelectedOfflineSaleForView(null)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{'Back to Offline Sales'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <Store className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {`Offline Retail Sale Invoice #${selectedOfflineSaleForView?.saleId || selectedOfflineSaleForView?.invoiceNumber}`}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{'Direct Store Counter Billing & Customer Ledger'}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-[#FDFBF7] rounded-3xl w-full shadow-xs border border-amber-900/15 overflow-hidden">
              {/* STICKY LUXURY HEADER */}
              <div className="px-6 py-6 bg-gradient-to-r from-forest-950 via-[#0B2316] to-forest-900 text-white flex items-center justify-between shrink-0 border-b border-gold-400/20 shadow-md">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gold-400/10 border border-gold-400/30 text-gold-400 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Store className="w-5 h-5 text-gold-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5 flex-wrap">
                      <h3 className="font-serif text-lg sm:text-xl font-bold tracking-wide text-white">
                        Offline Retail Sale Invoice
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-md bg-gold-400/20 text-gold-300 border border-gold-400/30 font-mono text-xs font-bold">
                        #{selectedOfflineSaleForView.saleId}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${selectedOfflineSaleForView.paymentStatus === 'PAID'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : selectedOfflineSaleForView.paymentStatus === 'PARTIAL'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                        }`}>
                        {selectedOfflineSaleForView.paymentStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans mt-0.5 flex items-center space-x-2">
                      <span>Logged on {new Date(selectedOfflineSaleForView.saleDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>Direct Counter Billing</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const s = selectedOfflineSaleForView;
                      setSelectedOfflineSaleForView(null);
                      handleOpenEditOfflineSale(s);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-forest-950 font-black text-xs transition shadow-md cursor-pointer transform hover:scale-[1.02]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Invoice</span>
                  </button>
                  <button
                    onClick={() => {
                      const s = selectedOfflineSaleForView;
                      setSelectedOfflineSaleForView(null);
                      handleDeleteOfflineSale(s._id, s.saleId);
                    }}
                    className="p-2 text-slate-300 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition cursor-pointer"
                    title="Delete sale record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedOfflineSaleForView(null)}
                    className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* SCROLLABLE BODY */}
              <div className="space-y-6 p-5 sm:p-7 space-y-6 bg-[#FCFBF8]">

                {/* 1. FINANCIAL SUMMARY RIBBON (4 LUXURY CARDS) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="p-4 bg-white rounded-2xl border border-amber-900/10 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                      Total Gross Bill
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-forest-950 font-mono mt-1 block">
                      ₹{Number(selectedOfflineSaleForView.totalAmount || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Full invoice value</span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-emerald-900/10 shadow-xs">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block font-sans">
                      Amount Collected
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1 block">
                      ₹{Number(selectedOfflineSaleForView.amountPaid || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Realized cash/UPI</span>
                  </div>

                  <div className={`p-4 bg-white rounded-2xl shadow-xs border ${selectedOfflineSaleForView.amountDue > 0 ? 'border-rose-200 bg-rose-50/20' : 'border-amber-900/10'
                    }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block font-sans ${selectedOfflineSaleForView.amountDue > 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}>
                      Outstanding Due
                    </span>
                    <span className={`text-xl sm:text-2xl font-black font-mono mt-1 block ${selectedOfflineSaleForView.amountDue > 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}>
                      ₹{Number(selectedOfflineSaleForView.amountDue || 0).toLocaleString('en-IN')}
                    </span>
                    <span className={`text-[10px] font-medium mt-0.5 block ${selectedOfflineSaleForView.amountDue > 0 ? 'text-rose-600' : 'text-slate-500'
                      }`}>
                      {selectedOfflineSaleForView.amountDue > 0 ? 'Pending Udhaar settlement' : 'Fully settled (Nil)'}
                    </span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-amber-900/10 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                      Payment Mode
                    </span>
                    <span className="text-sm font-bold text-slate-800 font-mono mt-1.5 block">
                      {selectedOfflineSaleForView.paymentMode}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Settlement channel</span>
                  </div>
                </div>

                {/* 2. CUSTOMER & BILL INFO CARD */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                    <User className="w-4 h-4 text-forest-900" />
                    <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950">
                      Customer & Billing Details
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Customer / Shop Name</span>
                      <p className="text-sm font-bold text-slate-900">{selectedOfflineSaleForView.customerName}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Phone Number</span>
                      {selectedOfflineSaleForView.customerPhone ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            +91 {selectedOfflineSaleForView.customerPhone}
                          </span>
                          <a
                            href={`https://wa.me/91${selectedOfflineSaleForView.customerPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] border border-emerald-200 transition"
                          >
                            WhatsApp
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not provided</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Counter / Area Location</span>
                      <p className="text-slate-800 font-medium">
                        {selectedOfflineSaleForView.locationArea || 'Direct Store Counter, Sidhpur'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Physical Bill / Voucher Number</span>
                      <p className="font-mono font-bold text-slate-800">
                        {selectedOfflineSaleForView.billNumber || 'None (Counter POS)'}
                      </p>
                    </div>

                    {selectedOfflineSaleForView.notes && (
                      <div className="md:col-span-2 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
                        <span className="font-bold text-amber-950 block text-[10.5px] uppercase tracking-wider mb-0.5">Voucher Notes:</span>
                        <p className="text-amber-900">{selectedOfflineSaleForView.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. ITEMS PURCHASED TABLE */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-forest-900" />
                    <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950">
                      Items Purchased & Line Ledger
                    </h4>
                  </div>

                  <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0B2316] text-gold-300 font-bold uppercase text-[10.5px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Product Name</th>
                          <th className="py-3 px-4 text-center">Quantity</th>
                          <th className="py-3 px-4 text-right">Unit Price</th>
                          <th className="py-3 px-4 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {selectedOfflineSaleForView.items?.map((item: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-sans font-bold text-slate-900">
                              {item.productName}
                              {item.sku && (
                                <span className="block text-[10px] text-slate-400 font-mono mt-0.5">SKU: {item.sku}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-bold">
                              <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-800">{item.quantity}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-slate-700">₹{item.unitPrice}</td>
                            <td className="py-3 px-4 text-right font-bold text-forest-950">₹{item.totalPrice}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[#FAF8F5] border-t border-slate-200/90 font-mono font-bold text-xs">
                        <tr>
                          <td colSpan={3} className="py-3 px-4 text-right font-sans text-slate-600">Net Payable Total:</td>
                          <td className="py-3 px-4 text-right text-forest-950 font-black text-sm">
                            ₹{Number(selectedOfflineSaleForView.totalAmount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* 4. AUDIT CHANGE LOGS SECTION */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <History className="w-4 h-4 text-forest-900" />
                      <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950">
                        Official Audit Trail & Modification History
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full font-mono text-[10px] font-bold border border-slate-200">
                      {selectedOfflineSaleForView.changeLogs?.length || 0} revisions recorded
                    </span>
                  </div>

                  {!selectedOfflineSaleForView.changeLogs || selectedOfflineSaleForView.changeLogs.length === 0 ? (
                    <div className="p-5 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                      <p className="font-bold text-xs text-slate-700">Pristine Audit Record</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        No price, customer, or payment revisions have been recorded for this invoice since initial entry.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedOfflineSaleForView.changeLogs.map((log: any, idx: number) => (
                        <div key={idx} className="p-4 bg-amber-50/40 border border-amber-200/70 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-bold font-sans text-[10px] tracking-wide uppercase">
                              {log.label || log.field}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {new Date(log.changedAt).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3 text-xs font-mono py-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Old:</span>
                              <span className="line-through text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {String(log.oldValue ?? '')}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-forest-800 shrink-0" />
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] uppercase font-bold text-emerald-700 font-sans">New:</span>
                              <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded shadow-2xs">
                                {String(log.newValue ?? '')}
                              </span>
                            </div>
                          </div>

                          {log.description && (
                            <p className="text-[11.5px] text-slate-700 font-sans bg-white p-2.5 rounded-xl border border-slate-200/60">
                              {log.description}
                            </p>
                          )}

                          <div className="text-[10.5px] text-slate-400 pt-0.5 flex items-center space-x-1">
                            <span>Modified by:</span>
                            <span className="font-bold text-slate-800">{log.changedBy?.name || 'Administrator'}</span>
                            <span>({log.changedBy?.email || 'admin@novise.in'})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* STICKY LUXURY FOOTER */}
              <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
                <p className="text-[11px] text-slate-400 font-sans">
                  Novise Herbal Financial Cell • Computer Generated Ledger Entry
                </p>
                <button
                  onClick={() => setSelectedOfflineSaleForView(null)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition text-xs"
                >
                  Close Invoice
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          MODAL 8: EDIT OFFLINE SALE & PRESERVE CHANGE LOG
          ==================================================================== */}
      {
        editingOfflineSale && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setEditingOfflineSale(null)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{selectedOfflineSaleForView ? 'Back to Invoice View' : 'Back to Offline Sales'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <Edit2 className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {`Edit Offline Sale #${editingOfflineSale?.invoiceNumber || editingOfflineSale?.saleId}`}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{'Revise customer info, purchased items, unit prices, or payment logs.'}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-[#FDFBF7] rounded-3xl w-full shadow-xs border border-amber-900/15 overflow-hidden">
              {/* STICKY LUXURY HEADER */}
              <div className="px-6 py-6 bg-gradient-to-r from-forest-950 via-[#0B2316] to-forest-900 text-white flex items-center justify-between shrink-0 border-b border-gold-400/20 shadow-md">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gold-400/10 border border-gold-400/30 text-gold-400 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Edit2 className="w-5 h-5 text-gold-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h3 className="font-serif text-lg sm:text-xl font-bold tracking-wide text-white">
                        Edit Offline Sale & Price Log
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-md bg-gold-400/20 text-gold-300 border border-gold-400/30 font-mono text-xs font-bold">
                        #{editingOfflineSale.saleId}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                      Price and customer modifications will automatically generate permanent audit trail logs
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingOfflineSale(null)}
                  className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SCROLLABLE BODY FORM */}
              <form id="editOfflineSaleForm" onSubmit={handleUpdateOfflineSale} className="space-y-6 p-5 sm:p-7 space-y-5 bg-[#FCFBF8]">

                {/* Notice Banner */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-950">
                    <p className="font-bold">Audit Preservation Notice</p>
                    <p className="text-amber-900 mt-0.5">
                      Any changes made to total bill, cash paid, or customer credentials will be recorded with old and new values in the change log.
                    </p>
                  </div>
                </div>

                {/* Section 1: Customer Details */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950 flex items-center space-x-2">
                    <User className="w-4 h-4 text-forest-900" />
                    <span>Customer & Contact Information</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Customer / Shop Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingOfflineSale.customerName}
                        onChange={(e) => setEditingOfflineSale({ ...editingOfflineSale, customerName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">Phone Number</label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {editingOfflineSale.customerPhone ? `${editingOfflineSale.customerPhone.length}/10 digits` : '10 digits'}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+91</span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[6-9][0-9]{9}"
                          maxLength={10}
                          placeholder="9876543210"
                          value={editingOfflineSale.customerPhone}
                          onChange={(e) => setEditingOfflineSale({
                            ...editingOfflineSale,
                            customerPhone: sanitizePhoneNumber(e.target.value)
                          })}
                          onKeyDown={handlePhoneKeyDown}
                          className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Area / Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Sidhpur Station Road, Ahmedabad"
                        value={editingOfflineSale.locationArea}
                        onChange={(e) => setEditingOfflineSale({ ...editingOfflineSale, locationArea: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Physical Bill / Receipt #</label>
                      <input
                        type="text"
                        placeholder="e.g. BILL-102"
                        value={editingOfflineSale.billNumber}
                        onChange={(e) => setEditingOfflineSale({ ...editingOfflineSale, billNumber: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Product & Quantity Sold */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950 flex items-center space-x-2">
                      <Package className="w-4 h-4 text-forest-900" />
                      <span>Product & Quantity Sold</span>
                    </h4>
                    <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      Auto Stock Sync Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Product</label>
                      {availableProducts.length > 0 ? (
                        <AdminSelect
                          value={editingOfflineSale.productId || ''}
                          onChange={(val) => {
                            const found = availableProducts.find(p => p._id === val);
                            if (found) {
                              const unitPrice = Number(found.sellingPrice ?? found.price) || 0;
                              const qty = Number(editingOfflineSale.quantity) || 1;
                              const total = qty * unitPrice;
                              setEditingOfflineSale({
                                ...editingOfflineSale,
                                productId: found._id,
                                productName: found.name,
                                productSku: found.sku || '',
                                unitPrice,
                                totalAmount: total,
                                amountPaid: editingOfflineSale.paymentMode === 'CREDIT_UDHAAR' ? 0 : total
                              });
                            }
                          }}
                          options={[
                            ...availableProducts.map(p => ({
                              value: p._id,
                              label: `${p.name} (₹${p.sellingPrice ?? p.price ?? 0})`,
                              badge: `Stock: ${p.stock ?? p.stockQuantity ?? 0}`
                            }))
                          ]}
                          size="md"
                          searchable={true}
                          className="w-full"
                        />
                      ) : (
                        <input
                          type="text"
                          disabled
                          value={editingOfflineSale.productName}
                          className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Quantity Sold <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editingOfflineSale.quantity}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setEditingOfflineSale({
                              ...editingOfflineSale,
                              quantity: '' as any,
                              totalAmount: 0,
                              amountPaid: 0
                            });
                            return;
                          }
                          const num = parseInt(val, 10);
                          const newQty = isNaN(num) ? ('' as any) : Math.max(0, num);
                          const unitPrice = Number(editingOfflineSale.unitPrice) || 0;
                          const newTotal = (typeof newQty === 'number' ? newQty : 0) * unitPrice;
                          setEditingOfflineSale({
                            ...editingOfflineSale,
                            quantity: newQty,
                            totalAmount: newTotal,
                            amountPaid: editingOfflineSale.paymentMode === 'CREDIT_UDHAAR' ? 0 : newTotal
                          });
                        }}
                        onBlur={() => {
                          if (!editingOfflineSale.quantity || Number(editingOfflineSale.quantity) < 1) {
                            const unitPrice = Number(editingOfflineSale.unitPrice) || 0;
                            setEditingOfflineSale({
                              ...editingOfflineSale,
                              quantity: 1,
                              totalAmount: unitPrice,
                              amountPaid: editingOfflineSale.paymentMode === 'CREDIT_UDHAAR' ? 0 : unitPrice
                            });
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingOfflineSale.unitPrice}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setEditingOfflineSale({
                              ...editingOfflineSale,
                              unitPrice: '' as any,
                              totalAmount: 0,
                              amountPaid: 0
                            });
                            return;
                          }
                          const num = parseFloat(val);
                          const newPrice = isNaN(num) ? ('' as any) : Math.max(0, num);
                          const qty = Number(editingOfflineSale.quantity) || 1;
                          const newTotal = qty * (typeof newPrice === 'number' ? newPrice : 0);
                          setEditingOfflineSale({
                            ...editingOfflineSale,
                            unitPrice: newPrice,
                            totalAmount: newTotal,
                            amountPaid: editingOfflineSale.paymentMode === 'CREDIT_UDHAAR' ? 0 : newTotal
                          });
                        }}
                        onBlur={() => {
                          if (editingOfflineSale.unitPrice === '' || Number(editingOfflineSale.unitPrice) < 0) {
                            setEditingOfflineSale({
                              ...editingOfflineSale,
                              unitPrice: 0,
                              totalAmount: 0,
                              amountPaid: 0
                            });
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-500 italic">
                    Changing quantity sold will automatically update the product warehouse stock by the difference (delta).
                  </p>
                </div>

                {/* Section 3: Billing & Financials */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950 flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-forest-900" />
                    <span>Financials & Settlement Status</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Total Bill Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          required
                          value={editingOfflineSale.totalAmount}
                          onChange={(e) => setEditingOfflineSale({ ...editingOfflineSale, totalAmount: Number(e.target.value) })}
                          className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-forest-950 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Amount Paid Now (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          required
                          value={editingOfflineSale.amountPaid}
                          onChange={(e) => setEditingOfflineSale({ ...editingOfflineSale, amountPaid: Number(e.target.value) })}
                          className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15 focus:border-emerald-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Mode</label>
                      <AdminSelect
                        value={editingOfflineSale.paymentMode}
                        onChange={(val) => setEditingOfflineSale({ ...editingOfflineSale, paymentMode: val })}
                        options={OFFLINE_PAYMENT_MODE_OPTIONS}
                        size="md"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Calculated Balance Pill */}
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Calculated Remaining Due:</span>
                    <span className={`font-mono font-black text-sm ${(editingOfflineSale.totalAmount - editingOfflineSale.amountPaid) > 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}>
                      ₹{Math.max(0, editingOfflineSale.totalAmount - editingOfflineSale.amountPaid).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Section 3: Date & Revision Reason */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-forest-900" />
                    <span>Audit Reason & Date</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Date</label>
                      <input
                        type="date"
                        value={editingOfflineSale.saleDate}
                        onChange={(e) => setEditingOfflineSale({ ...editingOfflineSale, saleDate: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Reason for Modification (Logged in Audit Trail)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Corrected invoice price from ₹100 to ₹200 as per counter register"
                        value={editingOfflineSale.notes}
                        onChange={(e) => setEditingOfflineSale({ ...editingOfflineSale, notes: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>
                  </div>
                </div>

              </form>

              {/* STICKY LUXURY FOOTER */}
              <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">
                  All changes are cryptographically timestamped and signed with your administrator identity.
                </span>
                <div className="flex items-center space-x-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingOfflineSale(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="editOfflineSaleForm"
                    disabled={isUpdatingOfflineSale}
                    className="px-6 py-2.5 bg-gradient-to-r from-forest-900 to-forest-950 hover:from-forest-950 hover:to-black text-gold-400 font-bold rounded-xl shadow-md transition transform hover:scale-[1.01] cursor-pointer disabled:opacity-50 text-xs"
                  >
                    {isUpdatingOfflineSale ? 'Saving & Logging...' : 'Save Changes & Log Audit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          MODAL 9: VIEW MANUFACTURING BATCH DETAILS & AUDIT CHANGE LOG
          ==================================================================== */}
      {
        selectedMfgForView && !editingMfg && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setSelectedMfgForView(null)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{'Back to Manufacturing'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <Factory className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {`Mfg Batch: ${selectedMfgForView?.productName || 'Procurement Batch'}`}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedMfgForView ? `Vendor: ${selectedMfgForView.vendorName} • Batch #${selectedMfgForView.batchNumber}` : ''}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-[#FDFBF7] rounded-3xl w-full shadow-xs border border-amber-900/15 overflow-hidden">
              {/* STICKY LUXURY HEADER */}
              <div className="px-6 py-6 bg-gradient-to-r from-forest-950 via-[#0B2316] to-forest-900 text-white flex items-center justify-between shrink-0 border-b border-gold-400/20 shadow-md">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-purple-400/10 border border-purple-400/30 text-purple-300 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Factory className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5 flex-wrap">
                      <h3 className="font-serif text-lg sm:text-xl font-bold tracking-wide text-white">
                        {selectedMfgForView.productName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-400/20 text-purple-200 border border-purple-400/30 font-mono text-xs font-bold">
                        Batch #{selectedMfgForView.batchNumber}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${selectedMfgForView.status === 'PAID'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                        }`}>
                        {selectedMfgForView.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans mt-0.5 flex items-center space-x-2">
                      <span>Procured on {new Date(selectedMfgForView.expenseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>Supplier: {selectedMfgForView.vendorName}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const m = selectedMfgForView;
                      setSelectedMfgForView(null);
                      handleOpenEditMfg(m);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-forest-950 font-black text-xs transition shadow-md cursor-pointer transform hover:scale-[1.02]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Batch</span>
                  </button>
                  <button
                    onClick={() => {
                      const m = selectedMfgForView;
                      setSelectedMfgForView(null);
                      handleDeleteMfg(m._id, m.batchNumber);
                    }}
                    className="p-2 text-slate-300 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition cursor-pointer"
                    title="Delete procurement record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedMfgForView(null)}
                    className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* SCROLLABLE BODY */}
              <div className="space-y-6 p-5 sm:p-7 space-y-6 bg-[#FCFBF8]">

                {/* 1. FINANCIAL SUMMARY RIBBON */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="p-4 bg-white rounded-2xl border border-amber-900/10 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                      Total Sourcing Cost
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-forest-950 font-mono mt-1 block">
                      ₹{Number(selectedMfgForView.totalCost || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">{selectedMfgForView.quantity} units @ ₹{selectedMfgForView.unitCost}</span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-emerald-900/10 shadow-xs">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block font-sans">
                      Amount Paid
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1 block">
                      ₹{Number(selectedMfgForView.amountPaid || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Disbursed to supplier</span>
                  </div>

                  <div className={`p-4 bg-white rounded-2xl shadow-xs border ${selectedMfgForView.amountDue > 0 ? 'border-rose-200 bg-rose-50/20' : 'border-amber-900/10'
                    }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block font-sans ${selectedMfgForView.amountDue > 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}>
                      Outstanding Due
                    </span>
                    <span className={`text-xl sm:text-2xl font-black font-mono mt-1 block ${selectedMfgForView.amountDue > 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}>
                      ₹{Number(selectedMfgForView.amountDue || 0).toLocaleString('en-IN')}
                    </span>
                    <span className={`text-[10px] font-medium mt-0.5 block ${selectedMfgForView.amountDue > 0 ? 'text-rose-600' : 'text-slate-500'
                      }`}>
                      {selectedMfgForView.amountDue > 0 ? 'Payable to vendor' : 'Fully settled (Nil)'}
                    </span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-amber-900/10 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                      Batch Procurement Status
                    </span>
                    <span className="text-sm font-bold text-slate-800 font-mono mt-1.5 block">
                      {selectedMfgForView.status}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">{selectedMfgForView.paymentMode}</span>
                  </div>
                </div>

                {/* 2. SUPPLIER & PROCUREMENT DETAILS CARD */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                    <Factory className="w-4 h-4 text-forest-900" />
                    <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950">
                      Manufacturer & Procurement Specifications
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Manufacturer / Vendor</span>
                      <p className="text-sm font-bold text-slate-900">{selectedMfgForView.vendorName}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Vendor Contact Phone</span>
                      {selectedMfgForView.vendorContact ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            +91 {selectedMfgForView.vendorContact}
                          </span>
                          <a
                            href={`https://wa.me/91${selectedMfgForView.vendorContact}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] border border-emerald-200 transition"
                          >
                            WhatsApp
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not provided</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Procurement Quantity & Unit Price</span>
                      <p className="text-slate-800 font-mono font-bold">
                        {selectedMfgForView.quantity} units @ ₹{selectedMfgForView.unitCost}/unit
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Supplier Invoice / Bill Number</span>
                      <p className="font-mono font-bold text-slate-800">
                        {selectedMfgForView.invoiceNumber || 'None (Direct Challan)'}
                      </p>
                    </div>

                    {selectedMfgForView.returnedQuantity > 0 && (
                      <div className="md:col-span-2 p-3 bg-purple-50/70 rounded-xl border border-purple-200/80 text-xs text-purple-950">
                        <span className="font-bold block text-[10.5px] uppercase tracking-wider mb-0.5">Supplier Return & Adjustments:</span>
                        <p>{selectedMfgForView.returnedQuantity} units returned to vendor • ₹{Number(selectedMfgForView.totalRefundedFromReturns || 0).toLocaleString('en-IN')} refunded/adjusted</p>
                      </div>
                    )}

                    {selectedMfgForView.notes && (
                      <div className="md:col-span-2 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
                        <span className="font-bold text-amber-950 block text-[10.5px] uppercase tracking-wider mb-0.5">QC & Batch Notes:</span>
                        <p className="text-amber-900">{selectedMfgForView.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. AUDIT CHANGE LOGS SECTION */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <History className="w-4 h-4 text-forest-900" />
                      <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950">
                        Official Audit Trail & Modification History
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full font-mono text-[10px] font-bold border border-slate-200">
                      {selectedMfgForView.changeLogs?.length || 0} revisions recorded
                    </span>
                  </div>

                  {!selectedMfgForView.changeLogs || selectedMfgForView.changeLogs.length === 0 ? (
                    <div className="p-5 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                      <p className="font-bold text-xs text-slate-700">Pristine Audit Record</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        No price, quantity, or supplier revisions have been recorded for this procurement batch since initial creation.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedMfgForView.changeLogs.map((log: any, idx: number) => (
                        <div key={idx} className="p-4 bg-purple-50/40 border border-purple-200/70 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                            <span className="px-2 py-0.5 bg-purple-200 text-purple-900 rounded-md font-bold font-sans text-[10px] tracking-wide uppercase">
                              {log.label || log.field}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {new Date(log.changedAt).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3 text-xs font-mono py-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Old:</span>
                              <span className="line-through text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {String(log.oldValue ?? '')}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-forest-800 shrink-0" />
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] uppercase font-bold text-emerald-700 font-sans">New:</span>
                              <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded shadow-2xs">
                                {String(log.newValue ?? '')}
                              </span>
                            </div>
                          </div>

                          {log.description && (
                            <p className="text-[11.5px] text-slate-700 font-sans bg-white p-2.5 rounded-xl border border-slate-200/60">
                              {log.description}
                            </p>
                          )}

                          <div className="text-[10.5px] text-slate-400 pt-0.5 flex items-center space-x-1">
                            <span>Modified by:</span>
                            <span className="font-bold text-slate-800">{log.changedBy?.name || 'Administrator'}</span>
                            <span>({log.changedBy?.email || 'admin@novise.in'})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* STICKY LUXURY FOOTER */}
              <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
                <p className="text-[11px] text-slate-400 font-sans">
                  Novise Herbal Procurement Cell • Batch Quality Verified
                </p>
                <button
                  onClick={() => setSelectedMfgForView(null)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition text-xs"
                >
                  Close Batch
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          MODAL 10: EDIT MANUFACTURING BATCH & PRESERVE CHANGE LOG
          ==================================================================== */}
      {
        editingMfg && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setEditingMfg(null)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{selectedMfgForView ? 'Back to Batch View' : 'Back to Manufacturing'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <Edit2 className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {`Edit Procurement Batch #${editingMfg?.batchNumber}`}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{editingMfg ? `Product: ${editingMfg.productName} • Vendor: ${editingMfg.vendorName}` : ''}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-[#FDFBF7] rounded-3xl w-full shadow-xs border border-amber-900/15 overflow-hidden">
              {/* STICKY LUXURY HEADER */}
              <div className="px-6 py-6 bg-gradient-to-r from-forest-950 via-[#0B2316] to-forest-900 text-white flex items-center justify-between shrink-0 border-b border-gold-400/20 shadow-md">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gold-400/10 border border-gold-400/30 text-gold-400 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Edit2 className="w-5 h-5 text-gold-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h3 className="font-serif text-lg sm:text-xl font-bold tracking-wide text-white">
                        Edit Procurement Batch & Sourcing Price
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-md bg-gold-400/20 text-gold-300 border border-gold-400/30 font-mono text-xs font-bold">
                        Batch #{editingMfg.batchNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                      Quantity revisions automatically synchronize inventory stock; price edits are recorded in audit logs
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingMfg(null)}
                  className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SCROLLABLE BODY FORM */}
              <form id="editMfgForm" onSubmit={handleUpdateMfg} className="space-y-6 p-5 sm:p-7 space-y-5 bg-[#FCFBF8]">

                {/* Notice Banner */}
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-purple-950">
                    <p className="font-bold">Inventory & Audit Synchronization</p>
                    <p className="text-purple-900 mt-0.5">
                      Changing batch quantity updates product warehouse inventory stock. Any change in procurement cost or amount paid will generate a permanent change log entry.
                    </p>
                  </div>
                </div>

                {/* Section 1: Product & Batch Identification */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950 flex items-center space-x-2">
                    <Package className="w-4 h-4 text-forest-900" />
                    <span>Product & Batch Identification</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Product Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingMfg.productName}
                        onChange={(e) => setEditingMfg({ ...editingMfg, productName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Batch Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingMfg.batchNumber}
                        onChange={(e) => setEditingMfg({ ...editingMfg, batchNumber: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Manufacturer / Vendor Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingMfg.vendorName}
                        onChange={(e) => setEditingMfg({ ...editingMfg, vendorName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">Vendor Contact Phone</label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {editingMfg.vendorContact ? `${editingMfg.vendorContact.length}/10 digits` : '10 digits'}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+91</span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[6-9][0-9]{9}"
                          maxLength={10}
                          placeholder="9876543210"
                          value={editingMfg.vendorContact}
                          onChange={(e) => setEditingMfg({
                            ...editingMfg,
                            vendorContact: sanitizePhoneNumber(e.target.value)
                          })}
                          onKeyDown={handlePhoneKeyDown}
                          className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Procurement Quantities & Costs */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950 flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-forest-900" />
                    <span>Procurement Costs & Supplier Settlement</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantity (Units) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editingMfg.quantity}
                        onChange={(e) => setEditingMfg({ ...editingMfg, quantity: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit Cost (₹) *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          required
                          value={editingMfg.unitCost}
                          onChange={(e) => setEditingMfg({ ...editingMfg, unitCost: Number(e.target.value) })}
                          className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Amount Paid to Supplier (₹) *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          required
                          value={editingMfg.amountPaid}
                          onChange={(e) => setEditingMfg({ ...editingMfg, amountPaid: Number(e.target.value) })}
                          className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15 focus:border-emerald-700"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Mode</label>
                      <AdminSelect
                        value={editingMfg.paymentMode}
                        onChange={(val) => setEditingMfg({ ...editingMfg, paymentMode: val })}
                        options={PAYMENT_MODE_OPTIONS}
                        size="md"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice / Challan Number</label>
                      <input
                        type="text"
                        placeholder="e.g. INV-2026-90"
                        value={editingMfg.invoiceNumber}
                        onChange={(e) => setEditingMfg({ ...editingMfg, invoiceNumber: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Procurement Date</label>
                      <input
                        type="date"
                        value={editingMfg.expenseDate}
                        onChange={(e) => setEditingMfg({ ...editingMfg, expenseDate: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Reason for Revision / Notes (Logged in Audit Trail)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Supplier invoice corrected, payment adjusted from ₹100 to ₹200"
                      value={editingMfg.notes}
                      onChange={(e) => setEditingMfg({ ...editingMfg, notes: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                    />
                  </div>
                </div>

              </form>

              {/* STICKY LUXURY FOOTER */}
              <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">
                  Inventory stock is adjusted by the delta of batch quantity change automatically.
                </span>
                <div className="flex items-center space-x-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingMfg(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="editMfgForm"
                    disabled={isUpdatingMfg}
                    className="px-6 py-2.5 bg-gradient-to-r from-forest-900 to-forest-950 hover:from-forest-950 hover:to-black text-gold-400 font-bold rounded-xl shadow-md transition transform hover:scale-[1.01] cursor-pointer disabled:opacity-50 text-xs"
                  >
                    {isUpdatingMfg ? 'Updating...' : 'Save Changes & Log Audit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          MODAL 11: VIEW OPERATING EXPENSE DETAILS & AUDIT CHANGE LOG
          ==================================================================== */}
      {
        selectedOperatingForView && !editingOperating && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setSelectedOperatingForView(null)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{'Back to Shop & Overhead'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <Receipt className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {`Operating Expense: ${selectedOperatingForView?.title || 'Overhead Voucher'}`}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedOperatingForView ? `Category: ${selectedOperatingForView.category} • Voucher Date: ${new Date(selectedOperatingForView.expenseDate).toLocaleDateString('en-IN')}` : ''}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-[#FDFBF7] rounded-3xl w-full shadow-xs border border-amber-900/15 overflow-hidden">
              {/* STICKY LUXURY HEADER */}
              <div className="px-6 py-6 bg-gradient-to-r from-forest-950 via-[#0B2316] to-forest-900 text-white flex items-center justify-between shrink-0 border-b border-gold-400/20 shadow-md">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-rose-400/10 border border-rose-400/30 text-rose-300 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Receipt className="w-5 h-5 text-rose-300" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5 flex-wrap">
                      <h3 className="font-serif text-lg sm:text-xl font-bold tracking-wide text-white">
                        {selectedOperatingForView.title}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30 font-bold text-[10px] uppercase tracking-wider">
                        {formatCategory(selectedOperatingForView.category)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans mt-0.5 flex items-center space-x-2">
                      <span>Voucher Date: {new Date(selectedOperatingForView.expenseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>Paid To: {selectedOperatingForView.paidTo || 'Local Vendor'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const op = selectedOperatingForView;
                      setSelectedOperatingForView(null);
                      handleOpenEditOperating(op);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-forest-950 font-black text-xs transition shadow-md cursor-pointer transform hover:scale-[1.02]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Expense</span>
                  </button>
                  <button
                    onClick={() => {
                      const op = selectedOperatingForView;
                      setSelectedOperatingForView(null);
                      handleDeleteOperating(op._id, op.title);
                    }}
                    className="p-2 text-slate-300 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition cursor-pointer"
                    title="Delete expense voucher"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedOperatingForView(null)}
                    className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* SCROLLABLE BODY */}
              <div className="space-y-6 p-5 sm:p-7 space-y-6 bg-[#FCFBF8]">

                {/* 1. FINANCIAL SUMMARY RIBBON */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block font-sans">
                      Disbursed Amount
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-1 block">
                      ₹{Number(selectedOperatingForView.amount || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-rose-500 mt-0.5 block">Operating overhead cost</span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-amber-900/10 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                      Payment Mode
                    </span>
                    <span className="text-sm font-bold text-slate-800 font-mono mt-1.5 block">
                      {selectedOperatingForView.paymentMode}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Settlement channel</span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-amber-900/10 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                      Payee / Recipient
                    </span>
                    <span className="text-sm font-bold text-slate-800 font-sans mt-1.5 block">
                      {selectedOperatingForView.paidTo || 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Beneficiary party</span>
                  </div>
                </div>

                {/* 2. VOUCHER & SPECIFICATION DETAILS */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                    <Receipt className="w-4 h-4 text-forest-900" />
                    <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950">
                      Voucher Specifications
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Expense Category</span>
                      <p className="text-sm font-bold text-slate-900">{formatCategory(selectedOperatingForView.category)}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Bill / Voucher Number</span>
                      <p className="font-mono font-bold text-slate-800">
                        {selectedOperatingForView.billNumber || 'None (Petty Cash)'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Voucher Date</span>
                      <p className="text-slate-800 font-medium font-mono">
                        {new Date(selectedOperatingForView.expenseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Paid Beneficiary</span>
                      <p className="text-slate-800 font-medium">
                        {selectedOperatingForView.paidTo || 'Not specified'}
                      </p>
                    </div>

                    {selectedOperatingForView.notes && (
                      <div className="md:col-span-2 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
                        <span className="font-bold text-amber-950 block text-[10.5px] uppercase tracking-wider mb-0.5">Voucher Notes:</span>
                        <p className="text-amber-900">{selectedOperatingForView.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. AUDIT CHANGE LOGS SECTION */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <History className="w-4 h-4 text-forest-900" />
                      <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950">
                        Official Audit Trail & Modification History
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full font-mono text-[10px] font-bold border border-slate-200">
                      {selectedOperatingForView.changeLogs?.length || 0} revisions recorded
                    </span>
                  </div>

                  {!selectedOperatingForView.changeLogs || selectedOperatingForView.changeLogs.length === 0 ? (
                    <div className="p-5 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                      <p className="font-bold text-xs text-slate-700">Pristine Audit Record</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        No expense revisions or voucher amount changes have been recorded for this entry since initial entry.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedOperatingForView.changeLogs.map((log: any, idx: number) => (
                        <div key={idx} className="p-4 bg-rose-50/40 border border-rose-200/70 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                            <span className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded-md font-bold font-sans text-[10px] tracking-wide uppercase">
                              {log.label || log.field}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {new Date(log.changedAt).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3 text-xs font-mono py-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Old:</span>
                              <span className="line-through text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {String(log.oldValue ?? '')}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-forest-800 shrink-0" />
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] uppercase font-bold text-emerald-700 font-sans">New:</span>
                              <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded shadow-2xs">
                                {String(log.newValue ?? '')}
                              </span>
                            </div>
                          </div>

                          {log.description && (
                            <p className="text-[11.5px] text-slate-700 font-sans bg-white p-2.5 rounded-xl border border-slate-200/60">
                              {log.description}
                            </p>
                          )}

                          <div className="text-[10.5px] text-slate-400 pt-0.5 flex items-center space-x-1">
                            <span>Modified by:</span>
                            <span className="font-bold text-slate-800">{log.changedBy?.name || 'Administrator'}</span>
                            <span>({log.changedBy?.email || 'admin@novise.in'})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* STICKY LUXURY FOOTER */}
              <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
                <p className="text-[11px] text-slate-400 font-sans">
                  Novise Herbal Overhead Cell • Voucher Verified & Logged
                </p>
                <button
                  onClick={() => setSelectedOperatingForView(null)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition text-xs"
                >
                  Close Voucher
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          MODAL 12: EDIT OPERATING EXPENSE & PRESERVE CHANGE LOG
          ==================================================================== */}
      {
        editingOperating && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setEditingOperating(null)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{selectedOperatingForView ? 'Back to Expense View' : 'Back to Shop & Overhead'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <Edit2 className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {`Edit Expense: ${editingOperating?.title || 'Overhead Expense'}`}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{'Update category, payment mode, vendor, or voucher specs with revision logging.'}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-[#FDFBF7] rounded-3xl w-full shadow-xs border border-amber-900/15 overflow-hidden">
              {/* STICKY LUXURY HEADER */}
              <div className="px-6 py-6 bg-gradient-to-r from-forest-950 via-[#0B2316] to-forest-900 text-white flex items-center justify-between shrink-0 border-b border-gold-400/20 shadow-md">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gold-400/10 border border-gold-400/30 text-gold-400 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Edit2 className="w-5 h-5 text-gold-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h3 className="font-serif text-lg sm:text-xl font-bold tracking-wide text-white">
                        Edit Operating Overhead Expense
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                      All adjustments to amount, payee, or category are tracked in the permanent change log
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingOperating(null)}
                  className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SCROLLABLE BODY FORM */}
              <form id="editOperatingForm" onSubmit={handleUpdateOperating} className="space-y-6 p-5 sm:p-7 space-y-5 bg-[#FCFBF8]">

                {/* Notice Banner */}
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-950">
                    <p className="font-bold">Overhead Audit Notice</p>
                    <p className="text-rose-900 mt-0.5">
                      Updating this voucher's payment amount or beneficiary will be preserved in the audit log with previous vs revised values.
                    </p>
                  </div>
                </div>

                {/* Section: Expense Classification & Details */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950 flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-forest-900" />
                    <span>Expense Classification & Title</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Expense Category <span className="text-rose-500">*</span>
                      </label>
                      <AdminSelect
                        value={editingOperating.category}
                        onChange={(val) => setEditingOperating({ ...editingOperating, category: val })}
                        options={OPERATING_CATEGORY_OPTIONS}
                        size="md"
                        searchable={true}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Expense Title / Description <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={editingOperating.title}
                        onChange={(e) => setEditingOperating({ ...editingOperating, title: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Expense Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-600 font-bold">₹</span>
                        <input
                          type="number"
                          min="1"
                          required
                          value={editingOperating.amount}
                          onChange={(e) => setEditingOperating({ ...editingOperating, amount: Number(e.target.value) })}
                          className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-700/15 focus:border-rose-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Mode</label>
                      <AdminSelect
                        value={editingOperating.paymentMode}
                        onChange={(val) => setEditingOperating({ ...editingOperating, paymentMode: val })}
                        options={PAYMENT_MODE_OPTIONS}
                        size="md"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Paid To (Vendor/Person)</label>
                      <input
                        type="text"
                        value={editingOperating.paidTo}
                        onChange={(e) => setEditingOperating({ ...editingOperating, paidTo: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Bill / Voucher #</label>
                      <input
                        type="text"
                        value={editingOperating.billNumber}
                        onChange={(e) => setEditingOperating({ ...editingOperating, billNumber: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Expense Date</label>
                      <input
                        type="date"
                        value={editingOperating.expenseDate}
                        onChange={(e) => setEditingOperating({ ...editingOperating, expenseDate: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Reason for Revision / Notes (Logged in Audit Trail)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Corrected voucher from ₹100 to ₹200 as per counter receipt"
                        value={editingOperating.notes}
                        onChange={(e) => setEditingOperating({ ...editingOperating, notes: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900"
                      />
                    </div>
                  </div>
                </div>

              </form>

              {/* STICKY LUXURY FOOTER */}
              <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">
                  Every overhead expense revision is strictly auditable by store administrators.
                </span>
                <div className="flex items-center space-x-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingOperating(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="editOperatingForm"
                    disabled={isUpdatingOperating}
                    className="px-6 py-2.5 bg-gradient-to-r from-forest-900 to-forest-950 hover:from-forest-950 hover:to-black text-gold-400 font-bold rounded-xl shadow-md transition transform hover:scale-[1.01] cursor-pointer disabled:opacity-50 text-xs"
                  >
                    {isUpdatingOperating ? 'Updating...' : 'Save Changes & Log Audit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          MODAL 13: VIEW DELETED RECORD AUDIT SNAPSHOT (TAB 5)
          ==================================================================== */}
      {
        selectedSnapshotForView && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setSelectedSnapshotForView(null)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{'Back to Audit & Deletion Logs'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <Archive className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {'Purged Financial Record Snapshot'}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedSnapshotForView ? `Archived Record ID: ${selectedSnapshotForView._id} • Type: ${selectedSnapshotForView.entityType}` : ''}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-[#FDFBF7] rounded-3xl w-full shadow-xs border border-amber-900/15 overflow-hidden">
              {/* STICKY LUXURY HEADER */}
              <div className="px-6 py-6 bg-gradient-to-r from-forest-950 via-[#0B2316] to-forest-900 text-white flex items-center justify-between shrink-0 border-b border-gold-400/20 shadow-md">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-rose-400/10 border border-rose-400/30 text-rose-300 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Archive className="w-5 h-5 text-rose-300" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5 flex-wrap">
                      <h3 className="font-serif text-lg sm:text-xl font-bold tracking-wide text-white">
                        Purged Financial Record Snapshot
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30 font-bold text-[10px] uppercase tracking-wider">
                        {selectedSnapshotForView.entityType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans mt-0.5 flex items-center space-x-2">
                      <span>Deleted on {new Date(selectedSnapshotForView.createdAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}</span>
                      <span>•</span>
                      <span>Audit ID: {selectedSnapshotForView._id}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSnapshotForView(null)}
                  className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SCROLLABLE BODY */}
              <div className="space-y-6 p-5 sm:p-7 space-y-6 bg-[#FCFBF8]">

                {/* 1. TOP PURGE SUMMARY BANNER */}
                <div className="p-5 bg-rose-50/50 border border-rose-200 rounded-2xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                        Purged Record Title
                      </span>
                      <span className="font-bold text-slate-900 text-sm mt-1 block">
                        {selectedSnapshotForView.entityTitle || 'Untitled Record'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                        Financial Impact Value
                      </span>
                      <span className="font-mono font-black text-rose-700 text-xl mt-1 block">
                        ₹{Number(selectedSnapshotForView.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {selectedSnapshotForView.reason && (
                    <div className="pt-3 border-t border-rose-200/60 text-xs text-rose-950">
                      <strong>Audit Consequence:</strong> {selectedSnapshotForView.reason}
                    </div>
                  )}
                </div>

                {/* 2. STRUCTURED SNAPSHOT ATTRIBUTES */}
                {selectedSnapshotForView.snapshot && (
                  <div className="space-y-3">
                    <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-forest-950 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-forest-900" />
                      <span>Preserved Snapshot Attributes & State at Deletion</span>
                    </h4>

                    <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {Object.entries(selectedSnapshotForView.snapshot)
                          .filter(([k, v]) => !['_id', '__v', 'changeLogs'].includes(k) && typeof v !== 'object')
                          .map(([key, val]) => (
                            <div key={key} className="space-y-0.5">
                              <span className="text-slate-400 font-mono text-[10.5px] block capitalize">
                                {key.replace(/([A-Z])/g, ' $1')}:
                              </span>
                              <span className="font-semibold text-slate-800 break-all">
                                {String(val)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Collapsible Full Raw JSON Technical Inspector */}
                    <details className="p-4 bg-white rounded-2xl border border-slate-200/90 text-xs group shadow-xs">
                      <summary className="font-bold text-slate-700 cursor-pointer flex items-center justify-between">
                        <span>View Technical Raw JSON Payload</span>
                        <span className="text-[10px] text-slate-400 group-open:rotate-90 transition font-mono">▶</span>
                      </summary>
                      <pre className="mt-3 p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-64 leading-relaxed">
                        {JSON.stringify(selectedSnapshotForView.snapshot, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

              </div>

              {/* STICKY LUXURY FOOTER */}
              <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
                <p className="text-[11px] text-slate-400 font-sans">
                  Novise Herbal Immutable Audit Vault • Read-Only Preserved Snapshot
                </p>
                <button
                  onClick={() => setSelectedSnapshotForView(null)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition text-xs"
                >
                  Close Snapshot
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ====================================================================
          REPORT PREVIEW & DOWNLOAD MODAL (IMP NOTE IMPLEMENTATION)
          Preview opens first on screen, downloaded to PC only when Download is clicked
          ==================================================================== */}
      {
        isReportModalOpen && (
          <div className="space-y-6 w-full animate-fadeIn pb-12">
            {/* Top Action Nav Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>{'Back to Finance Dashboard'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                      <FileText className="w-5 h-5 text-forest-900" />
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950">
                      {'Financial & P&L Audit Report'}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{'Novise Herbal Official Business Accounting & Ledger Summary'}</p>
                </div>
              </div>
            </div>

            {/* Main Full-Page Content Card */}
            <div className="bg-white rounded-3xl w-full shadow-xs border border-slate-200/90 overflow-hidden">
              {/* Modal Top Bar (Non-printed Controls) */}
              <div className="p-4 bg-[#07190F] text-white flex items-center justify-between shrink-0 print:hidden">
                <div className="flex items-center space-x-2">
                  <FileCheck2 className="w-5 h-5 text-gold-400" />
                  <div>
                    <h3 className="font-serif text-base font-bold text-white">
                      Financial Audit Report Preview
                    </h3>
                    <p className="text-[10px] text-gold-300 font-mono">
                      Filter: {getPeriodLabel()} • Scope: {
                        activeTab === 'overview' ? 'Complete Business P&L (All Modules)'
                          : activeTab === 'sales' ? 'Selling & Revenue'
                            : activeTab === 'manufacturing' ? 'Manufacturing & Sourcing'
                              : 'Shop & Overhead'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrintReport}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gold-400 hover:bg-gold-500 text-forest-950 font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
                    title="Download and save formatted report directly to your PC"
                  >
                    <Download className="w-4 h-4 text-forest-950" />
                    <span>Download / Print PDF</span>
                  </button>

                  <button
                    onClick={() => setIsReportModalOpen(false)}
                    className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* PRINTABLE REPORT PREVIEW CONTAINER */}
              <div className="p-6 sm:p-10 overflow-y-auto no-scrollbar flex-1 bg-white text-slate-900 font-serif space-y-6 printable-report">

                {/* Document Header */}
                <div className="border-b-2 border-forest-950 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-serif text-2xl font-black text-forest-950 tracking-wider">NOVIS HERBAL</span>
                      <span className="text-xs bg-forest-950 text-gold-400 px-2 py-0.5 rounded font-mono font-bold">
                        PVT. LTD.
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      Official Merchant Financial & Management Accounting Statement
                    </p>
                  </div>

                  <div className="text-right font-sans text-xs space-y-0.5">
                    <p className="font-bold text-forest-950">
                      Statement Scope: <span className="uppercase text-forest-900 font-black">{activeTab}</span>
                    </p>
                    <p className="text-slate-500">Period: <strong className="text-slate-800">{getPeriodLabel()}</strong></p>
                    <p className="text-slate-400 text-[11px] font-mono">Generated: {new Date().toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Scope-specific Report View */}

                {/* 1. All Tabs Overview Report */}
                {activeTab === 'overview' && (
                  <div className="space-y-6 font-sans text-xs">
                    {/* Executive KPI Summary */}
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Sales Inflow</span>
                        <span className="font-mono font-bold text-base text-emerald-700 block mt-1">
                          {formatCurrency(overviewData?.summary?.netSalesInflow)}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Manufacturing COGS</span>
                        <span className="font-mono font-bold text-base text-slate-900 block mt-1">
                          {formatCurrency(overviewData?.summary?.manufacturingSummary?.netManufacturingExpense)}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Operating Overhead</span>
                        <span className="font-mono font-bold text-base text-slate-900 block mt-1">
                          {formatCurrency(overviewData?.summary?.operatingSummary?.totalOperatingExpense)}
                        </span>
                      </div>

                      <div className="p-3 bg-forest-900 text-white rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-gold-300 block">Net Business Profit</span>
                        <span className="font-mono font-bold text-base text-gold-400 block mt-1">
                          {formatCurrency(overviewData?.summary?.netProfit)}
                        </span>
                      </div>
                    </div>

                    {/* Summary Ledger Table */}
                    <div>
                      <h4 className="font-serif font-bold text-sm text-forest-950 mb-2">1. Profit & Loss Summary</h4>
                      <table className="w-full text-left border border-slate-200 divide-y divide-slate-200">
                        <thead className="bg-slate-100 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2">Component</th>
                            <th className="p-2 text-right">Inflow (Cr)</th>
                            <th className="p-2 text-right">Outflow (Dr)</th>
                            <th className="p-2 text-right">Net</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          <tr>
                            <td className="p-2 font-sans">Customer Sales (Online Orders + Offline Retail)</td>
                            <td className="p-2 text-right text-emerald-700 font-bold">₹{overviewData?.summary?.netSalesInflow || 0}</td>
                            <td className="p-2 text-right text-slate-400">-</td>
                            <td className="p-2 text-right font-bold text-emerald-700">₹{overviewData?.summary?.netSalesInflow || 0}</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-sans">Product Sourcing & Manufacturing (COGS)</td>
                            <td className="p-2 text-right text-slate-400">-</td>
                            <td className="p-2 text-right text-rose-700 font-bold">₹{overviewData?.summary?.manufacturingSummary?.netManufacturingExpense || 0}</td>
                            <td className="p-2 text-right font-bold text-rose-700">-₹{overviewData?.summary?.manufacturingSummary?.netManufacturingExpense || 0}</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-sans">Shop & Office Overhead (Rent, Light, Staff, Tea)</td>
                            <td className="p-2 text-right text-slate-400">-</td>
                            <td className="p-2 text-right text-rose-700 font-bold">₹{overviewData?.summary?.operatingSummary?.totalOperatingExpense || 0}</td>
                            <td className="p-2 text-right font-bold text-rose-700">-₹{overviewData?.summary?.operatingSummary?.totalOperatingExpense || 0}</td>
                          </tr>
                          <tr className="bg-slate-100 font-bold font-sans">
                            <td className="p-2.5">Consolidated Net Profit (Operating Margin {overviewData?.summary?.netProfitMargin || 0}%)</td>
                            <td className="p-2.5 text-right font-mono">₹{overviewData?.summary?.netSalesInflow || 0}</td>
                            <td className="p-2.5 text-right font-mono text-rose-700">₹{overviewData?.summary?.totalOutflow || 0}</td>
                            <td className="p-2.5 text-right font-mono text-forest-950 text-sm font-black">₹{overviewData?.summary?.netProfit || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Pending Positions */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-800 block mb-1">Accounts Receivable</span>
                        <p className="text-slate-500 text-[11px]">Pending COD collections in courier transit: <strong className="font-mono text-forest-950 font-bold">₹{overviewData?.summary?.pendingReceivables || 0}</strong></p>
                      </div>
                      <div className="p-3 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-800 block mb-1">Accounts Payable</span>
                        <p className="text-slate-500 text-[11px]">Outstanding balance due to suppliers: <strong className="font-mono text-rose-700 font-bold">₹{overviewData?.summary?.outstandingPayables || 0}</strong></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Sales Tab Report */}
                {activeTab === 'sales' && (
                  <div className="space-y-4 font-sans text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Combined Gross</span>
                        <span className="font-mono font-bold text-base text-forest-950 block mt-1">
                          ₹{salesData?.overall?.combinedGross ?? salesData?.metrics?.grossSales ?? 0}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Realized Cashflow</span>
                        <span className="font-mono font-bold text-base text-emerald-700 block mt-1">
                          ₹{salesData?.overall?.combinedRealized ?? salesData?.metrics?.realizedEarning ?? 0}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Pending Receivables</span>
                        <span className="font-mono font-bold text-base text-amber-700 block mt-1">
                          ₹{salesData?.overall?.combinedPendingDue ?? salesData?.metrics?.pendingDue ?? 0}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Channel Share</span>
                        <span className="font-mono font-bold text-xs text-forest-950 block mt-1">
                          Web: {salesData?.overall?.onlineSharePercent ?? 0}% • Retail: {salesData?.overall?.offlineSharePercent ?? 0}%
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-2">
                      <h4 className="font-bold text-xs uppercase text-slate-700 mb-2">
                        {sellingSubTab === 'overall' && `Consolidated Sales Ledger (${consolidatedLedger.length} Records)`}
                        {sellingSubTab === 'online' && `Online E-Commerce Orders (${salesData?.online?.orders?.length || salesData?.orders?.length || 0} Orders)`}
                        {sellingSubTab === 'offline' && `Offline Local Retail Ledger (${salesData?.offline?.sales?.length || salesData?.offlineSales?.length || 0} Invoices)`}
                      </h4>

                      <table className="w-full text-left border border-slate-200 divide-y divide-slate-200">
                        <thead className="bg-slate-100 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2">ID & Date</th>
                            <th className="p-2">Channel / Type</th>
                            <th className="p-2">Customer & Area</th>
                            <th className="p-2">Payment Mode</th>
                            <th className="p-2">Status</th>
                            <th className="p-2 text-right">Amount</th>
                            <th className="p-2 text-right">Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {sellingSubTab === 'overall' && (
                            consolidatedLedger.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="p-4 text-center text-slate-400 italic font-sans">
                                  No customer sales logged for this period.
                                </td>
                              </tr>
                            ) : (
                              consolidatedLedger.map((tx: any) => (
                                <tr key={tx._id}>
                                  <td className="p-2 font-bold text-forest-950">
                                    {tx.displayId}
                                    <span className="block text-[9.5px] text-slate-400 font-sans">{formatDate(tx.date)}</span>
                                  </td>
                                  <td className="p-2 font-sans">
                                    <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${tx.channel === 'online' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      }`}>
                                      {tx.channel === 'online' ? 'ONLINE WEB' : 'OFFLINE RETAIL'}
                                    </span>
                                  </td>
                                  <td className="p-2 font-sans font-medium">
                                    {tx.customerName}
                                    {tx.location && <span className="block text-[9.5px] text-slate-400">{tx.location}</span>}
                                  </td>
                                  <td className="p-2">{tx.paymentMethod}</td>
                                  <td className="p-2 font-sans font-bold">{tx.paymentStatus}</td>
                                  <td className="p-2 text-right font-bold text-slate-900">₹{tx.amount || 0}</td>
                                  <td className="p-2 text-right font-bold text-rose-700">{tx.amountDue > 0 ? `₹${tx.amountDue}` : '₹0'}</td>
                                </tr>
                              ))
                            )
                          )}

                          {sellingSubTab === 'online' && (
                            (!salesData?.orders || salesData.orders.length === 0) ? (
                              <tr>
                                <td colSpan={7} className="p-4 text-center text-slate-400 italic font-sans">
                                  No online store orders logged for this period.
                                </td>
                              </tr>
                            ) : (
                              salesData.orders.map((o: any) => (
                                <tr key={o._id}>
                                  <td className="p-2 font-bold text-forest-950">
                                    {o.orderReferenceId || o.orderId}
                                    <span className="block text-[9.5px] text-slate-400 font-sans">{formatDate(o.createdAt)}</span>
                                  </td>
                                  <td className="p-2 font-sans font-bold text-[10px]">ONLINE</td>
                                  <td className="p-2 font-sans font-medium">
                                    {o.shippingAddress?.fullName || 'Online Guest'}
                                    <span className="block text-[9.5px] text-slate-400">{o.shippingAddress?.city}</span>
                                  </td>
                                  <td className="p-2">{o.paymentMethod}</td>
                                  <td className="p-2 font-sans font-bold">{o.paymentStatus}</td>
                                  <td className="p-2 text-right font-bold text-slate-900">₹{o.totalAmount || 0}</td>
                                  <td className="p-2 text-right font-bold text-rose-700">{o.paymentStatus !== 'PAID' ? `₹${o.totalAmount}` : '₹0'}</td>
                                </tr>
                              ))
                            )
                          )}

                          {sellingSubTab === 'offline' && (
                            (!salesData?.offline?.sales || salesData.offline.sales.length === 0) ? (
                              <tr>
                                <td colSpan={7} className="p-4 text-center text-slate-400 italic font-sans">
                                  No offline retail sales logged for this period.
                                </td>
                              </tr>
                            ) : (
                              salesData.offline.sales.map((s: any) => (
                                <tr key={s._id}>
                                  <td className="p-2 font-bold text-forest-950">
                                    {s.saleId}
                                    {s.billNumber && <span className="block text-[9.5px] text-slate-400 font-sans">#{s.billNumber}</span>}
                                  </td>
                                  <td className="p-2 font-sans font-bold text-[10px]">OFFLINE</td>
                                  <td className="p-2 font-sans font-medium">
                                    {s.customerName}
                                    {s.locationArea && <span className="block text-[9.5px] text-slate-400">{s.locationArea}</span>}
                                  </td>
                                  <td className="p-2">{s.paymentMode}</td>
                                  <td className="p-2 font-sans font-bold">{s.paymentStatus}</td>
                                  <td className="p-2 text-right font-bold text-slate-900">₹{s.totalAmount || 0}</td>
                                  <td className="p-2 text-right font-bold text-rose-700">{s.amountDue > 0 ? `₹${s.amountDue}` : '₹0'}</td>
                                </tr>
                              ))
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. Manufacturing Tab Report */}
                {/* 3. Manufacturing Tab Report */}
                {
                  activeTab === 'manufacturing' && (
                    <div className="space-y-4 font-sans text-xs">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Total Sourcing Cost</span>
                          <span className="font-mono font-bold text-base text-slate-900 block mt-1">₹{mfgData?.metrics?.totalCost || 0}</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Total Paid</span>
                          <span className="font-mono font-bold text-base text-emerald-700 block mt-1">₹{mfgData?.metrics?.totalPaid || 0}</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Outstanding Due</span>
                          <span className="font-mono font-bold text-base text-rose-700 block mt-1">₹{mfgData?.metrics?.totalDue || 0}</span>
                        </div>
                      </div>

                      <table className="w-full text-left border border-slate-200 divide-y divide-slate-200">
                        <thead className="bg-slate-100 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2">Batch #</th>
                            <th className="p-2">Product Name</th>
                            <th className="p-2">Vendor</th>
                            <th className="p-2">Qty</th>
                            <th className="p-2">Total Cost</th>
                            <th className="p-2">Paid</th>
                            <th className="p-2">Due</th>
                            <th className="p-2">Returns</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {(!mfgData?.entries || mfgData.entries.length === 0) ? (
                            <tr>
                              <td colSpan={8} className="p-4 text-center text-slate-400 italic font-sans">
                                No manufacturing procurement batches logged for this period.
                              </td>
                            </tr>
                          ) : (
                            mfgData.entries.map((e: any) => (
                              <tr key={e._id}>
                                <td className="p-2 font-bold text-forest-950">{e.batchNumber}</td>
                                <td className="p-2 font-sans font-medium">{e.productName}</td>
                                <td className="p-2 font-sans">{e.vendorName}</td>
                                <td className="p-2">{e.quantity}</td>
                                <td className="p-2 font-bold">₹{e.totalCost}</td>
                                <td className="p-2 text-emerald-700">₹{e.amountPaid}</td>
                                <td className="p-2 text-rose-700 font-bold">₹{e.amountDue}</td>
                                <td className="p-2 text-purple-700">₹{e.totalRefundedFromReturns || 0}</td>
                              </tr>
                            ))
                          )
                          }
                        </tbody >
                      </table >
                    </div >
                  )}

                {/* 4. Operating Tab Report */}
                {
                  activeTab === 'operating' && (
                    <div className="space-y-4 font-sans text-xs">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <span className="font-bold text-slate-700">Total Overhead Vouchers Logged:</span>
                        <span className="font-mono font-black text-lg text-forest-950">₹{operatingData?.metrics?.totalOperatingExpense || 0}</span>
                      </div>

                      <table className="w-full text-left border border-slate-200 divide-y divide-slate-200">
                        <thead className="bg-slate-100 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2">Date</th>
                            <th className="p-2">Category</th>
                            <th className="p-2">Title</th>
                            <th className="p-2">Paid To</th>
                            <th className="p-2">Mode</th>
                            <th className="p-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {(!operatingData?.entries || operatingData.entries.length === 0) ? (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-400 italic font-sans">
                                No operating overhead expenses logged for this period.
                              </td>
                            </tr>
                          ) : (
                            operatingData.entries.map((e: any) => (
                              <tr key={e._id}>
                                <td className="p-2 text-slate-500 text-[10.5px]">{new Date(e.expenseDate).toLocaleDateString('en-IN')}</td>
                                <td className="p-2 font-sans font-bold">{e.category}</td>
                                <td className="p-2 font-sans">{e.title}</td>
                                <td className="p-2 font-sans">{e.paidTo || 'N/A'}</td>
                                <td className="p-2">{e.paymentMode}</td>
                                <td className="p-2 text-right font-bold text-slate-900">₹{e.amount}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                {/* Verification & Sign-off Footer */}
                <div className="pt-8 border-t border-slate-200 font-sans text-xs flex justify-between items-end">
                  <div>
                    <p className="font-bold text-forest-950">Novise Herbal Finance & Accounting Cell</p>
                    <p className="text-[11px] text-slate-400">Computer generated audit voucher • Valid without physical signature</p>
                  </div>
                  <div className="text-right">
                    <div className="border-b border-slate-400 w-44 pb-1 mb-1"></div>
                    <p className="font-bold text-slate-800">Authorized Signatory</p>
                    <p className="text-[10px] text-slate-400 font-mono">{user?.name || 'Administrator'} ({user?.role || 'Admin'})</p>
                  </div>
                </div>

              </div >
            </div>
          </div>
        )
      }

      {/* Centered Luxury Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={!!deleteConfirmation}
        title={deleteConfirmation?.title || 'Confirm Deletion'}
        itemBadge={deleteConfirmation?.itemBadge}
        itemName={deleteConfirmation?.itemName}
        message={deleteConfirmation?.message || 'Are you sure you want to permanently delete this record?'}
        confirmLabel="Yes, Delete Record"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeletingFinanceItem}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={handleConfirmDeleteFinanceItem}
      />

    </div >
  );
};