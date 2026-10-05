import { create } from 'zustand';
import { api, ApiError, NetworkError, type ApiConversation } from '../lib/api';
import { rememberConversationId, restoreConversationId } from '../lib/chatHistory';

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
}

export const useChat = create<ChatStore>((set, get) => ({
  conversations: [],
  activeId: restoreConversationId(newConversationId),
  loading: false,
  error: null,

  async loadConversations() {
    set({ loading: true });
    try {
      const list = await api.listConversations();
      set({ conversations: Array.isArray(list) ? list : [], loading: false, error: null });
    } catch (err) {
      const isOfflineOrPreview =
        (err instanceof ApiError && err.status === 502) ||
        err instanceof NetworkError;

      if (isOfflineOrPreview) {
        set({
          loading: false,
          error: null,
        });
        return;
      }

      set({
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
    try {
      await api.deleteConversation(id);
    } catch (err) {
      const isOfflineOrPreview =
        (err instanceof ApiError && err.status === 502) ||
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

  upsertConversation(conv: ApiConversation) {
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
