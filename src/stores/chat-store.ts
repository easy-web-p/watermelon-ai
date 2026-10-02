import { create } from "zustand";
import {
  ChatMessage,
  ChatMode,
  Conversation,
  LocalAttachment,
} from "@/types/chat";

interface ChatState {
  conversations: Conversation[];
  messages: ChatMessage[];
  currentConversationId: string | null;
  mode: ChatMode;
  attachments: LocalAttachment[];
  isSending: boolean;
  sidebarOpen: boolean;
  searchQuery: string;
  draftText: string;

  setConversations: (items: Conversation[]) => void;
  setMessages: (items: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setCurrentConversation: (id: string | null) => void;
  setMode: (mode: ChatMode) => void;
  setDraftText: (text: string) => void;
  addAttachment: (attachment: LocalAttachment) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  setSending: (value: boolean) => void;
  setSidebarOpen: (value: boolean) => void;
  setSearchQuery: (query: string) => void;
  deleteConversation: (id: string) => void;
  togglePinConversation: (id: string) => void;
  clearAllConversations: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messages: [],
  currentConversationId: null,
  mode: "general",
  attachments: [],
  isSending: false,
  sidebarOpen: false,
  searchQuery: "",
  draftText: "",

  setConversations: (conversations) => set({ conversations }),
  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setCurrentConversation: (currentConversationId) =>
    set({ currentConversationId }),

  setMode: (mode) => set({ mode }),
  setDraftText: (draftText) => set({ draftText }),

  addAttachment: (attachment) =>
    set((state) => ({
      attachments: [...state.attachments, attachment],
    })),

  removeAttachment: (id) =>
    set((state) => {
      const attachment = state.attachments.find((item) => item.id === id);
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return {
        attachments: state.attachments.filter((item) => item.id !== id),
      };
    }),

  clearAttachments: () =>
    set((state) => {
      state.attachments.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      return { attachments: [] };
    }),

  setSending: (isSending) => set({ isSending }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  deleteConversation: (id) =>
    set((state) => {
      const filtered = state.conversations.filter((c) => c.id !== id);
      const isCurrent = state.currentConversationId === id;
      return {
        conversations: filtered,
        currentConversationId: isCurrent
          ? filtered.length > 0
            ? filtered[0].id
            : null
          : state.currentConversationId,
        messages: isCurrent ? [] : state.messages,
      };
    }),

  togglePinConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, isPinned: !c.isPinned } : c,
      ),
    })),

  clearAllConversations: () =>
    set({
      conversations: [],
      messages: [],
      currentConversationId: null,
      attachments: [],
    }),
}));
