import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Globe,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Copy,
  Check,
  Search,
  RefreshCw,
  ShoppingBag,
  Store,
  Layers,
  CheckCircle2,
  XCircle,
  Eye,
  TrendingUp,
  X,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  Package,
  ArrowLeft,
  Save
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../store/useToastStore';
import { AdminConfirmModal } from '../../components/common/AdminConfirmModal';
import { AdminSelect, SelectOption } from '../../components/common/AdminSelect';
import type { Marketplace, MarketplaceProductLink, Product } from '../../types';

// Preset color options for popular marketplaces
const PRESET_PLATFORMS = [
  {
    name: 'Amazon India',
    code: 'amazon',
    color: '#FF9900',
    textColor: '#111827',
    iconType: 'amazon',
    tagline: 'Fast Prime delivery & secure doorstep service across India',
    badgeText: 'Prime Verified',
    storeUrl: 'https://www.amazon.in'
  },
  {
    name: 'Meesho',
    code: 'meesho',
    color: '#9E1B60',
    textColor: '#FFFFFF',
    iconType: 'meesho',
    tagline: 'Direct manufacturer prices & free delivery with cash on delivery',
    badgeText: 'Lowest Price Guarantee',
    storeUrl: 'https://www.meesho.com'
  },
  {
    name: 'Flipkart',
    code: 'flipkart',
    color: '#2874F0',
    textColor: '#FFFFFF',
    iconType: 'flipkart',
    tagline: 'Superfast delivery & Flipkart Plus benefits',
    badgeText: 'Flipkart Assured',
    storeUrl: 'https://www.flipkart.com'
  },
  {
    name: 'Myntra',
    code: 'myntra',
    color: '#FF3F6C',
    textColor: '#FFFFFF',
    iconType: 'myntra',
    tagline: '100% Original Products & Premium Lifestyle Shopping',
    badgeText: 'Myntra Assured',
    storeUrl: 'https://www.myntra.com'
  }
];

