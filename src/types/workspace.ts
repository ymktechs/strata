import { Timestamp } from 'firebase/firestore';
import {
  AvatarColor,
  ChannelCategory,
  ChannelKind,
  OrgRole,
  PresenceState,
} from '../lib/validation';

export interface UserProfile {
  uid: string;
  displayName: string;
  jobTitle: string;
  department: string;
  statusText: string;
  presence: PresenceState;
  avatarColor: AvatarColor;
  activeOrgId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface UserPrivate {
  uid: string;
  email: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Organization {
  orgId: string;
  name: string;
  slug: string;
  description: string;
  industry: string;
  inviteCode: string;
  ownerId: string;
  memberCount: number;
  channelCount: number;
  status: 'active' | 'archived';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface OrgInvite {
  inviteCode: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
  ownerId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface UserMembership {
  membershipId: string;
  userId: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
  inviteCode: string;
  role: OrgRole;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface OrgMember {
  userId: string;
  orgId: string;
  slotId: string;
  displayName: string;
  jobTitle: string;
  department: string;
  statusText: string;
  presence: PresenceState;
  avatarColor: AvatarColor;
  role: OrgRole;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface OrgMemberDirectoryEntry {
  slotId: string;
  index: number;
  userId: string;
  orgId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Channel {
  channelId: string;
  index: number;
  orgId: string;
  name: string;
  topic: string;
  category: ChannelCategory;
  kind: ChannelKind;
  dmParticipantA: string;
  dmParticipantB: string;
  createdBy: string;
  messageCount: number;
  lastMessagePreview: string;
  lastMessageAuthorName: string;
  status: 'active' | 'archived';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Message {
  messageId: string;
  index: number;
  orgId: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatarColor: AvatarColor;
  content: string;
  replyToMessageId: string;
  replyToAuthorName: string;
  replyToPreview: string;
  isPinned: boolean;
  status: 'sent' | 'edited' | 'deleted';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}
