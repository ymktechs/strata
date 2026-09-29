import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  Channel,
  OrgInvite,
  OrgMember,
  Organization,
  UserProfile,
} from '../types/workspace';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  AvatarColor,
  ChannelCategory,
  ChannelKind,
  generateInviteCode,
  generateOrgId,
  LIMITS,
  OrgRole,
  PresenceState,
  sanitizeId,
  sanitizeText,
  toSlug,
} from './validation';

/**
 * Creates or updates the user's workspace profile and isolated PII record.
 */
export async function saveAccountProfile(params: {
  uid: string;
  email: string;
  displayName: string;
  jobTitle: string;
  department: string;
  statusText: string;
  presence: PresenceState;
  avatarColor: AvatarColor;
  activeOrgId: string;
  isNewAccount: boolean;
}): Promise<void> {
  const safeUid = sanitizeId(params.uid, LIMITS.ID_MAX);
  const safeDisplayName = sanitizeText(params.displayName, LIMITS.DISPLAY_NAME_MAX, 'Team Member');
  const safeJobTitle = sanitizeText(params.jobTitle, LIMITS.JOB_TITLE_MAX, 'Member');
  const safeDepartment = sanitizeText(params.department, LIMITS.DEPARTMENT_MAX, 'General');
  const safeStatusText = sanitizeText(params.statusText, LIMITS.STATUS_TEXT_MAX, '');
  const safeActiveOrgId = sanitizeId(params.activeOrgId || 'none', LIMITS.ID_MAX) || 'none';
  const safeEmail = sanitizeText(params.email, LIMITS.EMAIL_MAX, 'member@example.com');

  if (params.isNewAccount) {
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', safeUid);
    const privateRef = doc(db, 'user_private', safeUid);

    batch.set(userRef, {
      uid: safeUid,
      displayName: safeDisplayName,
      jobTitle: safeJobTitle,
      department: safeDepartment,
      statusText: safeStatusText,
      presence: params.presence,
      avatarColor: params.avatarColor,
      activeOrgId: safeActiveOrgId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(privateRef, {
      uid: safeUid,
      email: safeEmail,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${safeUid}`);
    }
  } else {
    const userRef = doc(db, 'users', safeUid);
    try {
      await updateDoc(userRef, {
        displayName: safeDisplayName,
        jobTitle: safeJobTitle,
        department: safeDepartment,
        statusText: safeStatusText,
        presence: params.presence,
        avatarColor: params.avatarColor,
        activeOrgId: safeActiveOrgId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${safeUid}`);
    }

    if (safeActiveOrgId !== 'none') {
      const orgMemberRef = doc(db, 'organizations', safeActiveOrgId, 'members', safeUid);
      try {
        const snap = await getDoc(orgMemberRef);
        if (snap.exists()) {
          await updateDoc(orgMemberRef, {
            displayName: safeDisplayName,
            jobTitle: safeJobTitle,
            department: safeDepartment,
            statusText: safeStatusText,
            presence: params.presence,
            avatarColor: params.avatarColor,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `organizations/${safeActiveOrgId}/members/${safeUid}`
        );
      }
    }
  }
}

/**
 * Updates only the user's active organization pointer on their profile.
 */
export async function switchActiveOrganization(
  userProfile: UserProfile,
  targetOrgId: string
): Promise<void> {
  const safeOrgId = sanitizeId(targetOrgId || 'none', LIMITS.ID_MAX) || 'none';
  const userRef = doc(db, 'users', userProfile.uid);
  try {
    await updateDoc(userRef, {
      displayName: userProfile.displayName,
      jobTitle: userProfile.jobTitle,
      department: userProfile.department,
      statusText: userProfile.statusText,
      presence: userProfile.presence,
      avatarColor: userProfile.avatarColor,
      activeOrgId: safeOrgId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
  }
}

/**
 * Creates a new Organization workspace, invite code, founder membership,
 * starter channels (#announcements, #general, #engineering-ops), and welcome message.
 */
export async function createOrganizationWorkspace(params: {
  userProfile: UserProfile;
  name: string;
  industry: string;
  description: string;
  customInviteCode?: string;
}): Promise<{ orgId: string; inviteCode: string; generalChannelId: string }> {
  const safeName = sanitizeText(params.name, LIMITS.ORG_NAME_MAX, 'Organization Workspace');
  const safeSlug = toSlug(safeName);
  const orgId = generateOrgId(safeSlug);
  const safeIndustry = sanitizeText(params.industry, LIMITS.ORG_INDUSTRY_MAX, 'Technology');
  const safeDescription = sanitizeText(
    params.description,
    LIMITS.ORG_DESC_MAX,
    `${safeName} organization communication workspace.`
  );

  let inviteCode = sanitizeId(
    (params.customInviteCode || generateInviteCode(safeName)).toUpperCase(),
    LIMITS.INVITE_CODE_MAX
  );
  if (inviteCode.length < LIMITS.INVITE_CODE_MIN) {
    inviteCode = generateInviteCode(safeName);
  }

  // Verify invite code is not already taken; if taken, append random suffix
  const existingInviteRef = doc(db, 'org_invites', inviteCode);
  try {
    const existingInviteSnap = await getDoc(existingInviteRef);
    if (existingInviteSnap.exists()) {
      inviteCode = generateInviteCode(safeName);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `org_invites/${inviteCode}`);
  }

  // Step 1: Atomic creation of Organization + OrgInvite
  const step1Batch = writeBatch(db);
  const orgRef = doc(db, 'organizations', orgId);
  const inviteRef = doc(db, 'org_invites', inviteCode);

  step1Batch.set(orgRef, {
    orgId,
    name: safeName,
    slug: safeSlug,
    description: safeDescription,
    industry: safeIndustry,
    inviteCode,
    ownerId: params.userProfile.uid,
    memberCount: 0,
    channelCount: 0,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  step1Batch.set(inviteRef, {
    inviteCode,
    orgId,
    orgName: safeName,
    orgSlug: safeSlug,
    ownerId: params.userProfile.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await step1Batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `organizations/${orgId}`);
  }

  // Step 2: Atomic Founder Join (mem_1 + OrgMember + UserMembership + memberCount = 1)
  const step2Batch = writeBatch(db);
  const slotId = 'mem_1';
  const membershipId = sanitizeId(`${params.userProfile.uid}_${orgId}`, LIMITS.ID_MAX);
  const memberRef = doc(db, 'organizations', orgId, 'members', params.userProfile.uid);
  const dirRef = doc(db, 'organizations', orgId, 'member_directory', slotId);
  const userMembershipRef = doc(db, 'user_memberships', membershipId);

  step2Batch.set(memberRef, {
    userId: params.userProfile.uid,
    orgId,
    slotId,
    displayName: params.userProfile.displayName,
    jobTitle: params.userProfile.jobTitle,
    department: params.userProfile.department,
    statusText: params.userProfile.statusText,
    presence: params.userProfile.presence,
    avatarColor: params.userProfile.avatarColor,
    role: 'owner',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  step2Batch.set(dirRef, {
    slotId,
    index: 1,
    userId: params.userProfile.uid,
    orgId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  step2Batch.set(userMembershipRef, {
    membershipId,
    userId: params.userProfile.uid,
    orgId,
    orgName: safeName,
    orgSlug: safeSlug,
    inviteCode,
    role: 'owner',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  step2Batch.update(orgRef, {
    memberCount: 1,
    updatedAt: serverTimestamp(),
  });

  try {
    await step2Batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `organizations/${orgId}/members/${params.userProfile.uid}`
    );
  }

  // Update activeOrgId on user profile
  await switchActiveOrganization(params.userProfile, orgId);

  // Step 3: Create default starter channels sequentially
  await createChannelInOrg({
    orgId,
    createdBy: params.userProfile.uid,
    name: 'announcements',
    topic: 'Company-wide announcements, leadership updates, and key milestones.',
    category: 'announcements',
    kind: 'announcement',
  });

  const generalChannelId = await createChannelInOrg({
    orgId,
    createdBy: params.userProfile.uid,
    name: 'general',
    topic: 'Organization town hall, team introductions, and cross-functional discussion.',
    category: 'general',
    kind: 'public',
  });

  await createChannelInOrg({
    orgId,
    createdBy: params.userProfile.uid,
    name: 'engineering-ops',
    topic: 'Technical architecture, deployment coordination, and system operations.',
    category: 'engineering',
    kind: 'public',
  });

  // Step 4: Seed welcome message in #general with shareable invite code
  await sendMessageInChannel({
    orgId,
    channelId: generalChannelId,
    author: {
      userId: params.userProfile.uid,
      displayName: params.userProfile.displayName,
      jobTitle: params.userProfile.jobTitle,
      avatarColor: params.userProfile.avatarColor,
    },
    content: `Welcome to ${safeName}! Share organization invite code ${inviteCode} with colleagues so they can join this workspace after creating their accounts.`,
  });

  return { orgId, inviteCode, generalChannelId };
}

/**
 * Joins an existing organization using its shareable invite code.
 */
export async function joinOrganizationByInviteCode(params: {
  userProfile: UserProfile;
  inviteCode: string;
}): Promise<{ orgId: string; orgName: string }> {
  const safeCode = sanitizeId(params.inviteCode.toUpperCase(), LIMITS.INVITE_CODE_MAX);
  if (safeCode.length < LIMITS.INVITE_CODE_MIN) {
    throw new Error('Please enter a valid invite code (at least 4 characters).');
  }

  const inviteRef = doc(db, 'org_invites', safeCode);
  let inviteData: OrgInvite;
  try {
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) {
      throw new Error(`No organization found for invite code "${safeCode}".`);
    }
    inviteData = inviteSnap.data() as OrgInvite;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No organization found')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, `org_invites/${safeCode}`);
  }

  const orgId = inviteData.orgId;
  const memberRef = doc(db, 'organizations', orgId, 'members', params.userProfile.uid);

  // Check if user is already a member of this organization
  try {
    const existingMemberSnap = await getDoc(memberRef);
    if (existingMemberSnap.exists()) {
      await switchActiveOrganization(params.userProfile, orgId);
      return { orgId, orgName: inviteData.orgName };
    }
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.GET,
      `organizations/${orgId}/members/${params.userProfile.uid}`
    );
  }

  // Read current organization state to get memberCount
  const orgRef = doc(db, 'organizations', orgId);
  let orgData: Organization;
  try {
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) {
      throw new Error('The target organization no longer exists.');
    }
    orgData = orgSnap.data() as Organization;
  } catch (error) {
    if (error instanceof Error && error.message.includes('no longer exists')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, `organizations/${orgId}`);
  }

  if (orgData.status === 'archived') {
    throw new Error('This organization workspace has been archived and is not accepting new members.');
  }

  const nextMemberIndex = orgData.memberCount + 1;
  const slotId = `mem_${nextMemberIndex}`;
  const membershipId = sanitizeId(`${params.userProfile.uid}_${orgId}`, LIMITS.ID_MAX);
  const role: OrgRole = orgData.ownerId === params.userProfile.uid ? 'owner' : 'member';

  const dirRef = doc(db, 'organizations', orgId, 'member_directory', slotId);
  const userMembershipRef = doc(db, 'user_memberships', membershipId);

  const joinBatch = writeBatch(db);

  joinBatch.set(memberRef, {
    userId: params.userProfile.uid,
    orgId,
    slotId,
    displayName: params.userProfile.displayName,
    jobTitle: params.userProfile.jobTitle,
    department: params.userProfile.department,
    statusText: params.userProfile.statusText,
    presence: params.userProfile.presence,
    avatarColor: params.userProfile.avatarColor,
    role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  joinBatch.set(dirRef, {
    slotId,
    index: nextMemberIndex,
    userId: params.userProfile.uid,
    orgId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  joinBatch.set(userMembershipRef, {
    membershipId,
    userId: params.userProfile.uid,
    orgId,
    orgName: orgData.name,
    orgSlug: orgData.slug,
    inviteCode: orgData.inviteCode,
    role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  joinBatch.update(orgRef, {
    memberCount: nextMemberIndex,
    updatedAt: serverTimestamp(),
  });

  try {
    await joinBatch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `organizations/${orgId}/members/${params.userProfile.uid}`
    );
  }

  await switchActiveOrganization(params.userProfile, orgId);
  return { orgId, orgName: orgData.name };
}

/**
 * Atomically creates a new channel or direct message thread inside an organization.
 */
export async function createChannelInOrg(params: {
  orgId: string;
  createdBy: string;
  name: string;
  topic: string;
  category: ChannelCategory;
  kind: ChannelKind;
  dmParticipantA?: string;
  dmParticipantB?: string;
}): Promise<string> {
  const orgRef = doc(db, 'organizations', params.orgId);
  let orgData: Organization;
  try {
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) {
      throw new Error('Organization not found.');
    }
    orgData = orgSnap.data() as Organization;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `organizations/${params.orgId}`);
  }

  const nextIndex = orgData.channelCount + 1;
  const channelId = `ch_${nextIndex}`;
  const channelRef = doc(db, 'organizations', params.orgId, 'channels', channelId);

  const rawName =
    params.kind === 'dm'
      ? sanitizeText(params.name, LIMITS.CHANNEL_NAME_MAX, 'Direct Message')
      : sanitizeText(
          params.name
            .toLowerCase()
            .replace(/[^a-z0-9\-_]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, ''),
          LIMITS.CHANNEL_NAME_MAX,
          `channel-${nextIndex}`
        );

  const safeTopic = sanitizeText(params.topic, LIMITS.CHANNEL_TOPIC_MAX, '');
  const safeDmA = sanitizeId(params.dmParticipantA || 'none', LIMITS.ID_MAX) || 'none';
  const safeDmB = sanitizeId(params.dmParticipantB || 'none', LIMITS.ID_MAX) || 'none';

  const batch = writeBatch(db);
  batch.set(channelRef, {
    channelId,
    index: nextIndex,
    orgId: params.orgId,
    name: rawName,
    topic: safeTopic,
    category: params.category,
    kind: params.kind,
    dmParticipantA: safeDmA,
    dmParticipantB: safeDmB,
    createdBy: params.createdBy,
    messageCount: 0,
    lastMessagePreview: '',
    lastMessageAuthorName: '',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.update(orgRef, {
    channelCount: nextIndex,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return channelId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `organizations/${params.orgId}/channels/${channelId}`
    );
  }
}

/**
 * Atomically posts a message in a channel or DM thread and updates channel counters.
 */
export async function sendMessageInChannel(params: {
  orgId: string;
  channelId: string;
  author: {
    userId: string;
    displayName: string;
    jobTitle: string;
    avatarColor: AvatarColor;
  };
  content: string;
  replyTo?: {
    messageId: string;
    authorName: string;
    preview: string;
  } | null;
}): Promise<string> {
  const safeContent = sanitizeText(params.content, LIMITS.MESSAGE_CONTENT_MAX);
  if (!safeContent) {
    throw new Error('Message content cannot be empty.');
  }

  const channelRef = doc(db, 'organizations', params.orgId, 'channels', params.channelId);
  let channelData: Channel;
  try {
    const channelSnap = await getDoc(channelRef);
    if (!channelSnap.exists()) {
      throw new Error('Channel not found.');
    }
    channelData = channelSnap.data() as Channel;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.GET,
      `organizations/${params.orgId}/channels/${params.channelId}`
    );
  }

  const nextIndex = channelData.messageCount + 1;
  const messageId = `msg_${nextIndex}`;
  const messageRef = doc(
    db,
    'organizations',
    params.orgId,
    'channels',
    params.channelId,
    'messages',
    messageId
  );

  const safeAuthorName = sanitizeText(
    params.author.displayName,
    LIMITS.DISPLAY_NAME_MAX,
    'Member'
  );
  const safeAuthorRole = sanitizeText(params.author.jobTitle, LIMITS.JOB_TITLE_MAX, 'Member');
  const replyId = params.replyTo?.messageId
    ? sanitizeId(params.replyTo.messageId, 64)
    : 'none';
  const replyAuthor = params.replyTo?.authorName
    ? sanitizeText(params.replyTo.authorName, LIMITS.DISPLAY_NAME_MAX, '')
    : '';
  const replyPreview = params.replyTo?.preview
    ? sanitizeText(params.replyTo.preview, LIMITS.REPLY_PREVIEW_MAX, '')
    : '';

  const batch = writeBatch(db);
  batch.set(messageRef, {
    messageId,
    index: nextIndex,
    orgId: params.orgId,
    channelId: params.channelId,
    authorId: params.author.userId,
    authorName: safeAuthorName,
    authorRole: safeAuthorRole,
    authorAvatarColor: params.author.avatarColor,
    content: safeContent,
    replyToMessageId: replyId,
    replyToAuthorName: replyAuthor,
    replyToPreview: replyPreview,
    isPinned: false,
    status: 'sent',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.update(channelRef, {
    messageCount: nextIndex,
    lastMessagePreview: sanitizeText(safeContent, LIMITS.CHANNEL_PREVIEW_MAX, ''),
    lastMessageAuthorName: safeAuthorName,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return messageId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `organizations/${params.orgId}/channels/${params.channelId}/messages/${messageId}`
    );
  }
}

/**
 * Edits or soft-deletes an existing message authored by the current user.
 */
export async function updateOwnMessage(params: {
  orgId: string;
  channelId: string;
  messageId: string;
  content: string;
  status: 'edited' | 'deleted';
}): Promise<void> {
  const safeContent =
    params.status === 'deleted'
      ? 'This message was removed by its author.'
      : sanitizeText(params.content, LIMITS.MESSAGE_CONTENT_MAX, '');

  if (!safeContent) {
    throw new Error('Updated message content cannot be empty.');
  }

  const messageRef = doc(
    db,
    'organizations',
    params.orgId,
    'channels',
    params.channelId,
    'messages',
    params.messageId
  );

  try {
    await updateDoc(messageRef, {
      content: safeContent,
      status: params.status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `organizations/${params.orgId}/channels/${params.channelId}/messages/${params.messageId}`
    );
  }
}

/**
 * Pins or unpins a message in a channel.
 */
export async function togglePinMessage(params: {
  orgId: string;
  channelId: string;
  messageId: string;
  isPinned: boolean;
}): Promise<void> {
  const messageRef = doc(
    db,
    'organizations',
    params.orgId,
    'channels',
    params.channelId,
    'messages',
    params.messageId
  );

  try {
    await updateDoc(messageRef, {
      isPinned: params.isPinned,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `organizations/${params.orgId}/channels/${params.channelId}/messages/${params.messageId}`
    );
  }
}

/**
 * Updates channel topic, name, category, or status (creator or org owner).
 */
export async function updateChannelMetadata(params: {
  orgId: string;
  channelId: string;
  name: string;
  topic: string;
  category: ChannelCategory;
  status: 'active' | 'archived';
}): Promise<void> {
  const channelRef = doc(db, 'organizations', params.orgId, 'channels', params.channelId);
  const safeName = sanitizeText(params.name, LIMITS.CHANNEL_NAME_MAX, 'channel');
  const safeTopic = sanitizeText(params.topic, LIMITS.CHANNEL_TOPIC_MAX, '');

  try {
    await updateDoc(channelRef, {
      name: safeName,
      topic: safeTopic,
      category: params.category,
      status: params.status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `organizations/${params.orgId}/channels/${params.channelId}`
    );
  }
}

/**
 * Updates organization metadata (owner only).
 */
export async function updateOrganizationMetadata(params: {
  orgId: string;
  name: string;
  description: string;
  industry: string;
  status: 'active' | 'archived';
}): Promise<void> {
  const orgRef = doc(db, 'organizations', params.orgId);
  const safeName = sanitizeText(params.name, LIMITS.ORG_NAME_MAX, 'Workspace');
  const safeDescription = sanitizeText(params.description, LIMITS.ORG_DESC_MAX, 'Workspace');
  const safeIndustry = sanitizeText(params.industry, LIMITS.ORG_INDUSTRY_MAX, 'Technology');

  try {
    await updateDoc(orgRef, {
      name: safeName,
      description: safeDescription,
      industry: safeIndustry,
      status: params.status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `organizations/${params.orgId}`);
  }
}

/**
 * Updates a member's role between 'admin' and 'member' (organization owner only).
 */
export async function updateOrgMemberRole(params: {
  orgId: string;
  targetUserId: string;
  newRole: 'admin' | 'member';
}): Promise<void> {
  const memberRef = doc(db, 'organizations', params.orgId, 'members', params.targetUserId);
  try {
    await updateDoc(memberRef, {
      role: params.newRole,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `organizations/${params.orgId}/members/${params.targetUserId}`
    );
  }
}

/**
 * Updates the current user's live presence and status note in both their profile and active org.
 */
export async function updateUserPresenceAndStatus(params: {
  userProfile: UserProfile;
  presence: PresenceState;
  statusText: string;
  activeMemberRecord?: OrgMember | null;
}): Promise<void> {
  const safeStatus = sanitizeText(params.statusText, LIMITS.STATUS_TEXT_MAX, '');
  const userRef = doc(db, 'users', params.userProfile.uid);

  try {
    await updateDoc(userRef, {
      displayName: params.userProfile.displayName,
      jobTitle: params.userProfile.jobTitle,
      department: params.userProfile.department,
      statusText: safeStatus,
      presence: params.presence,
      avatarColor: params.userProfile.avatarColor,
      activeOrgId: params.userProfile.activeOrgId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${params.userProfile.uid}`);
  }

  if (params.userProfile.activeOrgId !== 'none' && params.activeMemberRecord) {
    const memberRef = doc(
      db,
      'organizations',
      params.userProfile.activeOrgId,
      'members',
      params.userProfile.uid
    );
    try {
      await updateDoc(memberRef, {
        displayName: params.activeMemberRecord.displayName,
        jobTitle: params.activeMemberRecord.jobTitle,
        department: params.activeMemberRecord.department,
        statusText: safeStatus,
        presence: params.presence,
        avatarColor: params.activeMemberRecord.avatarColor,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `organizations/${params.userProfile.activeOrgId}/members/${params.userProfile.uid}`
      );
    }
  }
}
