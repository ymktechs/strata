import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  AVATAR_COLORS,
  AvatarColor,
  LIMITS,
  PRESENCE_STATES,
  PresenceState,
} from '../lib/validation';
import { UserProfile } from '../types/workspace';
import { Avatar, PRESENCE_LABEL_MAP } from './Avatar';

interface AccountSetupModalProps {
  uid: string;
  email: string;
  defaultDisplayName: string;
  existingProfile: UserProfile | null;
  onSave: (data: {
    displayName: string;
    jobTitle: string;
    department: string;
    statusText: string;
    presence: PresenceState;
    avatarColor: AvatarColor;
  }) => Promise<void>;
  onClose?: () => void;
  onSignOut?: () => void;
}

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Operations',
  'Executive',
  'Security',
  'Growth & Sales',
  'Customer Success',
];

export const AccountSetupModal: React.FC<AccountSetupModalProps> = ({
  email,
  defaultDisplayName,
  existingProfile,
  onSave,
  onClose,
  onSignOut,
}) => {
  const [displayName, setDisplayName] = useState(
    existingProfile?.displayName || defaultDisplayName || ''
  );
  const [jobTitle, setJobTitle] = useState(existingProfile?.jobTitle || 'Software Engineer');
  const [department, setDepartment] = useState(existingProfile?.department || 'Engineering');
  const [statusText, setStatusText] = useState(
    existingProfile?.statusText || 'Available in workspace'
  );
  const [presence, setPresence] = useState<PresenceState>(existingProfile?.presence || 'online');
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(
    existingProfile?.avatarColor || 'indigo'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !jobTitle.trim() || !department.trim()) {
      setError('Please fill in your display name, job title, and department.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        displayName: displayName.trim(),
        jobTitle: jobTitle.trim(),
        department: department.trim(),
        statusText: statusText.trim(),
        presence,
        avatarColor,
      });
      if (onClose) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {existingProfile ? 'Edit Workspace Member Profile' : 'Complete Your Member Account'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {existingProfile
                ? 'Changes automatically sync to your active organization directory.'
                : `Signed in as ${email}. Set up how colleagues see you in your organization.`}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Live Profile Preview Row */}
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <Avatar
              name={displayName || 'Team Member'}
              color={avatarColor}
              presence={presence}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {displayName || 'Your Name'}
              </div>
              <div className="text-xs text-slate-600 truncate">
                {jobTitle || 'Role'} · {department || 'Department'}
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {PRESENCE_LABEL_MAP[presence]}
                {statusText ? ` · "${statusText}"` : ''}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Display Name
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.DISPLAY_NAME_MAX}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Elena Vance"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Job Title / Role
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.JOB_TITLE_MAX}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Product Engineer"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Availability Status
              </label>
              <select
                value={presence}
                onChange={(e) => setPresence(e.target.value as PresenceState)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {PRESENCE_STATES.map((state) => (
                  <option key={state} value={state}>
                    {PRESENCE_LABEL_MAP[state]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Status Note</label>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {statusText.length}/{LIMITS.STATUS_TEXT_MAX}
              </span>
            </div>
            <input
              type="text"
              maxLength={LIMITS.STATUS_TEXT_MAX}
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="Working on Q4 launch..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Avatar Theme Color
            </label>
            <div className="flex items-center gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border capitalize transition-colors cursor-pointer ${
                    avatarColor === color
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            {onSignOut && !existingProfile ? (
              <button
                type="button"
                onClick={onSignOut}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Sign out
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
              >
                {isSubmitting
                  ? 'Saving Profile...'
                  : existingProfile
                  ? 'Save Profile Changes'
                  : 'Save Account & Continue →'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
