import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  RotateCcw,
  Heart,
  Layers
} from 'lucide-react';
import { getFullImageUrl, getFallbackProductImage } from '../../services/api';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  discountPercent?: number;
  volumeText?: string;
  isInWishlist?: boolean;
  onToggleWishlist?: () => void;
}

// Clean and stable luxury product image showcase with full-viewport presentation modal
export const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  images = [],
  productName,
  discountPercent = 0,
  volumeText,
  isInWishlist = false,
  onToggleWishlist
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [modalZoom, setModalZoom] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  // Safe fallback if images array is empty
  const fallbackImg = getFallbackProductImage(productName);
  const safeImages = images.filter(Boolean).length > 0 ? images.filter(Boolean) : [fallbackImg];
  const activeImage = safeImages[selectedIndex] || safeImages[0] || fallbackImg;
  const activeImageUrl = getFullImageUrl(activeImage, productName);

  // Prevent background scrolling and body shift when modal is open
  useEffect(() => {
    if (isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFullscreen]);

  // Reset zoom level whenever modal opens or image changes
  useEffect(() => {
    setModalZoom(1);
  }, [selectedIndex, isFullscreen]);

  // Keyboard navigation for fullscreen modal
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex(prev => (prev === 0 ? safeImages.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex(prev => (prev === safeImages.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, safeImages.length]);

  // Smooth scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const activeThumb = thumbnailContainerRef.current.children[selectedIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  }, [selectedIndex]);

  // Handle previous image
  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIndex(prev => (prev === 0 ? safeImages.length - 1 : prev - 1));
  };

  // Handle next image
  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIndex(prev => (prev === safeImages.length - 1 ? 0 : prev + 1));
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    setTouchStartX(null);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Main Desktop + Mobile Gallery Layout */}
      <div className="flex flex-col-reverse lg:flex-row gap-3 sm:gap-4 lg:gap-5 items-start">
        
        {/* Thumbnail Navigation Strip: Vertical on Desktop (Left), Horizontal on Mobile */}
        {safeImages.length > 1 && (
          <div
            ref={thumbnailContainerRef}
            className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto gap-2 sm:gap-2.5 w-full lg:w-20 shrink-0 pb-1 lg:pb-0 lg:max-h-[540px] no-scrollbar scroll-smooth"
          >
            {safeImages.map((img, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl overflow-hidden border-2 bg-gradient-to-b from-[#FAF8F5] to-white p-1 transition-all duration-200 shrink-0 group ${
                    isSelected
                      ? 'border-forest-900 shadow-md ring-2 ring-forest-900/20 scale-[1.02]'
                      : 'border-slate-200/90 hover:border-slate-400 opacity-75 hover:opacity-100'
                  }`}
                  aria-label={`View image ${idx + 1} of ${safeImages.length}`}
                >
                  <img
                    src={getFullImageUrl(img, productName)}
                    alt={`${productName} thumbnail ${idx + 1}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackImg;
                    }}
                  />
                  {/* Active selection dot */}
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-forest-900 ring-2 ring-white" />
                  )}
                  {/* Thumbnail Index */}
                  <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-white/90 text-slate-700 shadow-xs">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Stage Showcase Image (Steady, no mouse zoom) */}
        <div className="flex-1 w-full">
          <div
            className="relative aspect-[4/4.2] sm:aspect-square w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-b from-[#FBF9F6] via-white to-[#F5EFE6] border border-slate-200/90 shadow-[0_10px_35px_-8px_rgba(11,59,36,0.08)] select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Main Image Clickable Area */}
            <div
              className="w-full h-full relative flex items-center justify-center p-3 sm:p-6 cursor-pointer"
              onClick={() => setIsFullscreen(true)}
              title="Click to expand fullscreen"
            >
              <img
                src={activeImageUrl}
                alt={productName}
                className="w-full h-full object-contain select-none transition-opacity duration-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackImg;
                }}
              />
            </div>

            {/* Discount Badge */}
            {discountPercent > 0 && (
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 bg-forest-950 text-gold-400 font-extrabold text-[10px] sm:text-xs px-3 py-1 sm:px-3.5 sm:py-1 rounded-full uppercase tracking-wider shadow-md pointer-events-none">
                {discountPercent}% OFF
              </div>
            )}

            {/* Top Right Floating Actions: Fullscreen Inspect & Wishlist */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center space-x-1.5 sm:space-x-2">
              {onToggleWishlist && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWishlist();
                  }}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center backdrop-blur-md shadow-md transition-all ${
                    isInWishlist
                      ? 'bg-rose-50 text-rose-600 border border-rose-200 scale-105'
                      : 'bg-white/90 text-slate-600 hover:text-forest-950 hover:bg-white border border-slate-200/80'
                  }`}
                  aria-label="Save to Wishlist"
                  title="Save to Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-current text-rose-600' : ''}`} />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreen(true);
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-forest-950 text-slate-700 hover:text-gold-400 backdrop-blur-md flex items-center justify-center shadow-md border border-slate-200/80 transition-all"
                title="Fullscreen Image Inspector"
                aria-label="Open fullscreen image inspector"
              >
                <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Previous Arrow Button */}
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-forest-950 text-forest-950 hover:text-gold-400 backdrop-blur-md flex items-center justify-center shadow-lg border border-slate-200/80 transition-all opacity-85 hover:opacity-100 hover:scale-105"
                aria-label="Previous product image"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 -ml-0.5" />
              </button>
            )}

            {/* Next Arrow Button */}
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-forest-950 text-forest-950 hover:text-gold-400 backdrop-blur-md flex items-center justify-center shadow-lg border border-slate-200/80 transition-all opacity-85 hover:opacity-100 hover:scale-105"
                aria-label="Next product image"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 -mr-0.5" />
              </button>
            )}

            {/* Bottom Bar: Image Counter & Volume Text */}
            <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 flex items-center justify-between pointer-events-none">
              {/* Image Counter */}
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm text-[10px] sm:text-xs font-bold text-slate-700">
                <Layers className="w-3 h-3 text-forest-900" />
                <span className="font-mono">{selectedIndex + 1} / {safeImages.length}</span>
                <span className="hidden sm:inline text-slate-400 font-normal">• Click to Expand</span>
              </div>

              {/* Volume / Specification Pill */}
              {volumeText && (
                <div className="bg-forest-950/90 backdrop-blur-md text-gold-400 text-[10px] sm:text-xs font-extrabold px-2.5 py-1 sm:px-3 sm:py-1 rounded-xl shadow-sm border border-forest-800">
                  {volumeText}
                </div>
              )}
            </div>

            {/* Mobile Swipe Dot Indicators */}
            {safeImages.length > 1 && (
              <div className="lg:hidden absolute bottom-11 left-0 right-0 flex justify-center space-x-1.5 pointer-events-none z-10">
                {safeImages.map((_, dotIdx) => (
                  <span
                    key={dotIdx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      selectedIndex === dotIdx
                        ? 'w-5 bg-forest-900'
                        : 'w-1.5 bg-slate-300/80'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen High-Resolution Image Inspector Modal (Portaled to document.body for 100% viewport coverage) */}
      {isFullscreen && createPortal(
        <div className="fixed inset-0 z-[9999999] bg-[#0A120E]/95 backdrop-blur-xl flex flex-col justify-between p-3 sm:p-6 select-none animate-fadeIn">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between text-white border-b border-white/10 pb-3 sm:pb-4 gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <span className="px-3 py-1 rounded-full bg-forest-900 text-gold-400 border border-gold-500/30 text-xs font-mono font-bold shrink-0">
                {selectedIndex + 1} / {safeImages.length}
              </span>
              <h4 className="font-serif text-sm sm:text-base font-bold text-white truncate">
                {productName}
              </h4>
            </div>

            {/* Modal Controls: Zoom In, Zoom Out, Reset, Close */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setModalZoom(prev => Math.min(3, prev + 0.3))}
                className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                title="Zoom In"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                onClick={() => setModalZoom(prev => Math.max(1, prev - 0.3))}
                className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                title="Zoom Out"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                onClick={() => setModalZoom(1)}
                className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                title="Reset Zoom"
                aria-label="Reset zoom"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-2 sm:p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white transition ml-1.5 sm:ml-2 border border-rose-500/30"
                title="Close Inspector (Esc)"
                aria-label="Close fullscreen modal"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* Central Image Viewport with Clean Presentation Card */}
          <div className="relative flex-1 flex items-center justify-center overflow-auto p-2 sm:p-4 my-2">
            {/* Modal Previous Arrow */}
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 sm:left-6 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-forest-900 text-white hover:text-gold-400 transition shadow-2xl backdrop-blur-md border border-white/20 flex items-center justify-center hover:scale-105"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 -ml-0.5" />
              </button>
            )}

            {/* High-res Image Inside a Rounded Presentation Card */}
            <div
              className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-white/20 flex items-center justify-center overflow-hidden transition-transform duration-200"
              style={{ transform: `scale(${modalZoom})` }}
            >
              <img
                src={activeImageUrl}
                alt={`${productName} slide ${selectedIndex + 1}`}
                className="max-h-[65vh] sm:max-h-[70vh] w-auto max-w-[85vw] sm:max-w-3xl object-contain rounded-xl select-none"
              />
            </div>

            {/* Modal Next Arrow */}
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 sm:right-6 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-forest-900 text-white hover:text-gold-400 transition shadow-2xl backdrop-blur-md border border-white/20 flex items-center justify-center hover:scale-105"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 -mr-0.5" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip in Modal */}
          {safeImages.length > 1 && (
            <div className="flex flex-col items-center gap-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto max-w-full pb-1 no-scrollbar">
                {safeImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 bg-white transition-all p-1 shrink-0 ${
                      selectedIndex === idx
                        ? 'border-gold-400 ring-2 ring-gold-400/40 scale-105 shadow-lg'
                        : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
                    }`}
                  >
                    <img
                      src={getFullImageUrl(img)}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-white/50 font-mono hidden sm:block">
                Use Left and Right arrow keys to navigate • Press Esc to close
              </p>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
