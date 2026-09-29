import React, { useState } from 'react';
import { Hash, Megaphone, X } from 'lucide-react';
import { ChannelCategory, ChannelKind, LIMITS } from '../lib/validation';

interface CreateChannelModalProps {
  onClose: () => void;
  onCreate: (params: {
    name: string;
    topic: string;
    category: ChannelCategory;
    kind: ChannelKind;
  }) => Promise<void>;
}

const CATEGORIES: { value: ChannelCategory; label: string }[] = [
  { value: 'general', label: 'General & Cross-Team' },
  { value: 'engineering', label: 'Engineering & Technical' },
  { value: 'product', label: 'Product & Design' },
  { value: 'operations', label: 'Operations & Go-To-Market' },
  { value: 'announcements', label: 'Announcements' },
];

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<ChannelCategory>('general');
  const [kind, setKind] = useState<ChannelKind>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanedName) {
      setError('Please enter a valid channel name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate({
        name: cleanedName,
        topic: topic.trim() || `Discussions and updates for #${cleanedName}`,
        category: kind === 'announcement' ? 'announcements' : category,
        kind,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Create Organization Channel</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Channels organize conversations around a department, project, or topic.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Channel Type
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setKind('public')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  kind === 'public'
                    ? 'border-indigo-600 bg-indigo-50/40 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Standard Channel</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Open collaboration for all organization members.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setKind('announcement');
                  setCategory('announcements');
                }}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  kind === 'announcement'
                    ? 'border-indigo-600 bg-indigo-50/40 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <Megaphone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Broadcast Channel</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  High-signal updates and key milestone broadcasts.
                </p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-slate-400 font-mono">#</span>
              <input
                type="text"
                required
                maxLength={LIMITS.CHANNEL_NAME_MAX}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="design-systems"
                className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {kind === 'public' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category Group
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ChannelCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Channel Topic</label>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {topic.length}/{LIMITS.CHANNEL_TOPIC_MAX}
              </span>
            </div>
            <input
              type="text"
              maxLength={LIMITS.CHANNEL_TOPIC_MAX}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What does the team coordinate here?"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
