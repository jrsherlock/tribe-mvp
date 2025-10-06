/**
 * Facility Photo Albums Component
 * Photo album management for facilities (similar to user photo albums but for facilities)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Plus, Upload, Lock, Globe, Image, X, Edit3, Trash2, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  listFacilityAlbums,
  listPhotos,
  createFacilityAlbum,
  updateAlbum,
  deleteAlbum,
  setCoverPhoto,
  deletePhoto
} from '@/lib/services/albums';
import { uploadPhoto, deletePhotos } from '@/lib/services/storage';
import toast from 'react-hot-toast';
import ImageLightbox from '@/components/ImageLightbox';

interface Album {
  id?: string;
  tenant_id: string;
  title: string;
  description: string;
  cover_photo_url: string;
  is_public: boolean;
  photo_count: number;
  created_at: string;
  updated_at: string;
}

interface Photo {
  id?: string;
  tenant_id: string;
  album_id: string;
  photo_url: string;
  caption: string;
  is_public: boolean;
  is_cover_photo?: boolean;
  file_size: number;
  file_type: string;
  created_at: string;
}

interface FacilityPhotoAlbumsProps {
  tenantId: string;
  canEdit: boolean;
}

export function FacilityPhotoAlbums({ tenantId, canEdit }: FacilityPhotoAlbumsProps) {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [newAlbum, setNewAlbum] = useState({
    title: '',
    description: '',
    is_public: false
  });

  useEffect(() => {
    fetchAlbums();
  }, [tenantId]);

  useEffect(() => {
    if (selectedAlbum) {
      fetchPhotos(selectedAlbum.id!);
    }
  }, [selectedAlbum]);

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      const { data: albumList, error } = await listFacilityAlbums(tenantId);
      if (error) throw error;
      setAlbums((albumList as any) || []);
    } catch (error) {
      console.error('Failed to fetch facility albums:', error);
      toast.error('Failed to load albums');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async (albumId: string) => {
    try {
      const { data: photoList, error } = await listPhotos({ 
        album_id: albumId, 
        tenant_id: tenantId, 
        isOwnProfile: true 
      });
      if (error) throw error;
      setPhotos((photoList as any) || []);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
      toast.error('Failed to load photos');
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));

    if (fileArray.length === 0) {
      toast.error('Please select valid image files');
      return;
    }

    const urls = fileArray.map(file => URL.createObjectURL(file));
    setSelectedFiles(fileArray);
    setPreviewUrls(urls);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const createAlbum = async () => {
    if (!user || !newAlbum.title.trim()) return;

    try {
      const albumData = {
        tenant_id: tenantId,
        title: newAlbum.title.trim(),
        description: newAlbum.description.trim(),
        cover_photo_url: '',
        is_public: newAlbum.is_public,
        photo_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: created, error } = await createFacilityAlbum(albumData);
      if (error) throw error;
      setAlbums(prev => [created as any, ...prev]);
      setNewAlbum({ title: '', description: '', is_public: false });
      setShowCreateAlbum(false);
      toast.success('Album created successfully! 📸');
    } catch (error) {
      console.error('Failed to create album:', error);
      toast.error('Failed to create album');
    }
  };

  const uploadPhotos = async (files: File[], albumId: string) => {
    if (!user || !files.length) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      const inserted: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const path = `facilities/${tenantId}/${albumId}/${Date.now()}-${i}-${file.name}`;
          const publicUrl = await uploadPhoto(file, path);
          const { data: photoRow, error } = await supabase.from('album_photos').insert({
            tenant_id: tenantId,
            user_id: null, // Facility photos have no user_id
            album_id: albumId,
            photo_url: publicUrl,
            caption: '',
            is_public: selectedAlbum?.is_public || false,
            file_size: file.size,
            file_type: file.type,
            created_at: new Date().toISOString()
          }).select().single();
          if (error) throw error;
          inserted.push(photoRow);
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
          errors.push(file.name);
        }
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      if (inserted.length > 0) {
        setPhotos(prev => [...inserted as any[], ...prev]);

        const updatedCount = (selectedAlbum?.photo_count || 0) + inserted.length;
        const updateData: any = {
          photo_count: updatedCount,
          updated_at: new Date().toISOString()
        };

        if (!selectedAlbum?.cover_photo_url && inserted[0]) {
          updateData.cover_photo_url = (inserted[0] as any).photo_url;
        }

        await updateAlbum(albumId, updateData);

        setAlbums(prev => prev.map(album =>
          album.id === albumId
            ? { ...album, ...updateData }
            : album
        ));

        if (selectedAlbum) {
          setSelectedAlbum(prev => prev ? { ...prev, ...updateData } : null);
        }

        toast.success(`${inserted.length} photo(s) uploaded successfully! 📸`);
      }

      if (errors.length > 0) {
        toast.error(`Failed to upload ${errors.length} photo(s)`);
      }

      setSelectedFiles([]);
      setPreviewUrls([]);
      setShowPhotoUpload(false);
    } catch (error) {
      console.error('Failed to upload photos:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteAlbumHandler = async (albumId: string) => {
    if (!confirm('Are you sure you want to delete this album? All photos will be removed.')) return;

    try {
      const { data: albumPhotos, error } = await listPhotos({ 
        album_id: albumId, 
        tenant_id: tenantId, 
        isOwnProfile: true 
      });
      if (!error && albumPhotos && (albumPhotos as any[]).length > 0) {
        const paths = (albumPhotos as any[]).map(p => {
          try { return new URL(p.photo_url).pathname.split('/object/public/photos/')[1]; } catch { return ''; }
        }).filter(Boolean);
        if (paths.length) await deletePhotos(paths);
      }

      const { error: deleteError } = await deleteAlbum(albumId);
      if (deleteError) throw deleteError;

      setAlbums(prev => prev.filter(a => a.id !== albumId));
      if (selectedAlbum?.id === albumId) {
        setSelectedAlbum(null);
      }
      toast.success('Album deleted successfully');
    } catch (error) {
      console.error('Failed to delete album:', error);
      toast.error('Failed to delete album');
    }
  };

  const handleSetCoverPhoto = async (photoId: string, albumId: string) => {
    if (!canEdit) return;

    try {
      const { error } = await setCoverPhoto(photoId, albumId);
      if (error) throw error;

      // Update local state
      setPhotos(prev => prev.map(p => ({
        ...p,
        is_cover_photo: p.id === photoId
      })));

      // Update album's cover_photo_url in local state
      const photo = photos.find(p => p.id === photoId);
      if (photo) {
        setAlbums(prev => prev.map(a =>
          a.id === albumId ? { ...a, cover_photo_url: photo.photo_url } : a
        ));
        if (selectedAlbum?.id === albumId) {
          setSelectedAlbum(prev => prev ? { ...prev, cover_photo_url: photo.photo_url } : null);
        }
      }

      toast.success('Cover photo updated! ⭐');
    } catch (error) {
      console.error('Failed to set cover photo:', error);
      toast.error('Failed to set cover photo');
    }
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!canEdit) return;

    // Confirmation dialog
    if (!window.confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return;
    }

    try {
      // Extract storage path from URL
      const path = (() => {
        try {
          return new URL(photoUrl).pathname.split('/object/public/photos/')[1];
        } catch {
          return '';
        }
      })();

      // Delete from database first (RLS will handle authorization)
      const { error: dbError } = await deletePhoto(photoId);
      if (dbError) throw dbError;

      // Delete from storage if path was extracted
      if (path) {
        await deletePhotos([path]);
      }

      // Update local state - remove photo from list
      setPhotos(prev => prev.filter(p => p.id !== photoId));

      // If lightbox is open and we deleted the current photo, adjust index
      if (lightboxOpen) {
        const currentPhotoIndex = photos.findIndex(p => p.id === photoId);
        if (currentPhotoIndex === lightboxIndex) {
          // If it's the last photo, close lightbox
          if (photos.length === 1) {
            setLightboxOpen(false);
          } else if (currentPhotoIndex === photos.length - 1) {
            // If it's the last photo in the array, go to previous
            setLightboxIndex(currentPhotoIndex - 1);
          }
          // Otherwise, stay at same index (which will show next photo)
        } else if (currentPhotoIndex < lightboxIndex) {
          // If we deleted a photo before the current one, adjust index
          setLightboxIndex(lightboxIndex - 1);
        }
      }

      toast.success('Photo deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete photo:', error);
      toast.error(error.message || 'Failed to delete photo');
    }
  };

  const handleDeletePhotoByIndex = (index: number) => {
    const photo = photos[index];
    if (photo?.id && photo?.photo_url) {
      handleDeletePhoto(photo.id, photo.photo_url);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!selectedAlbum ? (
        /* Albums Grid */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Photo Albums</h3>
            {canEdit && (
              <button
                onClick={() => setShowCreateAlbum(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Album
              </button>
            )}
          </div>

          {albums.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No photo albums yet</p>
              {canEdit && (
                <button
                  onClick={() => setShowCreateAlbum(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Create Your First Album
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {albums.map(album => (
                <div
                  key={album.id}
                  onClick={() => setSelectedAlbum(album)}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    {album.cover_photo_url ? (
                      <img
                        src={album.cover_photo_url}
                        alt={album.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-1">{album.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{album.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{album.photo_count} photo{album.photo_count !== 1 ? 's' : ''}</span>
                      {album.is_public ? (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Public
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Private
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Album View - Photos Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedAlbum(null)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Albums
              </button>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedAlbum.title}</h3>
                <p className="text-sm text-gray-600">{selectedAlbum.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <>
                  <button
                    onClick={() => setShowPhotoUpload(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    Add Photos
                  </button>
                  <button
                    onClick={() => deleteAlbumHandler(selectedAlbum.id!)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Album
                  </button>
                </>
              )}
            </div>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No photos in this album yet</p>
              {canEdit && (
                <button
                  onClick={() => setShowPhotoUpload(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Add Photos
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo, index) => (
                <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || 'Photo'}
                    className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => {
                      setLightboxIndex(index);
                      setLightboxOpen(true);
                    }}
                  />

                  {/* Cover Photo Badge */}
                  {photo.is_cover_photo && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-lg">
                      <Star className="w-3 h-3 fill-current" />
                      Cover
                    </div>
                  )}

                  {/* Action Buttons (only for users with edit permissions) */}
                  {canEdit && (
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (photo.id && photo.photo_url) {
                            handleDeletePhoto(photo.id, photo.photo_url);
                          }
                        }}
                        className="bg-red-500/90 hover:bg-red-600 text-white p-1.5 rounded-lg shadow-lg transition-colors"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Set as Cover Button */}
                      {!photo.is_cover_photo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (photo.id && selectedAlbum?.id) {
                              handleSetCoverPhoto(photo.id, selectedAlbum.id);
                            }
                          }}
                          className="bg-white/90 hover:bg-white text-gray-700 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow-lg"
                        >
                          <Star className="w-3 h-3" />
                          Set as Cover
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Album Modal */}
      <AnimatePresence>
        {showCreateAlbum && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Create New Album</h3>
                <button
                  onClick={() => setShowCreateAlbum(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Album Title</label>
                  <input
                    type="text"
                    value={newAlbum.title}
                    onChange={(e) => setNewAlbum(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Facility Events"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newAlbum.description}
                    onChange={(e) => setNewAlbum(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Album description..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="album-public"
                    checked={newAlbum.is_public}
                    onChange={(e) => setNewAlbum(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="album-public" className="text-sm text-gray-700">
                    Make this album public
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={createAlbum}
                    disabled={!newAlbum.title.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Create Album
                  </button>
                  <button
                    onClick={() => setShowCreateAlbum(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Photos Modal */}
      <AnimatePresence>
        {showPhotoUpload && selectedAlbum && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Add Photos to {selectedAlbum.title}</h3>
                <button
                  onClick={() => {
                    setShowPhotoUpload(false);
                    setSelectedFiles([]);
                    setPreviewUrls([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={uploading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    id="photo-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="photo-upload" className={uploading ? 'cursor-not-allowed' : 'cursor-pointer'}>
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                    <p className="text-gray-600 font-medium mb-2">
                      {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </label>
                </div>

                {/* Preview */}
                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Progress */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => uploadPhotos(selectedFiles, selectedAlbum.id!)}
                    disabled={selectedFiles.length === 0 || uploading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photo${selectedFiles.length !== 1 ? 's' : ''}`}
                  </button>
                  <button
                    onClick={() => {
                      setShowPhotoUpload(false);
                      setSelectedFiles([]);
                      setPreviewUrls([]);
                    }}
                    disabled={uploading}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Lightbox */}
      <ImageLightbox
        images={photos.map(photo => ({
          src: photo.photo_url,
          alt: photo.caption || 'Photo',
          caption: photo.caption
        }))}
        open={lightboxOpen}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
        onDelete={canEdit ? handleDeletePhotoByIndex : undefined}
        canDelete={canEdit}
      />
    </div>
  );
}

