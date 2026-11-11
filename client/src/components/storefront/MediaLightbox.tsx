import React from 'react';
import { X } from 'lucide-react';
import { getFullImageUrl } from '../../services/api';
import { ReviewMedia } from '../../types';

interface MediaLightboxProps {
  media: ReviewMedia | null;
  onClose: () => void;
}

// Fullscreen lightbox viewer for review photos and videos
export const MediaLightbox: React.FC<MediaLightboxProps> = ({ media, onClose }) => {
  if (!media) return null;

  const isVideo = media.type === 'video' || /\.(mp4|webm|mov|m4v|ogg)$/i.test(media.url);
  const mediaUrl = getFullImageUrl(media.url);

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white hover:text-gold-400 transition"
          aria-label="Close media preview"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Media content */}
        <div className="rounded-2xl overflow-hidden bg-black/90 shadow-2xl flex items-center justify-center max-h-[80vh]">
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-[80vh] max-w-full rounded-2xl"
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Customer review attachment"
              className="max-h-[80vh] max-w-full object-contain rounded-2xl"
            />
          )}
        </div>
      </div>
    </div>
  );
};
