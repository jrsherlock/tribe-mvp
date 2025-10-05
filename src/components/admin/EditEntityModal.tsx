/**
 * Edit Entity Modal
 * Generic modal for editing facility, group, or user properties
 */

import React, { useState } from 'react';
import { X, Building2, Users, User, AlertCircle, Save } from 'lucide-react';
import { updateTenant } from '@/lib/services/tenants';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export type EntityType = 'facility' | 'group' | 'user';

export interface EditFacilityData {
  id: string;
  name: string;
  slug: string;
}

export interface EditGroupData {
  id: string;
  name: string;
  description: string | null;
}

export interface EditUserData {
  id: string;
  display_name: string;
  email: string;
}

export type EditEntityData = EditFacilityData | EditGroupData | EditUserData;

interface EditEntityModalProps {
  entityType: EntityType;
  data: EditEntityData;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEntityModal({ entityType, data, onClose, onSuccess }: EditEntityModalProps) {
  const [formData, setFormData] = useState(data);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (entityType === 'facility') {
        const facilityData = formData as EditFacilityData;
        const { error: updateError } = await updateTenant(facilityData.id, {
          name: facilityData.name.trim(),
          slug: facilityData.slug.trim()
        });

        if (updateError) throw updateError;
        toast.success('Facility updated successfully!');
      } else if (entityType === 'group') {
        const groupData = formData as EditGroupData;
        const { error: updateError } = await supabase
          .from('groups')
          .update({
            name: groupData.name.trim(),
            description: groupData.description?.trim() || null
          })
          .eq('id', groupData.id);

        if (updateError) throw updateError;
        toast.success('Group updated successfully!');
      } else if (entityType === 'user') {
        const userData = formData as EditUserData;
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            display_name: userData.display_name.trim()
          })
          .eq('id', userData.id);

        if (updateError) throw updateError;
        toast.success('User profile updated successfully!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update');
      toast.error(err.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (entityType) {
      case 'facility':
        return { Icon: Building2, color: 'blue' };
      case 'group':
        return { Icon: Users, color: 'green' };
      case 'user':
        return { Icon: User, color: 'purple' };
    }
  };

  const { Icon, color } = getIcon();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-${color}-100 rounded-lg flex items-center justify-center`}>
              <Icon className={`w-5 h-5 text-${color}-600`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Edit {entityType === 'facility' ? 'Facility' : entityType === 'group' ? 'Group' : 'User'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Facility Fields */}
          {entityType === 'facility' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={(formData as EditFacilityData).name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={(formData as EditFacilityData).slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  required
                  disabled={loading}
                  pattern="[a-z0-9-]+"
                />
              </div>
            </>
          )}

          {/* Group Fields */}
          {entityType === 'group' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={(formData as EditGroupData).name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={(formData as EditGroupData).description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {/* User Fields */}
          {entityType === 'user' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={(formData as EditUserData).display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={(formData as EditUserData).email}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

