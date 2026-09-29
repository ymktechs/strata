/**
 * Defensive Payload Constraints & Validation Synchronicity
 * Mirrors verbatim the maxLength, minLength, pattern, and enum constraints
 * defined in firebase-blueprint.json and firestore.rules.
 */

export const ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;

export const AVATAR_COLORS = ['slate', 'indigo', 'emerald', 'amber', 'rose', 'cyan'] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const PRESENCE_STATES = ['online', 'away', 'busy', 'offline'] as const;
export type PresenceState = (typeof PRESENCE_STATES)[number];

export const ORG_ROLES = ['owner', 'admin', 'member'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const CHANNEL_CATEGORIES = [
  'announcements',
  'general',
  'engineering',
  'product',
  'operations',
  'direct',
] as const;
export type ChannelCategory = (typeof CHANNEL_CATEGORIES)[number];

export const CHANNEL_KINDS = ['public', 'announcement', 'dm'] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];

export const LIMITS = {
  ID_MIN: 1,
  ID_MAX: 128,
  ORG_ID_MIN: 3,
  ORG_ID_MAX: 128,
  DISPLAY_NAME_MIN: 1,
  DISPLAY_NAME_MAX: 80,
  JOB_TITLE_MIN: 1,
  JOB_TITLE_MAX: 80,
  DEPARTMENT_MIN: 1,
  DEPARTMENT_MAX: 60,
  STATUS_TEXT_MAX: 120,
  EMAIL_MIN: 3,
  EMAIL_MAX: 160,
  ORG_NAME_MIN: 2,
  ORG_NAME_MAX: 80,
  ORG_SLUG_MIN: 2,
  ORG_SLUG_MAX: 60,
  ORG_DESC_MIN: 1,
  ORG_DESC_MAX: 240,
  ORG_INDUSTRY_MIN: 1,
  ORG_INDUSTRY_MAX: 60,
  INVITE_CODE_MIN: 4,
  INVITE_CODE_MAX: 32,
  CHANNEL_NAME_MIN: 1,
  CHANNEL_NAME_MAX: 60,
  CHANNEL_TOPIC_MAX: 160,
  CHANNEL_PREVIEW_MAX: 160,
  MESSAGE_CONTENT_MIN: 1,
  MESSAGE_CONTENT_MAX: 2000,
  REPLY_PREVIEW_MAX: 140,
} as const;

export function sanitizeText(value: string, maxLength: number, fallback = ''): string {
  const trimmed = value.trim();
  const base = trimmed.length > 0 ? trimmed : fallback;
  return base.slice(0, maxLength);
}

export function sanitizeId(value: string, maxLength: number = LIMITS.ID_MAX): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned.slice(0, maxLength);
}

export function toSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safe = slug.length >= 2 ? slug : `org-${ slug || 'workspace' }`;
  return safe.slice(0, LIMITS.ORG_SLUG_MAX);
}

export function generateInviteCode(orgName: string): string {
  const prefix = orgName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'STRATA';
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  return `${prefix}-${randomPart}`.slice(0, LIMITS.INVITE_CODE_MAX);
}

export function generateOrgId(slug: string): string {
  const suffix = Math.random().toString(36).substring(2, 8).replace(/[^a-z0-9]/g, 'a');
  return sanitizeId(`org_${slug.slice(0, 32)}_${suffix}`, LIMITS.ORG_ID_MAX);
}

export function isValidIdString(value: string, min = 1, max = 128): boolean {
  return value.length >= min && value.length <= max && ID_PATTERN.test(value);
}
