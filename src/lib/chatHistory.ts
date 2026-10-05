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

import type { ApiAttachment, ApiMessage, DiseaseDetection, KnockAnalysis } from './api';

export const CONVERSATION_STORAGE_KEY = 'watermelon.chat.conversation';

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
