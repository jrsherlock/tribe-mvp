/**
 * Create Facility Modal
 * SuperUser only - Create new tenant/facility
 */

import React, { useState } from 'react';
import { X, Building2, AlertCircle } from 'lucide-react';
import { createTenantRPC } from '@/lib/services/tenants';
import toast from 'react-hot-toast';

interface CreateFacilityModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateFacilityModal({ onClose, onSuccess }: CreateFacilityModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug: lowercase, replace spaces with hyphens, remove special chars
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Facility name is required');
      return;
    }

    if (!slug.trim()) {
      setError('Slug is required');
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError('Slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    setLoading(true);
    try {
      const { error: createError } = await createTenantRPC({
        name: name.trim(),
        slug: slug.trim()
      });

      if (createError) {
        throw new Error(createError.message || 'Failed to create facility');
      }

      toast.success(`Facility "${name}" created successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Create facility error:', err);
      setError(err.message || 'Failed to create facility');
      toast.error(err.message || 'Failed to create facility');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create Facility</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Add a new facility to the platform
              </p>
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

          {/* Facility Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facility Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Serenity Recovery Center"
              required
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              The display name for this facility
            </p>
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="e.g., serenity-recovery-center"
              required
              disabled={loading}
              pattern="[a-z0-9-]+"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL-friendly identifier (lowercase, hyphens only)
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> A "Default Group" will be automatically created for this facility.
            </p>
          </div>

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
              disabled={loading || !name.trim() || !slug.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </span>
              ) : (
                'Create Facility'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

