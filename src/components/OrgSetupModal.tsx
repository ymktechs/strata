import React, { useState } from 'react';
import { Building2, KeyRound, Plus, Users, X } from 'lucide-react';
import { generateInviteCode, LIMITS } from '../lib/validation';
import { UserMembership, UserProfile } from '../types/workspace';

interface OrgSetupModalProps {
  userProfile: UserProfile;
  existingMemberships: UserMembership[];
  onCreateOrg: (params: {
    name: string;
    industry: string;
    description: string;
    customInviteCode?: string;
  }) => Promise<void>;
  onJoinOrg: (inviteCode: string) => Promise<void>;
  onSelectExistingOrg?: (orgId: string) => Promise<void>;
  onClose?: () => void;
  onSignOut?: () => void;
}

const INDUSTRIES = [
  'Enterprise Software',
  'Artificial Intelligence & Data',
  'Financial Infrastructure',
  'Biotech & Healthcare',
  'Hardware & Robotics',
  'Creative & Design Studio',
  'Education & Research',
  'Operations & Logistics',
];

export const OrgSetupModal: React.FC<OrgSetupModalProps> = ({
  userProfile,
  existingMemberships,
  onCreateOrg,
  onJoinOrg,
  onSelectExistingOrg,
  onClose,
  onSignOut,
}) => {
  const [mode, setMode] = useState<'join' | 'create'>('create');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [description, setDescription] = useState('');
  const [customInviteCode, setCustomInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOrgNameChange = (val: string) => {
    setOrgName(val);
    if (!customInviteCode || customInviteCode.startsWith(orgName.slice(0, 3).toUpperCase())) {
      setCustomInviteCode(generateInviteCode(val));
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) {
      setError('Please enter your organization invite code.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onJoinOrg(inviteCodeInput.trim().toUpperCase());
      if (onClose) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to join organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orgName.trim().length < LIMITS.ORG_NAME_MIN) {
      setError('Organization name must be at least 2 characters.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreateOrg({
        name: orgName.trim(),
        industry,
        description:
          description.trim() ||
          `${orgName.trim()} internal communication workspace for team channels and direct messaging.`,
        customInviteCode: customInviteCode.trim().toUpperCase(),
      });
      if (onClose) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Welcome, {userProfile.displayName}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Create a new organization workspace or join your colleagues using an organization
              invite code.
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

        {/* If user already belongs to organizations, show quick switch list */}
        {existingMemberships.length > 0 && onSelectExistingOrg && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Your Existing Organization Workspaces
            </div>
            <div className="flex flex-wrap gap-2">
              {existingMemberships.map((m) => (
                <button
                  key={m.membershipId}
                  type="button"
                  onClick={async () => {
                    await onSelectExistingOrg(m.orgId);
                    if (onClose) onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md hover:border-indigo-600 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {m.orgName} · <span className="font-mono">{m.inviteCode}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Segmented Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'create'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Organization Workspace</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('join');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'join'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Join with Invite Code</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        {mode === 'create' ? (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={LIMITS.ORG_NAME_MAX}
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  placeholder="e.g. Aether Systems"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Industry / Sector
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Shareable Organization Invite Code
                </label>
                <span className="text-xs text-slate-500">
                  Teammates use this code to join your workspace
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={LIMITS.INVITE_CODE_MAX}
                value={customInviteCode}
                onChange={(e) =>
                  setCustomInviteCode(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9_\-]/g, '')
                  )
                }
                placeholder="e.g. AETHER-2026"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Workspace Mission / Description
                </label>
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  {description.length}/{LIMITS.ORG_DESC_MAX}
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={LIMITS.ORG_DESC_MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Central workspace for product engineering, operations, and leadership."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>What gets provisioned automatically:</span>
              </div>
              <div>
                · Starter channels: <span className="font-mono">#announcements</span>,{' '}
                <span className="font-mono">#general</span>, and{' '}
                <span className="font-mono">#engineering-ops</span>
              </div>
              <div>
                · Member directory with your founder profile and shareable invite code
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {onSignOut && !onClose ? (
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
                  {isSubmitting ? 'Provisioning Workspace...' : 'Create Organization Workspace →'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter Organization Invite Code
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.INVITE_CODE_MAX}
                value={inviteCodeInput}
                onChange={(e) =>
                  setInviteCodeInput(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9_\-]/g, '')
                  )
                }
                placeholder="e.g. AETHER-2026"
                className="w-full px-3.5 py-2.5 text-base font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 uppercase tracking-wider"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Ask your organization administrator or colleague for the invite code displayed in
                their workspace top bar.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
              <Users className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                Joining registers your account (<span className="font-semibold">{userProfile.displayName}</span> ·{' '}
                {userProfile.jobTitle}) in the organization member directory and grants immediate
                access to all public channels and direct messaging.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {onSignOut && !onClose ? (
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
                  {isSubmitting ? 'Joining Organization...' : 'Join Organization Workspace →'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
