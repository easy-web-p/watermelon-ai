import { describe, expect, it } from 'vitest';
import {
  GUEST_USER_ID,
  canAccessConversation,
  canPersistFor,
  isIdentifiedAccount,
  persistenceNote,
  visibleConversations,
  type Viewer,
} from '../../server-ownership';

/**
 * Written as the attack rather than the happy path, like the other server
 * tests. Each case is a way the conversation endpoints could previously be
 * entered as somebody else.
 */

const account = (sub: string, role = 'user'): Viewer => ({ sub, role, isGuest: false });
const guest = (): Viewer => ({ sub: GUEST_USER_ID, role: 'guest', isGuest: true });
const admin = (): Viewer => ({ sub: 'admin-1', role: 'admin', isGuest: false });

const row = (userId?: string) => ({ userId, id: 'conv-1' });

describe('conversation access', () => {
  it('lets an account reach its own thread', () => {
    expect(canAccessConversation(account('user-a'), row('user-a'))).toBe(true);
  });

  it('refuses another account thread', () => {
    expect(canAccessConversation(account('user-b'), row('user-a'))).toBe(false);
  });

  it('refuses a thread with no owner', () => {
    // The old check was `conv.userId && conv.userId !== sub`, which no
    // ownerless row could fail. Anyone could read it, rename it, delete it,
    // and the append path then stamped their id onto it for good.
    expect(canAccessConversation(account('user-a'), row(undefined))).toBe(false);
    expect(canAccessConversation(account('user-a'), row(''))).toBe(false);
  });

  it('refuses a guest, because every guest is the same subject', () => {
    expect(canAccessConversation(guest(), row(GUEST_USER_ID))).toBe(false);
  });

  it('refuses a missing row instead of throwing', () => {
    expect(canAccessConversation(account('user-a'), undefined)).toBe(false);
    expect(canAccessConversation(account('user-a'), null)).toBe(false);
  });

  it('lets an elevated role read across accounts for support', () => {
    expect(canAccessConversation(admin(), row('user-a'))).toBe(true);
    expect(canAccessConversation(admin(), row(undefined))).toBe(true);
  });
});

describe('conversation listing', () => {
  const rows = [row('user-a'), row('user-b'), row(undefined)];

  it('shows an account only its own rows', () => {
    expect(visibleConversations(account('user-a'), rows)).toEqual([row('user-a')]);
  });

  it('hides ownerless rows from an ordinary account', () => {
    expect(visibleConversations(account('user-a'), rows)).not.toContainEqual(row(undefined));
  });

  it('shows a guest nothing at all', () => {
    // This is the live exposure the policy closes: one guest subject meant
    // `GET /conversations` handed every anonymous visitor's threads, photos
    // and field notes to every other anonymous visitor.
    expect(visibleConversations(guest(), rows)).toEqual([]);
  });

  it('shows an elevated role everything', () => {
    expect(visibleConversations(admin(), rows)).toHaveLength(3);
  });

  it('does not hand back the caller array, so a later filter cannot mutate the database', () => {
    const everything = visibleConversations(admin(), rows);
    everything.pop();
    expect(rows).toHaveLength(3);
  });
});

describe('persistence policy', () => {
  it('stores turns for a signed-in account', () => {
    expect(canPersistFor(account('user-a'))).toBe(true);
    expect(persistenceNote(account('user-a'))).toBe('');
  });

  it('does not store turns for a guest', () => {
    expect(canPersistFor(guest())).toBe(false);
  });

  it('tells a guest where their history is kept instead of implying a save', () => {
    expect(persistenceNote(guest())).toContain('เครื่องนี้เท่านั้น');
    expect(persistenceNote(guest())).toContain('เข้าสู่ระบบ');
  });

  it('treats a token carrying the guest subject as a guest', () => {
    // `isGuest` is a claim; the subject is what makes guest rows shared.
    // A token minted with the guest subject must not get an account bucket.
    const forged: Viewer = { sub: GUEST_USER_ID, role: 'user', isGuest: false };
    expect(isIdentifiedAccount(forged)).toBe(false);
    expect(canPersistFor(forged)).toBe(false);
    expect(visibleConversations(forged, [row(GUEST_USER_ID)])).toEqual([]);
  });

  it('treats an empty subject as unusable', () => {
    expect(isIdentifiedAccount(account(''))).toBe(false);
  });
});
