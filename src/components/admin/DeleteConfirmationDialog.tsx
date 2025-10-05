/**
 * Delete Confirmation Dialog
 * Generic confirmation dialog for delete operations
 */

import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

export interface DeleteConfirmationProps {
  title: string;
  message: string;
  entityName: string;
  entityType: 'facility' | 'group' | 'user' | 'membership';
  warningMessage?: string;
  confirmText?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({
  title,
  message,
  entityName,
  entityType,
  warningMessage,
  confirmText = 'Delete',
  onConfirm,
  onCancel
}: DeleteConfirmationProps) {
  const [loading, setLoading] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');

  const requiresConfirmation = entityType === 'facility' || entityType === 'group';
  const isConfirmed = !requiresConfirmation || confirmationInput === entityName;

  const handleConfirm = async () => {
    if (!isConfirmed) return;

    setLoading(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (entityType) {
      case 'facility':
        return 'bg-red-100 text-red-600';
      case 'group':
        return 'bg-orange-100 text-orange-600';
      case 'user':
      case 'membership':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-red-100 text-red-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIcon()}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Message */}
          <p className="text-gray-700">{message}</p>

          {/* Entity Name Display */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-600 mb-1">
              {entityType === 'facility' ? 'Facility' : entityType === 'group' ? 'Group' : 'Item'} to delete:
            </p>
            <p className="font-semibold text-gray-900">{entityName}</p>
          </div>

          {/* Warning Message */}
          {warningMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{warningMessage}</p>
            </div>
          )}

          {/* Confirmation Input (for facilities and groups) */}
          {requiresConfirmation && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-mono bg-gray-100 px-1 rounded">{entityName}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder={entityName}
                disabled={loading}
                autoFocus
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !isConfirmed}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {confirmText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

