import React, { useState } from 'react';
import { Building2, Check, Copy, Edit3, Plus, Shield } from 'lucide-react';
import { LIMITS } from '../lib/validation';
import { Organization, UserMembership, UserProfile } from '../types/workspace';
import { Avatar, PRESENCE_LABEL_MAP } from './Avatar';

interface WorkspaceSettingsViewProps {
  organization: Organization;
  userProfile: UserProfile;
  memberships: UserMembership[];
  currentUserId: string;
  onUpdateOrganization: (params: {
    name: string;
    industry: string;
    description: string;
  }) => Promise<void>;
  onOpenEditProfile: () => void;
  onOpenSwitchOrCreateOrg: () => void;
  onCopyInviteCode: () => void;
  inviteCopied: boolean;
}

export const WorkspaceSettingsView: React.FC<WorkspaceSettingsViewProps> = ({
  organization,
  userProfile,
  memberships,
  currentUserId,
  onUpdateOrganization,
  onOpenEditProfile,
  onOpenSwitchOrCreateOrg,
  onCopyInviteCode,
  inviteCopied,
}) => {
  const isOwner = organization.ownerId === currentUserId;
  const [name, setName] = useState(organization.name);
  const [industry, setIndustry] = useState(organization.industry);
  const [description, setDescription] = useState(organization.description);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    setIsSaving(true);
    setError(null);
    setSavedNotice(false);
    try {
      await onUpdateOrganization({
        name: name.trim(),
        industry: industry.trim(),
        description: description.trim(),
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Invite Teammates Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Invite People to {organization.name}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Share this organization invite code with colleagues. Once they create an account,
                they can enter this code to join your channels and member directory.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono text-sm font-bold text-slate-900 tabular-nums">
                {organization.inviteCode}
              </div>
              <button
                type="button"
                onClick={onCopyInviteCode}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                {inviteCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
            <div>
              <span className="text-slate-400">Workspace Slug:</span>{' '}
              <span className="font-mono text-slate-800">{organization.slug}</span>
            </div>
            <div>
              <span className="text-slate-400">Active Members:</span>{' '}
              <span className="font-mono font-semibold text-slate-800 tabular-nums">
                {organization.memberCount}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Active Channels:</span>{' '}
              <span className="font-mono font-semibold text-slate-800 tabular-nums">
                {organization.channelCount}
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization Details Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Organization Profile</h3>
              </div>
              <span className="text-xs text-slate-500">
                {isOwner ? 'Owner Access' : 'Read-Only'}
              </span>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveOrg} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  disabled={!isOwner}
                  maxLength={LIMITS.ORG_NAME_MAX}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white disabled:bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Industry / Domain
                </label>
                <input
                  type="text"
                  disabled={!isOwner}
                  maxLength={LIMITS.ORG_INDUSTRY_MAX}
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white disabled:bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Workspace Description
                </label>
                <textarea
                  rows={3}
                  disabled={!isOwner}
                  maxLength={LIMITS.ORG_DESC_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white disabled:bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                />
              </div>

              {isOwner && (
                <div className="pt-2 flex items-center justify-between">
                  {savedNotice ? (
                    <span className="text-xs font-medium text-emerald-600">
                      Organization settings updated.
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : 'Save Organization'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Member Account & Multi-Org Membership Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Your Account & Workspaces</h3>
              </div>
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <Avatar
                name={userProfile.displayName}
                color={userProfile.avatarColor}
                presence={userProfile.presence}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {userProfile.displayName}
                </div>
                <div className="text-xs text-slate-600 truncate">
                  {userProfile.jobTitle} · {userProfile.department}
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  {PRESENCE_LABEL_MAP[userProfile.presence]}
                  {userProfile.statusText ? ` · "${userProfile.statusText}"` : ''}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Joined Organizations ({memberships.length})
                </span>
                <button
                  type="button"
                  onClick={onOpenSwitchOrCreateOrg}
                  className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:text-indigo-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Join or Create</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {memberships.map((m) => (
                  <div
                    key={m.membershipId}
                    className="px-3 py-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{m.orgName}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="text-slate-500 capitalize">{m.role}</span>
                    </div>
                    <span className="font-mono text-slate-500 tabular-nums">{m.inviteCode}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
