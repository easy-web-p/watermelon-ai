/**
 * Restoring a chat thread after a page reload.
 *
 * The server persists every turn, including the leaf photo and the diagnosis
 * that came back for it. Two things have to hold for a farmer to see that
 * history again:
 *
 *   1. the conversation id must outlive the reload, and
 *   2. the stored turns must map back onto the feed's own message shape.
 *
 * Both live here rather than in the screen, so a field rename on the API side
 * breaks a test instead of silently emptying someone's conversation.
 */

import type { ApiAttachment, ApiConversation, ApiMessage, DiseaseDetection, DiseaseRecord, KnockAnalysis } from './api';

export const CONVERSATION_STORAGE_KEY = 'watermelon.chat.conversation';
export const CONVERSATION_LIST_STORAGE_KEY = 'watermelon.chat.conversations';
export const MESSAGES_STORAGE_KEY_PREFIX = 'watermelon.chat.messages.';
export const DISEASE_HISTORY_STORAGE_KEY = 'watermelon.disease.history';

/**
 * Whose history is in local storage.
 *
 * Every key above used to be global to the device. Two accounts on one phone
 * — a shared family handset, or a farmer and an extension officer — read and
 * wrote the same four keys, so the second person to sign in saw the first
 * person's threads and diagnoses. `signOut` did not clear them either, so the
 * leak outlived the session. The server has always enforced ownership; it was
 * only the device that mixed people together.
 *
 * Keys are therefore suffixed with the signed-in account. A visitor who has
 * not signed in keeps the unsuffixed keys: that is where every existing
 * install already wrote its data, so nothing has to be migrated and nothing
 * is attributed to an account it may not belong to. History written before
 * this change stays readable while signed out, and a signed-in account pulls
 * its own threads back from the server, which knows who owns what.
 */
export const GUEST_SCOPE = 'guest';

/** Where the auth store's zustand `persist` middleware keeps the session. */
const AUTH_STORAGE_KEY = 'watermelon-auth';

/**
 * Set by the auth store the moment the session changes.
 *
 * Without it a sign-out would keep writing to the account's keys until the
 * next reload, because the scope would still be read out of a persisted
 * session that zustand has not rewritten yet.
 */
let scopeOverride: string | null = null;

/**
 * Reads the account id straight out of the persisted session.
 *
 * Deriving the scope from storage rather than from the auth store keeps this
 * module free of store imports, and makes the scope correct no matter which
 * store is constructed first — the chat store reads history while it is being
 * created, which is before any screen can tell it who is signed in.
 */
function persistedUserId(): string | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { user?: { id?: unknown } | null } | null };
    const id = parsed?.state?.user?.id;
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    // Unreadable or malformed session: treat as a visitor rather than guess.
    return null;
  }
}

/** The scope local history is read from and written to right now. */
export function historyScope(): string {
  if (scopeOverride !== null) return scopeOverride;
  const id = persistedUserId();
  return id ? `u:${id}` : GUEST_SCOPE;
}

/** Point local history at an account, or at the visitor bucket with `null`. */
export function setHistoryScope(userId: string | null): void {
  scopeOverride = userId ? `u:${userId}` : GUEST_SCOPE;
  inMemoryConversationIds.clear();
}

/** Test seam: forget the override so the scope is read from storage again. */
export function resetHistoryScope(): void {
  scopeOverride = null;
  inMemoryConversationIds.clear();
}

function scopedKey(base: string): string {
  const scope = historyScope();
  return scope === GUEST_SCOPE ? base : `${base}::${scope}`;
}

/** The feed's bubble shape, as `ChatAssistant` renders it. */
export type FeedMessage = {
  id: string;
  role: 'user' | 'assistant';
  time: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  knock?: KnockAnalysis;
  disease?: DiseaseDetection;
  failed?: boolean;
};

/**
 * Reads the stored conversation id, or creates and stores a new one.
 *
 * `localStorage` throws in private windows and with site data blocked, and
 * returns null when nothing was stored, so every path here degrades to a fresh
 * thread rather than to a broken screen.
 */
/**
 * Fallback thread id for a session where storage cannot be read.
 *
 * Held in memory for the life of the page: without it every call minted a
 * new id, and the chat screen calls this twice (once for its ref, once in
 * the restore effect). In a private window the two disagreed, so the turn
 * the farmer sent went to a different thread than the one being displayed.
 */
const inMemoryConversationIds = new Map<string, string>();

export function restoreConversationId(createId: () => string): string {
  const scope = historyScope();
  try {
    const saved = window.localStorage.getItem(scopedKey(CONVERSATION_STORAGE_KEY));
    if (saved) return saved;
  } catch {
    // Storage unavailable — this visit keeps one thread per account in memory.
    // Keyed by scope rather than held in a single variable: with one variable
    // a sign-in inside a private window kept writing into the visitor's thread.
    const held = inMemoryConversationIds.get(scope);
    if (held) return held;
    const minted = createId();
    inMemoryConversationIds.set(scope, minted);
    return minted;
  }

  const fresh = createId();
  rememberConversationId(fresh);
  return fresh;
}

/** Best-effort persist. A failure only costs history on the next reload. */
export function rememberConversationId(conversationId: string): void {
  try {
    window.localStorage.setItem(scopedKey(CONVERSATION_STORAGE_KEY), conversationId);
  } catch {
    // Ignored on purpose; see restoreConversationId.
  }
}

/** `HH:MM น.`, or empty when the timestamp is unusable. */
export function timeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
}

const firstOfType = (attachments: ApiAttachment[] | undefined, type: ApiAttachment['type']) =>
  attachments?.find((attachment) => attachment.type === type);

