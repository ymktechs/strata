# Security Specification — Strata Organization Workspace & Chat

## 1. Data Invariants & Master Source of Truth

1. **Global Default Deny**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Verified Identity Gate**: Every read and write operation requires an authenticated user with `request.auth.token.email_verified == true`.
3. **PII Split-Collection Isolation**: User email addresses are strictly isolated in `/user_private/{userId}` and readable/writable only by `request.auth.uid == userId` where `email == request.auth.token.email`. Public workspace profiles (`/users/{userId}` and `/organizations/{orgId}/members/{userId}`) never store email, phone, or physical address fields.
4. **Master Gate Relational Sync**:
   - `/organizations/{orgId}` is the parent resource for all workspace subcollections (`members`, `member_directory`, `channels`, and `channels/{channelId}/messages`).
   - `/organizations/{orgId}/members/{userId}` is the authoritative membership gate (`isOrgMember(orgId)`).
   - Every subcollection operation verifies that `/organizations/{orgId}` is in `status == 'active'` via `get()` and that the caller has an active membership document in `/organizations/{orgId}/members/$(request.auth.uid)`.
5. **Atomic Counter & Relational Integrity (`existsAfter` / `getAfter`)**:
   - Creating an `Organization` requires atomically creating its `OrgInvite` document in `/org_invites/{inviteCode}` in the same batch.
   - Joining an organization requires atomically creating `/organizations/{orgId}/members/{uid}`, `/organizations/{orgId}/member_directory/mem_{N}`, `/user_memberships/{uid}_{orgId}`, and incrementing `Organization.memberCount` to `N`.
   - Creating a channel `ch_{N}` requires atomically incrementing `Organization.channelCount` to `N`.
   - Creating a message `msg_{N}` requires atomically incrementing `Channel.messageCount` to `N`.
6. **Direct Message Privacy**: If a channel has `kind == 'dm'`, only `dmParticipantA` and `dmParticipantB` may read or create messages within `/organizations/{orgId}/channels/{channelId}/messages/{messageId}`.
7. **Zero Unbounded Arrays & Zero Unsafe List Queries**:
   - No arrays are used for members, channels, or messages.
   - The only collection supporting `allow list` is `/user_memberships/{membershipId}`, which enforces `resource.data.userId == request.auth.uid` with zero `get()` or `exists()` calls.
8. **Terminal State Locking & Temporal Integrity**:
   - Archived organizations (`status == 'archived'`), archived channels (`status == 'archived'`), and deleted messages (`status == 'deleted'`) are locked against further state mutations.
   - All `createdAt` and `updatedAt` fields must equal `request.time` on creation, and `createdAt` is immutable while `updatedAt == request.time` on update.

---

## 2. The "Dirty Dozen" Adversarial Payloads

### Payload 1: Shadow Field Injection on UserProfile Creation (Pillar 2)
```json
{
  "operation": "create",
  "path": "/users/user_alice",
  "auth": { "uid": "user_alice", "email": "alice@example.com", "email_verified": true },
  "data": {
    "uid": "user_alice",
    "displayName": "Alice Vance",
    "jobTitle": "Staff Engineer",
    "department": "Platform",
    "statusText": "Building",
    "presence": "online",
    "avatarColor": "indigo",
    "activeOrgId": "none",
    "isAdmin": true,
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```
**Expected**: `PERMISSION_DENIED` (`hasOnly` rejects ghost key `isAdmin`).

### Payload 2: Unverified Email Spoofing on Organization Creation (Phase 5)
```json
{
  "operation": "create",
  "path": "/organizations/org_acme",
  "auth": { "uid": "user_spoof", "email": "yasonimboga@gmail.com", "email_verified": false },
  "data": {
    "orgId": "org_acme",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "description": "Engineering workspace",
    "industry": "Technology",
    "inviteCode": "ACME2026",
    "ownerId": "user_spoof",
    "memberCount": 0,
    "channelCount": 0,
    "status": "active",
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```
**Expected**: `PERMISSION_DENIED` (`email_verified == true` is required).

### Payload 3: Cross-User PII Read on `/user_private/{userId}` (Pillar 6)
```json
{
  "operation": "get",
  "path": "/user_private/user_alice",
  "auth": { "uid": "user_bob", "email": "bob@example.com", "email_verified": true }
}
```
**Expected**: `PERMISSION_DENIED` (`isOwner(userId)` blocks non-owner access).

### Payload 4: Self-Assigned Owner Role Escalation When Joining Org (Phase 3)
```json
{
  "operation": "create",
  "path": "/organizations/org_acme/members/user_bob",
  "auth": { "uid": "user_bob", "email": "bob@example.com", "email_verified": true },
  "data": {
    "userId": "user_bob",
    "orgId": "org_acme",
    "slotId": "mem_2",
    "displayName": "Bob Chen",
    "jobTitle": "Developer",
    "department": "Engineering",
    "statusText": "Ready",
    "presence": "online",
    "avatarColor": "emerald",
    "role": "owner",
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```
**Expected**: `PERMISSION_DENIED` (non-owner of `org_acme` cannot self-assign `role: 'owner'`).

