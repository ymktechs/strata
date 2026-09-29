/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  Building2,
  Check,
  ChevronDown,
  Copy,
  Hash,
  LogOut,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { AccountSetupModal } from './components/AccountSetupModal';
import { Avatar, PRESENCE_LABEL_MAP } from './components/Avatar';
import { ChatChannelView } from './components/ChatChannelView';
import { CreateChannelModal } from './components/CreateChannelModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingAuthView } from './components/LandingAuthView';
import { MemberDirectoryView } from './components/MemberDirectoryView';
import { OrgSetupModal } from './components/OrgSetupModal';
import { WorkspaceSettingsView } from './components/WorkspaceSettingsView';
import { useOrganizationWorkspace } from './hooks/useOrganizationWorkspace';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import { PRESENCE_STATES, PresenceState } from './lib/validation';
import {
  createChannelInOrg,
  createOrganizationWorkspace,
  joinOrganizationByInviteCode,
  saveAccountProfile,
  sendMessageInChannel,
  switchActiveOrganization,
  togglePinMessage,
  updateChannelMetadata,
  updateOrganizationMetadata,
  updateOrgMemberRole,
  updateOwnMessage,
  updateUserPresenceAndStatus,
} from './lib/workspaceService';
import { OrgMember, UserMembership, UserProfile } from './types/workspace';

type WorkspaceTab = 'chat' | 'pinned' | 'directory' | 'settings';

