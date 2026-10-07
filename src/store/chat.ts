import { create } from 'zustand';
import { api, ApiError, NetworkError, type ApiConversation } from '../lib/api';
import {
  deleteLocalConversation,
  getLocalConversations,
  historyScope,
  rememberConversationId,
  restoreConversationId,
  saveLocalConversation,
  saveLocalConversations,
} from '../lib/chatHistory';
import { useAuth } from './auth';

/**
 * `conv-${Date.now()}` collided whenever two threads were started inside the
 * same millisecond — "new chat" twice in a row, or a scan firing alongside
 * one — and the second silently joined the first thread.
 */
function newConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ChatStore {
  conversations: ApiConversation[];
  activeId: string;
  loading: boolean;
  error: string | null;

  loadConversations: () => Promise<void>;
  setActiveId: (id: string) => void;
  startNewChat: () => string;
  deleteChat: (id: string) => Promise<void>;
  upsertConversation: (conv: ApiConversation) => void;
  /** Re-read everything for whoever is signed in now. */
  adoptCurrentAccount: () => void;
}

export const useChat = create<ChatStore>((set, get) => ({
  conversations: getLocalConversations(),
  activeId: restoreConversationId(newConversationId),
  loading: false,
  error: null,

  async loadConversations() {
    set({ loading: true });
    try {
      const serverList = await api.listConversations();
      const list = Array.isArray(serverList) ? serverList : [];
      const local = getLocalConversations();
      const map = new Map<string, ApiConversation>();
      for (const item of local) {
        map.set(item.id, item);
      }
      for (const item of list) {
        map.set(item.id, item);
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      saveLocalConversations(merged);
      set({ conversations: merged, loading: false, error: null });
    } catch (err) {
      const isOfflineOrPreview =
        (err instanceof ApiError && (err.status === 404 || err.status === 502)) ||
        err instanceof NetworkError;

      const local = getLocalConversations();
      if (isOfflineOrPreview) {
        set({
          conversations: local,
          loading: false,
          error: null,
        });
        return;
      }

      set({
        conversations: local,
        loading: false,
        error: err instanceof Error ? err.message : 'โหลดรายการสนทนาไม่สำเร็จ',
      });
    }
  },

  setActiveId(id: string) {
    rememberConversationId(id);
    set({ activeId: id });
  },

  startNewChat() {
    const threadId = newConversationId();
    rememberConversationId(threadId);
    set({ activeId: threadId });
    return threadId;
  },

  async deleteChat(id: string) {
    // The failure is recorded for the screen to show and then re-thrown for
    // the caller's own handling. It must not be swallowed: a delete that
    // did not happen on the server would otherwise vanish from the list and
    // reappear on the next load.
    deleteLocalConversation(id);
    try {
      await api.deleteConversation(id);
    } catch (err) {
      const isOfflineOrPreview =
        (err instanceof ApiError && (err.status === 404 || err.status === 502)) ||
        err instanceof NetworkError;
      if (!isOfflineOrPreview) {
        set({ error: err instanceof Error ? err.message : 'ลบการสนทนาไม่สำเร็จ' });
        throw err;
      }
    }
    const remaining = get().conversations.filter((c) => c.id !== id);
    const currentActive = get().activeId;
    const nextActive = currentActive === id ? (remaining[0]?.id ?? newConversationId()) : currentActive;
    rememberConversationId(nextActive);
    set({ conversations: remaining, activeId: nextActive, error: null });
  },

  adoptCurrentAccount() {
    // Signing in or out must not leave the previous account's threads on
    // screen. The list and the open thread both come from storage that is now
    // scoped to someone else, so both are re-read rather than merged: merging
    // is what used to carry a visitor's conversation into the account that
    // signed in next.
    const list = getLocalConversations();
    set({ conversations: list, activeId: restoreConversationId(newConversationId), error: null });
    void get().loadConversations();
  },

  upsertConversation(conv: ApiConversation) {
    saveLocalConversation(conv);
    set((state) => {
      const exists = state.conversations.some((c) => c.id === conv.id);
      if (exists) {
        return {
          conversations: state.conversations.map((c) => (c.id === conv.id ? { ...c, ...conv } : c)),
        };
      }
      return {
        conversations: [conv, ...state.conversations],
      };
    });
  },
}));

/**
 * Follow the session.
 *
 * `applyHeaders` in the auth store repoints local history at the new account,
 * but a screen already mounted keeps rendering whatever this store holds. The
 * subscription makes the switch visible immediately instead of on the next
 * reload, which is when someone would otherwise notice that the threads on
 * screen are not theirs.
 *
 * Compared by scope rather than by user object: zustand hands us a new object
 * on every unrelated change (an OTP step, a consent toggle), and reloading the
 * whole thread list on each of those is wasted work.
 */
let lastScope = historyScope();
useAuth.subscribe(() => {
  const scope = historyScope();
  if (scope === lastScope) return;
  lastScope = scope;
  useChat.getState().adoptCurrentAccount();
});
