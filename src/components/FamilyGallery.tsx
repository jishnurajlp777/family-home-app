import React, { useState, useEffect, useCallback } from 'react';
import { GalleryItem } from '../types/member';
import { FamilyService } from '../services/api';

interface FamilyGalleryProps {
  currentUserName?: string;
  currentUserRole?: string;
  currentUserId?: string;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const FamilyGallery: React.FC<FamilyGalleryProps> = ({
  currentUserName = 'Family Member',
  currentUserRole = 'member',
  currentUserId,
  onShowToast,
}) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [photoTitle, setPhotoTitle] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const loadGallery = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await FamilyService.getGallery();
      setItems(data);
    } catch {
      onShowToast('Could not load gallery images', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  // Compress high-resolution photos client-side to guarantee fast, reliable uploads
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image file'));
        img.onload = () => {
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressedDataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // RBAC Permission: Home can delete ALL photos; Members can delete ONLY their own uploads
  const canUserDelete = (item: GalleryItem): boolean => {
    if (currentUserRole === 'admin' || currentUserRole === 'super_admin') {
      return true; // Home Admin has full delete permissions
    }
    if (currentUserRole === 'member') {
      if (item.uploaded_by_id && currentUserId && String(item.uploaded_by_id).trim() === String(currentUserId).trim()) {
        return true;
      }
      if (item.uploaded_by && currentUserName && item.uploaded_by.trim().toLowerCase() === currentUserName.trim().toLowerCase()) {
        return true;
      }
    }
    return false;
  };

  // Handle image file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation: Only images allowed
    if (!file.type.startsWith('image/')) {
      onShowToast('Only image files are allowed (JPEG, PNG, WebP, GIF).', 'error');
      e.target.value = '';
      return;
    }

    try {
      const compressed = await compressImageFile(file);
      setPreviewDataUrl(compressed);
      setPhotoTitle(file.name.replace(/\.[^/.]+$/, ''));
      setIsUploadModalOpen(true);
    } catch {
      onShowToast('Could not process image. Please try another photo.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewDataUrl) return;

    try {
      setIsUploading(true);
      await FamilyService.addGalleryItem(
        previewDataUrl,
        photoTitle.trim() || 'Family Memory',
        currentUserName,
        currentUserId
      );
      onShowToast('Photo saved to Family Gallery in database!');
      setIsUploadModalOpen(false);
      setPreviewDataUrl('');
      setPhotoTitle('');
      await loadGallery();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save photo';
      onShowToast(msg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await FamilyService.deleteGalleryItem(id);
      onShowToast('Photo removed from database');
      if (selectedImage && selectedImage.id === id) {
        setSelectedImage(null);
      }
      await loadGallery();
    } catch {
      onShowToast('Error deleting photo', 'error');
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-7">
      {/* Gallery Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Family Gallery
            </h2>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
              {items.length} {items.length === 1 ? 'photo' : 'photos'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Store and cherish all our family moments (Saved to database)
          </p>
        </div>

        {/* Upload Button */}
        <div>
          <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl shadow-xs transition active:scale-95">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Photo</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-medium">
          Loading Family Gallery from database...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3 text-2xl shadow-inner">
            🖼️
          </div>
          <h3 className="text-sm font-bold text-slate-700">No photos added yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click <strong className="text-indigo-600">"Add Photo"</strong> to upload your favorite family pictures. All images are securely stored in the database!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedImage(item)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-square shadow-2xs hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <img
                src={item.image_data}
                alt={item.title || 'Family Memory'}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />

              {/* Gradient Overlay on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 text-white">
                <p className="text-xs font-bold truncate">{item.title || 'Family Memory'}</p>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-300">
                  <span>{item.uploaded_by || 'Family'}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Delete button (Home can delete all records; Member can delete his/her own record only) */}
              {canUserDelete(item) && (
                <button
                  type="button"
                  onClick={(e) => handleDeletePhoto(item.id, e)}
                  title="Delete photo"
                  className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center text-xs opacity-80 sm:opacity-0 group-hover:opacity-100 transition shadow-md"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Preview Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <span>📸</span>
                <span>Add to Family Gallery</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePhoto} className="space-y-4">
              {/* Image Preview */}
              <div className="w-full h-48 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                <img
                  src={previewDataUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title / Caption */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Photo Caption / Title
                </label>
                <input
                  type="text"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  placeholder="e.g. Weekend picnic, Birthday celebration"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition disabled:opacity-50"
                >
                  {isUploading ? 'Saving to Database...' : 'Save Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-80 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center transition"
            >
              ✕
            </button>
            <div className="max-h-[75vh] flex items-center justify-center bg-black">
              <img
                src={selectedImage.image_data}
                alt={selectedImage.title}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-between text-white">
              <div>
                <h4 className="text-sm font-bold">{selectedImage.title || 'Family Memory'}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Uploaded by {selectedImage.uploaded_by || 'Family Member'} • {new Date(selectedImage.created_at).toLocaleDateString()}
                </p>
              </div>
              {canUserDelete(selectedImage) && (
                <button
                  type="button"
                  onClick={(e) => handleDeletePhoto(selectedImage.id, e)}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-1.5 rounded-lg border border-rose-800 hover:bg-rose-950/50 transition cursor-pointer"
                >
                  Delete Photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