/** Stored turn → feed bubble. */
export function toFeedMessage(message: ApiMessage): FeedMessage {
  return {
    id: message.id,
    // The feed has no bubble for `system`; those turns read as the assistant.
    role: message.role === 'user' ? 'user' : 'assistant',
    time: timeLabel(message.createdAt),
    text: message.content || undefined,
    imageUrl: firstOfType(message.attachments, 'image')?.url,
    audioUrl: firstOfType(message.attachments, 'audio')?.url,
    knock: message.knockAnalysis,
    disease: message.diseaseDetection,
  };
}

/** Local-first persistence: read stored conversations. */
export function getLocalConversations(): ApiConversation[] {
  try {
    const raw = window.localStorage.getItem(scopedKey(CONVERSATION_LIST_STORAGE_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Local-first persistence: save all conversations. */
export function saveLocalConversations(convs: ApiConversation[]): void {
  try {
    window.localStorage.setItem(scopedKey(CONVERSATION_LIST_STORAGE_KEY), JSON.stringify(convs.slice(0, 50)));
  } catch {
    // Best effort on quota or disabled storage.
  }
}

/** Local-first persistence: upsert single conversation into stored list. */
export function saveLocalConversation(conv: ApiConversation): void {
  try {
    const current = getLocalConversations();
    const existingIdx = current.findIndex((c) => c.id === conv.id);
    let updated: ApiConversation[];
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = { ...updated[existingIdx], ...conv };
    } else {
      updated = [conv, ...current];
    }
    saveLocalConversations(updated);
  } catch {
    // Best effort.
  }
}

/** Local-first persistence: remove conversation and its messages from storage. */
export function deleteLocalConversation(id: string): void {
  try {
    const current = getLocalConversations().filter((c) => c.id !== id);
    saveLocalConversations(current);
    window.localStorage.removeItem(scopedKey(`${MESSAGES_STORAGE_KEY_PREFIX}${id}`));
  } catch {
    // Best effort.
  }
}

/** Local-first persistence: read stored messages for a specific conversation. */
export function getLocalMessages(conversationId: string): FeedMessage[] {
  try {
    const raw = window.localStorage.getItem(scopedKey(`${MESSAGES_STORAGE_KEY_PREFIX}${conversationId}`));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Local-first persistence: store messages for a specific conversation. */
export function saveLocalMessages(conversationId: string, messages: FeedMessage[]): void {
  try {
    // Do not persist the initial generic greeting bubble; it's dynamically added on render.
    const toStore = messages.filter((m) => m.id !== 'greeting');
    window.localStorage.setItem(scopedKey(`${MESSAGES_STORAGE_KEY_PREFIX}${conversationId}`), JSON.stringify(toStore.slice(-100)));
  } catch {
    // Best effort.
  }
}

/** Local-first persistence: read stored disease diagnosis history. */
export function getLocalDiseaseHistory(): DiseaseRecord[] {
  try {
    const raw = window.localStorage.getItem(scopedKey(DISEASE_HISTORY_STORAGE_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Local-first persistence: save or prepend a disease scan diagnosis record. */
export function saveLocalDiseaseRecord(record: DiseaseRecord): void {
  try {
    const current = getLocalDiseaseHistory();
    const updated = [record, ...current.filter((r) => r.id !== record.id)];
    window.localStorage.setItem(scopedKey(DISEASE_HISTORY_STORAGE_KEY), JSON.stringify(updated.slice(0, 50)));
  } catch {
    // Best effort.
  }
}

export type ConversationOwnership = {
  isOwner: boolean;
  isGuest: boolean;
  ownerLabel: string;
  ownerId?: string;
};

/**
 * Checks whether a conversation belongs to the currently active user,
 * a guest/temporary session, or another account on this device.
 */
export function verifyConversationOwnership(
  conv: { userId?: string } | undefined | null,
  currentUser: { id?: string; name?: string } | null | undefined,
): ConversationOwnership {
  if (!conv) {
    return {
      isOwner: true,
      isGuest: !currentUser?.id,
      ownerLabel: currentUser?.name || 'ของคุณ',
      ownerId: currentUser?.id,
    };
  }

  const convUserId = conv.userId;
  const currentUserId = currentUser?.id;

  // Case 1: Current user is signed in
  if (currentUserId) {
    if (convUserId === currentUserId) {
      return {
        isOwner: true,
        isGuest: false,
        ownerLabel: currentUser?.name ? `บัญชีของคุณ (${currentUser.name})` : 'บัญชีของคุณ',
        ownerId: currentUserId,
      };
    }
    if (!convUserId || convUserId === 'guest-anonymous') {
      return {
        isOwner: false,
        isGuest: true,
        ownerLabel: 'เซสชันชั่วคราว (Guest / ก่อนเข้าสู่ระบบ)',
        ownerId: 'guest-anonymous',
      };
    }
    return {
      isOwner: false,
      isGuest: false,
      ownerLabel: 'บัญชีอื่นที่เคยใช้งานบนเครื่องนี้',
      ownerId: convUserId,
    };
  }

  // Case 2: Current user is NOT signed in (Guest)
  if (!convUserId || convUserId === 'guest-anonymous') {
    return {
      isOwner: true,
      isGuest: true,
      ownerLabel: 'เซสชันของคุณ (Guest)',
      ownerId: 'guest-anonymous',
    };
  }
  return {
    isOwner: false,
    isGuest: false,
    ownerLabel: 'บัญชีสมาชิกที่เข้าสู่ระบบไว้',
    ownerId: convUserId,
  };
}

