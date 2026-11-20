import React, { useEffect, useState, useMemo } from 'react';
import api, { getFullImageUrl, getFallbackProductImage } from '../../services/api';
import { useProductStore } from '../../store/useProductStore';
import {
  Globe,
  Store,
  ExternalLink,
  Search,
  Sparkles,
  ShieldCheck,
  Truck,
  CheckCircle2,
  ArrowRight,
  ShoppingBag,
  X,
  BadgeCheck,
  Check
} from 'lucide-react';

interface MappedProduct {
  _id: string;
  product?: {
    _id: string;
    name: string;
    slug?: string;
    images?: string[];
    thumbnail?: string;
    sellingPrice?: number;
    mrp?: number;
  } | null;
  productName: string;
  productSlug?: string;
  productSku?: string;
  imageUrl?: string;
  url: string;
  badgeText?: string;
  priceNote?: string;
  inStock?: boolean;
  isActive?: boolean;
  clicks?: number;
}

interface PublicMarketplace {
  _id: string;
  name: string;
  code: string;
  tagline?: string;
  brandColor?: string;
  textColor?: string;
  bgColor?: string;
  iconType?: string;
  logoUrl?: string;
  storeUrl?: string;
  badgeText?: string;
  displayOrder?: number;
  products: MappedProduct[];
}

interface FlattenedMarketplaceItem {
  marketplace: PublicMarketplace;
  link: MappedProduct;
}

interface MarketplacesPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const MarketplacesPage: React.FC<MarketplacesPageProps> = ({ onNavigate }) => {
  const { comboDiscount, products: storeProducts } = useProductStore();
  const [marketplaces, setMarketplaces] = useState<PublicMarketplace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');

