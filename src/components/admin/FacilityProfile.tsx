/**
 * Facility Profile Component
 * Comprehensive facility profile view with edit mode, photo albums, user management, and group management
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Edit3, Save, X, Camera, Users, FolderOpen, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { getTenant, updateTenant, type Tenant } from '@/lib/services/tenants';
import { uploadPhoto } from '@/lib/services/storage';
import toast from 'react-hot-toast';
import { FacilityPhotoAlbums } from './FacilityPhotoAlbums';
import { FacilityUserManagement } from './FacilityUserManagement';
import { FacilityGroupManagement } from './FacilityGroupManagement';

interface FacilityProfileProps {
  tenantId: string;
  tenantName: string;
  onUpdate?: () => void;
}

type TabType = 'profile' | 'albums' | 'users' | 'groups';

export function FacilityProfile({ tenantId, tenantName, onUpdate }: FacilityProfileProps) {
  console.log('[FacilityProfile] Rendering with tenantId:', tenantId, 'tenantName:', tenantName);

  const { user } = useAuth();
  const { isSuperUser, isFacilityAdmin } = useUserRole(tenantId);

  const [facility, setFacility] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    profile_picture_url: ''
  });

  const canEdit = isSuperUser || isFacilityAdmin;

  useEffect(() => {
    fetchFacility();
  }, [tenantId]);

  const fetchFacility = async () => {
    try {
      console.log('[FacilityProfile] Fetching facility data for tenantId:', tenantId);
      setLoading(true);
      const { data, error } = await getTenant(tenantId);
      if (error) throw error;

      if (data) {
        console.log('[FacilityProfile] Facility data loaded:', data);
        setFacility(data);
        setEditForm({
          name: data.name || '',
          bio: data.bio || '',
          profile_picture_url: data.profile_picture_url || ''
        });
      }
    } catch (error) {
      console.error('[FacilityProfile] Failed to fetch facility:', error);
      toast.error('Failed to load facility details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!facility) return;

    try {
      setSaving(true);
      const { error } = await updateTenant(tenantId, {
        name: editForm.name.trim(),
        bio: editForm.bio.trim(),
        profile_picture_url: editForm.profile_picture_url
      });

      if (error) throw error;

      setFacility({ ...facility, ...editForm });
      setIsEditing(false);
      toast.success('Facility profile updated successfully! 🎉');
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update facility:', error);
      toast.error('Failed to update facility profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!facility) return;

    try {
      setUploadingPhoto(true);
      const path = `facilities/${tenantId}/profile-${Date.now()}-${file.name}`;
      const newPhotoUrl = await uploadPhoto(file, path);

      const { error } = await updateTenant(tenantId, {
        profile_picture_url: newPhotoUrl
      });

      if (error) throw error;

      setFacility({ ...facility, profile_picture_url: newPhotoUrl });
      setEditForm(prev => ({ ...prev, profile_picture_url: newPhotoUrl }));
      toast.success('Facility photo updated successfully! 📸');
      onUpdate?.();
    } catch (error) {
      console.error('Failed to upload facility photo:', error);
      toast.error('Failed to upload facility photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCancel = () => {
    if (facility) {
      setEditForm({
        name: facility.name || '',
        bio: facility.bio || '',
        profile_picture_url: facility.profile_picture_url || ''
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    console.log('[FacilityProfile] Loading state...');
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!facility) {
    console.log('[FacilityProfile] No facility data found');
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Facility not found</p>
        </div>
      </div>
    );
  }

  console.log('[FacilityProfile] Rendering facility profile for:', facility.name);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">{facility.name}</h2>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Profile
            </div>
          </button>
          <button
            onClick={() => setActiveTab('albums')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'albums'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Photo Albums
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </div>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'groups'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Groups
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg p-6"
        >
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Facility Information</h3>
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            )}
            {canEdit && isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Picture */}
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center mx-auto relative border-2 border-gray-200">
                  {(isEditing ? editForm.profile_picture_url : facility.profile_picture_url) ? (
                    <img
                      src={isEditing ? editForm.profile_picture_url : facility.profile_picture_url}
                      alt={facility.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-16 h-16 text-gray-400" />
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                    </div>
                  )}
                </div>
                {canEdit && (
                  <div className="absolute bottom-0 right-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handlePhotoUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="facility-photo-upload"
                    />
                    <label
                      htmlFor="facility-photo-upload"
                      className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-lg"
                    >
                      <Camera size={16} />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Facility Details */}
            <div className="lg:col-span-2 space-y-4">
              {/* Facility Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Facility Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Facility name"
                  />
                ) : (
                  <div className="text-lg text-gray-900">{facility.name || 'Not set'}</div>
                )}
              </div>

              {/* Bio/Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                {isEditing ? (
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Facility description..."
                    rows={4}
                    maxLength={1000}
                  />
                ) : (
                  <div className="text-gray-700">{facility.bio || 'No description provided'}</div>
                )}
                {isEditing && (
                  <div className="text-xs text-gray-500 mt-1">
                    {editForm.bio.length}/1000 characters
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'albums' && (
        <FacilityPhotoAlbums tenantId={tenantId} canEdit={canEdit} />
      )}

      {activeTab === 'users' && (
        <FacilityUserManagement tenantId={tenantId} tenantName={facility.name} canEdit={canEdit} onUpdate={onUpdate} />
      )}

      {activeTab === 'groups' && (
        <FacilityGroupManagement tenantId={tenantId} tenantName={facility.name} canEdit={canEdit} onUpdate={onUpdate} />
      )}
    </div>
  );
}