function WorkspaceApp() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chat');
  const [sidebarSearch, setSidebarSearch] = useState<string>('');

  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showOrgSetupModal, setShowOrgSetupModal] = useState<boolean>(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState<boolean>(false);
  const [inviteCopied, setInviteCopied] = useState<boolean>(false);

  // 1. Track Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setUserProfile(null);
        setMemberships([]);
        setActiveChannelId(null);
      }
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to current user's UserProfile & UserMemberships
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    setProfileLoading(true);
    const userPath = `users/${firebaseUser.uid}`;
    const unsubProfile = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        } else {
          setUserProfile(null);
        }
        setProfileLoading(false);
      },
      (error) => {
        setProfileLoading(false);
        handleFirestoreError(error, OperationType.GET, userPath);
      }
    );

    const membershipsQuery = query(
      collection(db, 'user_memberships'),
      where('userId', '==', firebaseUser.uid)
    );
    const unsubMemberships = onSnapshot(
      membershipsQuery,
      (snap) => {
        const list: UserMembership[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as UserMembership);
        });
        setMemberships(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'user_memberships');
      }
    );

    return () => {
      unsubProfile();
      unsubMemberships();
    };
  }, [authReady, firebaseUser]);

  // Determine effective activeOrgId
  const effectiveOrgId = useMemo(() => {
    if (!userProfile) return null;
    if (userProfile.activeOrgId && userProfile.activeOrgId !== 'none') {
      return userProfile.activeOrgId;
    }
    if (memberships.length > 0) {
      return memberships[0].orgId;
    }
    return null;
  }, [userProfile, memberships]);

  const {
    organization,
    orgLoading,
    channels,
    members,
    membersMap,
    messages,
    activeChannel,
  } = useOrganizationWorkspace(
    effectiveOrgId,
    firebaseUser?.uid || null,
    activeChannelId
  );

  // Select default channel (#general or first public channel) when organization loads
  useEffect(() => {
    if (channels.length === 0) {
      setActiveChannelId(null);
      return;
    }
    if (!activeChannelId || !channels.some((c) => c.channelId === activeChannelId)) {
      const general =
        channels.find((c) => c.name === 'general' && c.kind !== 'dm') || channels[0];
      setActiveChannelId(general.channelId);
    }
  }, [channels, activeChannelId]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Unable to sign in with Google.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleCopyInviteCode = () => {
    if (!organization) return;
    navigator.clipboard?.writeText(organization.inviteCode);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2500);
  };

  // Start or open a 1:1 Direct Message channel with a member
  const handleStartDirectMessage = async (targetMember: OrgMember) => {
    if (!organization || !firebaseUser || !userProfile) return;
    const myUid = firebaseUser.uid;
    const otherUid = targetMember.userId;

    // Check if DM thread already exists in loaded channels
    const existingDm = channels.find(
      (c) =>
        c.kind === 'dm' &&
        ((c.dmParticipantA === myUid && c.dmParticipantB === otherUid) ||
          (c.dmParticipantA === otherUid && c.dmParticipantB === myUid))
    );

    if (existingDm) {
      setActiveChannelId(existingDm.channelId);
      setActiveTab('chat');
      return;
    }

    const [sortedA, sortedB] = [myUid, otherUid].sort();
    const newDmChannelId = await createChannelInOrg({
      orgId: organization.orgId,
      createdBy: myUid,
      name: `${userProfile.displayName} & ${targetMember.displayName}`,
      topic: 'Direct Message Thread',
      category: 'direct',
      kind: 'dm',
      dmParticipantA: sortedA,
      dmParticipantB: sortedB,
    });

    setActiveChannelId(newDmChannelId);
    setActiveTab('chat');
  };

  // Filtered sidebar channels and DMs
  const { announcementChannels, publicChannels, dmChannels } = useMemo(() => {
    const q = sidebarSearch.toLowerCase().trim();
    const filtered = channels.filter((ch) => {
      if (!q) return true;
      if (ch.kind === 'dm') {
        const partnerId =
          ch.dmParticipantA === firebaseUser?.uid
            ? ch.dmParticipantB
            : ch.dmParticipantA;
        const partnerName = membersMap[partnerId]?.displayName || ch.name;
        return partnerName.toLowerCase().includes(q);
      }
      return ch.name.toLowerCase().includes(q) || ch.topic.toLowerCase().includes(q);
    });

    return {
      announcementChannels: filtered.filter((c) => c.kind === 'announcement'),
      publicChannels: filtered.filter((c) => c.kind === 'public'),
      dmChannels: filtered.filter((c) => c.kind === 'dm'),
    };
  }, [channels, sidebarSearch, firebaseUser?.uid, membersMap]);

  const pinnedCount = useMemo(
    () => messages.filter((m) => m.isPinned && m.status !== 'deleted').length,
    [messages]
  );

  // Loading state while Auth initializes
  if (!authReady || (firebaseUser && profileLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-8 h-8 rounded-lg border-2 border-slate-900 border-t-transparent animate-spin" />
          <div className="text-xs font-medium text-slate-600">
            Synchronizing organization workspace...
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated state -> Landing + Account Sign In View
  if (!firebaseUser) {
    return (
      <LandingAuthView
        onSignIn={handleGoogleSignIn}
        isSigningIn={isSigningIn}
        authError={authError}
      />
    );
  }

  // First-time account setup -> Complete Member Profile
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-slate-100">
        <AccountSetupModal
          uid={firebaseUser.uid}
          email={firebaseUser.email || 'member@organization.com'}
          defaultDisplayName={firebaseUser.displayName || ''}
          existingProfile={null}
          onSave={async (data) => {
            await saveAccountProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || 'member@organization.com',
              displayName: data.displayName,
              jobTitle: data.jobTitle,
              department: data.department,
              statusText: data.statusText,
              presence: data.presence,
              avatarColor: data.avatarColor,
              activeOrgId: 'none',
              isNewAccount: true,
            });
          }}
          onSignOut={handleSignOut}
        />
      </div>
    );
  }

  // User has created an account profile, but has not joined or created an Organization yet
  if (!effectiveOrgId || (!orgLoading && !organization)) {
    return (
      <div className="min-h-screen bg-slate-100">
        <OrgSetupModal
          userProfile={userProfile}
          existingMemberships={memberships}
          onCreateOrg={async (params) => {
            const res = await createOrganizationWorkspace({
              userProfile,
              name: params.name,
              industry: params.industry,
              description: params.description,
              customInviteCode: params.customInviteCode,
            });
            setActiveChannelId(res.generalChannelId);
            setActiveTab('chat');
          }}
          onJoinOrg={async (inviteCode) => {
            await joinOrganizationByInviteCode({
              userProfile,
              inviteCode,
            });
            setActiveTab('chat');
          }}
          onSelectExistingOrg={async (targetOrgId) => {
            await switchActiveOrganization(userProfile, targetOrgId);
          }}
          onSignOut={handleSignOut}
        />
      </div>
    );
  }

  // Skeleton while active organization loads
  if (!organization) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-xs font-medium text-slate-600">
          Loading organization channels and directory...
        </div>
      </div>
    );
  }

  const currentMemberRecord = membersMap[firebaseUser.uid] || null;

  return (
    <div className="h-screen flex flex-col bg-white text-slate-900 overflow-hidden">
      {/* Top Bar Contract (Single-Row, 3 Zones) */}
      <header className="h-14 px-5 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
        {/* Zone 1: Brand & Contextual Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base font-bold tracking-tight text-slate-900">Strata</span>
          <span className="text-slate-300" aria-hidden="true">
            /
          </span>
          <span className="text-sm font-semibold text-slate-800 truncate">
            {organization.name}
          </span>
          {activeChannel && activeTab === 'chat' && (
            <>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="text-xs font-mono text-slate-500 truncate hidden sm:inline">
                {activeChannel.kind === 'dm' ? 'direct-message' : `#${activeChannel.name}`}
              </span>
            </>
          )}
        </div>

        {/* Zone 2: 4 Clean Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'chat'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Messages
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pinned')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'pinned'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pinned ({pinnedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'directory'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Directory ({organization.memberCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Workspace Info
          </button>
        </nav>

        {/* Zone 3: Primary Actions (Shareable Invite Code + Sign Out) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyInviteCode}
            title="Copy organization invite code for teammates"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200/70 transition-colors whitespace-nowrap cursor-pointer"
          >
            {inviteCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied {organization.inviteCode}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Invite: {organization.inviteCode}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body (268px Left Sidebar + Viewport) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Workspace Navigation Sidebar */}
        <aside className="w-68 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800">
          {/* Organization Switcher Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-sm font-bold text-white truncate">
                  {organization.name}
                </span>
              </div>
              <div className="text-xs text-slate-400 truncate mt-0.5">
                {organization.industry} ·{' '}
                <span className="font-mono tabular-nums">{organization.memberCount}</span>{' '}
                {organization.memberCount === 1 ? 'member' : 'members'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowOrgSetupModal(true)}
              title="Switch, join, or create another organization"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors shrink-0 cursor-pointer"
            >
              <span>Switch</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sidebar Filter Input */}
          <div className="p-3 border-b border-slate-800/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Jump to channel or DM..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-800/90 text-white placeholder:text-slate-400 border border-slate-700 rounded-md focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Scrollable Channels & Direct Messages Navigation */}
          <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
            {/* Announcements Section */}
            {announcementChannels.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-xs font-semibold text-slate-400">
                  Broadcasts
                </div>
                {announcementChannels.map((ch) => {
                  const isActive =
                    activeChannelId === ch.channelId &&
                    (activeTab === 'chat' || activeTab === 'pinned');
                  return (
                    <button
                      key={ch.channelId}
                      type="button"
                      onClick={() => {
                        setActiveChannelId(ch.channelId);
                        setActiveTab('chat');
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Megaphone className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span className="truncate">{ch.name}</span>
                      </div>
                      {ch.messageCount > 0 && (
                        <span className="font-mono text-xs opacity-75 tabular-nums">
                          {ch.messageCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Organization Channels Section */}
            <div className="space-y-1">
              <div className="px-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Channels ({publicChannels.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateChannelModal(true)}
                  title="Create new channel"
                  className="p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {publicChannels.map((ch) => {
                const isActive =
                  activeChannelId === ch.channelId &&
                  (activeTab === 'chat' || activeTab === 'pinned');
                return (
                  <button
                    key={ch.channelId}
                    type="button"
                    onClick={() => {
                      setActiveChannelId(ch.channelId);
                      setActiveTab('chat');
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      <span className="truncate">{ch.name}</span>
                    </div>
                    {ch.messageCount > 0 && (
                      <span className="font-mono text-xs opacity-75 tabular-nums">
                        {ch.messageCount}
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowCreateChannelModal(true)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add Channel</span>
              </button>
            </div>

            {/* Direct Messages Section */}
            <div className="space-y-1">
              <div className="px-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Direct Messages
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('directory')}
                  title="Open member directory to message someone"
                  className="p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {dmChannels.map((dm) => {
                const partnerUid =
                  dm.dmParticipantA === firebaseUser.uid
                    ? dm.dmParticipantB
                    : dm.dmParticipantA;
                const partner = membersMap[partnerUid];
                const label = partner?.displayName || dm.name;
                const isActive =
                  activeChannelId === dm.channelId &&
                  (activeTab === 'chat' || activeTab === 'pinned');

                return (
                  <button
                    key={dm.channelId}
                    type="button"
                    onClick={() => {
                      setActiveChannelId(dm.channelId);
                      setActiveTab('chat');
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      <span className="truncate">{label}</span>
                    </div>
                    {dm.messageCount > 0 && (
                      <span className="font-mono text-xs opacity-75 tabular-nums">
                        {dm.messageCount}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Quick Teammates List to Start DM */}
              {members
                .filter((m) => m.userId !== firebaseUser.uid)
                .slice(0, 8)
                .map((colleague) => {
                  const hasDmAlready = dmChannels.some(
                    (dm) =>
                      dm.dmParticipantA === colleague.userId ||
                      dm.dmParticipantB === colleague.userId
                  );
                  if (hasDmAlready) return null;
                  return (
                    <button
                      key={colleague.userId}
                      type="button"
                      onClick={() => handleStartDirectMessage(colleague)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          name={colleague.displayName}
                          color={colleague.avatarColor}
                          presence={colleague.presence}
                          size="sm"
                        />
                        <span className="truncate">{colleague.displayName}</span>
                      </div>
                      <span className="text-xs opacity-60">DM</span>
                    </button>
                  );
                })}
            </div>

            {/* Quick Workspace Views */}
            <div className="pt-2 border-t border-slate-800 space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'directory'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  <span>Organization Directory</span>
                </div>
                <span className="font-mono tabular-nums">{organization.memberCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Workspace & Invites</span>
                </div>
              </button>
            </div>
          </div>

          {/* Current User Profile & Presence Footer */}
          <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                name={userProfile.displayName}
                color={userProfile.avatarColor}
                presence={userProfile.presence}
                size="sm"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {userProfile.displayName}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <select
                    aria-label="Availability status"
                    value={userProfile.presence}
                    onChange={(e) =>
                      updateUserPresenceAndStatus({
                        userProfile,
                        presence: e.target.value as PresenceState,
                        statusText: userProfile.statusText,
                        activeMemberRecord: currentMemberRecord,
                      })
                    }
                    className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {PRESENCE_STATES.map((st) => (
                      <option key={st} value={st} className="bg-slate-900 text-white">
                        {PRESENCE_LABEL_MAP[st]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEditProfileModal(true)}
              className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors shrink-0 cursor-pointer"
            >
              Profile
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        {(activeTab === 'chat' || activeTab === 'pinned') && activeChannel ? (
          <ChatChannelView
            organization={organization}
            channel={activeChannel}
            messages={messages}
            membersMap={membersMap}
            currentUserId={firebaseUser.uid}
            showOnlyPinned={activeTab === 'pinned'}
            onExitPinnedFilter={() => setActiveTab('chat')}
            onSendMessage={async (content, replyTo) => {
              await sendMessageInChannel({
                orgId: organization.orgId,
                channelId: activeChannel.channelId,
                author: {
                  userId: firebaseUser.uid,
                  displayName: userProfile.displayName,
                  jobTitle: userProfile.jobTitle,
                  avatarColor: userProfile.avatarColor,
                },
                content,
                replyTo,
              });
            }}
            onEditMessage={async (messageId, newContent) => {
              await updateOwnMessage({
                orgId: organization.orgId,
                channelId: activeChannel.channelId,
                messageId,
                content: newContent,
                status: 'edited',
              });
            }}
            onDeleteMessage={async (messageId) => {
              await updateOwnMessage({
                orgId: organization.orgId,
                channelId: activeChannel.channelId,
                messageId,
                content: 'This message was removed by its author.',
                status: 'deleted',
              });
            }}
            onTogglePin={async (messageId, isPinned) => {
              await togglePinMessage({
                orgId: organization.orgId,
                channelId: activeChannel.channelId,
                messageId,
                isPinned,
              });
            }}
            onUpdateTopic={async (newTopic) => {
              await updateChannelMetadata({
                orgId: organization.orgId,
                channelId: activeChannel.channelId,
                name: activeChannel.name,
                topic: newTopic,
                category: activeChannel.category,
                status: activeChannel.status,
              });
            }}
          />
        ) : activeTab === 'directory' ? (
          <MemberDirectoryView
            organization={organization}
            members={members}
            currentUserId={firebaseUser.uid}
            onStartDirectMessage={handleStartDirectMessage}
            onToggleMemberRole={async (targetMember) => {
              const nextRole = targetMember.role === 'admin' ? 'member' : 'admin';
              await updateOrgMemberRole({
                orgId: organization.orgId,
                targetUserId: targetMember.userId,
                newRole: nextRole,
              });
            }}
            onCopyInviteCode={handleCopyInviteCode}
            inviteCopied={inviteCopied}
          />
        ) : (
          <WorkspaceSettingsView
            organization={organization}
            userProfile={userProfile}
            memberships={memberships}
            currentUserId={firebaseUser.uid}
            onUpdateOrganization={async (params) => {
              await updateOrganizationMetadata({
                orgId: organization.orgId,
                name: params.name,
                industry: params.industry,
                description: params.description,
                status: organization.status,
              });
            }}
            onOpenEditProfile={() => setShowEditProfileModal(true)}
            onOpenSwitchOrCreateOrg={() => setShowOrgSetupModal(true)}
            onCopyInviteCode={handleCopyInviteCode}
            inviteCopied={inviteCopied}
          />
        )}
      </div>

      {/* Modals */}
      {showEditProfileModal && (
        <AccountSetupModal
          uid={firebaseUser.uid}
          email={firebaseUser.email || ''}
          defaultDisplayName={userProfile.displayName}
          existingProfile={userProfile}
          onSave={async (data) => {
            await saveAccountProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || 'member@organization.com',
              displayName: data.displayName,
              jobTitle: data.jobTitle,
              department: data.department,
              statusText: data.statusText,
              presence: data.presence,
              avatarColor: data.avatarColor,
              activeOrgId: organization.orgId,
              isNewAccount: false,
            });
          }}
          onClose={() => setShowEditProfileModal(false)}
        />
      )}

      {showOrgSetupModal && (
        <OrgSetupModal
          userProfile={userProfile}
          existingMemberships={memberships}
          onCreateOrg={async (params) => {
            const res = await createOrganizationWorkspace({
              userProfile,
              name: params.name,
              industry: params.industry,
              description: params.description,
              customInviteCode: params.customInviteCode,
            });
            setActiveChannelId(res.generalChannelId);
            setActiveTab('chat');
          }}
          onJoinOrg={async (inviteCode) => {
            await joinOrganizationByInviteCode({
              userProfile,
              inviteCode,
            });
            setActiveTab('chat');
          }}
          onSelectExistingOrg={async (targetOrgId) => {
            await switchActiveOrganization(userProfile, targetOrgId);
            setActiveTab('chat');
          }}
          onClose={() => setShowOrgSetupModal(false)}
        />
      )}

      {showCreateChannelModal && (
        <CreateChannelModal
          onClose={() => setShowCreateChannelModal(false)}
          onCreate={async (params) => {
            const newId = await createChannelInOrg({
              orgId: organization.orgId,
              createdBy: firebaseUser.uid,
              name: params.name,
              topic: params.topic,
              category: params.category,
              kind: params.kind,
            });
            setActiveChannelId(newId);
            setActiveTab('chat');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WorkspaceApp />
    </ErrorBoundary>
  );
}
