import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  Star,
  CheckCircle,
  Truck,
  Heart,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play
} from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useCMSStore } from '../../store/useCMSStore';
import api, { getFullImageUrl, getFallbackProductImage } from '../../services/api';
import type { Product } from '../../types';

interface HeroProps {
  onNavigate: (page: string, param?: string) => void;
  products?: Product[];
}

export const HeroSlider: React.FC<HeroProps> = ({ onNavigate, products: propProducts }) => {
  const { addItem } = useCartStore();
  const { cms, fetchCMS } = useCMSStore();
  const [liveProducts, setLiveProducts] = useState<Product[]>(propProducts || []);

  useEffect(() => {
    if (!cms) {
      fetchCMS();
    }
  }, [cms, fetchCMS]);

  useEffect(() => {
    const refreshLiveProducts = () => {
      api.get('/products')
        .then((res) => {
          if (res.data?.success && res.data.products?.length > 0) {
            setLiveProducts(res.data.products);
          }
        })
        .catch(console.error);
    };

    if (propProducts && propProducts.length > 0) {
      setLiveProducts(propProducts);
    } else {
      refreshLiveProducts();
    }

    window.addEventListener('novise:product-updated', refreshLiveProducts);
    return () => {
      window.removeEventListener('novise:product-updated', refreshLiveProducts);
    };
  }, [propProducts]);

  // Match live product from DB
  const comboDb = liveProducts.find(p => p.isCombo || p.slug.includes('combo') || p.sku.includes('CMB') || p.name.toLowerCase().includes('combo'));
  const shampooDb = liveProducts.find(p => !p.isCombo && (p.slug.includes('shampoo') || p.name.toLowerCase().includes('shampoo') || p.sku.includes('SHM')));
  const oilDb = liveProducts.find(p => !p.isCombo && (p.slug.includes('oil') || p.name.toLowerCase().includes('oil') || p.sku.includes('OIL')));

  // Helper to compute discount
  const getProductDiscount = (mrp: number, price: number, percent?: number) => {
    if (percent && percent > 0) return percent;
    if (mrp > price && mrp > 0) return Math.round(((mrp - price) / mrp) * 100);
    return 0;
  };

  const comboMrp = comboDb?.mrp ?? 1399;
  const comboPrice = comboDb?.sellingPrice ?? 599;
  const comboDisc = getProductDiscount(comboMrp, comboPrice, comboDb?.discountPercent);

  const shampooMrp = shampooDb?.mrp ?? 599;
  const shampooPrice = shampooDb?.sellingPrice ?? 350;
  const shampooDisc = getProductDiscount(shampooMrp, shampooPrice, shampooDb?.discountPercent);

  const oilMrp = oilDb?.mrp ?? 799;
  const oilPrice = oilDb?.sellingPrice ?? 399;
  const oilDisc = getProductDiscount(oilMrp, oilPrice, oilDb?.discountPercent);

  const getSafeImage = (customUrl?: string, productFallback?: string, absoluteCloudinary?: string) => {
    if (customUrl && customUrl.trim() && !customUrl.startsWith('/uploads/')) {
      return getFullImageUrl(customUrl);
    }
    if (productFallback && productFallback.startsWith('http')) {
      return productFallback;
    }
    return absoluteCloudinary || 'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361823/NOVISE_HERBAL/products/novise_combo_1.jpg';
  };

  // Derive active CMS slides (or use default 3 flagship products if empty)
  const activeCmsSlides = (cms?.heroSlides && cms.heroSlides.length > 0)
    ? cms.heroSlides.filter(s => s.isActive !== false)
    : [];

  const defaultHeroSlides = [
    {
      title: 'The Complete Hair & Scalp Restoration Ritual',
      subtitle: 'Overnight root strengthening with Ayurvedic Growth Oil + Morning anti-fungal clarifying shampoo. Save instantly on our best-selling synergistic kit.',
      buttonText: 'CLAIM OFFER (ADD TO BAG)',
      buttonLink: '/shop',
      badge: 'Flat 57% OFF on Combos',
      imageUrl: 'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361823/NOVISE_HERBAL/products/novise_combo_1.jpg'
    },
    {
      title: 'Scalp Clarifying Anti-Dandruff & Itch Relief Shampoo',
      subtitle: 'Targeted anti-fungal formula combining Ketoconazole 1%, Australian Tea Tree Oil & Salicylic Acid. Gently exfoliates without stripping natural hair moisture.',
      buttonText: 'CLAIM OFFER (ADD TO BAG)',
      buttonLink: '/product/novise-anti-dandruff-shampoo',
      badge: 'Dermatologically Tested',
      imageUrl: 'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361817/NOVISE_HERBAL/products/novise_shampoo_1.jpg'
    },
    {
      title: 'Clinically Formulated 14-Day Hair Fall Control Oil',
      subtitle: 'Crafted with 18 sacred Ayurvedic botanicals including Rosemary Oil, Redensyl, and Bhringraj to awaken dormant follicles and boost new dense hair growth.',
      buttonText: 'CLAIM OFFER (ADD TO BAG)',
      buttonLink: '/product/novise-ayurvedic-hair-growth-oil',
      badge: '100% Natural Formulation',
      imageUrl: 'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361811/NOVISE_HERBAL/products/novise_hair_oil_1.jpg'
    }
  ];

  const slidesToRender = activeCmsSlides.length > 0 ? activeCmsSlides : defaultHeroSlides;

  // Dynamically map each CMS slide to a rich interactive hero product card
  const heroProducts = slidesToRender.map((slide, idx) => {
    let matchedProduct: Product | undefined = undefined;

    // 1. Match by explicit productId saved in CMS
    if ((slide as any).productId) {
      matchedProduct = liveProducts.find(p => String(p._id) === String((slide as any).productId));
    }

    // 2. Match by explicit productSlug
    if (!matchedProduct && (slide as any).productSlug) {
      matchedProduct = liveProducts.find(p => p.slug === (slide as any).productSlug);
    }

    // 3. Match by buttonLink (/product/:slug)
    if (!matchedProduct && slide.buttonLink && slide.buttonLink.includes('/product/')) {
      const slug = slide.buttonLink.split('/product/')[1]?.split(/[?#]/)[0]?.trim();
      if (slug) {
        matchedProduct = liveProducts.find(p => p.slug === slug);
      }
    }

    // 4. Fallback keyword matching
    if (!matchedProduct) {
      const linkOrTitle = `${slide.buttonLink || ''} ${slide.title || ''}`.toLowerCase();
      if (linkOrTitle.includes('combo')) {
        matchedProduct = comboDb;
      } else if (linkOrTitle.includes('shampoo') || linkOrTitle.includes('dandruff')) {
        matchedProduct = shampooDb;
      } else if (linkOrTitle.includes('oil') || linkOrTitle.includes('hair-fall') || linkOrTitle.includes('growth')) {
        matchedProduct = oilDb;
      }
    }

    // 5. Default fallback to flagship products
    if (!matchedProduct) {
      matchedProduct = idx === 0 ? comboDb : (idx === 1 ? shampooDb : (idx === 2 ? oilDb : (liveProducts[idx % liveProducts.length] || comboDb)));
    }

    const mrp = matchedProduct?.mrp ?? (idx === 0 ? 1399 : (idx === 1 ? 599 : (idx === 2 ? 799 : 999)));
    const price = matchedProduct?.sellingPrice ?? (idx === 0 ? 599 : (idx === 1 ? 350 : (idx === 2 ? 399 : 499)));
    const disc = getProductDiscount(mrp, price, matchedProduct?.discountPercent);

    // Dynamic Tab Label
    let tabTitle = `Slide ${idx + 1}`;
    if (matchedProduct?.isCombo || (matchedProduct?.name && matchedProduct.name.toLowerCase().includes('combo'))) {
      tabTitle = 'Complete Combo Kit';
    } else if (matchedProduct?.name && matchedProduct.name.toLowerCase().includes('shampoo')) {
      tabTitle = 'Anti-Dandruff Shampoo';
    } else if (matchedProduct?.name && matchedProduct.name.toLowerCase().includes('oil')) {
      tabTitle = 'Ayurvedic Hair Growth Oil';
    } else if (matchedProduct?.name) {
      tabTitle = matchedProduct.name.length > 24 ? `${matchedProduct.name.slice(0, 22)}...` : matchedProduct.name;
    } else if (slide.badge) {
      tabTitle = slide.badge;
    } else if (slide.title) {
      tabTitle = slide.title.length > 22 ? `${slide.title.slice(0, 20)}...` : slide.title;
    }

    const tabLabel = `${idx + 1}. ${tabTitle}`;
    const discountBadge = disc > 0 ? `${disc}% OFF` : (slide.badge || 'OFFER');

    const defaultImg = idx === 0
      ? 'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361823/NOVISE_HERBAL/products/novise_combo_1.jpg'
      : (idx === 1
        ? 'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361817/NOVISE_HERBAL/products/novise_shampoo_1.jpg'
        : 'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361811/NOVISE_HERBAL/products/novise_hair_oil_1.jpg');

    return {
      id: matchedProduct?._id || `slide-${idx}`,
      sku: matchedProduct?.sku || (idx === 0 ? 'NOV-CMB-001' : (idx === 1 ? 'NOV-SHM-250' : 'NOV-OIL-200')),
      slug: matchedProduct?.slug || 'novise-hair-oil-shampoo-combo',
      tag: slide.badge || (disc > 0 ? `${disc}% OFF • BOTANICAL AYURVEDA` : 'BOTANICAL AYURVEDA'),
      tabLabel,
      discountBadge,
      title: slide.title || matchedProduct?.name || 'Pure Botanical Scalp & Hair Care',
      subtitle: slide.subtitle || matchedProduct?.shortDescription || 'Synergistic botanical actives to arrest hair fall and eliminate stubborn flakes.',
      mrp,
      price,
      discountPercent: disc,
      discountText: disc > 0 ? `Save ₹${mrp - price} (${disc}% OFF)` : '',
      volume: matchedProduct?.volumeText || (idx === 0 ? '200 ML Oil + 250 ML Shampoo' : (idx === 1 ? '250 ML Bottle' : '200 ML Precision Dropper')),
      image: getSafeImage(slide.imageUrl, matchedProduct?.images?.[0], defaultImg),
      rating: matchedProduct?.averageRating ? matchedProduct.averageRating.toFixed(1) : '4.9',
      reviews: matchedProduct?.numReviews ? `${matchedProduct.numReviews}+` : '280+',
      highlights: (matchedProduct?.benefits && matchedProduct.benefits.length > 0) ? matchedProduct.benefits.slice(0, 3) : ['100% Cold-Pressed Ayurvedic Herbs', 'Visible Results in 14 Days', 'Zero Sulfates & Harsh Chemicals'],
      badgeFloat1: slide.badge ? `✨ ${slide.badge}` : '✨ 100% Pure Botanical Ayurveda',
      badgeFloat2: '🛡️ Clinically Proven Results',
      buttonText: slide.buttonText || 'CLAIM OFFER (ADD TO BAG)',
      buttonLink: slide.buttonLink || '/shop'
    };
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const safeIndex = activeIndex >= heroProducts.length ? 0 : activeIndex;
  const current = heroProducts[safeIndex] || heroProducts[0];

  // Automatic swap every 5 seconds (5000ms)
  useEffect(() => {
    if (isPaused || heroProducts.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroProducts.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [activeIndex, isPaused, heroProducts.length]);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % heroProducts.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + heroProducts.length) % heroProducts.length);
  };

  const handleQuickAdd = () => {
    addItem({
      productId: current.id,
      name: current.title,
      price: current.price,
      mrp: current.mrp,
      sku: current.sku,
      image: current.image,
      volumeText: current.volume
    });
  };

  // If CMS section visibility hides hero slider, honor it
  if (cms?.sectionVisibility?.showHeroSlider === false) {
    return null;
  }

  return (
    <section className="relative overflow-hidden forest-hero-bg text-white border-b border-forest-900/60 select-none">

      {/* Background ambient lighting effects */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Desktop Prev / Next Navigation Arrows */}
      <button
        onClick={prevSlide}
        aria-label="Previous Hero Product"
        className="hidden md:flex absolute left-3 lg:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-forest-900/70 hover:bg-gold-500 hover:text-forest-950 text-white border border-white/20 transition-all shadow-xl backdrop-blur-md group"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
      </button>

      <button
        onClick={nextSlide}
        aria-label="Next Hero Product"
        className="hidden md:flex absolute right-3 lg:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-forest-900/70 hover:bg-gold-500 hover:text-forest-950 text-white border border-white/20 transition-all shadow-xl backdrop-blur-md group"
      >
        <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
      </button>

      <div className="w-full max-w-full overflow-hidden px-3.5 sm:px-6 lg:px-14 py-6 sm:py-10 lg:py-14 relative z-10">

        {/* Hero Grid: Left Content + Right Product Showcase */}
        <div
          key={current.id}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-14 items-center w-full min-w-0 animate-hero-slide"
        >

          {/* Right Column on Desktop, Top on Mobile: Product Presentation */}
          <div className="lg:col-span-5 order-1 lg:order-2 relative flex flex-col items-center justify-center w-full min-w-0 overflow-hidden">

            {/* Ambient circular glow background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-gold-500/20 to-emerald-500/20 rounded-full blur-3xl transform scale-90" />

            {/* Product Centerpiece */}
            <div className="relative w-full max-w-[320px] sm:max-w-md aspect-[4/3.6] sm:aspect-square rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-gold-500/40 shadow-2xl bg-forest-900 group">
              <img
                src={getFullImageUrl(current.image)}
                alt={current.title}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = getFallbackProductImage(current.slug || current.sku || current.id || current.title);
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Bottom tag on image */}
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 flex justify-between items-center text-[11px] sm:text-xs">
                <span className="bg-forest-950/90 backdrop-blur-md text-gold-400 font-bold px-2.5 sm:px-3 py-1 rounded-full border border-gold-500/30">
                  {current.volume}
                </span>
                <span className="bg-emerald-600 text-white font-extrabold px-2.5 sm:px-3 py-1 rounded-full shadow">
                  IN STOCK
                </span>
              </div>
            </div>

            {/* Mobile Metric Badges strip */}
            <div className="flex sm:hidden flex-wrap items-center justify-center gap-1.5 mt-2.5 w-full">
              <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold px-2.5 py-1 rounded-full">
                {current.badgeFloat1}
              </span>
              <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold px-2.5 py-1 rounded-full">
                {current.badgeFloat2}
              </span>
            </div>

            {/* Desktop Floating Metric Badge 1 (Top Left) */}
            <div className="hidden sm:flex absolute top-2 left-2 bg-white/95 backdrop-blur-md text-forest-950 px-3.5 py-2 rounded-2xl shadow-xl border border-white/40 items-center space-x-2 text-xs font-bold animate-float">
              <span className="text-sm">✨</span>
              <span>{current.badgeFloat1}</span>
            </div>

            {/* Desktop Floating Metric Badge 2 (Bottom Right) */}
            <div className="hidden sm:flex absolute bottom-2 right-2 bg-white/95 backdrop-blur-md text-forest-950 px-3.5 py-2 rounded-2xl shadow-xl border border-white/40 items-center space-x-2 text-xs font-bold animate-float" style={{ animationDelay: '2s' }}>
              <span className="text-sm">🛡️</span>
              <span>{current.badgeFloat2}</span>
            </div>

          </div>

          {/* Left Column (Editorial Content & CTAs) */}
          <div className="lg:col-span-7 order-2 lg:order-1 space-y-3.5 sm:space-y-6 w-full min-w-0">

            {/* Pill Tag */}
            <div className="inline-flex items-center space-x-2 bg-gold-500/20 text-gold-400 border border-gold-500/40 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-gold-300" />
              <span>{current.tag}</span>
            </div>

            {/* Main Title */}
            <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.18] sm:leading-[1.12] text-white">
              {current.title}
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-base text-slate-300 leading-relaxed font-normal">
              {current.subtitle}
            </p>

            {/* Highlights checkmarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-1 text-xs text-slate-200">
              {current.highlights.map((h, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold-400 shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>

            {/* Pricing Box & Savings Strip */}
            <div className="p-3.5 sm:p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex flex-wrap items-center justify-between gap-3 sm:gap-4 max-w-xl">
              <div>
                <div className="flex items-baseline space-x-2 sm:space-x-3">
                  <span className="text-2xl sm:text-4xl font-extrabold text-white">₹{current.price}</span>
                  <span className="text-sm sm:text-lg text-slate-400 line-through">₹{current.mrp}</span>
                  <span className="text-[10px] sm:text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                    {current.discountText}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                  Package: <strong className="text-slate-200">{current.volume}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-amber-400 bg-amber-400/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-amber-400/20">
                <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                <span className="font-bold text-white">{current.rating}</span>
                <span className="text-slate-400 text-[11px]">({current.reviews})</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5 pt-1 sm:pt-2">
              <button
                onClick={handleQuickAdd}
                className="w-full sm:w-auto px-6 sm:px-7 py-3.5 sm:py-4 bg-gold-500 hover:bg-gold-600 text-forest-950 font-extrabold text-xs sm:text-sm tracking-wider uppercase rounded-xl transition shadow-glow-gold flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{current.buttonText || 'CLAIM OFFER (ADD TO BAG)'}</span>
              </button>

              <button
                onClick={() => onNavigate('product', current.slug)}
                className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl transition border border-white/15 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>View Full Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Micro guarantees */}
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-6 pt-2 text-[10px] sm:text-[11px] text-slate-400 border-t border-white/10">
              <span className="flex items-center space-x-1">
                <Truck className="w-3.5 h-3.5 text-gold-400" />
                <span>Shipping Available in All India</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
                <span>Cash on Delivery</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center space-x-1">
                <Heart className="w-3.5 h-3.5 text-gold-400" />
                <span>All India Delivery</span>
              </span>
            </div>

          </div>

        </div>

        {/* Bottom Carousel Controls: 3 Dots Indicators + 3-Second Countdown / Toggle */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 sm:mt-10 pt-4 border-t border-white/10">

          {/* Mobile Navigation Arrows */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={prevSlide}
              aria-label="Previous Slide"
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next Slide"
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 3 Interactive Dots with 3-Second Fill Indicator */}
          <div className="flex items-center space-x-2.5">
            {heroProducts.map((p, idx) => {
              const isActive = activeIndex === idx;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Go to ${p.tabLabel}`}
                  className={`h-2.5 rounded-full transition-all relative overflow-hidden ${isActive
                    ? 'w-10 sm:w-14 bg-gold-500 shadow-glow-gold'
                    : 'w-3 bg-white/25 hover:bg-white/50'
                    }`}
                >
                  {isActive && (
                    <span
                      key={`dot-progress-${activeIndex}-${isPaused ? 'paused' : 'running'}`}
                      className={`absolute inset-0 bg-white/70 ${isPaused ? 'w-full' : 'animate-swap-progress'}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* 5s Auto-Swap Live Status & Pause/Play Control */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 transition"
            title={isPaused ? "Click to resume 5-second auto rotation" : "Click to pause rotation"}
          >
            {isPaused ? (
              <>
                <Play className="w-3 h-3 text-gold-400 fill-current" />
                <span>Paused (Click to Resume 5s Swap)</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 text-gold-400" />
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>5s Auto-Swap Active</span>
                </span>
              </>
            )}
          </button>

        </div>

      </div>
    </section>
  );
};