export const AdminMarketplaces: React.FC = () => {
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Platform Form View State (Dedicated Full Page)
  const [isPlatformFormView, setIsPlatformFormView] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Marketplace | null>(null);
  const [platformForm, setPlatformForm] = useState({
    name: '',
    code: '',
    tagline: '',
    brandColor: '#FF9900',
    textColor: '#111827',
    storeUrl: '',
    logoUrl: '',
    badgeText: 'Official Store',
    isActive: true
  });

  // Product Link Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<{ marketplaceId: string; link?: MarketplaceProductLink } | null>(null);
  const [linkForm, setLinkForm] = useState({
    marketplaceId: '',
    productName: '',
    url: '',
    imageUrl: '',
    inStock: true,
    isActive: true
  });

  // Lock body scroll and window scroll when link modal is open
  useEffect(() => {
    if (isLinkModalOpen) {
      window.scrollTo(0, 0);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isLinkModalOpen]);

  // Delete Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'platform' | 'link';
    marketplaceId: string;
    linkId?: string;
    title: string;
    message: string;
  } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mpRes, prodRes] = await Promise.all([
        api.get('/marketplaces'),
        api.get('/products?limit=100')
      ]);

      if (mpRes.data?.success) {
        setMarketplaces(mpRes.data.marketplaces || []);
      }
      if (prodRes.data?.success && Array.isArray(prodRes.data.products)) {
        setProducts(prodRes.data.products);
      }
    } catch (err: any) {
      console.error('Failed to load marketplaces:', err);
      toast.error(err.response?.data?.message || 'Could not load marketplace channels');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute metrics
  const totalPlatforms = marketplaces.length;
  const activePlatforms = marketplaces.filter(m => m.isActive).length;
  const totalMappedLinks = marketplaces.reduce((sum, m) => sum + (m.products?.length || 0), 0);
  const totalClicks = marketplaces.reduce(
    (sum, m) => sum + (m.products || []).reduce((pSum, p) => pSum + (p.clicks || 0), 0),
    0
  );

  // Copy helper
  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Product link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Add Platform Modal
  const handleOpenAddPlatform = () => {
    setEditingPlatform(null);
    setPlatformForm({
      name: '',
      code: '',
      tagline: '',
      brandColor: '#2874F0',
      textColor: '#FFFFFF',
      storeUrl: '',
      logoUrl: '',
      badgeText: 'Official Store',
      isActive: true
    });
    setIsPlatformFormView(true);
  };

  // Open Edit Platform Page View
  const handleOpenEditPlatform = (platform: Marketplace) => {
    setEditingPlatform(platform);
    setPlatformForm({
      name: platform.name,
      code: platform.code,
      tagline: platform.tagline || '',
      brandColor: platform.brandColor || '#FF9900',
      textColor: platform.textColor || '#111827',
      storeUrl: platform.storeUrl || '',
      logoUrl: platform.logoUrl || '',
      badgeText: platform.badgeText || 'Official Store',
      isActive: platform.isActive
    });
    setIsPlatformFormView(true);
  };

  // Save Platform (Create or Update)
  const handleSavePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformForm.name.trim()) {
      toast.warning('Platform name is required');
      return;
    }

    try {
      if (editingPlatform) {
        const res = await api.put(`/marketplaces/${editingPlatform._id}`, platformForm);
        if (res.data?.success) {
          toast.success(res.data.message || 'Platform updated');
          setIsPlatformFormView(false);
          fetchData();
        }
      } else {
        const res = await api.post('/marketplaces', platformForm);
        if (res.data?.success) {
          toast.success(res.data.message || 'Platform created');
          setIsPlatformFormView(false);
          fetchData();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save marketplace platform');
    }
  };

  // Quick toggle platform active status
  const handleTogglePlatformActive = async (platform: Marketplace) => {
    try {
      const res = await api.put(`/marketplaces/${platform._id}`, {
        isActive: !platform.isActive
      });
      if (res.data?.success) {
        toast.info(`${platform.name} is now ${!platform.isActive ? 'Active' : 'Inactive'}`);
        fetchData();
      }
    } catch (err: any) {
      toast.error('Failed to toggle status');
    }
  };

  // Open Add Link Modal
  const handleOpenAddLink = (marketplaceId?: string) => {
    const defaultMpId = marketplaceId || (marketplaces[0]?._id || '');
    setEditingLink({ marketplaceId: defaultMpId });
    setLinkForm({
      marketplaceId: defaultMpId,
      productName: '',
      url: '',
      imageUrl: '',
      inStock: true,
      isActive: true
    });
    setIsLinkModalOpen(true);
  };

  // Open Edit Link Modal
  const handleOpenEditLink = (marketplaceId: string, link: MarketplaceProductLink) => {
    setEditingLink({ marketplaceId, link });
    setLinkForm({
      marketplaceId,
      productName: link.productName || '',
      url: link.url,
      imageUrl: link.imageUrl || '',
      inStock: link.inStock !== false,
      isActive: link.isActive !== false
    });
    setIsLinkModalOpen(true);
  };

  // Save Product Link
  const handleSaveProductLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkForm.marketplaceId) {
      toast.warning('Please select a marketplace platform');
      return;
    }
    if (!linkForm.productName.trim()) {
      toast.warning('Please enter a product / listing name');
      return;
    }
    if (!linkForm.url.trim() || !linkForm.url.startsWith('http')) {
      toast.warning('Please enter a valid URL starting with http:// or https://');
      return;
    }

    try {
      const payload: any = {
        productName: linkForm.productName.trim(),
        url: linkForm.url.trim(),
        imageUrl: linkForm.imageUrl.trim(),
        inStock: linkForm.inStock,
        isActive: linkForm.isActive
      };

      if (editingLink?.link?._id) {
        payload.linkId = editingLink.link._id;
      }

      const res = await api.post(`/marketplaces/${linkForm.marketplaceId}/products`, payload);
      if (res.data?.success) {
        toast.success(res.data.message || 'Marketplace link saved');
        setIsLinkModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save product link');
    }
  };

  // Toggle Product Link Active
  const handleToggleLinkActive = async (marketplaceId: string, link: MarketplaceProductLink) => {
    try {
      const prodId = link.product && typeof link.product === 'object' ? (link.product as any)._id : (typeof link.product === 'string' && link.product ? link.product : undefined);
      await api.post(`/marketplaces/${marketplaceId}/products`, {
        linkId: link._id,
        productId: prodId,
        productName: link.productName,
        url: link.url,
        badgeText: link.badgeText,
        priceNote: link.priceNote,
        inStock: link.inStock,
        isActive: !link.isActive
      });
      toast.info(`Link is now ${!link.isActive ? 'Active' : 'Inactive'}`);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to update link status');
    }
  };

  // Confirm and Execute Delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      if (deleteConfirmation.type === 'platform') {
        const res = await api.delete(`/marketplaces/${deleteConfirmation.marketplaceId}`);
        if (res.data?.success) {
          toast.success(res.data.message || 'Marketplace deleted');
        }
      } else if (deleteConfirmation.type === 'link' && deleteConfirmation.linkId) {
        const res = await api.delete(`/marketplaces/${deleteConfirmation.marketplaceId}/products/${deleteConfirmation.linkId}`);
        if (res.data?.success) {
          toast.success(res.data.message || 'Product link deleted');
        }
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleteConfirmation(null);
    }
  };

  // Flatten all product links for the filterable table view
  const allFlattenedLinks: Array<{
    marketplace: Marketplace;
    link: MarketplaceProductLink;
  }> = [];

  marketplaces.forEach(m => {
    (m.products || []).forEach(p => {
      allFlattenedLinks.push({
        marketplace: m,
        link: p
      });
    });
  });

  const filteredLinks = allFlattenedLinks.filter(item => {
    const matchesPlatform = selectedPlatformFilter === 'ALL' || item.marketplace._id === selectedPlatformFilter;
    const matchesSearch = !searchQuery.trim() ||
      item.link.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.marketplace.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.link.badgeText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.link.url?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  const marketplaceSelectOptions: SelectOption[] = marketplaces.map((m) => ({
    value: m._id,
    label: m.name,
    badge: m.isActive ? 'Active' : 'Disabled',
    description: m.tagline || `Channel code: ${m.code}`,
    icon: Store
  }));

  return (
    <div className="space-y-6 w-full">
      {isPlatformFormView ? (
        /* ============================================================== */
        /* FULL PAGE: ADD / EDIT MARKETPLACE PLATFORM                     */
        /* ============================================================== */
        <div className="space-y-6 w-full animate-fadeIn">
          {/* Header Card with Back Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsPlatformFormView(false)}
                    className="inline-flex items-center space-x-2 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group w-fit shrink-0"
                    title="Back to Marketplaces"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Marketplaces</span>
                  </button>
                    <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 text-forest-900 font-bold text-xs uppercase tracking-wider">
                        <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Channel Configuration</span>
                      </div>
                        <h1 className="font-serif text-lg sm:text-2xl font-black text-forest-950 mt-1 truncate">
                          {editingPlatform ? `Edit ${editingPlatform.name} Channel` : 'Add New Marketplace Channel'}
                        </h1>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 sm:line-clamp-none">
                            {editingPlatform
                              ? `Update branding, storefront URL, or logo for ${editingPlatform.name}.`
                              : 'Configure an external sales channel (Amazon, Meesho, Flipkart, Myntra) for your storefront.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Form */}
                    <form id="platformForm" onSubmit={handleSavePlatform} className="space-y-6 w-full">
                      {/* 1. Quick Presets (When creating new platform) */}
                      {!editingPlatform && (
                        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                              <span>Popular E-Commerce Presets (Click to autofill):</span>
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">1-click setup</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {PRESET_PLATFORMS.map((preset) => {
                              const isAlreadyAdded = marketplaces.some(
                                (m) => m.code === preset.code || m.name.toLowerCase() === preset.name.toLowerCase()
                              );
                              return (
                                <button
                                  key={preset.code}
                                  type="button"
                                  onClick={() => {
                                    if (isAlreadyAdded) {
                                      toast.info(`${preset.name} is already configured in your channels list`);
                                    }
                                    setPlatformForm({
                                      ...platformForm,
                                      name: preset.name,
                                      code: preset.code,
                                      brandColor: preset.color,
                                      textColor: preset.textColor,
                                      tagline: preset.tagline,
                                      badgeText: preset.badgeText || platformForm.badgeText,
                                      storeUrl: preset.storeUrl || platformForm.storeUrl
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center space-x-1.5 ${isAlreadyAdded
                                    ? 'border-slate-300 opacity-75 hover:opacity-100'
                                    : 'border-slate-200 hover:border-slate-400'
                                    }`}
                                  style={{
                                    backgroundColor: `${preset.color}15`,
                                    color: preset.color
                                  }}
                                  title={isAlreadyAdded ? `${preset.name} is already connected` : `Pre-fill ${preset.name}`}
                                >
                                  <span>+ {preset.name}</span>
                                  {isAlreadyAdded && (
                                    <span className="text-[9.5px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold ml-0.5">
                                      Added
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. Platform Core Identity Card */}
                      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
                        <h3 className="font-serif text-base font-bold text-forest-950 flex items-center space-x-2 border-b border-slate-100 pb-3">
                          <Store className="w-4 h-4 text-forest-900" />
                          <span>Platform Details & Identity</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1.5 text-xs">Platform Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Flipkart"
                              value={platformForm.name}
                              onChange={(e) =>
                                setPlatformForm({
                                  ...platformForm,
                                  name: e.target.value,
                                  code: platformForm.code || e.target.value.toLowerCase().replace(/\s+/g, '-')
                                })
                              }
                              className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900 font-semibold text-xs"
                            />
                            <span className="text-[10.5px] text-slate-400 mt-1 block">
                              The name displayed on customer buttons and admin listings.
                            </span>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1.5 text-xs">Slug / Unique Code *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. flipkart"
                              value={platformForm.code}
                              onChange={(e) =>
                                setPlatformForm({
                                  ...platformForm,
                                  code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
                                })
                              }
                              className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900 font-mono text-xs"
                            />
                            <span className="text-[10.5px] text-slate-400 mt-1 block">
                              Unique identifier used in URLs and badges (lowercase, no spaces).
                            </span>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1.5 text-xs">Brand Hex Color</label>
                            <div className="flex items-center space-x-2.5">
                              <input
                                type="color"
                                value={platformForm.brandColor}
                                onChange={(e) => setPlatformForm({ ...platformForm, brandColor: e.target.value })}
                                className="w-10 h-10 p-0.5 rounded-xl border border-slate-300 cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                value={platformForm.brandColor}
                                onChange={(e) => setPlatformForm({ ...platformForm, brandColor: e.target.value })}
                                className="flex-1 px-4 py-2.5 bg-[#FAF8F5] border border-slate-300 rounded-xl font-mono text-xs uppercase"
                              />
                            </div>
                            <span className="text-[10.5px] text-slate-400 mt-1 block">
                              Accent color for badges, buttons, and icons.
                            </span>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1.5 text-xs">Default Badge Text</label>
                            <input
                              type="text"
                              placeholder="e.g. Official Store"
                              value={platformForm.badgeText}
                              onChange={(e) => setPlatformForm({ ...platformForm, badgeText: e.target.value })}
                              className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900 text-xs"
                            />
                            <span className="text-[10.5px] text-slate-400 mt-1 block">
                              Subtext displayed on marketplace chips (e.g. 'Prime Available', 'Official Partner').
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1.5 text-xs">Tagline / Description</label>
                          <input
                            type="text"
                            placeholder="e.g. Superfast delivery & Flipkart Plus benefits"
                            value={platformForm.tagline}
                            onChange={(e) => setPlatformForm({ ...platformForm, tagline: e.target.value })}
                            className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900 text-xs"
                          />
                        </div>

                        <div className="pt-2">
                          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={platformForm.isActive}
                              onChange={(e) => setPlatformForm({ ...platformForm, isActive: e.target.checked })}
                              className="rounded border-slate-300 text-forest-900 focus:ring-forest-900 w-4 h-4 cursor-pointer"
                            />
                            <span className="font-bold text-slate-800 text-xs">
                              Platform is Active and Visible to Customers on Storefront
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* 3. Official Storefront URL */}
                      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                        <h3 className="font-serif text-base font-bold text-forest-950 flex items-center space-x-2 border-b border-slate-100 pb-3">
                          <Globe className="w-4 h-4 text-forest-900" />
                          <span>Storefront Link</span>
                        </h3>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                            Brand Storefront Profile URL (Optional)
                          </label>
                          <input
                            type="url"
                            placeholder="https://www.flipkart.com/novis-herbal or https://www.amazon.in/stores/..."
                            value={platformForm.storeUrl}
                            onChange={(e) => setPlatformForm({ ...platformForm, storeUrl: e.target.value })}
                            className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900 font-mono text-xs"
                          />
                          <span className="text-[10.5px] text-slate-400 mt-1 block">
                            Direct link to your official brand store/profile page on this marketplace.
                          </span>
                        </div>
                      </div>

                      {/* Bottom Actions Bar */}
                      <div className="flex items-center justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsPlatformFormView(false)}
                          className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-forest-950 hover:bg-forest-900 text-gold-400 font-black text-xs rounded-2xl transition shadow-md shadow-forest-950/15 cursor-pointer flex items-center space-x-1.5"
                        >
                          <Save className="w-4 h-4" />
                          <span>{editingPlatform ? 'Update Platform' : 'Save Platform'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                  ) : (
                  /* ============================================================== */
                  /* MAIN LIST VIEW                                                 */
                  /* ============================================================== */
                  <div className="space-y-6 w-full animate-fadeIn">
                    {/* Top Banner / Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
                      <div>
                        <div className="flex items-center space-x-2 text-forest-900 font-bold text-xs uppercase tracking-wider">
                          <Globe className="w-4 h-4 text-emerald-600" />
                          <span>Multi-Channel Sales</span>
                        </div>
                        <h1 className="font-serif text-2xl sm:text-3xl font-black text-forest-950 mt-1">
                          E-Commerce & Marketplaces
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
                          Manage your live external product listings across Amazon, Meesho, Flipkart, and other partner platforms. Links dynamically surface on your customer storefront.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        <button
                          type="button"
                          onClick={fetchData}
                          className="p-2.5 border border-slate-200 hover:bg-slate-50 rounded-2xl transition cursor-pointer text-slate-600"
                          title="Refresh"
                        >
                          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenAddPlatform}
                          className="px-4 py-2.5 bg-white border border-forest-900/30 text-forest-900 hover:bg-forest-900 hover:text-gold-400 font-bold text-xs rounded-2xl transition shadow-xs inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Store className="w-4 h-4" />
                          <span>Add Platform</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAddLink()}
                          className="px-4 py-2.5 bg-forest-950 hover:bg-forest-900 text-gold-400 font-black text-xs rounded-2xl transition shadow-md shadow-forest-950/15 inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Map Product Link</span>
                        </button>
                      </div>
                    </div>

                    {/* Summary Scorecard Ribbon */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Connected Marketplaces
                        </span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-2xl font-black text-forest-950 font-mono">
                            {totalPlatforms}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {activePlatforms} Active
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Live Product Links
                        </span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-2xl font-black text-forest-950 font-mono">
                            {totalMappedLinks}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            across {totalPlatforms} platforms
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Active Store Listings
                        </span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-2xl font-black text-forest-950 font-mono">
                            {allFlattenedLinks.filter(l => l.link.isActive).length}
                          </span>
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            Live on Store
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 1: Active Marketplace Platforms */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="font-serif text-lg font-bold text-forest-950 flex items-center space-x-2">
                          <Store className="w-4 h-4 text-forest-900" />
                          <span>Connected Sales Channels</span>
                        </h2>
                        <span className="text-xs text-slate-400">
                          {marketplaces.length} Channels configured
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {marketplaces.map((platform) => {
                          const linkCount = platform.products?.length || 0;

                          return (
                            <div
                              key={platform._id}
                              className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs transition hover:shadow-md space-y-4 relative flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center space-x-3">
                                    <div
                                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-inner shrink-0 overflow-hidden"
                                      style={{
                                        backgroundColor: platform.brandColor || '#07190F',
                                        color: platform.textColor || '#FFFFFF'
                                      }}
                                    >
                                      {platform.logoUrl ? (
                                        <img
                                          src={platform.logoUrl}
                                          alt={platform.name}
                                          className="w-full h-full object-contain p-1.5"
                                        />
                                      ) : (
                                        platform.name.charAt(0)
                                      )}
                                    </div>
                                    <div>
                                      <h3 className="font-serif text-base font-bold text-forest-950 flex items-center gap-1.5">
                                        <span>{platform.name}</span>
                                        <span
                                          className={`w-2 h-2 rounded-full ${platform.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                        />
                                        {platform.storeUrl && (
                                          <a
                                            href={platform.storeUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-400 hover:text-forest-900 transition p-0.5"
                                            title="Visit Official Storefront Profile"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        )}
                                      </h3>
                                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                        code: {platform.code}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditPlatform(platform)}
                                      className="p-1.5 text-slate-400 hover:text-forest-900 hover:bg-slate-100 rounded-lg transition"
                                      title="Edit Platform"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeleteConfirmation({
                                          type: 'platform',
                                          marketplaceId: platform._id,
                                          title: `Delete ${platform.name}?`,
                                          message: `Are you sure you want to delete ${platform.name}? All ${linkCount} product links under this platform will also be permanently deleted.`
                                        })
                                      }
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                      title="Delete Platform"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {platform.tagline && (
                                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed line-clamp-2">
                                    {platform.tagline}
                                  </p>
                                )}
                              </div>

                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                <div className="text-slate-500 font-mono text-[11px]">
                                  <span className="font-bold text-forest-950">{linkCount}</span> product links
                                </div>

                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePlatformActive(platform)}
                                    className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition cursor-pointer ${platform.isActive
                                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      }`}
                                  >
                                    {platform.isActive ? 'Active' : 'Disabled'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddLink(platform._id)}
                                    className="p-1 text-forest-900 hover:text-forest-950 font-bold text-[11px] flex items-center gap-0.5 hover:underline"
                                    title="Add link to this platform"
                                  >
                                    <span>+ Link</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SECTION 2: Filterable Product Links Mapping Table */}
                    <div className="space-y-4 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                          <span className="text-xs font-bold text-slate-700">Filter Platform:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setSelectedPlatformFilter('ALL')}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${selectedPlatformFilter === 'ALL'
                                ? 'bg-forest-950 text-gold-400'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                              All Platforms ({allFlattenedLinks.length})
                            </button>
                            {marketplaces.map((m) => (
                              <button
                                key={m._id}
                                type="button"
                                onClick={() => setSelectedPlatformFilter(m._id)}
                                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${selectedPlatformFilter === m._id
                                  ? 'bg-forest-950 text-gold-400'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                              >
                                {m.name} ({m.products?.length || 0})
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search product or link..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-xs bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900 w-full sm:w-64"
                          />
                        </div>
                      </div>

                      {/* Links Table */}
                      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#FAF8F5] text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                              <tr>
                                <th className="py-3.5 px-4">Platform</th>
                                <th className="py-3.5 px-4">Product / Listing Name</th>
                                <th className="py-3.5 px-4">Marketplace URL</th>
                                <th className="py-3.5 px-4 text-center">Status</th>
                                <th className="py-3.5 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredLinks.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="py-12 text-center text-slate-400">
                                    <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                    <p className="font-bold text-slate-700">No marketplace links found</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      Click "+ Map Product Link" above to attach live Amazon, Meesho, or Flipkart URLs to your products.
                                    </p>
                                  </td>
                                </tr>
                              ) : (
                                filteredLinks.map(({ marketplace, link }) => (
                                  <tr key={link._id || link.url} className="hover:bg-slate-50/70 transition">
                                    {/* Platform */}
                                    <td className="py-3 px-4 whitespace-nowrap">
                                      <span
                                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-2xs"
                                        style={{
                                          backgroundColor: marketplace.brandColor || '#FF9900',
                                          color: marketplace.textColor || '#FFFFFF'
                                        }}
                                      >
                                        {marketplace.logoUrl && (
                                          <img
                                            src={marketplace.logoUrl}
                                            alt=""
                                            className="w-3.5 h-3.5 object-contain shrink-0"
                                          />
                                        )}
                                        <span>{marketplace.name}</span>
                                      </span>
                                    </td>

                                    {/* Product Name */}
                                    <td className="py-3 px-4">
                                      <div className="font-bold text-forest-950 text-xs">
                                        {link.productName}
                                      </div>
                                    </td>

                                    {/* URL with Test & Copy */}
                                    <td className="py-3 px-4 max-w-xs">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-mono text-[11px] text-slate-600 truncate block max-w-[200px]" title={link.url}>
                                          {link.url}
                                        </span>

                                        <button
                                          type="button"
                                          onClick={() => handleCopyLink(link.url, link._id || link.url)}
                                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                                          title="Copy link"
                                        >
                                          {copiedId === (link._id || link.url) ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </button>

                                        <a
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 hover:bg-slate-100 rounded text-blue-600 hover:text-blue-800 transition inline-flex items-center"
                                          title="Open in new tab to test live page"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      </div>
                                    </td>

                                    {/* Status Toggle */}
                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleLinkActive(marketplace._id, link)}
                                        className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold transition cursor-pointer ${link.isActive
                                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                          : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                                          }`}
                                      >
                                        {link.isActive ? 'Active' : 'Disabled'}
                                      </button>
                                    </td>

                                    {/* Action Buttons */}
                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end space-x-1">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditLink(marketplace._id, link)}
                                          className="p-1.5 text-slate-400 hover:text-forest-900 hover:bg-slate-100 rounded-lg transition"
                                          title="Edit Link"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDeleteConfirmation({
                                              type: 'link',
                                              marketplaceId: marketplace._id,
                                              linkId: link._id,
                                              title: `Remove ${marketplace.name} link?`,
                                              message: `Remove the ${marketplace.name} link for "${link.productName}"? This product will no longer show the ${marketplace.name} button on the storefront.`
                                            })
                                          }
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                          title="Remove Link"
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
                      </div>
                    </div>

                  </div>
      )}

                  {/* ============================================================== */}
                  {/* MODAL 2: MAP / EDIT PRODUCT LINK                             */}
                  {/* ============================================================== */}
                  {isLinkModalOpen && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn">
                      <div className="min-h-full flex items-center justify-center py-6 sm:py-8">
                        <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 flex flex-col animate-scaleUp">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
                            <div className="flex items-center space-x-2">
                              <Package className="w-5 h-5 text-forest-900" />
                              <h3 className="font-serif text-lg font-bold text-forest-950">
                                {editingLink?.link ? 'Edit Product Marketplace Link' : 'Map Product to Marketplace'}
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsLinkModalOpen(false)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Form Body */}
                          <form onSubmit={handleSaveProductLink} className="space-y-4 text-xs pt-3">
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Target Marketplace Channel *</label>
                              <AdminSelect
                                value={linkForm.marketplaceId}
                                onChange={(val) => setLinkForm({ ...linkForm, marketplaceId: val })}
                                options={marketplaceSelectOptions}
                                placeholder="Select platform..."
                                icon={Store}
                                size="md"
                                className="w-full"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Product / Listing Name *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Novise Complete Hair Regrowth Combo Pack"
                                value={linkForm.productName}
                                onChange={(e) => setLinkForm({ ...linkForm, productName: e.target.value })}
                                className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900 font-semibold"
                              />
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                Product or listing title as displayed on the marketplace.
                              </span>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Live Product URL on Marketplace *</label>
                              <input
                                type="url"
                                required
                                placeholder="https://www.amazon.in/dp/... or https://www.meesho.com/..."
                                value={linkForm.url}
                                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                                className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900 font-mono text-[11px]"
                              />
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                Copy direct product link from Amazon, Meesho, or Flipkart. When customers click, they land directly on this product page.
                              </span>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">
                                Marketplace Product Image URL (Optional)
                              </label>
                              <input
                                type="url"
                                placeholder="https://m.media-amazon.com/images/I/... or https://images.meesho.com/..."
                                value={linkForm.imageUrl}
                                onChange={(e) => setLinkForm({ ...linkForm, imageUrl: e.target.value })}
                                className="w-full px-3 py-2 bg-[#FAF8F5] border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-900 font-mono text-[11px]"
                              />
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                Agar Amazon, Meesho ya Flipkart par alag packaging image hai toh uska direct URL yaha paste karein. Khali chhodne par website ka original product image auto-load hoga.
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="linkStock"
                                  checked={linkForm.inStock}
                                  onChange={(e) => setLinkForm({ ...linkForm, inStock: e.target.checked })}
                                  className="rounded border-slate-300 text-forest-900 focus:ring-forest-900 w-4 h-4 cursor-pointer"
                                />
                                <label htmlFor="linkStock" className="font-bold text-slate-700 cursor-pointer">
                                  In Stock on Platform
                                </label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="linkActive"
                                  checked={linkForm.isActive}
                                  onChange={(e) => setLinkForm({ ...linkForm, isActive: e.target.checked })}
                                  className="rounded border-slate-300 text-forest-900 focus:ring-forest-900 w-4 h-4 cursor-pointer"
                                />
                                <label htmlFor="linkActive" className="font-bold text-slate-700 cursor-pointer">
                                  Link is Active on Store
                                </label>
                              </div>
                            </div>

                            <div className="pt-3.5 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setIsLinkModalOpen(false)}
                                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold transition cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-2 bg-forest-950 hover:bg-forest-900 text-gold-400 font-black rounded-xl transition shadow-md shadow-forest-950/15 cursor-pointer"
                              >
                                {editingLink?.link ? 'Update Link' : 'Save Product Link'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}

                  {/* Delete Confirmation Modal */}
                  {deleteConfirmation && (
                    <AdminConfirmModal
                      isOpen={true}
                      title={deleteConfirmation.title}
                      message={deleteConfirmation.message}
                      confirmLabel="Yes, Delete"
                      cancelLabel="Cancel"
                      variant="danger"
                      onConfirm={handleConfirmDelete}
                      onClose={() => setDeleteConfirmation(null)}
                    />
                  )}
                </div>
                );
};

                export default AdminMarketplaces;