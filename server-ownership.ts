/**
 * Who may see and change a conversation.
 *
 * This lived inline in `server.ts` as the same expression repeated at four
 * call sites:
 *
 *     conv.userId && conv.userId !== currentUserId && !isElevated(role)
 *
 * Two things were wrong with it, and both are reachable from the public
 * internet on the deployed app.
 *
 * 1. A row with no `userId` satisfied no branch, so it passed every check.
 *    `ApiConversation.userId` is optional, so an ownerless row — one stored
 *    by an older build, restored from a backup, or written by any path that
 *    forgets the field — could be read, appended to, renamed and deleted by
 *    anybody. The append path then wrote the caller's id onto it, handing
 *    them the thread permanently.
 *
 * 2. Every visitor who has not signed in resolves to the same subject,
 *    `guest-anonymous`. Ownership by subject therefore put all of them in
 *    one bucket: `GET /api/v1/conversations` returned every anonymous
 *    visitor's threads to every other anonymous visitor, including the leaf
 *    photos and field notes attached to them. Guest browsing was opened up
 *    deliberately; sharing one server-side history between all guests was
 *    not part of that decision.
 *
 * The policy here fixes both by stating it positively — a viewer must *be*
 * the owner — and by refusing to persist anything for a shared subject.
 * Guests keep their history: the client stores it per device, scoped to the
 * visitor bucket (see `src/lib/chatHistory.ts`).
 *
 * It is a separate module because `server.ts` exports nothing and cannot be
 * imported by a test without starting a listener. The authentication
 * primitives were split out to `server-jwt.ts` for the same reason, and are
 * tested the same way.
 */

/** The subject every unauthenticated caller resolves to. Shared, so unusable as an owner. */
export const GUEST_USER_ID = "guest-anonymous";

/** Roles that may read across accounts for support and moderation. */
const ELEVATED_ROLES = new Set(["admin", "super_admin"]);

export type Viewer = {
  sub: string;
  role: string;
  isGuest: boolean;
};

/** A stored row, narrowed to the field ownership depends on. */
export type OwnedRow = {
  userId?: string;
};

export function isElevated(role: string): boolean {
  return ELEVATED_ROLES.has(role);
}

/**
 * True when this viewer is a real, individual account.
 *
 * `isGuest` is what the token says; the subject check is what makes the
 * guarantee. A token that somehow carried `guest-anonymous` as its subject
 * would otherwise be treated as an account and share the guest bucket.
 */
export function isIdentifiedAccount(viewer: Viewer): boolean {
  return !viewer.isGuest && viewer.sub !== GUEST_USER_ID && viewer.sub.length > 0;
}

/**
 * May this viewer read or modify this conversation?
 *
 * An ownerless row is not visible to an ordinary account. Attributing it to
 * whoever asks first is how the previous version gave threads away; leaving
 * it readable by an elevated role keeps it recoverable for support instead
 * of silently deleting data.
 */
export function canAccessConversation(viewer: Viewer, row: OwnedRow | undefined | null): boolean {
  if (!row) return false;
  if (isElevated(viewer.role)) return true;
  if (!isIdentifiedAccount(viewer)) return false;
  return Boolean(row.userId) && row.userId === viewer.sub;
}

/** The subset of rows this viewer may be shown. */
export function visibleConversations<T extends OwnedRow>(viewer: Viewer, rows: readonly T[]): T[] {
  if (isElevated(viewer.role)) return [...rows];
  if (!isIdentifiedAccount(viewer)) return [];
  return rows.filter((row) => Boolean(row.userId) && row.userId === viewer.sub);
}

/**
 * May anything this viewer sends be written to the shared database?
 *
 * No for a guest: there is one guest subject, so a stored guest row belongs
 * to everybody. The answer is still computed and returned — guest usage is
 * allowed on purpose — it is simply not kept server-side, and the response
 * says so rather than implying a save that did not happen.
 */
export function canPersistFor(viewer: Viewer): boolean {
  return isIdentifiedAccount(viewer);
}

/** Why a turn was not stored, for the response body. Empty when it was. */
export function persistenceNote(viewer: Viewer): string {
  if (canPersistFor(viewer)) return "";
  return (
    "ยังไม่ได้เข้าสู่ระบบ ประวัติการสนทนานี้จึงเก็บไว้ในเครื่องนี้เท่านั้น " +
    "เข้าสู่ระบบเพื่อให้บันทึกไว้กับบัญชีและเห็นได้จากเครื่องอื่น"
  );
}
