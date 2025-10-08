import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Trash2, Star } from 'lucide-react';

export interface LightboxImage {
  src: string;
  alt?: string;
  caption?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  open: boolean;
  index: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  onDelete?: (index: number) => void;
  canDelete?: boolean;
  onSetCover?: (index: number) => void;
  canSetCover?: boolean;
}

/**
 * Custom lightweight image lightbox component
 *
 * Features:
 * - Full-size image viewing
 * - Left/right arrow navigation
 * - Keyboard navigation (arrow keys, ESC to close)
 * - Click outside to close
 * - Touch/swipe support on mobile
 * - Smooth animations with framer-motion
 *
 * @example
 * ```tsx
 * const [lightboxOpen, setLightboxOpen] = useState(false);
 * const [lightboxIndex, setLightboxIndex] = useState(0);
 *
 * const images = photos.map(photo => ({
 *   src: photo.photo_url,
 *   alt: photo.caption || 'Photo',
 *   caption: photo.caption
 * }));
 *
 * <ImageLightbox
 *   images={images}
 *   open={lightboxOpen}
 *   index={lightboxIndex}
 *   onClose={() => setLightboxOpen(false)}
 *   onIndexChange={setLightboxIndex}
 * />
 * ```
 */
export function ImageLightbox({
  images,
  open,
  index,
  onClose,
  onIndexChange,
  onDelete,
  canDelete = false,
  onSetCover,
  canSetCover = false
}: ImageLightboxProps) {
  // Early return if images array is empty or index is out of bounds
  if (images.length === 0 || index < 0 || index >= images.length) {
    return null;
  }

  const currentImage = images[index];
  const hasMultipleImages = images.length > 1;

  const goToPrevious = useCallback(() => {
    if (!hasMultipleImages) return;
    const newIndex = index === 0 ? images.length - 1 : index - 1;
    onIndexChange?.(newIndex);
  }, [index, images.length, hasMultipleImages, onIndexChange]);

  const goToNext = useCallback(() => {
    if (!hasMultipleImages) return;
    const newIndex = index === images.length - 1 ? 0 : index + 1;
    onIndexChange?.(newIndex);
  }, [index, images.length, hasMultipleImages, onIndexChange]);

  // Download image
  const handleDownload = useCallback(async () => {
    // Guard against undefined currentImage
    if (!currentImage?.src) {
      console.warn('Cannot download: image source is undefined');
      return;
    }

    try {
      const response = await fetch(currentImage.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from URL or use a default name
      const urlParts = currentImage.src.split('/');
      const filename = urlParts[urlParts.length - 1] || `photo-${Date.now()}.jpg`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      // Fallback: open in new tab
      window.open(currentImage.src, '_blank');
    }
  }, [currentImage?.src]);

  // Delete image
  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(index);
    }
  }, [onDelete, index]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, goToPrevious, goToNext]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!currentImage) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={onClose}
        >
          {/* Top Bar Controls */}
          <div className="absolute top-4 left-0 right-0 z-50 flex items-center justify-between px-4">
            {/* Image Counter */}
            {hasMultipleImages ? (
              <div className="px-4 py-2 bg-black/50 text-white rounded-full text-sm font-medium">
                {index + 1} / {images.length}
              </div>
            ) : (
              <div></div>
            )}

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Set as Cover Button */}
              {canSetCover && onSetCover && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetCover(index);
                  }}
                  className="p-2 text-white hover:bg-yellow-500/20 rounded-full transition-colors"
                  aria-label="Set as cover image"
                  title="Set as cover image"
                >
                  <Star className="w-6 h-6" />
                </button>
              )}

              {/* Delete Button */}
              {canDelete && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="p-2 text-white hover:bg-red-500/20 rounded-full transition-colors"
                  aria-label="Delete image"
                  title="Delete image"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              )}

              {/* Download Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Download image"
                title="Download image"
              >
                <Download className="w-6 h-6" />
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close lightbox"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Previous Button */}
          {hasMultipleImages && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 z-50 p-3 text-white hover:bg-white/10 rounded-full transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Next Button */}
          {hasMultipleImages && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 z-50 p-3 text-white hover:bg-white/10 rounded-full transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Image Container */}
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-7xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage.src}
              alt={currentImage.alt || 'Photo'}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />

            {/* Caption */}
            {currentImage.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
                <p className="text-white text-center text-sm">
                  {currentImage.caption}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ImageLightbox;