### Payload 5: Orphaned Message Write Without Updating Channel Counter (Pillar 7)
```json
{
  "operation": "create",
  "path": "/organizations/org_acme/channels/ch_1/messages/msg_5",
  "auth": { "uid": "user_alice", "email": "alice@example.com", "email_verified": true },
  "data": {
    "messageId": "msg_5",
    "index": 5,
    "orgId": "org_acme",
    "channelId": "ch_1",
    "authorId": "user_alice",
    "authorName": "Alice Vance",
    "authorRole": "Founder",
    "authorAvatarColor": "indigo",
    "content": "Unindexed message",
    "replyToMessageId": "none",
    "replyToAuthorName": "",
    "replyToPreview": "",
    "isPinned": false,
    "status": "sent",
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```
**Expected**: `PERMISSION_DENIED` (`getAfter` requires `channel.messageCount == incoming().index` in the same atomic batch).

### Payload 6: Non-Member Reading Organization Channel Messages (Pillar 1)
```json
{
  "operation": "get",
  "path": "/organizations/org_acme/channels/ch_1/messages/msg_1",
  "auth": { "uid": "user_outsider", "email": "outsider@example.com", "email_verified": true }
}
```
**Expected**: `PERMISSION_DENIED` (`isOrgMember(orgId)` fails).

### Payload 7: Unauthorized Third Party Reading a Direct Message Thread
```json
{
  "operation": "get",
  "path": "/organizations/org_acme/channels/ch_4/messages/msg_1",
  "auth": { "uid": "user_charlie", "email": "charlie@example.com", "email_verified": true },
  "context": "ch_4 has kind == 'dm', dmParticipantA == 'user_alice', dmParticipantB == 'user_bob'"
}
```
**Expected**: `PERMISSION_DENIED` (caller is neither `dmParticipantA` nor `dmParticipantB`).

### Payload 8: Identity Spoofing on Message Creation (`authorId` Mismatch)
```json
{
  "operation": "create",
  "path": "/organizations/org_acme/channels/ch_1/messages/msg_2",
  "auth": { "uid": "user_bob", "email": "bob@example.com", "email_verified": true },
  "data": {
    "messageId": "msg_2",
    "index": 2,
    "orgId": "org_acme",
    "channelId": "ch_1",
    "authorId": "user_alice",
    "authorName": "Alice Vance",
    "authorRole": "Founder",
    "authorAvatarColor": "indigo",
    "content": "Spoofed message",
    "replyToMessageId": "none",
    "replyToAuthorName": "",
    "replyToPreview": "",
    "isPinned": false,
    "status": "sent",
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```
**Expected**: `PERMISSION_DENIED` (`incoming().authorId == request.auth.uid` fails).

### Payload 9: Terminal State Bypass — Editing a Deleted Message (Phase 4 Rule 6)
```json
{
  "operation": "update",
  "path": "/organizations/org_acme/channels/ch_1/messages/msg_1",
  "auth": { "uid": "user_alice", "email": "alice@example.com", "email_verified": true },
  "existingData": { "status": "deleted", "authorId": "user_alice" },
  "data": { "content": "Resurrected content", "status": "edited" }
}
```
**Expected**: `PERMISSION_DENIED` (`existing().status != 'deleted'` blocks updates to terminal state).

### Payload 10: Value Poisoning on Update — Oversized String in Whitelisted Field (Phase 5)
```json
{
  "operation": "update",
  "path": "/users/user_alice",
  "auth": { "uid": "user_alice", "email": "alice@example.com", "email_verified": true },
  "data": {
    "statusText": "<250-char string exceeding maxLength 120>"
  }
}
```
**Expected**: `PERMISSION_DENIED` (`isValidUserProfile(incoming())` wraps the update block and rejects `.size() > 120`).

### Payload 11: Path ID Poisoning with Special Characters (Pillar 3)
```json
{
  "operation": "create",
  "path": "/organizations/org_acme$bad!id",
  "auth": { "uid": "user_alice", "email": "alice@example.com", "email_verified": true }
}
```
**Expected**: `PERMISSION_DENIED` (`isValidId` regex `^[a-zA-Z0-9_\-]+$` rejects the path ID).

### Payload 12: Unrestricted Collection Scraping on `/user_memberships` (Pillar 8)
```json
{
  "operation": "list",
  "path": "/user_memberships",
  "auth": { "uid": "user_bob", "email": "bob@example.com", "email_verified": true },
  "query": "where('orgId', '==', 'org_acme') without where('userId', '==', 'user_bob')"
}
```
**Expected**: `PERMISSION_DENIED` (`allow list` requires `existing().userId == request.auth.uid`).
