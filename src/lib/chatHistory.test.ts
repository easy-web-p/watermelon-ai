import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONVERSATION_STORAGE_KEY,
  rememberConversationId,
  restoreConversationId,
  timeLabel,
  toFeedMessage,
} from './chatHistory';
import type { ApiMessage } from './api';

const message = (overrides: Partial<ApiMessage> = {}): ApiMessage => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'assistant',
  content: 'สวัสดีครับ',
  attachments: [],
  createdAt: '2026-10-05T03:15:00.000Z',
  status: 'completed',
  ...overrides,
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('restoreConversationId', () => {
  it('reuses the stored id so a reload returns to the same thread', () => {
    window.localStorage.setItem(CONVERSATION_STORAGE_KEY, 'conv-existing');
    const createId = vi.fn(() => 'conv-new');

    expect(restoreConversationId(createId)).toBe('conv-existing');
    expect(createId).not.toHaveBeenCalled();
  });

  it('creates and stores an id on the first visit', () => {
    expect(restoreConversationId(() => 'conv-first')).toBe('conv-first');
    expect(window.localStorage.getItem(CONVERSATION_STORAGE_KEY)).toBe('conv-first');
  });

  it('still returns an id when storage throws', () => {
    // Private windows and blocked site data make these accessors throw.
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(restoreConversationId(() => 'conv-fallback')).toBe('conv-fallback');
  });

  it('does not throw when the id cannot be persisted', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => rememberConversationId('conv-x')).not.toThrow();
  });
});

describe('toFeedMessage', () => {
  it('carries the diagnosis back so a reloaded thread still shows the card', () => {
    const detection = { status: 'diagnosed', disease_id: 'downy-mildew' } as ApiMessage['diseaseDetection'];
    const feed = toFeedMessage(message({ diseaseDetection: detection }));

    expect(feed.disease).toBe(detection);
    expect(feed.role).toBe('assistant');
    expect(feed.text).toBe('สวัสดีครับ');
  });

  it('restores the photo that was analysed', () => {
    const feed = toFeedMessage(
      message({
        role: 'user',
        content: 'ใบเป็นจุด',
        attachments: [
          { id: 'att-1', type: 'image', name: 'leaf.jpg', mimeType: 'image/jpeg', url: '/api/v1/storage/files/a/1/leaf.jpg' },
        ],
      }),
    );

    expect(feed.role).toBe('user');
    expect(feed.imageUrl).toBe('/api/v1/storage/files/a/1/leaf.jpg');
    expect(feed.audioUrl).toBeUndefined();
  });

  it('picks the audio clip for a knock turn', () => {
    const feed = toFeedMessage(
      message({
        attachments: [
          { id: 'att-2', type: 'audio', name: 'knock.webm', mimeType: 'audio/webm', url: '/api/v1/storage/files/b/2/knock.webm' },
        ],
        knockAnalysis: { maturityClass: 'สุกพอดี' } as ApiMessage['knockAnalysis'],
      }),
    );

    expect(feed.audioUrl).toBe('/api/v1/storage/files/b/2/knock.webm');
    expect(feed.imageUrl).toBeUndefined();
    expect(feed.knock?.maturityClass).toBe('สุกพอดี');
  });

  it('leaves text undefined when the turn was only an attachment', () => {
    expect(toFeedMessage(message({ content: '' })).text).toBeUndefined();
  });

  it('renders a system turn as the assistant, since the feed has no system bubble', () => {
    expect(toFeedMessage(message({ role: 'system' })).role).toBe('assistant');
  });
});

describe('timeLabel', () => {
  it('formats a stored timestamp', () => {
    expect(timeLabel('2026-10-05T03:15:00.000Z')).toMatch(/\d{2}:\d{2} น\./);
  });

  it('returns empty rather than "Invalid Date" for a broken timestamp', () => {
    expect(timeLabel('not-a-date')).toBe('');
    expect(timeLabel('')).toBe('');
  });
});
