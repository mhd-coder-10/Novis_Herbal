import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  Check,
  X,
  MessageSquare,
  Trash2,
  Eye,
  ArrowLeft,
  ShieldCheck,
  Image as ImageIcon,
  Video,
  Play,
  CheckCircle2,
  Clock,
  Package,
  User,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  EyeOff
} from 'lucide-react';
import api, { getFullImageUrl } from '../../services/api';
import { toast } from '../../store/useToastStore';
import { AdminPagination } from '../../components/common/AdminPagination';
import { AdminConfirmModal } from '../../components/common/AdminConfirmModal';
import { MediaLightbox } from '../../components/storefront/MediaLightbox';
import { Review, ReviewMedia } from '../../types';
import { emitLiveEvent } from '../../services/realtimeSync';

export const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reviewToDelete, setReviewToDelete] = useState<{ id: string; reviewerName: string } | null>(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);

  // Dedicated Full-Page View State
  const [selectedReview, setSelectedReview] = useState<any | null>(null);

  // Lightbox Media Viewer State
  const [lightboxMedia, setLightboxMedia] = useState<ReviewMedia | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'hidden'>('all');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'with-media'>('all');

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/reviews/admin/all');
      if (res.data?.success) {
        setReviews(res.data.reviews || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load customer reviews', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Helper to extract combined media (media array + legacy images array)
  const getReviewMediaList = (r: any): ReviewMedia[] => {
    if (!r) return [];
    const list: ReviewMedia[] = [
      ...(r.media || []),
      ...(r.images || [])
        .filter((img: string) => !(r.media || []).some((m: any) => m.url === img))
        .map((url: string) => ({ url, type: 'image' as const }))
    ];
    return list;
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await api.put(`/reviews/admin/${id}/toggle`);
      if (res.data?.success) {
        const newStatus = res.data.isApproved;
        setReviews(prev => prev.map(r => r._id === id ? { ...r, isApproved: newStatus } : r));
        if (selectedReview && selectedReview._id === id) {
          setSelectedReview((prev: any) => prev ? { ...prev, isApproved: newStatus } : null);
        }
        toast.success(
          newStatus ? 'Review approved & published to store' : 'Review hidden from store',
          'Review Moderation'
        );
        emitLiveEvent('REVIEW_UPDATED', { reviewId: id, isApproved: newStatus });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update review status', 'Moderation Error');
    }
  };

  const handleDeleteReview = (id: string, reviewerName: string) => {
    setReviewToDelete({ id, reviewerName });
  };

  const handleConfirmDeleteReview = async () => {
    if (!reviewToDelete) return;
    setIsDeletingReview(true);
    try {
      const res = await api.delete(`/reviews/${reviewToDelete.id}`);
      if (res.data?.success) {
        toast.success('Review permanently deleted', 'Review Removed');
        setReviews(prev => prev.filter(r => r._id !== reviewToDelete.id));
        if (selectedReview && selectedReview._id === reviewToDelete.id) {
          setSelectedReview(null);
        }
        emitLiveEvent('REVIEW_UPDATED', { reviewId: reviewToDelete.id, action: 'delete' });
        setReviewToDelete(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete review', 'Delete Error');
    } finally {
      setIsDeletingReview(false);
    }
  };

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const customer = (r.customerName || '').toLowerCase();
        const email = (r.customerEmail || '').toLowerCase();
        const product = (r.product?.name || '').toLowerCase();
        const title = (r.title || '').toLowerCase();
        const comment = (r.comment || '').toLowerCase();
        if (!customer.includes(q) && !email.includes(q) && !product.includes(q) && !title.includes(q) && !comment.includes(q)) {
          return false;
        }
      }

      // Status
      if (statusFilter === 'approved' && !r.isApproved) return false;
      if (statusFilter === 'hidden' && r.isApproved) return false;

      // Rating
      if (ratingFilter !== 'all' && r.rating !== ratingFilter) return false;

      // Media
      if (mediaFilter === 'with-media') {
        const media = getReviewMediaList(r);
        if (media.length === 0) return false;
      }

      return true;
    });
  }, [reviews, searchQuery, statusFilter, ratingFilter, mediaFilter]);

  // Paginated reviews
  const paginatedReviews = useMemo(() => {
    return filteredReviews.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredReviews, currentPage, pageSize]);

  // Quick Metrics
  const metrics = useMemo(() => {
    const total = reviews.length;
    const approved = reviews.filter(r => r.isApproved).length;
    const hidden = total - approved;
    const withMedia = reviews.filter(r => getReviewMediaList(r).length > 0).length;
    const avgRating = total > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / total).toFixed(1) : '0.0';
    return { total, approved, hidden, withMedia, avgRating };
  }, [reviews]);

  return (
    <div className="space-y-6 w-full">
      {!selectedReview ? (
        /* ====================================================================
           REVIEWS DIRECTORY VIEW: METRICS, FILTERS & TABLE
           ==================================================================== */
        <div className="space-y-6 animate-fadeIn pb-12">
          {/* Top Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-gold-600 font-bold text-xs uppercase tracking-wider mb-1">
                <MessageSquare className="w-4 h-4" />
                <span>Product Feedback & Ratings</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-black text-forest-950">
                Customer Reviews Moderation
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Inspect customer testimonials, ratings, photos, and video reviews before publication on live product pages.
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={fetchReviews}
                disabled={isLoading}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/90 shadow-2xs transition cursor-pointer disabled:opacity-50"
                title="Refresh reviews list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                Total Reviews
              </span>
              <span className="font-serif text-2xl font-black text-forest-950 block mt-1">
                {metrics.total}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">All customer submissions</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                Approved & Live
              </span>
              <span className="font-serif text-2xl font-black text-emerald-700 block mt-1">
                {metrics.approved}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">Active on storefront</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                Hidden / Pending
              </span>
              <span className="font-serif text-2xl font-black text-amber-700 block mt-1">
                {metrics.hidden}
              </span>
              <span className="text-[10px] text-amber-600 font-semibold">Awaiting review / unlisted</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                With Photos / Videos
              </span>
              <span className="font-serif text-2xl font-black text-blue-700 block mt-1">
                {metrics.withMedia}
              </span>
              <span className="text-[10px] text-blue-600 font-medium">Rich customer media</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                Average Rating
              </span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="font-serif text-2xl font-black text-forest-950">
                  {metrics.avgRating}
                </span>
                <span className="text-amber-500 font-bold text-xs">★ / 5.0</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Storewide customer score</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reviews by customer, product, or keywords..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-forest-900 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved & Public</option>
                <option value="hidden">Hidden Only</option>
              </select>

              {/* Rating Filter */}
              <select
                value={ratingFilter}
                onChange={(e) => { setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setCurrentPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-forest-900 cursor-pointer"
              >
                <option value="all">All Ratings (1 - 5 ★)</option>
                <option value="5">5 Stars ★★★★★</option>
                <option value="4">4 Stars ★★★★☆</option>
                <option value="3">3 Stars ★★★☆☆</option>
                <option value="2">2 Stars ★★☆☆☆</option>
                <option value="1">1 Star ★☆☆☆☆</option>
              </select>

              {/* Media Filter */}
              <select
                value={mediaFilter}
                onChange={(e) => { setMediaFilter(e.target.value as any); setCurrentPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-forest-900 cursor-pointer"
              >
                <option value="all">All Submissions</option>
                <option value="with-media">Has Photos / Videos Only</option>
              </select>
            </div>
          </div>

          {/* Reviews Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Product</th>
                    <th className="py-3.5 px-4">Rating & Review</th>
                    <th className="py-3.5 px-4">Media</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-forest-900 mb-2" />
                        <span>Loading customer reviews...</span>
                      </td>
                    </tr>
                  ) : filteredReviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        No customer reviews match your active search filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedReviews.map((r) => {
                      const mediaList = getReviewMediaList(r);
                      const photoCount = mediaList.filter(m => m.type !== 'video' && !/\.(mp4|webm|mov|m4v|ogg)$/i.test(m.url)).length;
                      const videoCount = mediaList.filter(m => m.type === 'video' || /\.(mp4|webm|mov|m4v|ogg)$/i.test(m.url)).length;

                      return (
                        <tr
                          key={r._id}
                          className="hover:bg-slate-50/70 transition cursor-pointer group"
                          onClick={() => setSelectedReview(r)}
                        >
                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-full bg-forest-900 text-gold-400 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                {(r.customerName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 group-hover:text-forest-950 transition">
                                  {r.customerName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                                  {r.customerEmail || '—'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Product */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2">
                              {r.product?.images?.[0] ? (
                                <img
                                  src={getFullImageUrl(r.product.images[0])}
                                  alt={r.product.name}
                                  className="w-8 h-8 rounded-lg object-cover bg-slate-50 border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <span className="font-semibold text-slate-800 line-clamp-1 max-w-[160px]" title={r.product?.name}>
                                {r.product?.name || 'Novise Product'}
                              </span>
                            </div>
                          </td>

                          {/* Rating & Review Excerpt */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex items-center space-x-1 mb-1">
                              <div className="flex items-center text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'}`}
                                  />
                                ))}
                              </div>
                              <span className="font-bold text-[10px] text-slate-700 font-mono">
                                {r.rating}.0
                              </span>
                            </div>
                            <p className="font-bold text-slate-900 text-[11px] truncate">
                              {r.title}
                            </p>
                            <p className="text-slate-500 text-[10px] line-clamp-1">
                              {r.comment}
                            </p>
                          </td>

                          {/* Media count badges */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {mediaList.length > 0 ? (
                              <div className="flex items-center space-x-1.5">
                                {photoCount > 0 && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                                    <ImageIcon className="w-3 h-3" />
                                    <span>{photoCount}</span>
                                  </span>
                                )}
                                {videoCount > 0 && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                                    <Video className="w-3 h-3" />
                                    <span>{videoCount}</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 font-mono">None</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px] font-mono">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${r.isApproved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${r.isApproved ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span>{r.isApproved ? 'Approved' : 'Hidden'}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* View Details Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedReview(r)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer shadow-2xs group"
                                title="Open full review details & media inspector"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>

                              {/* Toggle Approve/Hide Button */}
                              <button
                                type="button"
                                onClick={() => handleToggle(r._id)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${r.isApproved
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                                  }`}
                                title={r.isApproved ? 'Hide review from product page' : 'Approve and publish review to storefront'}
                              >
                                {r.isApproved ? 'Hide' : 'Approve'}
                              </button>

                              {/* Delete Review */}
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(r._id, r.customerName)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                title="Delete review permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* Pagination Controls */}
            {filteredReviews.length > 0 && (
              <AdminPagination
                currentPage={currentPage}
                totalItems={filteredReviews.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="reviews"
              />
            )}
          </div>
        </div>
      ) : (
        /* ====================================================================
           DEDICATED FULL-PAGE REVIEW DETAILS & MEDIA INSPECTOR
           ==================================================================== */
        <div className="space-y-6 w-full animate-fadeIn pb-12">
          {/* Top Action Nav Bar with 1-Step Back Navigation */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="inline-flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group w-fit shrink-0"
                  title="Return to customer reviews moderation list"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>Back to Reviews</span>
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-forest-900/10 text-forest-900 flex items-center justify-center font-serif text-sm font-bold shrink-0">
                      <MessageSquare className="w-4 h-4 text-forest-900" />
                    </div>
                    <h2 className="font-serif text-lg sm:text-2xl font-black text-forest-950 truncate">
                      Review: {selectedReview.customerName}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Submitted {selectedReview.createdAt ? new Date(selectedReview.createdAt).toLocaleString('en-IN') : 'N/A'}
                    <span className="hidden sm:inline"> &bull; </span>
                    <span className="block sm:inline font-mono text-[11px] text-slate-400 break-all">ID: {selectedReview._id}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {/* Publication Status Badge */}
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${selectedReview.isApproved
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                  {selectedReview.isApproved ? '✓ Approved' : '⚠ Hidden'}
                </span>

                {/* Toggle Approve / Hide Button */}
                <button
                type="button"
                onClick={() => handleToggle(selectedReview._id)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${selectedReview.isApproved
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
              >
                {selectedReview.isApproved ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </>
                )}
              </button>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleDeleteReview(selectedReview._id, selectedReview.customerName)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200/80 transition cursor-pointer"
                title="Delete customer review permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Main 2-Column Luxury Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column (8 cols): Feedback Content & Photos / Videos Gallery */}
            <div className="lg:col-span-8 space-y-6">

              {/* 1. Customer Feedback & Review Content Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                      Customer Rating Score
                    </span>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-5 h-5 ${s <= selectedReview.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'}`}
                          />
                        ))}
                      </div>
                      <span className="font-serif font-black text-xl text-forest-950">
                        {selectedReview.rating}.0
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ 5.0</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {selectedReview.isVerifiedPurchase && (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verified Buyer</span>
                      </span>
                    )}
                    {selectedReview.isEdited && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-mono">
                        Edited Review ({selectedReview.editCount || 1}x)
                      </span>
                    )}
                  </div>
                </div>

                {/* Review Headline & Body */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                    Review Headline
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest-950 leading-snug">
                    {selectedReview.title}
                  </h3>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                    Customer Experience & Feedback
                  </span>
                  <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-slate-200/80 text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                    {selectedReview.comment}
                  </div>
                </div>
              </div>

              {/* 2. Customer Uploaded Photos & Videos Gallery Card */}
              {(() => {
                const mediaList = getReviewMediaList(selectedReview);
                const photoCount = mediaList.filter(m => m.type !== 'video' && !/\.(mp4|webm|mov|m4v|ogg)$/i.test(m.url)).length;
                const videoCount = mediaList.filter(m => m.type === 'video' || /\.(mp4|webm|mov|m4v|ogg)$/i.test(m.url)).length;

                return (
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-serif text-lg font-bold text-forest-950">
                            Customer Uploaded Media ({mediaList.length})
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Photos and video attachments captured by the customer to verify product results.
                        </p>
                      </div>

                      {mediaList.length > 0 && (
                        <div className="flex items-center space-x-2">
                          {photoCount > 0 && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-xl text-xs font-bold font-mono">
                              {photoCount} Photo{photoCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {videoCount > 0 && (
                            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200/60 rounded-xl text-xs font-bold font-mono">
                              {videoCount} Video{videoCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {mediaList.length === 0 ? (
                      <div className="py-12 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">No photos or videos attached</p>
                        <p className="text-[11px] text-slate-400">
                          This customer submitted a text-only rating without media files.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {mediaList.map((mediaItem, idx) => {
                          const isVideo = mediaItem.type === 'video' || /\.(mp4|webm|mov|m4v|ogg)$/i.test(mediaItem.url);
                          const fileUrl = getFullImageUrl(mediaItem.url);

                          return (
                            <div
                              key={idx}
                              className="group relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between"
                            >
                              {/* Media Content Container */}
                              <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
                                {isVideo ? (
                                  <div className="w-full h-full relative flex items-center justify-center">
                                    <video
                                      src={fileUrl}
                                      controls
                                      playsInline
                                      preload="metadata"
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                ) : (
                                  <img
                                    src={fileUrl}
                                    alt={`Review attachment ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                    onClick={() => setLightboxMedia(mediaItem)}
                                  />
                                )}

                                {/* Top Type Badge */}
                                <div className="absolute top-2.5 left-2.5 z-10">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs ${isVideo
                                    ? 'bg-purple-900/90 text-purple-200 border border-purple-400/40'
                                    : 'bg-black/70 text-white border border-white/20'
                                    }`}>
                                    {isVideo ? '🎥 Video' : '📷 Photo'}
                                  </span>
                                </div>

                                {/* Fullscreen Zoom Trigger on Hover */}
                                <button
                                  type="button"
                                  onClick={() => setLightboxMedia(mediaItem)}
                                  className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-forest-900 text-white hover:text-gold-400 transition opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
                                  title="Open in fullscreen lightbox viewer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Card Bottom Meta Bar */}
                              <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="font-mono text-[10px] text-slate-500 font-bold truncate max-w-[120px]">
                                  Attachment #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setLightboxMedia(mediaItem)}
                                  className="text-[11px] font-bold text-forest-900 hover:text-forest-950 hover:underline flex items-center space-x-1 cursor-pointer"
                                >
                                  <span>View High-Res</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* Right Column (4 cols): Customer Profile, Product Details & Moderation Card */}
            <div className="lg:col-span-4 space-y-6">

              {/* 1. Customer Information Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 min-w-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-forest-900 text-gold-400 font-bold flex items-center justify-center font-serif text-lg shadow-sm shrink-0">
                    {(selectedReview.customerName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-serif font-bold text-forest-950 text-base truncate">
                      {selectedReview.customerName}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono break-all">
                      {selectedReview.customerEmail || 'Verified Customer'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100/70">
                    <span className="text-slate-500">Customer Status</span>
                    <span className="font-bold text-emerald-700 flex items-center space-x-1 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Buyer</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100/70">
                    <span className="text-slate-500">Review Date</span>
                    <span className="font-mono font-semibold text-slate-800 text-[11px] shrink-0">
                      {selectedReview.createdAt ? new Date(selectedReview.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>

                  {selectedReview.user?._id && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 gap-1">
                      <span className="text-slate-500">User Account ID</span>
                      <span className="font-mono text-slate-600 text-[10px] break-all">
                        {selectedReview.user._id}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Reviewed Product Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                  <Package className="w-4 h-4 text-forest-900" />
                  <h4 className="font-serif font-bold text-forest-950 text-sm">
                    Reviewed Product
                  </h4>
                </div>

                <div className="flex items-start space-x-3">
                  {selectedReview.product?.images?.[0] ? (
                    <img
                      src={getFullImageUrl(selectedReview.product.images[0])}
                      alt={selectedReview.product.name}
                      className="w-14 h-14 rounded-xl object-cover bg-slate-50 border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h5 className="font-bold text-forest-950 text-xs leading-snug line-clamp-2">
                      {selectedReview.product?.name || 'Novise Product'}
                    </h5>
                    {selectedReview.product?.sellingPrice && (
                      <p className="text-xs font-mono font-bold text-forest-900 mt-1">
                        ₹{selectedReview.product.sellingPrice}
                      </p>
                    )}
                    {selectedReview.product?.slug && (
                      <a
                        href={`/products/${selectedReview.product.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-[11px] text-forest-900 hover:text-forest-950 hover:underline font-bold mt-1.5 cursor-pointer"
                      >
                        <span>View Product Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Moderation Controls Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-forest-900" />
                  <h4 className="font-serif font-bold text-forest-950 text-sm">
                    Moderation Decision
                  </h4>
                </div>

                <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${selectedReview.isApproved
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}>
                  <p className="font-bold">
                    {selectedReview.isApproved ? 'Public on Storefront' : 'Hidden from Storefront'}
                  </p>
                  <p className="text-[11px] opacity-80">
                    {selectedReview.isApproved
                      ? 'This customer review and its uploaded photos/videos are live on the product page.'
                      : 'This review is unlisted and hidden from potential buyers browsing the store.'}
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(selectedReview._id)}
                    className={`w-full py-3 rounded-2xl font-bold text-xs transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer ${selectedReview.isApproved
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-forest-900 hover:bg-forest-950 text-gold-400 shadow-md'
                      }`}
                  >
                    {selectedReview.isApproved ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Hide from Product Page</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Approve & Make Public</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteReview(selectedReview._id, selectedReview.customerName)}
                    className="w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200/80 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Review Permanently</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Lightbox Media Viewer Modal (Images & Videos) */}
      <MediaLightbox
        media={lightboxMedia}
        onClose={() => setLightboxMedia(null)}
      />

      {/* Centered Luxury Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={!!reviewToDelete}
        title="Delete Customer Review"
        itemName={reviewToDelete ? `Review by ${reviewToDelete.reviewerName}` : undefined}
        message="Are you sure you want to permanently delete this customer review? Once deleted, it will be removed permanently from the store."
        confirmLabel="Yes, Delete Review"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeletingReview}
        onClose={() => setReviewToDelete(null)}
        onConfirm={handleConfirmDeleteReview}
      />
    </div>
  );
};
