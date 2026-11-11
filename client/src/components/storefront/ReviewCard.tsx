import React from 'react';
import { Star, ShieldCheck, Play, Video, Edit2, Trash2 } from 'lucide-react';
import { Review, ReviewMedia } from '../../types';
import { getFullImageUrl } from '../../services/api';

interface ReviewCardProps {
  review: Review;
  isOwner?: boolean;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  onOpenMedia?: (media: ReviewMedia) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  isOwner,
  onEdit,
  onDelete,
  onOpenMedia
}) => {
  const canEdit = isOwner && (review.editCount || 0) < 1;

  // Extract all media items (combining media array and legacy images array)
  const mediaList: ReviewMedia[] = [
    ...(review.media || []),
    ...(review.images || [])
      .filter(img => !(review.media || []).some(m => m.url === img))
      .map(url => ({ url, type: 'image' as const }))
  ];

  const formattedDate = new Date(review.createdAt).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition duration-200 ${
        isOwner
          ? 'bg-gradient-to-b from-emerald-50/50 to-white border-2 border-emerald-500/30 shadow-md ring-1 ring-emerald-500/20'
          : 'bg-[#FAF8F5] border border-slate-200/80 shadow-sm hover:border-slate-300'
      }`}
    >
      <div className="space-y-3">
        {/* Top Header: User info, Badge, and Action buttons */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-forest-900 text-gold-400 font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-sm">
              {review.customerName ? review.customerName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="font-bold text-forest-950 text-xs truncate">
                  {review.customerName}
                </span>
                {isOwner && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-forest-900 text-gold-400">
                    You
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1 text-[10px] text-emerald-800 font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Verified Buyer</span>
              </div>
            </div>
          </div>

          {/* Owner actions (Edit / Delete) */}
          {isOwner && (
            <div className="flex items-center space-x-1 flex-shrink-0">
              {canEdit ? (
                <button
                  onClick={() => onEdit?.(review)}
                  title="Edit Review (1 edit allowed)"
                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-[9px] text-slate-400 italic px-1 font-mono">Edited</span>
              )}
              <button
                onClick={() => onDelete?.(review._id)}
                title="Delete Review"
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Rating Stars and Date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-0.5">
            {[1, 2, 3, 4, 5].map((starIdx) => (
              <Star
                key={starIdx}
                className={`w-3.5 h-3.5 ${
                  starIdx <= review.rating
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-200 fill-slate-100'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
            <span>{formattedDate}</span>
            {review.isEdited && <span className="italic text-slate-400">(Edited)</span>}
          </div>
        </div>

        {/* Headline */}
        <h4 className="font-serif font-bold text-xs sm:text-sm text-forest-950 line-clamp-2 leading-snug">
          {review.title}
        </h4>

        {/* Comment Text */}
        <p className="text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-line line-clamp-5">
          {review.comment}
        </p>
      </div>

      {/* Media Thumbnails Rail */}
      {mediaList.length > 0 && (
        <div className="pt-3 mt-3 border-t border-slate-200/60">
          <div className="flex items-center space-x-2 overflow-x-auto py-1">
            {mediaList.map((mediaItem, idx) => {
              const isVideo = mediaItem.type === 'video' || /\.(mp4|webm|mov|m4v|ogg)$/i.test(mediaItem.url);
              const previewUrl = getFullImageUrl(mediaItem.url);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onOpenMedia?.(mediaItem)}
                  className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-black flex-shrink-0 group hover:opacity-90 transition shadow-sm focus:outline-none"
                  aria-label="View media attachment"
                >
                  {isVideo ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                      <video
                        src={previewUrl}
                        className="w-full h-full object-cover opacity-80"
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="w-5 h-5 rounded-full bg-black/60 text-gold-400 flex items-center justify-center group-hover:scale-110 transition">
                          <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                        </span>
                      </div>
                      <span className="absolute bottom-0.5 right-0.5 text-[7px] font-bold bg-black/70 text-white px-0.5 rounded font-mono">
                        {mediaItem.duration ? `${mediaItem.duration}s` : '<15s'}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Review photo"
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
