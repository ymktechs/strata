import React, { useMemo, useState } from 'react';
import { MessageSquare, Search, ShieldCheck, UserPlus } from 'lucide-react';
import { OrgMember, Organization } from '../types/workspace';
import { Avatar, PRESENCE_LABEL_MAP } from './Avatar';

interface MemberDirectoryViewProps {
  organization: Organization;
  members: OrgMember[];
  currentUserId: string;
  onStartDirectMessage: (targetMember: OrgMember) => Promise<void>;
  onToggleMemberRole: (targetMember: OrgMember) => Promise<void>;
  onCopyInviteCode: () => void;
  inviteCopied: boolean;
}

export const MemberDirectoryView: React.FC<MemberDirectoryViewProps> = ({
  organization,
  members,
  currentUserId,
  onStartDirectMessage,
  onToggleMemberRole,
  onCopyInviteCode,
  inviteCopied,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const departments = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.department) set.add(m.department);
    });
    return ['all', ...Array.from(set).sort()];
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (selectedDepartment !== 'all' && m.department !== selectedDepartment) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.jobTitle.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        m.statusText.toLowerCase().includes(q)
      );
    });
  }, [members, selectedDepartment, searchQuery]);

  const isOrgOwner = organization.ownerId === currentUserId;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto p-6 space-y-6">
      {/* Header & Invite Callout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {organization.name} · Member Directory
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Browse all verified members in this organization, filter by department, or launch a 1:1
            direct message thread.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="text-right">
            <div className="text-xs text-slate-500">Organization Invite Code</div>
            <div className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
              {organization.inviteCode}
            </div>
          </div>
          <button
            type="button"
            onClick={onCopyInviteCode}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{inviteCopied ? 'Copied Invite Code' : 'Copy Invite Code'}</span>
          </button>
        </div>
      </div>

      {/* Search & Department Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter members by name, title, department, or status..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          {departments.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDepartment(dept)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                selectedDepartment === dept
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {dept === 'all' ? `All (${members.length})` : dept}
            </button>
          ))}
        </div>
      </div>

      {/* High-Density Member Data Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role & Department</th>
                <th className="py-3 px-4">Availability</th>
                <th className="py-3 px-4">Status Note</th>
                <th className="py-3 px-4">Access Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No members match your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isMe = member.userId === currentUserId;
                  return (
                    <tr
                      key={member.userId}
                      className="hover:bg-slate-50/80 transition-colors h-12"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={member.displayName}
                            color={member.avatarColor}
                            presence={member.presence}
                            size="sm"
                          />
                          <div className="font-semibold text-slate-900 whitespace-nowrap">
                            {member.displayName}
                            {isMe && (
                              <span className="ml-1.5 text-slate-400 font-normal">(You)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        <span className="font-medium text-slate-800">{member.jobTitle}</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span>{member.department}</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        {PRESENCE_LABEL_MAP[member.presence]}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">
                        {member.statusText || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 capitalize whitespace-nowrap">
                        {member.role}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {isOrgOwner && !isMe && member.role !== 'owner' && (
                            <button
                              type="button"
                              disabled={busyMemberId === member.userId}
                              onClick={async () => {
                                setBusyMemberId(member.userId);
                                try {
                                  await onToggleMemberRole(member);
                                } finally {
                                  setBusyMemberId(null);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>
                                {member.role === 'admin' ? 'Set Member' : 'Make Admin'}
                              </span>
                            </button>
                          )}

                          {!isMe && (
                            <button
                              type="button"
                              disabled={busyMemberId === member.userId}
                              onClick={async () => {
                                setBusyMemberId(member.userId);
                                try {
                                  await onStartDirectMessage(member);
                                } finally {
                                  setBusyMemberId(null);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Message</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
