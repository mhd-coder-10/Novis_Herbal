import React, { useState, useRef, useEffect } from 'react';
import { Star, Upload, X, Video, Image as ImageIcon, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Review, ReviewMedia, User } from '../../types';
import api, { getFullImageUrl } from '../../services/api';
import { toast } from '../../store/useToastStore';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  productName: string;
  productId?: string;
  existingReview?: Review | null;
  onSubmitSuccess: (review: Review, isEdit: boolean) => void;
}

interface LocalMediaItem {
  file?: File;
  url: string;
  type: 'image' | 'video';
  duration?: number;
  previewUrl: string;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  5: '5 Stars - Exceptional',
  4: '4 Stars - Very Good',
  3: '3 Stars - Average',
  2: '2 Stars - Poor',
  1: '1 Star - Disappointed'
};

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  user,
  productName,
  productId,
  existingReview,
  onSubmitSuccess
}) => {
  const isEditMode = !!existingReview;

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [mediaItems, setMediaItems] = useState<LocalMediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form state
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating || 5);
      setTitle(existingReview.title || '');
      setComment(existingReview.comment || '');

      const initialMedia: LocalMediaItem[] = (existingReview.media || []).map(m => ({
        url: m.url,
        type: m.type,
        duration: m.duration,
        previewUrl: getFullImageUrl(m.url)
      }));
      setMediaItems(initialMedia);
    } else {
      setRating(5);
      setTitle('');
      setComment('');
      setMediaItems([]);
    }
    setErrorMessage('');
  }, [existingReview, isOpen]);

  if (!isOpen) return null;

  // Helper to check video duration
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Invalid video file'));
      };
      video.src = URL.createObjectURL(file);
    });
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    if (mediaItems.length + files.length > 3) {
      toast.warning('Maximum 3 files allowed in a review (photos and videos combined).', 'File Limit');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const newItems: LocalMediaItem[] = [];

    for (const file of files) {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);

      if (isVideo) {
        try {
          const duration = await getVideoDuration(file);
          // Strict 15 seconds restriction
          if (duration > 15.5) {
            toast.warning(
              `"${file.name}" is ${Math.round(duration)} seconds. Videos cannot exceed 15 seconds.`,
              'Video Too Long'
            );
            continue;
          }
          newItems.push({
            file,
            url: '',
            type: 'video',
            duration: Math.round(duration),
            previewUrl: URL.createObjectURL(file)
          });
        } catch {
          toast.error(`Unable to process video: ${file.name}`, 'File Error');
        }
      } else {
        newItems.push({
          file,
          url: '',
          type: 'image',
          previewUrl: URL.createObjectURL(file)
        });
      }
    }

    setMediaItems(prev => [...prev, ...newItems].slice(0, 3));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove media item
  const handleRemoveMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim() || !comment.trim()) {
      setErrorMessage('Please provide both headline and feedback text.');
      return;
    }

    if (rating < 1 || rating > 5) {
      setErrorMessage('Please select a rating between 1 and 5 stars.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload any new files
      const filesToUpload = mediaItems.filter(item => !!item.file);
      let uploadedMediaUrls: { url: string; type: 'image' | 'video'; duration?: number }[] = [];

      if (filesToUpload.length > 0) {
        const formData = new FormData();
        filesToUpload.forEach(item => {
          if (item.file) formData.append('files', item.file);
        });

        const uploadRes = await api.post('/reviews/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (uploadRes.data?.success && Array.isArray(uploadRes.data.files)) {
          uploadedMediaUrls = uploadRes.data.files.map((f: any, idx: number) => ({
            url: f.url,
            type: f.type,
            duration: filesToUpload[idx]?.duration || 0
          }));
        }
      }

      // Combine existing URLs and newly uploaded URLs
      const existingUrls = mediaItems
        .filter(item => !item.file && item.url)
        .map(item => ({
          url: item.url,
          type: item.type,
          duration: item.duration || 0
        }));

      const finalMedia = [...existingUrls, ...uploadedMediaUrls].slice(0, 3);
      const finalImages = finalMedia.filter(m => m.type === 'image').map(m => m.url);

      if (isEditMode && existingReview) {
        const res = await api.put(`/reviews/${existingReview._id}`, {
          rating,
          title: title.trim(),
          comment: comment.trim(),
          media: finalMedia,
          images: finalImages
        });
        if (res.data?.success) {
          toast.success('Your review was updated successfully!', 'Review Updated');
          onSubmitSuccess(res.data.review, true);
          onClose();
        }
      } else {
        const res = await api.post('/reviews', {
          productId,
          rating,
          title: title.trim(),
          comment: comment.trim(),
          media: finalMedia,
          images: finalImages
        });
        if (res.data?.success) {
          toast.success('Thank you! Your verified review has been published.', 'Review Published');
          onSubmitSuccess(res.data.review, false);
          onClose();
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit review. Please try again.';
      setErrorMessage(msg);
      toast.error(msg, 'Submission Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Dialog (Smooth 4-corner rounded curve, zero scrollbar pipe) */}
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl z-10 my-8 animate-fadeIn max-h-[92vh] flex flex-col overflow-hidden border border-emerald-950/10">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-5 sm:px-8 py-5 shrink-0 bg-white">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
              {isEditMode ? 'Edit Review (1 Time Only)' : 'Verified Customer Review'}
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest-950 mt-1">
              {isEditMode ? 'Update Your Review' : 'Write a Product Review'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body without ugly scrollbar pipe */}
        <div className="overflow-y-auto no-scrollbar px-5 sm:px-8 py-5 space-y-5 flex-1">
          {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Verified User Identity Display */}
        <div className="flex items-center space-x-3 p-3 bg-[#FAF8F5] border border-slate-200/80 rounded-2xl">
          <div className="w-10 h-10 rounded-full bg-forest-900 text-gold-400 font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-forest-950 text-xs sm:text-sm truncate">
                {user?.name || 'Verified Customer'}
              </span>
              <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-forest-900 text-gold-400 flex-shrink-0">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>Verified Buyer</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono truncate">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Interactive Star Rating */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs">
              Overall Rating <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center space-x-1.5">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const active = starValue <= (hoverRating || rating);
                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                    aria-label={`${starValue} Stars`}
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                        active
                          ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_2px_4px_rgba(251,191,36,0.3)]'
                          : 'text-slate-300 fill-slate-100 hover:text-amber-200'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-xs font-bold text-forest-900">
                {RATING_DESCRIPTIONS[hoverRating || rating]}
              </span>
            </div>
          </div>

          {/* Headline */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Headline <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cleared my dandruff in just 3 days!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-forest-900 font-medium"
            />
          </div>

          {/* Detailed Feedback */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Detailed Experience <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Share what you liked most, aroma, texture, and real scalp/hair results..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-forest-900 leading-relaxed font-medium resize-none"
            />
          </div>

          {/* Media Attachments Section (Max 3 files, videos <= 15s) */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-slate-700 font-bold text-xs">
                  Attach Photos or Videos <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <p className="text-[10px] text-slate-500">
                  Up to 3 files total. Videos must be 15 seconds or less.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {mediaItems.length}/3 files
              </span>
            </div>

            {/* Media Previews Rail */}
            {mediaItems.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {mediaItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group shadow-sm"
                  >
                    {item.type === 'video' ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                        <video
                          src={item.previewUrl}
                          className="w-full h-full object-cover opacity-80"
                          muted
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
                            <Video className="w-3.5 h-3.5 text-gold-400" />
                          </span>
                        </div>
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[8px] font-bold bg-black/70 text-white font-mono">
                          {item.duration ? `${item.duration}s` : '<15s'}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={item.previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white hover:bg-rose-600 flex items-center justify-center transition"
                      aria-label="Remove item"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File upload trigger */}
            {mediaItems.length < 3 && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 border border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-forest-800 hover:text-forest-900 transition flex items-center justify-center space-x-2 bg-[#FAF8F5]/60"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-800" />
                  <span className="font-semibold text-xs">Add Photos or Video (Max 15s)</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-forest-900 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-forest-800 transition shadow-md shadow-forest-900/10 flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Update Review' : 'Submit Review'}</span>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};
