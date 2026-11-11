import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle2, ShoppingBag, ArrowRight, MapPin, Sparkles, MessageSquare, ShieldCheck, Truck, RefreshCw, Heart, Lock } from 'lucide-react';
import type { Product, Review, ReviewMedia } from '../../types';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { getFullImageUrl } from '../../services/api';
import api from '../../services/api';
import { toast } from '../../store/useToastStore';
import { ReviewCard } from '../../components/storefront/ReviewCard';
import { ReviewModal } from '../../components/storefront/ReviewModal';
import { MediaLightbox } from '../../components/storefront/MediaLightbox';
import { ProductImageGallery } from '../../components/storefront/ProductImageGallery';
import { appConfig } from '../../config/appConfig';

interface ProductDetailProps {
  slug?: string;
  onNavigate: (page: string, param?: string) => void;
  onDirectCheckout: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailProps> = ({ slug, onNavigate, onDirectCheckout }) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const activeSlug = slug || routeSlug || 'novise-hair-oil-shampoo-combo';

  const { addItem } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Pincode checker state
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<ReviewMedia | null>(null);

  const inWishlist = product ? isInWishlist(product._id) : false;

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/products/${activeSlug}`);
        if (res.data?.success) {
          setProduct(res.data.product);
          setSelectedImageIndex(0);

          const revRes = await api.get(`/reviews/product/${res.data.product._id}`);
          if (revRes.data?.success) {
            setReviews(revRes.data.reviews);
          }
        }
      } catch (err) {
        console.error('Error fetching product detail:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Listen to live updates from admin without page reload
    const handleLiveSync = () => {
      fetchProduct();
    };
    window.addEventListener('novise:product-updated', handleLiveSync);
    window.addEventListener('novise:review-updated', handleLiveSync);
    return () => {
      window.removeEventListener('novise:product-updated', handleLiveSync);
      window.removeEventListener('novise:review-updated', handleLiveSync);
    };
  }, [activeSlug]);

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.length === 6 && /^\d+$/.test(pincode)) {
      const today = new Date();
      const estDate = new Date(today.setDate(today.getDate() + 3));
      const formatted = estDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      const codNote = appConfig.codFee > 0 ? ` (+₹${appConfig.codFee} COD fee)` : ' (Free COD)';
      const deliveryText = appConfig.estimatedDeliveryText ? ` • ${appConfig.estimatedDeliveryText}` : '';
      setPincodeStatus(`⚡ Available! Guaranteed delivery by ${formatted}${deliveryText}. Cash on Delivery supported${codNote}.`);
    } else {
      setPincodeStatus('Please enter a valid 6-digit Indian pincode.');
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product._id,
      name: product.name,
      price: product.sellingPrice,
      mrp: product.mrp,
      sku: product.sku,
      image: product.images?.[0] || '',
      volumeText: product.volumeText,
      weightGrams: product.weightGrams,
      quantity
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    onDirectCheckout();
  };

  // Find if currently logged in user has already reviewed this product
  const userReview = reviews.find(r => {
    if (!user) return false;
    const rUserId = typeof r.user === 'string' ? r.user : r.user?._id;
    return rUserId === user.id || (r.customerEmail && r.customerEmail.toLowerCase() === user.email.toLowerCase());
  });

  // Put currently logged in user's review first in the grid
  const orderedReviews = userReview
    ? [userReview, ...reviews.filter(r => r._id !== userReview._id)]
    : reviews;

  const handleOpenReviewModal = () => {
    if (!isAuthenticated) {
      toast.warning('Please log in with your email to write a verified customer review', 'Login Required');
      setIsLoginPromptOpen(true);
      return;
    }
    if (userReview) {
      toast.info('You have already reviewed this product. You can edit your existing review.', 'Review Exists');
      return;
    }
    setEditingReview(null);
    setIsReviewModalOpen(true);
  };

  const handleEditReview = (rev: Review) => {
    if ((rev.editCount || 0) >= 1) {
      toast.warning('This review has already been edited once. Further edits are not permitted.', 'Edit Limit Reached');
      return;
    }
    setEditingReview(rev);
    setIsReviewModalOpen(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete your review? After deleting, you can write a fresh new review.')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => r._id !== reviewId));
      toast.info('Your review has been removed. You can now write a fresh review.', 'Review Removed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete review', 'Delete Error');
    }
  };

  const handleSubmitReviewSuccess = (savedReview: Review, isEdit: boolean) => {
    if (isEdit) {
      setReviews(prev => prev.map(r => r._id === savedReview._id ? savedReview : r));
    } else {
      setReviews(prev => [savedReview, ...prev]);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full px-3.5 sm:px-6 lg:px-10 py-20 text-center">
        <div className="w-12 h-12 border-4 border-forest-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full px-3.5 sm:px-6 lg:px-10 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-800">Product Not Found</h2>
        <button
          onClick={() => onNavigate('shop')}
          className="mt-4 px-6 py-2.5 bg-forest-900 text-gold-400 font-bold rounded-xl text-xs"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  const discount = product.discountPercent || Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100);

  return (
    <div className="py-4 sm:py-10 pb-24 lg:pb-14">
      <div className="w-full px-3.5 sm:px-6 lg:px-10">

        {/* Breadcrumb */}
        <div className="text-[11px] sm:text-xs text-slate-400 mb-4 sm:mb-8 flex items-center space-x-2 font-medium overflow-x-auto no-scrollbar">
          <button onClick={() => onNavigate('home')} className="hover:text-forest-900 transition shrink-0">Home</button>
          <span>/</span>
          <button onClick={() => onNavigate('shop')} className="hover:text-forest-900 transition shrink-0">Products</button>
          <span>/</span>
          <span className="text-forest-950 font-bold truncate max-w-xs">{product.name}</span>
        </div>

        {/* 2-Column Product Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-14">

          {/* Left Gallery (6 cols) */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            <ProductImageGallery
              images={product.images || []}
              productName={product.name}
              discountPercent={discount}
              volumeText={product.volumeText}
              isInWishlist={inWishlist}
              onToggleWishlist={() => product && toggleWishlist(product)}
            />

            {/* Quick Guarantees Box */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1 sm:pt-2 text-center text-xs">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/70">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-forest-900 mx-auto mb-1" />
                <span className="font-bold text-slate-800 text-[10px] sm:text-[11px] block">
                  {appConfig.freeShippingThreshold > 0 ? `Free Over ₹${appConfig.freeShippingThreshold}` : 'Free Express Shipping'}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400">{appConfig.estimatedDeliveryText || 'All India'}</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/70">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-forest-900 mx-auto mb-1" />
                <span className="font-bold text-slate-800 text-[10px] sm:text-[11px] block">100% Ayurvedic</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400">Ayush Certified</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/70">
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-forest-900 mx-auto mb-1" />
                <span className="font-bold text-slate-800 text-[10px] sm:text-[11px] block">Cash on Delivery</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400">{appConfig.codFee > 0 ? `+₹${appConfig.codFee} COD Fee` : 'Pay at Doorstep'}</span>
              </div>
            </div>

          </div>

          {/* Right Product Details (6 cols) */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6">

            <div>
              <div className="flex items-center space-x-2 mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-forest-900/10 text-forest-900 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
                  {product.isCombo ? 'Super Saver Combo' : '100% Botanical Actives'}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-400 font-mono">SKU: {product.sku}</span>
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl font-extrabold text-forest-950 leading-tight">
                {product.name}
              </h1>

              {/* Ratings */}
              <div className="flex items-center space-x-2 mt-2 sm:mt-3">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                  ))}
                </div>
                <span className="text-xs font-extrabold text-slate-900">{product.averageRating || 4.9}</span>
                <span className="text-xs text-slate-400">({product.numReviews || 120} Customer Reviews)</span>
              </div>
            </div>

            {/* Pricing Box */}
            <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-1.5 sm:space-y-2">
              <div className="flex items-baseline space-x-2.5 sm:space-x-3">
                <span className="text-2xl sm:text-4xl font-extrabold text-forest-950">₹{product.sellingPrice}</span>
                {product.mrp > product.sellingPrice && (
                  <span className="text-sm sm:text-base text-slate-400 line-through">MRP ₹{product.mrp}</span>
                )}
                {discount > 0 && (
                  <span className="text-[10px] sm:text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-emerald-200">
                    Save ₹{product.mrp - product.sellingPrice} ({discount}% OFF)
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Taxes included • {appConfig.freeShippingThreshold > 0 ? `Free shipping on orders above ₹${appConfig.freeShippingThreshold}` : 'Free Express Shipping All India'}
              </p>
            </div>

            {/* Short Description */}
            {product.shortDescription && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {product.shortDescription}
              </p>
            )}

            {/* Quantity Selector and CTA Buttons */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-4">
                <span className="text-xs font-bold text-slate-800">Quantity:</span>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3.5 py-2 hover:bg-slate-100 text-slate-700 font-extrabold transition"
                  >
                    -
                  </button>
                  <span className="px-5 py-2 text-xs font-bold text-slate-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3.5 py-2 hover:bg-slate-100 text-slate-700 font-extrabold transition"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3.5">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-4 bg-forest-950 text-gold-400 hover:bg-forest-900 font-extrabold text-xs tracking-wider uppercase rounded-xl transition shadow-md shadow-forest-950/15 flex items-center justify-center space-x-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Bag</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 py-4 bg-gold-500 text-forest-950 hover:bg-gold-600 font-extrabold text-xs tracking-wider uppercase rounded-xl transition shadow-glow-gold flex items-center justify-center space-x-2"
                >
                  <span>BUY NOW • COD</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => product && toggleWishlist(product)}
                  className={`px-4 py-4 rounded-xl border transition flex items-center justify-center shrink-0 ${inWishlist
                    ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-forest-900'
                    }`}
                  title={inWishlist ? "Saved in Wishlist" : "Save to Wishlist"}
                >
                  <Heart className={`w-5 h-5 ${inWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Delivery Pincode Checker */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-900">
                <MapPin className="w-4 h-4 text-forest-900" />
                <span>Check Delivery & Cash on Delivery Serviceability</span>
              </div>
              <form onSubmit={handleCheckPincode} className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit Pincode"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-forest-900 font-mono"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-black transition"
                >
                  Check
                </button>
              </form>
              {pincodeStatus && (
                <p className="text-[11px] font-bold text-emerald-800 mt-1">
                  {pincodeStatus}
                </p>
              )}
            </div>

            {/* Key Clinical Benefits */}
            {product.benefits && product.benefits.length > 0 && (
              <div className="p-5 rounded-2xl bg-cream-200/60 border border-slate-200/60 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest-950 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                  <span>Clinical & Ayurvedic Highlights</span>
                </h4>
                <div className="space-y-2">
                  {product.benefits.map((b, i) => (
                    <div key={i} className="flex items-start space-x-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-forest-900 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Deep Details: Ingredients & Rituals */}
        <div className="mt-10 sm:mt-20 pt-8 sm:pt-12 border-t border-slate-200/80 space-y-8 sm:space-y-12">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">

            {/* Actives */}
            {product.ingredients && product.ingredients.length > 0 && (
              <div className="luxury-card p-4 sm:p-8 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4">
                <h3 className="font-serif text-lg sm:text-2xl font-bold text-forest-950">
                  Key Botanical Actives
                </h3>
                <p className="text-xs text-slate-500">
                  Crafted with 100% genuine Ayurvedic extracts without synthetic dilution:
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                  {product.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="bg-forest-900/10 text-forest-950 border border-forest-900/15 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold"
                    >
                      🌿 {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* How to Use */}
            {product.howToUse && product.howToUse.length > 0 && (
              <div className="luxury-card p-4 sm:p-8 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4">
                <h3 className="font-serif text-lg sm:text-2xl font-bold text-forest-950">
                  How to Use for Optimal Results
                </h3>
                <div className="space-y-2.5 sm:space-y-3">
                  {product.howToUse.map((step, i) => (
                    <div key={i} className="flex items-start space-x-2.5 sm:space-x-3 text-xs text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-gold-500/20 text-gold-700 font-extrabold flex items-center justify-center shrink-0 text-[10px]">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Customer Reviews Section on Product Detail */}
          <div className="bg-white p-4 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-100">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest-950">
                  Customer Reviews ({reviews.length})
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-800">{product.averageRating || 5.0} out of 5</span>
                  <span className="text-[10px] text-slate-400 font-mono">• {reviews.length} ratings</span>
                </div>
              </div>

              {/* Action Button: Write or Review Status */}
              {userReview ? (
                <div className="self-start sm:self-auto flex items-center space-x-2">
                  <span className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-bold border border-emerald-200/80 flex items-center space-x-1.5 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>You Reviewed This Product</span>
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleOpenReviewModal}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 bg-forest-950 text-gold-400 font-bold text-xs rounded-xl hover:bg-forest-900 transition flex items-center space-x-1.5 self-start sm:self-auto shadow-md shadow-forest-950/10"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Write a Review</span>
                </button>
              )}
            </div>

            {/* Unified Reviews Grid (Desktop 3-4 columns, Mobile box cards) */}
            <div>
              {orderedReviews.length === 0 ? (
                <div className="text-center py-12 px-4 bg-[#FAF8F5] rounded-2xl border border-dashed border-slate-200">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No customer reviews yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">Be the first to share your honest botanical experience!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {orderedReviews.map((rev) => {
                    const isOwner = rev._id === userReview?._id;
                    return (
                      <ReviewCard
                        key={rev._id}
                        review={rev}
                        isOwner={isOwner}
                        onEdit={handleEditReview}
                        onDelete={handleDeleteReview}
                        onOpenMedia={(m) => setLightboxMedia(m)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modern Review Modal */}
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          user={user}
          productId={product._id}
          productName={product.name}
          existingReview={editingReview}
          onSubmitSuccess={handleSubmitReviewSuccess}
        />

        {/* Media Lightbox Viewer */}
        <MediaLightbox
          media={lightboxMedia}
          onClose={() => setLightboxMedia(null)}
        />

        {/* Login Required Modal for Review */}
        {isLoginPromptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsLoginPromptOpen(false)} />
            <div className="relative bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl z-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-forest-900/10 text-forest-900 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-forest-950">
                Customer Sign In Required
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Only verified Novise customers can submit product reviews to keep our ratings 100% genuine and spam-free.
              </p>
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                    setIsLoginPromptOpen(false);
                    onNavigate('login');
                  }}
                  className="w-full py-3 bg-forest-900 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-forest-800 transition shadow-md shadow-forest-900/10"
                >
                  Sign In / Create Account
                </button>
                <button
                  onClick={() => setIsLoginPromptOpen(false)}
                  className="w-full py-2.5 text-xs text-slate-500 font-semibold hover:text-slate-800"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Mobile Purchase Bar (Always visible on phones) */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 lg:hidden shadow-[0_-4px_25px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg font-extrabold text-forest-950">₹{product.sellingPrice}</span>
                {product.mrp > product.sellingPrice && (
                  <span className="text-[11px] text-slate-400 line-through">₹{product.mrp}</span>
                )}
              </div>
              <span className="text-[10px] text-emerald-700 font-bold block">
                Shipping Available in All India
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => product && toggleWishlist(product)}
                className={`p-2.5 rounded-xl border transition shrink-0 ${inWishlist
                  ? 'bg-rose-50 border-rose-300 text-rose-600'
                  : 'bg-white border-slate-200 text-slate-600'
                  }`}
                title={inWishlist ? "Saved in Wishlist" : "Save to Wishlist"}
              >
                <Heart className={`w-4 h-4 ${inWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
              <button
                onClick={handleAddToCart}
                className="px-3 py-2.5 bg-forest-950 text-gold-400 font-extrabold text-[11px] uppercase tracking-wider rounded-xl flex items-center space-x-1 shadow-sm shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
              <button
                onClick={handleBuyNow}
                className="px-3 py-2.5 bg-gold-500 text-forest-950 font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-glow-gold shrink-0"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
