/**
 * Security Rules Specification & Dirty Dozen Verification Suite
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * are rejected with PERMISSION_DENIED by firestore.rules.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  pillar: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on UserProfile Creation',
    pillar: 'Pillar 2: Validation Blueprints (Anti-Update-Gap)',
    operation: 'create',
    path: '/users/user_alice',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoofing on Organization Creation',
    pillar: 'Phase 5: Email Spoofing Guard',
    operation: 'create',
    path: '/organizations/org_acme',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-User PII Read on /user_private/{userId}',
    pillar: 'Pillar 6: PII Isolation & Schema Constraints',
    operation: 'get',
    path: '/user_private/user_alice',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Self-Assigned Owner Role Escalation When Joining Org',
    pillar: 'Phase 3: Prevent Self-Assigned Roles',
    operation: 'create',
    path: '/organizations/org_acme/members/user_bob',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Orphaned Message Write Without Updating Channel Counter',
    pillar: 'Pillar 7: Atomicity Guarantee (getAfter)',
    operation: 'create',
    path: '/organizations/org_acme/channels/ch_1/messages/msg_5',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Non-Member Reading Organization Channel Messages',
    pillar: 'Pillar 1: Master Gate (Relational Sync)',
    operation: 'get',
    path: '/organizations/org_acme/channels/ch_1/messages/msg_1',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unauthorized Third Party Reading a Direct Message Thread',
    pillar: 'Pillar 1 & 4: DM Participant Isolation',
    operation: 'get',
    path: '/organizations/org_acme/channels/ch_4/messages/msg_1',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Identity Spoofing on Message Creation (authorId Mismatch)',
    pillar: 'Pillar 2: Identity Integrity',
    operation: 'create',
    path: '/organizations/org_acme/channels/ch_1/messages/msg_2',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal State Bypass — Editing a Deleted Message',
    pillar: 'Phase 4 Rule 6: Terminal State Locking',
    operation: 'update',
    path: '/organizations/org_acme/channels/ch_1/messages/msg_1',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Update — Oversized String in Whitelisted Field',
    pillar: 'Phase 5: Value Poisoning Guard',
    operation: 'update',
    path: '/users/user_alice',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Path ID Poisoning with Special Characters',
    pillar: 'Pillar 3: Path Variable Hardening',
    operation: 'create',
    path: '/organizations/org_acme$bad!id',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unrestricted Collection Scraping on /user_memberships',
    pillar: 'Pillar 8: Secure List Queries (Query Enforcer)',
    operation: 'list',
    path: '/user_memberships',
    expectedResult: 'PERMISSION_DENIED',
  },
];
