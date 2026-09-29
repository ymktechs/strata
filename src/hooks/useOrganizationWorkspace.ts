import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Channel,
  Message,
  OrgMember,
  OrgMemberDirectoryEntry,
  Organization,
} from '../types/workspace';

export function useOrganizationWorkspace(
  orgId: string | null,
  currentUserId: string | null,
  activeChannelId: string | null
) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState<boolean>(false);
  const [channelsMap, setChannelsMap] = useState<Record<string, Channel>>({});
  const [memberUidsMap, setMemberUidsMap] = useState<Record<string, string>>({});
  const [membersMap, setMembersMap] = useState<Record<string, OrgMember>>({});
  const [messagesMap, setMessagesMap] = useState<Record<string, Message>>({});

  // 1. Subscribe to Organization document
  useEffect(() => {
    if (!orgId || orgId === 'none' || !currentUserId) {
      setOrganization(null);
      setChannelsMap({});
      setMemberUidsMap({});
      setMembersMap({});
      setMessagesMap({});
      return;
    }

    setOrgLoading(true);
    const path = `organizations/${orgId}`;
    const unsubscribe = onSnapshot(
      doc(db, 'organizations', orgId),
      (snap) => {
        if (snap.exists()) {
          setOrganization(snap.data() as Organization);
        } else {
          setOrganization(null);
        }
        setOrgLoading(false);
      },
      (error) => {
        setOrgLoading(false);
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [orgId, currentUserId]);

  // 2. Subscribe to sequential Channels (ch_1 .. ch_N)
  useEffect(() => {
    if (!organization || !currentUserId || organization.channelCount <= 0) {
      setChannelsMap({});
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const total = Math.min(organization.channelCount, 200);

    for (let i = 1; i <= total; i++) {
      const chId = `ch_${i}`;
      const path = `organizations/${organization.orgId}/channels/${chId}`;
      const unsub = onSnapshot(
        doc(db, 'organizations', organization.orgId, 'channels', chId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Channel;
            setChannelsMap((prev) => ({ ...prev, [chId]: data }));
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
      unsubscribes.push(unsub);
    }

    return () => {
      unsubscribes.forEach((u) => u());
    };
  }, [organization?.orgId, organization?.channelCount, currentUserId]);

  // 3. Subscribe to sequential Member Directory slots (mem_1 .. mem_M)
  useEffect(() => {
    if (!organization || !currentUserId || organization.memberCount <= 0) {
      setMemberUidsMap({});
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const total = Math.min(organization.memberCount, 250);

    for (let i = 1; i <= total; i++) {
      const slotId = `mem_${i}`;
      const path = `organizations/${organization.orgId}/member_directory/${slotId}`;
      const unsub = onSnapshot(
        doc(db, 'organizations', organization.orgId, 'member_directory', slotId),
        (snap) => {
          if (snap.exists()) {
            const entry = snap.data() as OrgMemberDirectoryEntry;
            setMemberUidsMap((prev) => ({ ...prev, [slotId]: entry.userId }));
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
      unsubscribes.push(unsub);
    }

    return () => {
      unsubscribes.forEach((u) => u());
    };
  }, [organization?.orgId, organization?.memberCount, currentUserId]);

  // 4. Subscribe to live OrgMember profiles for each discovered member UID
  const discoveredUidsKey = Object.values(memberUidsMap).sort().join(',');
  useEffect(() => {
    if (!organization || !currentUserId || !discoveredUidsKey) {
      setMembersMap({});
      return;
    }

    const uniqueUids = Array.from(new Set(Object.values(memberUidsMap)));
    const unsubscribes: (() => void)[] = [];

    uniqueUids.forEach((uid) => {
      const path = `organizations/${organization.orgId}/members/${uid}`;
      const unsub = onSnapshot(
        doc(db, 'organizations', organization.orgId, 'members', uid),
        (snap) => {
          if (snap.exists()) {
            const memberData = snap.data() as OrgMember;
            setMembersMap((prev) => ({ ...prev, [uid]: memberData }));
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((u) => u());
    };
  }, [organization?.orgId, discoveredUidsKey, currentUserId]);

  // 5. Subscribe to sequential Messages in active channel (msg_1 .. msg_K)
  const activeChannel = activeChannelId ? channelsMap[activeChannelId] || null : null;
  useEffect(() => {
    setMessagesMap({});
  }, [activeChannelId, organization?.orgId]);

  useEffect(() => {
    if (
      !organization ||
      !currentUserId ||
      !activeChannel ||
      activeChannel.messageCount <= 0
    ) {
      setMessagesMap({});
      return;
    }

    // Check DM authorization before attaching message listeners
    if (
      activeChannel.kind === 'dm' &&
      activeChannel.dmParticipantA !== currentUserId &&
      activeChannel.dmParticipantB !== currentUserId
    ) {
      setMessagesMap({});
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const total = activeChannel.messageCount;
    const start = Math.max(1, total - 99);

    for (let i = start; i <= total; i++) {
      const msgId = `msg_${i}`;
      const path = `organizations/${organization.orgId}/channels/${activeChannel.channelId}/messages/${msgId}`;
      const unsub = onSnapshot(
        doc(
          db,
          'organizations',
          organization.orgId,
          'channels',
          activeChannel.channelId,
          'messages',
          msgId
        ),
        (snap) => {
          if (snap.exists()) {
            const msgData = snap.data() as Message;
            setMessagesMap((prev) => ({ ...prev, [msgId]: msgData }));
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
      unsubscribes.push(unsub);
    }

    return () => {
      unsubscribes.forEach((u) => u());
    };
  }, [
    organization?.orgId,
    activeChannel?.channelId,
    activeChannel?.messageCount,
    activeChannel?.kind,
    currentUserId,
  ]);

  const channels = Object.values(channelsMap)
    .filter((ch) => {
      if (ch.status === 'archived') return false;
      if (ch.kind === 'dm') {
        return ch.dmParticipantA === currentUserId || ch.dmParticipantB === currentUserId;
      }
      return true;
    })
    .sort((a, b) => a.index - b.index);

  const members = Object.values(membersMap).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  const messages = Object.values(messagesMap).sort((a, b) => a.index - b.index);

  return {
    organization,
    orgLoading,
    channels,
    members,
    membersMap,
    messages,
    activeChannel,
  };
}