  // Fetch active public marketplaces & links
  const fetchMarketplaces = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/marketplaces/public');
      if (res.data?.success) {
        setMarketplaces(res.data.marketplaces || []);
      }
    } catch (err) {
      console.error('Failed to fetch public marketplaces:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplaces();

    // Listen for live updates from admin broadcasts
    const handleSync = () => {
      fetchMarketplaces();
    };
    window.addEventListener('novise:marketplace-updated', handleSync);
    return () => {
      window.removeEventListener('novise:marketplace-updated', handleSync);
    };
  }, []);

  // Handle outbound link click: track analytics asynchronously and open in new tab
  const handleMarketplaceClick = (marketplaceId: string, linkId: string, url: string) => {
    // Fire click tracking in background without waiting
    api.post(`/marketplaces/${marketplaceId}/links/${linkId}/click`).catch((err) => {
      console.warn('Click track silent fail:', err);
    });

    // Open target marketplace product listing
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Flatten all active product links
  const allItems: FlattenedMarketplaceItem[] = useMemo(() => {
    const list: FlattenedMarketplaceItem[] = [];
    marketplaces.forEach((m) => {
      (m.products || []).forEach((p) => {
        if (p.isActive !== false) {
          list.push({ marketplace: m, link: p });
        }
      });
    });
    return list;
  }, [marketplaces]);

  // Filter items by search query and platform
  const filteredItems = useMemo(() => {
    return allItems.filter(({ marketplace, link }) => {
      const matchesPlatform =
        selectedPlatform === 'ALL' ||
        marketplace.code === selectedPlatform ||
        marketplace._id === selectedPlatform;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        link.productName?.toLowerCase().includes(q) ||
        marketplace.name?.toLowerCase().includes(q);

      return matchesPlatform && matchesSearch;
    });
  }, [allItems, selectedPlatform, searchQuery]);

  // Helper for platform visual accents & styling
  const getPlatformVisuals = (code: string, fallbackColor?: string) => {
    switch (code?.toLowerCase()) {
      case 'amazon':
        return {
          brandColor: '#FF9900',
          textColor: '#111827',
          bgColor: '#FFF8ED',
          borderAccent: 'border-amber-300',
          pillBg: 'bg-[#FFF8ED] text-amber-950 border border-amber-300',
          glow: 'hover:border-amber-400 hover:shadow-lg',
          btnBg: 'bg-[#FF9900] hover:bg-[#e68a00] text-slate-950 font-black shadow-sm'
        };
      case 'meesho':
        return {
          brandColor: '#9E1B60',
          textColor: '#FFFFFF',
          bgColor: '#FFF0F6',
          borderAccent: 'border-pink-300',
          pillBg: 'bg-[#FFF0F6] text-pink-950 border border-pink-300',
          glow: 'hover:border-pink-400 hover:shadow-lg',
          btnBg: 'bg-[#9E1B60] hover:bg-[#851651] text-white font-bold shadow-sm'
        };
      case 'flipkart':
        return {
          brandColor: '#2874F0',
          textColor: '#FFFFFF',
          bgColor: '#EEF4FF',
          borderAccent: 'border-blue-300',
          pillBg: 'bg-[#EEF4FF] text-blue-950 border border-blue-300',
          glow: 'hover:border-blue-400 hover:shadow-lg',
          btnBg: 'bg-[#2874F0] hover:bg-[#1f5ec4] text-white font-bold shadow-sm'
        };
      case 'myntra':
        return {
          brandColor: '#FF3F6C',
          textColor: '#FFFFFF',
          bgColor: '#FFF0F5',
          borderAccent: 'border-rose-300',
          pillBg: 'bg-[#FFF0F5] text-rose-950 border border-rose-300',
          glow: 'hover:border-rose-400 hover:shadow-lg',
          btnBg: 'bg-[#FF3F6C] hover:bg-[#e0305a] text-white font-bold shadow-sm'
        };
      default:
        return {
          brandColor: fallbackColor || '#07190F',
          textColor: '#FFFFFF',
          bgColor: '#F5F5F5',
          borderAccent: 'border-stone-300',
          pillBg: 'bg-stone-100 text-stone-900 border border-stone-300',
          glow: 'hover:border-forest-900/40 hover:shadow-lg',
          btnBg: 'bg-forest-950 hover:bg-forest-900 text-gold-400 font-bold shadow-sm'
        };
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#FAF8F5]">
      {/* ============================================================== */}
      {/* 1. LUXURY HERO BANNER (Full-width, Fluid & Balanced)           */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#05140B] via-[#092215] to-[#05140B] text-white py-10 sm:py-14 border-b border-gold-500/20">
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-[400px] h-[250px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-forest-900/90 border border-gold-400/40 text-gold-400 text-[11px] font-bold uppercase tracking-widest shadow-inner">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-gold-300" />
                <span>Certified Multi-Channel Distribution</span>
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Shop Novis Herbal on India's{' '}
                <span className="bg-gradient-to-r from-gold-300 via-amber-400 to-gold-500 bg-clip-text text-transparent">
                  Leading Marketplaces
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed max-w-2xl">
                Prefer ordering via Amazon, Meesho, Flipkart, or Myntra? Every external link below connects directly to certified, 100% authentic Novis Herbal inventory dispatched fresh from our Ayush-approved facility.
              </p>
            </div>

            {/* Key Trust Highlights (Right Side Desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 shrink-0 text-xs">
              <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl backdrop-blur-xs text-stone-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Authentic Ayush Certified</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl backdrop-blur-xs text-stone-200">
                <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Prime & Assured Express Shipping</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl backdrop-blur-xs text-stone-200">
                <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
                <span>Direct Manufacturer Backing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. OFFICIAL BRAND STOREFRONTS (Adaptive Responsive Layout)     */}
      {/* ============================================================== */}
      <section className="w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-8 pb-4">
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-stone-200/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-forest-900 font-mono">
                Brand Destinations
              </span>
              <h2 className="font-serif text-lg font-bold text-forest-950">
                Official Marketplace Brand Stores
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Browse full verified brand catalogs directly on your favorite e-commerce platforms
            </p>
          </div>

          {/* Adaptive Grid that gracefully fills full width whether 2, 3, or 4 platforms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {marketplaces.map((platform) => {
              const visuals = getPlatformVisuals(platform.code, platform.brandColor);
              const activeLinksCount = (platform.products || []).filter((p) => p.isActive !== false).length;
              const isSelected = selectedPlatform === platform.code || selectedPlatform === platform._id;

              return (
                <div
                  key={platform._id}
                  onClick={() => setSelectedPlatform(isSelected ? 'ALL' : platform.code)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between group ${isSelected
                      ? 'border-forest-900 bg-forest-900/5 shadow-sm ring-1 ring-forest-900/20'
                      : 'border-slate-200/90 bg-[#FDFBF7] hover:bg-white hover:shadow-md hover:border-slate-300'
                    }`}
                >
                  <div className="space-y-2.5">
                    {/* Header: Platform Icon + Name + Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-xs shrink-0"
                          style={{
                            backgroundColor: visuals.brandColor,
                            color: visuals.textColor
                          }}
                        >
                          {platform.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-serif text-sm font-bold text-forest-950 flex items-center gap-1.5 truncate">
                            <span className="truncate">{platform.name}</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active Channel" />
                          </h3>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {activeLinksCount} {activeLinksCount === 1 ? 'Live Listing' : 'Live Listings'}
                          </span>
                        </div>
                      </div>

                      {platform.badgeText && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-700 shadow-2xs shrink-0 whitespace-nowrap">
                          {platform.badgeText}
                        </span>
                      )}
                    </div>

                    {/* Tagline */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {platform.tagline || 'Fast delivery and certified genuine Novis Herbal hair care.'}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-forest-900 group-hover:text-forest-950 flex items-center space-x-1">
                      {isSelected ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Filter Active</span>
                        </>
                      ) : (
                        <span>Filter Products</span>
                      )}
                    </span>
                    {platform.storeUrl && (
                      <a
                        href={platform.storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1 text-slate-400 hover:text-forest-900 transition font-semibold text-[11px]"
                        title={`Open official ${platform.name} Storefront`}
                      >
                        <span>Storefront</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. PRODUCT CATALOG SECTION (Clean, Minimalist, Luxury Cards)   */}
      {/* ============================================================== */}
      <section className="w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        {/* Controls Bar: Platform Filter Pills & Wide Search Box */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Platform Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              onClick={() => setSelectedPlatform('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center space-x-1.5 ${selectedPlatform === 'ALL'
                  ? 'bg-forest-950 text-gold-400 shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                }`}
            >
              <span>All Platforms</span>
          <span className="text-[11px] opacity-80 font-mono">({allItems.length})</span>
        </button>

            {
              marketplaces.map((m) => {
                const count = (m.products || []).filter((p) => p.isActive !== false).length;
                const isSelected = selectedPlatform === m.code || selectedPlatform === m._id;
                return (
                  <button
                    key={m._id}
                    onClick={() => setSelectedPlatform(m.code)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center space-x-2 ${isSelected
                        ? 'bg-forest-950 text-gold-400 shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                      }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: m.brandColor || '#111827' }}
                    />
                    <span>{m.name}</span>
                    <span className="text-[11px] opacity-80 font-mono">({count})</span>
                  </button>
                );
              })
            }
          </div>

          {/* Search Box (Clean, Wide, Minimalist) */ }
  <div className="relative w-full md:w-80 shrink-0">
    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search products, hair oil, shampoo..."
      className="w-full bg-stone-50 border border-stone-200/90 rounded-xl pl-9 pr-8 py-2 text-xs text-forest-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:bg-white transition"
    />
    {searchQuery && (
      <button
        onClick={() => setSearchQuery('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-forest-950 p-0.5"
        title="Clear search"
      >
        <X className="w-3.5 h-3.5" />
      </button>
            )}
  </div>
        </div >

    {/* Results Summary Bar */ }
    < div className = "flex items-center justify-between text-xs text-slate-500 px-2" >
      <span>
        Showing <strong className="text-forest-950 font-bold">{filteredItems.length}</strong> verified marketplace listings
      </span>
  {
    (selectedPlatform !== 'ALL' || searchQuery) && (
      <button
        onClick={() => {
          setSelectedPlatform('ALL');
          setSearchQuery('');
        }}
        className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
      >
        Reset all filters
      </button>
    )
  }
        </div >

            {/* Loading Skeleton */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-3xl border border-stone-200 p-5 space-y-4 animate-pulse"
                  >
                    <div className="w-full h-52 bg-stone-100 rounded-2xl" />
                    <div className="h-4 bg-stone-100 rounded-md w-3/4" />
                    <div className="h-10 bg-stone-100 rounded-2xl w-full" />
                  </div>
                ))}
              </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-stone-200/90 p-12 text-center max-w-lg mx-auto space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Store className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-xl font-bold text-forest-950">No Listings Found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We couldn't find any marketplace product matching your search criteria. Try choosing another platform or clearing your search keywords.
            </p>
            <button
              onClick={() => {
                setSelectedPlatform('ALL');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 bg-forest-950 text-gold-400 font-bold text-xs rounded-2xl shadow-sm hover:bg-forest-900 transition cursor-pointer"
            >
              Show All Marketplace Listings
            </button>
          </div>
          ) : (
          /* ============================================================== */
          /* MAPPED PRODUCT CARDS GRID (Pure Clean Artwork, No Overlays)    */
          /* ============================================================== */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-5 sm:gap-6">
            {filteredItems.map(({ marketplace, link }) => {
              const visuals = getPlatformVisuals(marketplace.code, marketplace.brandColor);

              // Match store product dynamically for image or slug fallback
              const linkedProdId = typeof link.product === 'object' ? link.product?._id : (typeof link.product === 'string' ? link.product : undefined);
              const matchedStoreProduct =
                (typeof link.product === 'object' && link.product) ||
                storeProducts.find((p) =>
                  (linkedProdId && p._id === linkedProdId) ||
                  (link.productSlug && p.slug === link.productSlug) ||
                  (p.sku && link.productSku && p.sku.toLowerCase() === link.productSku.toLowerCase()) ||
                  link.productName.toLowerCase().includes(p.name.toLowerCase()) ||
                  p.name.toLowerCase().includes(link.productName.toLowerCase())
                );

              // Priority order for marketplace card image:
              // 1. Direct marketplace packaging/listing image URL if provided (from Amazon/Meesho)
              // 2. Direct populated product image
              // 3. Matched store product image (live tracking from Admin updates)
              // 4. Botanical fallback product category image
              const resolvedImage =
                link.imageUrl ||
                (typeof link.product === 'object' && (link.product?.images?.[0] || link.product?.thumbnail)) ||
                matchedStoreProduct?.images?.[0] ||
                getFallbackProductImage(link.productName);

              const imageUrl = getFullImageUrl(resolvedImage, link.productName);
              const storeProductSlug =
                (typeof link.product === 'object' && link.product?.slug) ||
                link.productSlug ||
                matchedStoreProduct?.slug;

                  return (
                  <div
                    key={`${marketplace._id}-${link._id}`}
                    className={`bg-white rounded-3xl border border-stone-200/90 p-4 sm:p-5 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden ${visuals.glow}`}
                  >
                    {/* Card Upper Details */}
                    <div className="flex flex-col space-y-3.5">
                      {/* Top Row: Platform Badge + In Stock Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 ${visuals.pillBg}`}>
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: visuals.brandColor }}
                          />
                          <span className="truncate">{marketplace.name}</span>
                        </span>

                        {/* Clean In-Stock Pill */}
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${link.inStock !== false
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                              : 'bg-stone-100 text-stone-600 border border-stone-200'
                            }`}
                      >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${link.inStock !== false ? 'bg-emerald-500' : 'bg-stone-400'
                          }`}
                      />
                      <span>{link.inStock !== false ? 'In Stock' : 'Out of Stock'}</span>
                    </span>
                  </div>

                  {/* Product Image Frame: Clean, Unobstructed Product Bottle Display */}
                  <div className="w-full h-52 sm:h-56 rounded-2xl bg-gradient-to-b from-[#FAF8F5] to-white border border-stone-100 flex items-center justify-center p-4 relative overflow-hidden group-hover:border-stone-200 transition-colors">
                    <img
                      src={imageUrl}
                      alt={link.productName}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = getFallbackProductImage(link.productName);
                      }}
                      className="max-h-full max-w-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                    {/* Content Section: Clean Product Title */ }
                < div className = "pt-1" >
                <h3
                  className="font-serif text-sm sm:text-[15px] font-bold text-forest-950 line-clamp-2 leading-snug min-h-[42px] group-hover:text-forest-800 transition-colors"
                  title={link.productName}
                >
                  {link.productName}
                </h3>
                    </div>
        </div>

    {/* Actions Section: Stacked Cleanly at Bottom */ }
    <div className="pt-4 mt-3 border-t border-stone-100 flex flex-col space-y-2">
      {/* Primary CTA: High-Converting Buy Button with Brand Colors */}
      <button
        type="button"
        onClick={() => handleMarketplaceClick(marketplace._id, link._id, link.url)}
        className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-xs ${visuals.btnBg}`}
      >
        <span>Buy on {marketplace.name}</span>
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      </button>

{/* Secondary CTA: Direct compare on official Novis store if slug exists */ }
{
  storeProductSlug && (
    <button
      type="button"
      onClick={() => onNavigate('product', storeProductSlug)}
      className="w-full py-1.5 px-3 rounded-lg border border-stone-200 text-stone-600 hover:text-forest-950 hover:bg-stone-50 font-bold text-[11px] transition flex items-center justify-center space-x-1 cursor-pointer"
    >
      <ShoppingBag className="w-3 h-3 text-stone-400" />
      <span>Compare on Novis Store</span>
    </button>
  )
}
                  </div >
                </div >
              );
            })}
          </div >
        )}
      </section >

      {/* ============================================================== */}
      {/* 4. VALUE PROPOSITION: MARKETPLACES VS NOVIS DIRECT             */}
      {/* ============================================================== */}
      <section className="w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-10">
        <div className="bg-gradient-to-br from-white via-[#FCFAF7] to-white rounded-3xl p-6 sm:p-10 border border-stone-200/90 shadow-xs space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700 font-mono">
              Transparent Customer Experience
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-black text-forest-950">
              Why Choose Between Marketplaces & Direct Store?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              We empower you to purchase wherever you feel most comfortable. Here is what to expect across different ordering channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Marketplaces Card */}
            <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-forest-950">
                    Buying on Amazon, Meesho, Flipkart & Myntra
                  </h3>
                  <span className="text-[11px] text-slate-500">Maximum convenience & platform rewards</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Utilize Amazon Prime 1-day delivery and Flipkart Assured shipping.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Redeem platform reward coins, SuperCoins, wallet balances & bank card offers.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Unified doorstep tracking alongside your everyday orders.</span>
                </li>
              </ul>
            </div>

            {/* Novis Direct Store Card */}
            <div className="p-6 rounded-3xl bg-forest-950 text-white shadow-md space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gold-400/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center space-x-3 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-gold-400/20 text-gold-300 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-white">
                    Buying Direct on NovisHerbal.com
                  </h3>
                  <span className="text-[11px] text-gold-400/80">Best value, direct Ayurvedic consultation</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-stone-300 relative z-10">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                  <span>Exclusive {comboDiscount}% OFF Super-Saver Combo Packs not always available on external apps.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                  <span>Fresh small batches direct from the source with maximum herbal potency.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                  <span>Complimentary WhatsApp Ayurvedic consultation & customized hair care regimen.</span>
                </li>
              </ul>

              <div className="pt-2 relative z-10">
                <button
                  onClick={() => onNavigate('shop')}
                  className="px-4 py-2 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-forest-950 font-black text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <span>Explore Direct Store Specials</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

{/* ============================================================== */ }
{/* 5. TRUST & AUTHENTICITY ASSURANCE RIBBON                       */ }
{/* ============================================================== */ }
<section className="bg-forest-900/10 border-t border-forest-900/15 py-10">
  <div className="w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
    <div className="flex items-center space-x-3.5">
      <div className="w-12 h-12 rounded-2xl bg-forest-950 text-gold-400 flex items-center justify-center shrink-0 shadow-sm">
        <BadgeCheck className="w-6 h-6" />
      </div>
      <div>
        <h4 className="font-serif text-base font-bold text-forest-950">
          Zero Counterfeit Policy Guaranteed
        </h4>
        <p className="text-xs text-slate-600 mt-0.5">
          Every external marketplace listing on this page is officially registered under Novis Herbal.
        </p>
      </div>
    </div>

    <div className="flex items-center space-x-3">
      <button
        onClick={() => onNavigate('policy', 'aboutUs')}
        className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-forest-950 hover:bg-stone-50 transition shadow-2xs cursor-pointer"
      >
        Learn About Our Formulation
      </button>
      <button
        onClick={() => onNavigate('shop')}
        className="px-4 py-2 bg-forest-950 text-gold-400 rounded-xl text-xs font-black hover:bg-forest-900 transition shadow-sm cursor-pointer"
      >
        Shop All Products
      </button>
    </div>
  </div>
</section>
    </div >
  );
};

export default MarketplacesPage;
