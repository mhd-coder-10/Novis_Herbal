import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Upload,
  X,
  Package,
  Layers,
  DollarSign,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  ArrowLeft
} from 'lucide-react';
import { Product } from '../../types';
import api, { getFullImageUrl, getFallbackProductImage } from '../../services/api';
import { toast } from '../../store/useToastStore';
import { AdminPagination } from '../../components/common/AdminPagination';
import { TimeRangeDropdown } from '../../components/common/TimeRangeDropdown';
import { emitLiveEvent } from '../../services/realtimeSync';

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtered Products for Live Search, Time Range & Status Tabs
  const filteredProducts = products.filter((p) => {
    if (statusFilter === 'PUBLISHED' && p.isPublished === false) return false;
    if (statusFilter === 'DRAFT' && p.isPublished !== false) return false;

    // Time Range Filter
    if (selectedPeriod !== 'ALL') {
      const dateVal = (p as any).createdAt || (p as any).updatedAt;
      const itemDate = dateVal ? new Date(dateVal) : null;
      const now = new Date();

      if (!itemDate || isNaN(itemDate.getTime())) {
        if (selectedPeriod === 'CUSTOM') return false;
      } else {
        if (selectedPeriod === 'TODAY') {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          if (itemDate < startOfToday || itemDate > endOfToday) return false;
        } else if (selectedPeriod === 'THIS_WEEK') {
          const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startOfWeek.setHours(0, 0, 0, 0);
          if (itemDate < startOfWeek) return false;
        } else if (selectedPeriod === 'THIS_MONTH') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          if (itemDate < startOfMonth) return false;
        } else if (selectedPeriod === 'THIS_YEAR') {
          const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          if (itemDate < startOfYear) return false;
        } else if (selectedPeriod === 'CUSTOM') {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (itemDate < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) return false;
          }
        }
      }
    }

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.volumeText?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedPeriod, customStartDate, customEndDate]);

  const paginatedProducts = React.useMemo(() => {
    return filteredProducts.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredProducts, currentPage, pageSize]);

  // Aggregate Metrics
  const totalStockUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const lowStockCount = products.filter((p) => (p.stock || 0) <= (p.lowStockThreshold || 10) && (p.stock || 0) > 0).length;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    mrp: 0,
    sellingPrice: 0,
    costPrice: 0,
    discountPercent: 0,
    stock: 0,
    lowStockThreshold: 10,
    volumeText: '',
    weightGrams: 250,
    shortDescription: '',
    description: '',
    images: [] as string[],
    isCombo: false,
    isPublished: true,
    isFeatured: false
  });

  const [isUploading, setIsUploading] = useState(false);

  // Lock background body scroll when modal or dialog is open
  useEffect(() => {
    if (isModalOpen || deletingProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, deletingProduct]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadData = new FormData();
    for (let i = 0; i < files.length; i++) {
      uploadData.append('images', files[i]);
    }

    try {
      const res = await api.post('/upload/multiple', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success && res.data.files) {
        const newUrls = res.data.files.map((f: any) => f.url);
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...newUrls]
        }));
        toast.success(`${newUrls.length} photo(s) uploaded successfully!`, 'Gallery Updated');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload product photos');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/products?includeUnpublished=true');
      if (res.data?.success) {
        setProducts(res.data.products);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: `NOV-${Date.now().toString().slice(-4)}`,
      mrp: 0,
      sellingPrice: 0,
      costPrice: 0,
      discountPercent: 0,
      stock: 0,
      lowStockThreshold: 10,
      volumeText: '',
      weightGrams: 250,
      shortDescription: '',
      description: '',
      images: [],
      isCombo: false,
      isPublished: true,
      isFeatured: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    const initialDiscount = p.discountPercent !== undefined
      ? p.discountPercent
      : (p.mrp > p.sellingPrice ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100) : 0);

    setFormData({
      name: p.name,
      sku: p.sku,
      mrp: p.mrp,
      sellingPrice: p.sellingPrice,
      costPrice: p.costPrice || 0,
      discountPercent: initialDiscount,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold || 10,
      volumeText: p.volumeText || '',
      weightGrams: p.weightGrams || 250,
      shortDescription: p.shortDescription || '',
      description: p.description || '',
      images: p.images || [],
      isCombo: !!p.isCombo,
      isPublished: p.isPublished !== false,
      isFeatured: !!p.isFeatured
    });
    setIsModalOpen(true);
  };

  // 1. MRP Change: recalculates Selling Price if discount is active, or recalculates Discount if sellingPrice exists
  const handleMrpChange = (newMrp: number) => {
    const mrpVal = Math.max(0, newMrp);
    setFormData(prev => {
      let updatedSelling = prev.sellingPrice;
      let updatedDiscount = prev.discountPercent || 0;

      if (mrpVal > 0) {
        if (updatedDiscount > 0) {
          // Keep discount %, update selling price
          updatedSelling = Math.round(mrpVal * (1 - updatedDiscount / 100));
        } else if (updatedSelling > 0 && mrpVal >= updatedSelling) {
          // Recompute discount %
          updatedDiscount = Math.round(((mrpVal - updatedSelling) / mrpVal) * 100);
        }
      }
      return {
        ...prev,
        mrp: mrpVal,
        sellingPrice: updatedSelling,
        discountPercent: updatedDiscount
      };
    });
  };

  // 2. Selling Price Change: automatically calculates Discount % from MRP
  const handleSellingPriceChange = (newSelling: number) => {
    const sellingVal = Math.max(0, newSelling);
    setFormData(prev => {
      let calculatedDiscount = 0;
      if (prev.mrp > 0 && prev.mrp >= sellingVal) {
        calculatedDiscount = Math.round(((prev.mrp - sellingVal) / prev.mrp) * 100);
      }
      return {
        ...prev,
        sellingPrice: sellingVal,
        discountPercent: calculatedDiscount
      };
    });
  };

  // 3. Discount (%) Change: automatically calculates Selling Price from MRP
  const handleDiscountChange = (newDiscount: number | '') => {
    setFormData(prev => {
      if (newDiscount === '' || isNaN(Number(newDiscount))) {
        return {
          ...prev,
          discountPercent: 0
        };
      }
      const discVal = Math.min(99, Math.max(0, Number(newDiscount)));
      let calculatedSelling = prev.sellingPrice;
      if (prev.mrp > 0) {
        calculatedSelling = Math.round(prev.mrp * (1 - discVal / 100));
      }
      return {
        ...prev,
        discountPercent: discVal,
        sellingPrice: calculatedSelling
      };
    });
  };

  const handleTogglePublish = async (p: Product) => {
    try {
      const res = await api.put(`/products/${p._id}`, { isPublished: !p.isPublished });
      if (res.data?.success) {
        setProducts(products.map(item => item._id === p._id ? { ...item, isPublished: !p.isPublished } : item));
        const statusMsg = !p.isPublished ? 'Product is now live and published on store' : 'Product unpublished and hidden from store';
        setNotification({ type: 'success', message: statusMsg });
        toast.success(statusMsg, 'Catalog');
        emitLiveEvent('PRODUCT_UPDATED', { product: p, isPublished: !p.isPublished });
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Error updating status';
      setNotification({ type: 'error', message: errMsg });
      toast.error(errMsg, 'Catalog Error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/products/${deletingProduct._id}`);
      const successMsg = res.data?.message || `"${deletingProduct.name}" and all product media deleted permanently.`;
      setNotification({ type: 'success', message: successMsg });
      toast.success(successMsg, 'Product Deleted');
      setDeletingProduct(null);
      fetchProducts();
      emitLiveEvent('PRODUCT_UPDATED', { productId: deletingProduct._id, action: 'delete' });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to remove product';
      setNotification({ type: 'error', message: errMsg });
      toast.error(errMsg, 'Delete Failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    toast.info('Image removed from form. Save product to apply changes.', 'Product Photos');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning('Please enter product title.', 'Validation Error');
      return;
    }
    if (Number(formData.sellingPrice) <= 0) {
      toast.warning('Selling price must be greater than 0!', 'Validation Error');
      return;
    }
    if (Number(formData.mrp) <= 0) {
      toast.warning('MRP must be greater than 0!', 'Validation Error');
      return;
    }
    if (Number(formData.sellingPrice) > Number(formData.mrp)) {
      toast.warning('Selling price cannot exceed MRP!', 'Validation Error');
      return;
    }
    if (!formData.images || formData.images.length === 0) {
      toast.warning('Please upload or provide at least one product photo.', 'Validation Error');
      return;
    }

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, formData);
        setNotification({ type: 'success', message: 'Product updated successfully!' });
        toast.success(`"${formData.name}" updated successfully!`, 'Catalog Updated');
        emitLiveEvent('PRODUCT_UPDATED', { action: 'update', product: formData });
      } else {
        await api.post('/products', formData);
        setNotification({ type: 'success', message: 'New product added successfully!' });
        toast.success(`"${formData.name}" added to catalog!`, 'Product Created');
        emitLiveEvent('PRODUCT_UPDATED', { action: 'create', product: formData });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to save product';
      toast.error(errMsg, 'Save Error');
    }
  };

  return (
    <div className="space-y-6 w-full">

      {!isModalOpen ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Action & Catalog Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-800">Product & Inventory Catalog</h2>
              <p className="text-xs text-slate-500">Manage prices, MRP, stock levels, parcel weights, and image galleries.</p>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 bg-forest-900 text-gold-400 hover:bg-forest-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-forest-900/10 flex items-center space-x-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add New Product</span>
            </button>
          </div>

          {notification && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between animate-fadeIn ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
              <span>{notification.message}</span>
              <button onClick={() => setNotification(null)} className="font-bold text-slate-400 hover:text-slate-700">✕</button>
            </div>
          )}

          {/* Time Range Filter Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-20">
            <TimeRangeDropdown
              value={selectedPeriod}
              onChange={(p) => {
                setSelectedPeriod(p);
                if (p !== 'CUSTOM') {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }
              }}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onCustomStartDateChange={setCustomStartDate}
              onCustomEndDateChange={setCustomEndDate}
              onApplyCustom={(start, end) => {
                setCustomStartDate(start);
                setCustomEndDate(end);
                setSelectedPeriod('CUSTOM');
              }}
              format="uppercase"
              label="TIME PERIOD:"
            />

            <div className="text-[11px] text-slate-500 font-medium hidden md:block">
              Matching Products: <strong className="text-forest-950 font-bold">{filteredProducts.length}</strong> of {products.length}
            </div>
          </div>

          {/* Toolbar: Live Search & Catalog Quick Stats */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by product name, SKU, or volume..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-[#FAF8F5] border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-900/10 focus:border-forest-900 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Tabs & Stats Badges */}
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pt-1 md:pt-0">
              <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'ALL' ? 'bg-white text-forest-950 shadow-xs font-black' : 'hover:text-slate-900'}`}
                >
                  All ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('PUBLISHED')}
                  className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'PUBLISHED' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'hover:text-slate-900'}`}
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('DRAFT')}
                  className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'DRAFT' ? 'bg-white text-slate-800 shadow-xs font-black' : 'hover:text-slate-900'}`}
                >
                  Drafts
                </button>
              </div>

              <div className="hidden lg:flex items-center space-x-2 pl-2 border-l border-slate-200 text-xs">
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80 rounded-xl flex items-center space-x-1.5 whitespace-nowrap shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{totalStockUnits} Total Stock</span>
                </span>
                {lowStockCount > 0 && (
                  <span className="px-3 py-1.5 bg-amber-50 text-amber-900 font-bold border border-amber-200/80 rounded-xl flex items-center space-x-1.5 whitespace-nowrap shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>{lowStockCount} Low Stock</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Products Table (Spacious, Fixed-Ratio & Squeeze-Proof) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead className="bg-[#FAF8F5] text-slate-500 uppercase text-[11px] font-black tracking-wider border-b border-slate-200/90 select-none">
                  <tr>
                    <th className="px-5 py-4 w-[34%] min-w-[280px]">Product & Identity</th>
                    <th className="px-4 py-4 w-[16%] min-w-[140px]">SKU / Volume</th>
                    <th className="px-4 py-4 w-[11%] min-w-[95px]">MRP</th>
                    <th className="px-4 py-4 w-[14%] min-w-[125px]">Selling Price</th>
                    <th className="px-4 py-4 w-[13%] min-w-[115px]">Stock Level</th>
                    <th className="px-4 py-4 w-[11%] min-w-[105px]">Status</th>
                    <th className="px-5 py-4 w-[10%] min-w-[95px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin text-forest-900 mx-auto mb-2" />
                        <p className="font-semibold text-xs">Loading catalog products...</p>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700 text-sm">No products found</p>
                        <p className="text-xs text-slate-400 mt-0.5">Try searching with a different keyword or reset filters.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p) => {
                      const discount = p.discountPercent || (p.mrp > p.sellingPrice ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100) : 0);
                      const isLowStock = (p.stock || 0) <= (p.lowStockThreshold || 10) && (p.stock || 0) > 0;
                      const isOutOfStock = (p.stock || 0) === 0;

                      return (
                        <tr key={p._id} className="hover:bg-[#FAF8F5]/80 transition group">
                          {/* 1. Product Title & Photo */}
                          <td className="px-5 py-4">
                            <div className="flex items-center space-x-3.5">
                              <div className="relative w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl overflow-hidden bg-stone-50 border border-slate-200/80 shadow-2xs shrink-0">
                                <img
                                  src={getFullImageUrl(p.images?.[0], p.name)}
                                  alt={p.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = getFallbackProductImage(p.name);
                                  }}
                                />
                                {p.images && p.images.length > 1 && (
                                  <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-slate-900/85 text-white shadow-xs">
                                    +{p.images.length - 1}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="font-serif font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-forest-950 transition" title={p.name}>
                                  {p.name}
                                </p>
                                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                  {p.isCombo && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300/80 shadow-2xs">
                                      ⭐ Super Combo
                                    </span>
                                  )}
                                  {p.isFeatured && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300/80 shadow-2xs">
                                      Featured
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. SKU Identifier & Volume */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-forest-950 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/80 block w-fit">
                              {p.sku}
                            </span>
                            {p.volumeText && (
                              <p className="text-[11px] text-slate-500 font-medium mt-1 truncate max-w-[160px]" title={p.volumeText}>
                                {p.volumeText}
                              </p>
                            )}
                          </td>

                          {/* 3. MRP (Strike-through) */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold text-slate-400 line-through">
                              ₹{p.mrp?.toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* 4. Selling Price & Auto Discount Badge */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-start">
                              <span className="font-mono font-black text-forest-950 text-sm tracking-tight">
                                ₹{p.sellingPrice?.toLocaleString('en-IN')}
                              </span>
                              {discount > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-200/80 mt-0.5">
                                  {discount}% OFF
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 5. Stock Level Badge (Strictly Single-Line with status dot) */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border shadow-2xs ${isOutOfStock
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isLowStock
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOutOfStock
                                  ? 'bg-rose-500'
                                  : isLowStock
                                    ? 'bg-amber-500 animate-pulse'
                                    : 'bg-emerald-500'
                                  }`}
                              />
                              <span>
                                {isOutOfStock ? 'Out of Stock' : `${p.stock} units`}
                              </span>
                            </span>
                          </td>

                          {/* 6. Publication Status Toggle */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(p)}
                              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border shadow-2xs cursor-pointer ${p.isPublished !== false
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                }`}
                              title="Click to toggle store publication"
                            >
                              {p.isPublished !== false ? (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                  <span>Published</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>Draft</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* 7. Action Buttons (Modern SaaS Buttons) */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(p)}
                                className="p-2 text-slate-600 hover:text-forest-950 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition shadow-2xs cursor-pointer"
                                title="Edit Product Details & Pricing"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingProduct(p)}
                                className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 rounded-xl transition shadow-2xs cursor-pointer"
                                title="Delete Product Permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Product Catalog Pagination */}
            {filteredProducts.length > 0 && (
              <AdminPagination
                currentPage={currentPage}
                totalItems={filteredProducts.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="products"
              />
            )}
          </div>
        </div>
      ) : (
        /* DEDICATED FULL-PAGE PRODUCT EDITOR / CREATOR VIEW */
        <div className="space-y-6 w-full animate-fadeIn pb-12">
          {/* Top Action Nav Bar with Back Button */}
            {/* Top Action Nav Bar with Back Button */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group w-fit shrink-0"
                title="Return to products catalog"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Products</span>
              </button>
              <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold tracking-widest text-emerald-800 uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Product Catalog
                  </span>
                  {editingProduct && (
                    <span className="font-mono text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md truncate">
                      {editingProduct.sku}
                    </span>
                  )}
                </div>
                <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950 mt-1 truncate">
                  {editingProduct ? `Edit "${editingProduct.name}"` : 'Create New Botanical Product'}
                </h2>
              </div>
            </div>

                      {/* Full Page Editor Card */}
                      <div className="bg-[#FAF8F5] rounded-3xl w-full shadow-xs border border-slate-200/90 overflow-hidden">
                        {/* Scrollable Form Body */}
                        <form id="productForm" onSubmit={handleSubmit} className="overflow-y-auto px-5 sm:px-8 py-6 space-y-6 flex-1 no-scrollbar text-xs">

                          {/* Card 1: Product Identity & Specifications */}
                          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <div className="flex items-center space-x-2">
                                <Layers className="w-4 h-4 text-forest-900" />
                                <h4 className="font-serif text-sm font-bold text-forest-950 uppercase tracking-wider">
                                  1. Product Identity & Packaging Specifications
                                </h4>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium">Core Catalog Data</span>
                            </div>

                            <div className="space-y-4">
                              {/* Title */}
                              <div>
                                <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                                  Product Title * <span className="text-slate-400 font-normal">(Shown on public storefront, cart, and tax invoices)</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={formData.name}
                                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                  placeholder="e.g. Novis Herbal Advanced Ayurvedic Hair Oil (200 ML)"
                                  className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900 text-sm"
                                />
                              </div>

                              {/* SKU, Volume, Weight */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                                    SKU Identifier * <span className="text-slate-400 font-normal">(Stock Keeping Unit)</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                                    placeholder="e.g. NOV-OIL-200"
                                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl font-mono uppercase font-bold text-forest-950 focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900"
                                  />
                                </div>

                                <div>
                                  <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                                    Bottle / Volume Text <span className="text-slate-400 font-normal">(Display volume)</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.volumeText}
                                    onChange={(e) => setFormData({ ...formData, volumeText: e.target.value })}
                                    placeholder="e.g. 200 ML Precision Dropper"
                                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900"
                                  />
                                </div>

                                <div>
                                  <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                                    Courier Package Weight <span className="text-slate-400 font-normal">(Grams for Courier Parcel)</span>
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={formData.weightGrams || ''}
                                    onChange={(e) => setFormData({ ...formData, weightGrams: Number(e.target.value) })}
                                    placeholder="e.g. 250"
                                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900"
                                  />
                                </div>
                              </div>

                              {/* Short Description */}
                              <div>
                                <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                                  Key Highlights / Short Description <span className="text-slate-400 font-normal">(Appears on hero slider, catalog cards, and Google search snippet)</span>
                                </label>
                                <textarea
                                  rows={2}
                                  value={formData.shortDescription}
                                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                                  placeholder="e.g. Crafted with 20 cold-pressed botanical oils to deeply nourish hair roots and support natural hair vitality..."
                                  className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Card 2: Pricing & Automated Discount Engine */}
                          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-4 h-4 text-emerald-700" />
                                <h4 className="font-serif text-sm font-bold text-forest-950 uppercase tracking-wider">
                                  2. Pricing, Automated Discounts & Inventory
                                </h4>
                              </div>
                              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                Two-Way Live Sync Active
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* MRP */}
                              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-1">
                                <label className="block text-slate-600 font-bold text-xs uppercase tracking-wider">
                                  MRP (₹) *
                                </label>
                                <p className="text-[10px] text-slate-400">Printed Max Retail Price</p>
                                <div className="relative mt-1.5">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                                  <input
                                    type="number"
                                    required
                                    min={1}
                                    value={formData.mrp || ''}
                                    onChange={(e) => handleMrpChange(Number(e.target.value))}
                                    placeholder="799"
                                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-forest-900/20"
                                  />
                                </div>
                              </div>

                              {/* Discount (%) */}
                              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="block text-amber-950 font-bold text-xs uppercase tracking-wider">
                                    Discount (%)
                                  </label>
                                  <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded">
                                    Auto
                                  </span>
                                </div>
                                <p className="text-[10px] text-amber-700">Calculates selling price</p>
                                <div className="relative mt-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    max={99}
                                    value={formData.discountPercent !== undefined && formData.discountPercent !== null ? formData.discountPercent : ''}
                                    onChange={(e) => handleDiscountChange(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="50"
                                    className="w-full pl-3 pr-7 py-2 bg-white border border-amber-300 rounded-lg font-mono font-extrabold text-amber-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-amber-700">%</span>
                                </div>
                              </div>

                              {/* Selling Price */}
                              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80 space-y-1">
                                <label className="block text-emerald-950 font-bold text-xs uppercase tracking-wider">
                                  Selling Price (₹) *
                                </label>
                                <p className="text-[10px] text-emerald-700">Final checkout price</p>
                                <div className="relative mt-1.5">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-700">₹</span>
                                  <input
                                    type="number"
                                    required
                                    min={1}
                                    value={formData.sellingPrice || ''}
                                    onChange={(e) => handleSellingPriceChange(Number(e.target.value))}
                                    placeholder="399"
                                    className="w-full pl-7 pr-3 py-2 bg-white border border-emerald-300 rounded-lg font-mono font-black text-emerald-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                                  />
                                </div>
                              </div>

                              {/* Stock Quantity */}
                              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-1">
                                <label className="block text-slate-600 font-bold text-xs uppercase tracking-wider">
                                  Stock Quantity *
                                </label>
                                <p className="text-[10px] text-slate-400">Warehouse units available</p>
                                <input
                                  type="number"
                                  required
                                  min={0}
                                  value={formData.stock === 0 && !editingProduct ? '' : (formData.stock ?? '')}
                                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                                  placeholder="100"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-forest-900/20 mt-1.5"
                                />
                              </div>
                            </div>

                            {/* Savings Live Feedback Bar */}
                            {formData.mrp > 0 && formData.sellingPrice > 0 && (
                              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-4 h-4 text-emerald-700" />
                                  </div>
                                  <div>
                                    <p className="text-emerald-950 font-bold text-xs">
                                      Customer Saves ₹{Math.max(0, formData.mrp - formData.sellingPrice)} instantly on MRP ₹{formData.mrp}
                                    </p>
                                    <p className="text-[10px] text-emerald-700 mt-0.5">
                                      Calculated from MRP ₹{formData.mrp} $\rightarrow$ Final Selling Price ₹{formData.sellingPrice}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  <span className="px-3 py-1 rounded-full font-black text-xs bg-emerald-700 text-white shadow-xs tracking-wider">
                                    {formData.discountPercent || Math.round(((formData.mrp - formData.sellingPrice) / formData.mrp) * 100)}% DISCOUNT
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card 3: Product Image Gallery (Device Upload Only) */}
                          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                              <div className="flex items-center space-x-2">
                                <Upload className="w-4 h-4 text-forest-900" />
                                <h4 className="font-serif text-sm font-bold text-forest-950 uppercase tracking-wider">
                                  3. Product Photos & Media
                                </h4>
                              </div>
                              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                {formData.images.length} {formData.images.length === 1 ? 'Photo Added' : 'Photos Added'}
                              </span>
                            </div>

                            {/* Direct Upload from Device Drop Zone */}
                            <label
                              className={`w-full border-2 border-dashed rounded-2xl p-6 transition flex flex-col items-center justify-center text-center cursor-pointer group ${isUploading
                                ? 'bg-slate-100/80 border-slate-300 cursor-not-allowed opacity-75'
                                : 'bg-emerald-50/30 hover:bg-emerald-50/60 border-emerald-200 hover:border-emerald-500/80'
                                }`}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileUpload}
                                disabled={isUploading}
                                className="hidden"
                              />

                              {isUploading ? (
                                <div className="space-y-2 py-2">
                                  <Loader2 className="w-8 h-8 animate-spin text-forest-900 mx-auto" />
                                  <p className="font-bold text-slate-800 text-xs">Uploading photos from device...</p>
                                  <p className="text-[11px] text-slate-400">Please wait while high-resolution media is being optimized</p>
                                </div>
                              ) : (
                                <div className="space-y-2 py-1">
                                  <div className="w-12 h-12 rounded-2xl bg-forest-900 text-gold-400 flex items-center justify-center mx-auto shadow-md group-hover:scale-105 transition">
                                    <Upload className="w-5 h-5 stroke-[2.5]" />
                                  </div>
                                  <div>
                                    <p className="font-serif font-bold text-forest-950 text-sm">
                                      Upload Photos from Device
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      Click to select multiple images from your computer or phone (JPG, PNG, WEBP)
                                    </p>
                                  </div>
                                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                                    Choose Files From Device
                                  </span>
                                </div>
                              )}
                            </label>

                            {/* Uploaded Gallery Grid */}
                            {formData.images.length === 0 ? (
                              <div className="py-4 text-center">
                                <p className="text-[11px] text-slate-400 italic">
                                  No photos added yet. Upload at least one photo for public catalog display.
                                </p>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center justify-between mb-2.5">
                                  <p className="text-[11px] text-slate-500 font-medium">
                                    The first photo serves as the <strong className="text-forest-950 font-bold">Primary Cover Photo</strong> on the storefront:
                                  </p>
                                  <label className="text-[11px] font-bold text-forest-900 hover:text-forest-950 hover:underline cursor-pointer flex items-center space-x-1">
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add More Photos</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={handleFileUpload}
                                      disabled={isUploading}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                  {formData.images.map((img, i) => (
                                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-200/90 shadow-2xs group bg-slate-100 hover:border-forest-900 transition">
                                      <img
                                        src={getFullImageUrl(img)}
                                        alt={`Photo ${i + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                      />
                                      {i === 0 && (
                                        <span className="absolute top-1.5 left-1.5 bg-forest-950/90 text-gold-400 text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs">
                                          Cover Photo
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveImage(i)}
                                        className="absolute top-1.5 right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md transition opacity-90 hover:opacity-100 cursor-pointer"
                                        title="Remove image from gallery"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card 4: Storefront Visibility & Badges */}
                          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                              <ShieldCheck className="w-4 h-4 text-forest-900" />
                              <h4 className="font-serif text-sm font-bold text-forest-950 uppercase tracking-wider">
                                4. Publishing & Storefront Badges
                              </h4>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                              {/* Publish */}
                              <label className={`p-4 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${formData.isPublished
                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 ring-1 ring-emerald-500/20'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}>
                                <input
                                  type="checkbox"
                                  checked={formData.isPublished}
                                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                                  className="w-4 h-4 mt-0.5 text-emerald-700 rounded border-slate-300 focus:ring-emerald-600"
                                />
                                <div>
                                  <p className="font-bold text-xs">Publish on Website</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Item is immediately live and visible to customers.</p>
                                </div>
                              </label>

                              {/* Super Combo */}
                              <label className={`p-4 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${formData.isCombo
                                ? 'bg-amber-50/70 border-amber-300 text-amber-950 ring-1 ring-amber-500/20'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}>
                                <input
                                  type="checkbox"
                                  checked={formData.isCombo}
                                  onChange={(e) => setFormData({ ...formData, isCombo: e.target.checked })}
                                  className="w-4 h-4 mt-0.5 text-amber-700 rounded border-slate-300 focus:ring-amber-600"
                                />
                                <div>
                                  <p className="font-bold text-xs">Is Super Combo?</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Applies bundle savings badge and combo showcase.</p>
                                </div>
                              </label>

                              {/* Featured */}
                              <label className={`p-4 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${formData.isFeatured
                                ? 'bg-purple-50/70 border-purple-300 text-purple-950 ring-1 ring-purple-500/20'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}>
                                <input
                                  type="checkbox"
                                  checked={formData.isFeatured}
                                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                  className="w-4 h-4 mt-0.5 text-purple-700 rounded border-slate-300 focus:ring-purple-600"
                                />
                                <div>
                                  <p className="font-bold text-xs">Feature on Homepage</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Prioritizes product in featured showcases.</p>
                                </div>
                              </label>
                            </div>
                          </div>

                        </form>

                        {/* Sticky Modal Footer: Outside the scrolling body so action buttons never scroll out of view! */}
                        <div className="bg-white px-6 sm:px-8 py-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                          <div className="flex items-center space-x-3 text-xs text-slate-500 flex-wrap">
                            <span>SKU: <strong className="font-mono text-slate-800">{formData.sku || 'N/A'}</strong></span>
                            <span>•</span>
                            <span>Selling: <strong className="text-forest-950 font-bold">₹{formData.sellingPrice || 0}</strong></span>
                            <span>•</span>
                            <span>Stock: <strong className="text-slate-800 font-bold">{formData.stock || 0} units</strong></span>
                          </div>

                          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => setIsModalOpen(false)}
                              className="px-5 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              form="productForm"
                              disabled={isUploading}
                              className="px-7 py-2.5 bg-forest-950 hover:bg-forest-900 text-gold-400 font-extrabold rounded-xl shadow-md transition text-xs tracking-wider uppercase flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
      )}

                    {/* Delete Product Confirmation Dialog (Portaled to document.body for true full-screen centering) */}
                    {deletingProduct && typeof document !== 'undefined' && createPortal(
                      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <div
                          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
                          onClick={() => !isDeleting && setDeletingProduct(null)}
                        />
                        <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-100 space-y-5 z-10 animate-in fade-in zoom-in-95 duration-200">
                          {/* Header with Warning Icon */}
                          <div className="flex items-start space-x-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                              <AlertTriangle className="w-6 h-6 text-rose-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900">
                                Delete Product Permanently?
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                This action is irreversible and cannot be undone.
                              </p>
                            </div>
                            <button
                              onClick={() => !isDeleting && setDeletingProduct(null)}
                              disabled={isDeleting}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition disabled:opacity-50"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Target Product Summary Card */}
                          <div className="flex items-center space-x-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                            <img
                              src={getFullImageUrl(deletingProduct.images?.[0])}
                              alt={deletingProduct.name}
                              className="w-14 h-14 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 text-sm truncate">{deletingProduct.name}</p>
                              <p className="text-[11px] font-mono text-slate-500">
                                SKU: <span className="font-bold text-slate-700">{deletingProduct.sku}</span> • ₹{deletingProduct.sellingPrice}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Stock: {deletingProduct.stock} units
                              </p>
                            </div>
                          </div>

                          {/* Impact Details Callout */}
                          <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 text-xs space-y-2 text-rose-950">
                            <p className="font-bold text-rose-900 flex items-center space-x-1.5">
                              <span>The following will be completely deleted:</span>
                            </p>
                            <ul className="space-y-1.5 text-slate-700 text-[11px] pl-1">
                              <li className="flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                <span><strong>Store Catalog:</strong> Product listing removed permanently.</span>
                              </li>
                              <li className="flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                <span><strong>Product Media:</strong> All gallery photos and media files deleted permanently.</span>
                              </li>
                              <li className="flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                <span><strong>Customer Reviews:</strong> All customer reviews and uploaded review photos/videos deleted.</span>
                              </li>
                            </ul>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end space-x-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setDeletingProduct(null)}
                              disabled={isDeleting}
                              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmDelete}
                              disabled={isDeleting}
                              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md shadow-rose-600/20 disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Deleting Media & Data...</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete Product Permanently</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>,
                      document.body
                    )}

                  </div>
                  );
};
