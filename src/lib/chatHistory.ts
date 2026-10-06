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
let inMemoryConversationId: string | null = null;

export function restoreConversationId(createId: () => string): string {
  try {
    const saved = window.localStorage.getItem(CONVERSATION_STORAGE_KEY);
    if (saved) return saved;
  } catch {
    // Storage unavailable — this visit keeps one thread in memory instead.
    if (!inMemoryConversationId) inMemoryConversationId = createId();
    return inMemoryConversationId;
  }

  const fresh = createId();
  rememberConversationId(fresh);
  return fresh;
}

/** Best-effort persist. A failure only costs history on the next reload. */
export function rememberConversationId(conversationId: string): void {
  try {
    window.localStorage.setItem(CONVERSATION_STORAGE_KEY, conversationId);
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
    const raw = window.localStorage.getItem(CONVERSATION_LIST_STORAGE_KEY);
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
    window.localStorage.setItem(CONVERSATION_LIST_STORAGE_KEY, JSON.stringify(convs.slice(0, 50)));
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
    window.localStorage.removeItem(`${MESSAGES_STORAGE_KEY_PREFIX}${id}`);
  } catch {
    // Best effort.
  }
}

/** Local-first persistence: read stored messages for a specific conversation. */
export function getLocalMessages(conversationId: string): FeedMessage[] {
  try {
    const raw = window.localStorage.getItem(`${MESSAGES_STORAGE_KEY_PREFIX}${conversationId}`);
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
    window.localStorage.setItem(`${MESSAGES_STORAGE_KEY_PREFIX}${conversationId}`, JSON.stringify(toStore.slice(-100)));
  } catch {
    // Best effort.
  }
}

/** Local-first persistence: read stored disease diagnosis history. */
export function getLocalDiseaseHistory(): DiseaseRecord[] {
  try {
    const raw = window.localStorage.getItem(DISEASE_HISTORY_STORAGE_KEY);
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
    window.localStorage.setItem(DISEASE_HISTORY_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch {
    // Best effort.
  }
}

