import React, { useState, useEffect } from 'react';
import { FamilyMember, CaricatureType } from '../types/member';
import { Caricature } from './Caricature';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FamilyMember;
  allMembers?: FamilyMember[];
  onSave: (id: string, updates: Partial<FamilyMember>) => Promise<void>;
}

const CARICATURE_OPTIONS: { key: CaricatureType; label: string }[] = [
  { key: 'boy', label: 'Young Boy' },
  { key: 'girl', label: 'Young Girl' },
  { key: 'jishnu', label: 'Modern Geek' },
  { key: 'ashna', label: 'Creative Artist' },
  { key: 'raju', label: 'Wise Elder' },
  { key: 'lalitha', label: 'Master Chef' },
  { key: 'elder', label: 'Grandparent' },
  { key: 'pet', label: 'Pet' },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  member,
  allMembers = [],
  onSave,
}) => {
  const [name, setName] = useState(member.name);
  const [mobileNumber, setMobileNumber] = useState(member.mobile_number || '');
  const [role, setRole] = useState(member.role || '');
  const [caricatureKey, setCaricatureKey] = useState<CaricatureType>(member.caricature_key);
  const [imageUrl, setImageUrl] = useState<string>(member.image_url || '');
  const [bio, setBio] = useState(member.bio || '');
  const [quote, setQuote] = useState(member.quote || '');
  const [tags, setTags] = useState<string[]>(member.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [roomTitle, setRoomTitle] = useState(member.room_title || '');
  const [roomDesc, setRoomDesc] = useState(member.room_desc || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(member.name);
    setMobileNumber(member.mobile_number || '');
    setRole(member.role || '');
    setCaricatureKey(member.caricature_key);
    setImageUrl(member.image_url || '');
    setBio(member.bio || '');
    setQuote(member.quote || '');
    setTags(member.tags || []);
    setRoomTitle(member.room_title || '');
    setRoomDesc(member.room_desc || '');
    setError(null);
  }, [member]);

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

  const handleRemoveImage = () => {
    setImageUrl('');
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
      setError('Please enter a name.');
      return;
    }
    if (!cleanPhone) {
      setError('Please enter a mobile phone number.');
      return;
    }
    if (cleanPhone === '2000') {
      setError('This number format is reserved. Please enter a valid mobile phone number.');
      return;
    }

    const isDuplicate = allMembers.some(
      (m) => m.id !== member.id && String(m.mobile_number || '').trim() === cleanPhone
    );
    if (isDuplicate) {
      setError('This mobile number is already registered to another family member.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const updates: Partial<FamilyMember> = {
        name: cleanName,
        mobile_number: cleanPhone,
        role: role.trim() || member.role,
        caricature_key: caricatureKey,
        bio: bio.trim() || member.bio,
        quote: quote.trim() || member.quote,
        tags,
        room_title: roomTitle.trim() || member.room_title,
        room_desc: roomDesc.trim() || member.room_desc,
      };

      // Handle image updates explicitly so existing photos are never lost
      if (imageUrl !== member.image_url) {
        updates.image_url = imageUrl;
      }

      await onSave(member.id, updates);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving profile';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">Edit Member Profile</h3>
              <p className="text-[11px] text-slate-400">Editing {member.name}'s details</p>
            </div>
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
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
                placeholder="e.g. Tech Explorer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium outline-hidden"
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mobile Number (Used for Login) <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="e.g. 9876543210"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium outline-hidden"
            />
          </div>

          {/* Profile Photo / Avatar (Add / Remove) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Profile Photo (Add / Remove Image)
            </label>

            {imageUrl ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-sm shrink-0">
                  <img src={imageUrl} alt="Profile preview" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-emerald-600 block">✓ Custom photo active</span>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                      Change Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1"
                    >
                      ✕ Remove Photo
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0">
                    <Caricature type={caricatureKey} />
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 px-3 py-2 rounded-xl text-slate-700 shadow-2xs transition">
                    <span>📷 Upload Custom Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Caricature selection */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Caricature Avatar Style:
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

          {/* Member Tags (Add / Remove) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tags & Hobbies (Add / Remove)
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
                    title={`Remove tag "${tag}"`}
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
                placeholder="e.g. 💻 Tech Lover or ☕ Coffee Fan"
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 transition"
              >
                + Add Tag
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
              rows={3}
              placeholder="About this family member..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-medium outline-hidden"
            />
          </div>

          {/* Motto / Quote */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Favorite Motto / Quote
            </label>
            <input
              type="text"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Favorite quote..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs font-medium outline-hidden"
            />
          </div>

          {/* Room Sanctuary Details */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              🛋️ Room Sanctuary Settings
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Room Title / Corner Name
                </label>
                <input
                  type="text"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  placeholder="e.g. Creative Haven"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 bg-white text-xs outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Room Description
                </label>
                <input
                  type="text"
                  value={roomDesc}
                  onChange={(e) => setRoomDesc(e.target.value)}
                  placeholder="e.g. Sunlit room with watercolors"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 bg-white text-xs outline-hidden"
                />
              </div>
            </div>
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
              {isSubmitting ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
