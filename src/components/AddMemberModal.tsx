import React, { useState } from 'react';
import { CaricatureType, NewMemberInput } from '../types/member';
import { Caricature } from './Caricature';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: NewMemberInput) => Promise<void>;
}

const CARICATURE_OPTIONS: { key: CaricatureType; label: string }[] = [
  { key: 'boy', label: 'Young Boy' },
  { key: 'girl', label: 'Young Girl' },
  { key: 'jishnu', label: 'Jishnu' },
  { key: 'ashna', label: 'Ashna' },
  { key: 'raju', label: 'Raju' },
  { key: 'lalitha', label: 'Lalitha' },
  { key: 'elder', label: 'Grandparent' },
  { key: 'pet', label: 'Family Pet' },
];

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [role, setRole] = useState('');
  const [caricatureKey, setCaricatureKey] = useState<CaricatureType>('boy');
  const [imageUrl, setImageUrl] = useState('');
  const [bio, setBio] = useState('');
  const [quote, setQuote] = useState('');
  const [tags, setTags] = useState<string[]>(['🏡 Family Member']);
  const [newTagInput, setNewTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = () => {
    const clean = newTagInput.trim();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = mobileNumber.trim();

    if (!cleanName) {
      setError('Name is required.');
      return;
    }
    if (!cleanPhone) {
      setError('Mobile Number is mandatory for member login.');
      return;
    }
    if (cleanPhone === '2000') {
      setError('Mobile number "2000" is reserved for Admin login. Please enter a different number.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onAdd({
        name: cleanName,
        mobile_number: cleanPhone,
        role: role.trim() || 'Family Member',
        caricature_key: caricatureKey,
        image_url: imageUrl.trim() || undefined,
        bio: bio.trim() || undefined,
        quote: quote.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      // Reset form
      setName('');
      setMobileNumber('');
      setRole('');
      setCaricatureKey('boy');
      setImageUrl('');
      setBio('');
      setQuote('');
      setTags(['🏡 Family Member']);
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h3 className="text-lg font-extrabold text-slate-800">Add New Family Member</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maya"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Role / Title
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Science Explorer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium outline-hidden"
              />
            </div>
          </div>

          {/* Mandatory Mobile Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mobile Number (Mandatory for Login) <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="e.g. 9876543214 (Used by this member to log in)"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              🔒 Mandatory: The member will use this mobile number to log in and access their profile.
            </p>
          </div>

          {/* Avatar / Image Add or Remove */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Profile Photo / Avatar
            </label>

            {imageUrl ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-sm shrink-0">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-emerald-600 block">✓ Custom photo selected</span>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold inline-flex items-center gap-1 hover:underline"
                  >
                    ✕ Remove Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 px-3 py-2 rounded-xl text-slate-700 shadow-2xs transition">
                    <span>📷 Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-400">or use caricature below</span>
                </div>
              </div>
            )}

            {/* Caricature style picker */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Caricature Style (fallback if no photo):
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {CARICATURE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setCaricatureKey(opt.key)}
                    className={`p-1.5 rounded-xl border-2 transition flex flex-col items-center gap-1 ${
                      caricatureKey === opt.key
                        ? 'border-indigo-600 bg-indigo-50 shadow-xs scale-105'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-7 h-7">
                      <Caricature type={opt.key} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 truncate w-full text-center">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tags Add / Remove */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Member Tags & Hobbies
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-xl text-xs font-semibold"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-rose-600 font-bold text-xs"
                    title="Remove tag"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="e.g. 🎨 Painter or 🚀 Space Fan"
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 transition"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Bio / Story */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Personal Story / Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="A few lines about what makes this member special..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-medium outline-hidden"
            />
          </div>

          {/* Quote */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Family Motto / Favorite Quote
            </label>
            <input
              type="text"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="e.g. Kindness begins with a smile."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs font-medium outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Member to Family'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
