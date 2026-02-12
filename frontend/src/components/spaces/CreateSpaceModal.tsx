'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Globe, Lock } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useSpaceStore } from '@/stores/space-store';
import { api } from '@/lib/api';

export function CreateSpaceModal() {
  const { createSpaceModalOpen, setCreateSpaceModal } = useUIStore();
  const { fetchSpaces } = useSpaceStore();
  const router = useRouter();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate key from name
    if (!key || key === generateKey(name)) {
      setKey(generateKey(value));
    }
  };

  const generateKey = (str: string) =>
    str
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);

  const isKeyValid = /^[A-Z][A-Z0-9]{1,9}$/.test(key);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isKeyValid) return;

    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/spaces', {
        name: name.trim(),
        key,
        description: description.trim() || undefined,
        visibility,
      });
      await fetchSpaces();
      handleClose();
      router.push(`/spaces/${data.key}/board`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create space');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCreateSpaceModal(false);
    setName('');
    setKey('');
    setDescription('');
    setVisibility('PRIVATE');
    setError('');
  };

  if (!createSpaceModalOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Create Space</h2>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Space name <span className="text-red-400">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Engineering, Product"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition"
                autoFocus
              />
            </div>

            {/* Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Space key <span className="text-red-400">*</span>
              </label>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                placeholder="e.g. ENG"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:border-brand-500 transition"
              />
              {key && !isKeyValid && (
                <p className="text-xs text-red-400 mt-1">
                  Key must start with a letter and be 2–10 alphanumeric characters
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Used as prefix for task IDs (e.g., {key || 'KEY'}-1, {key || 'KEY'}-2)
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this space for?"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition resize-none"
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setVisibility('PRIVATE')}
                  className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                    visibility === 'PRIVATE'
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Lock className={`w-5 h-5 ${visibility === 'PRIVATE' ? 'text-brand-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className="text-sm font-medium">Private</div>
                    <div className="text-2xs text-gray-400">Members only</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('PUBLIC')}
                  className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                    visibility === 'PUBLIC'
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Globe className={`w-5 h-5 ${visibility === 'PUBLIC' ? 'text-brand-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className="text-sm font-medium">Public</div>
                    <div className="text-2xs text-gray-400">Anyone can see</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || !isKeyValid || loading}
                className="btn-primary"
              >
                {loading ? 'Creating...' : 'Create Space'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
