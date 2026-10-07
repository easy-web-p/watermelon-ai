import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONVERSATION_STORAGE_KEY,
  GUEST_SCOPE,
  deleteLocalConversation,
  getLocalConversations,
  getLocalDiseaseHistory,
  getLocalMessages,
  historyScope,
  rememberConversationId,
  resetHistoryScope,
  setHistoryScope,
  restoreConversationId,
  saveLocalConversation,
  saveLocalDiseaseRecord,
  saveLocalMessages,
  timeLabel,
  toFeedMessage,
  verifyConversationOwnership,
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

describe('local-first persistence', () => {
  it('saves and reads local conversations', () => {
    const conv1 = {
      id: 'conv-test-1',
      title: 'สนทนา 1',
      lastMessage: 'ทดสอบ',
      messageCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
      chatMode: 'general',
    };
    saveLocalConversation(conv1);
    const loaded = getLocalConversations();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('conv-test-1');

    deleteLocalConversation('conv-test-1');
    expect(getLocalConversations().length).toBe(0);
  });

  it('saves and reads local messages excluding greeting', () => {
    const msgs = [
      { id: 'greeting', role: 'assistant' as const, time: '10:00 น.', text: 'สวัสดี' },
      { id: 'u-1', role: 'user' as const, time: '10:01 น.', text: 'แตงโมเป็นโรคอะไร' },
      { id: 'a-1', role: 'assistant' as const, time: '10:01 น.', text: 'แอนแทรคโนสครับ' },
    ];
    saveLocalMessages('conv-test-1', msgs);
    const loaded = getLocalMessages('conv-test-1');
    expect(loaded.length).toBe(2);
    expect(loaded[0].id).toBe('u-1');
    expect(loaded[1].id).toBe('a-1');
  });

  it('saves and reads disease diagnosis records', () => {
    const record = {
      id: 'dis-1',
      detectedAt: new Date().toISOString(),
      farmId: 'farm-01',
      notes: 'ทดสอบ',
      status: 'diagnosed' as const,
      disease_id: 'anthracnose',
      thai_name: 'โรคแอนแทรคโนส',
      confidence_percentage: 95,
      severity: 'รุนแรงมาก',
      severity_level: 5,
      urgent_action: 'พ่นสารเคมี',
      phi_days: 7,
      model_version: 'v3',
      from_verified_model: true,
    };
    saveLocalDiseaseRecord(record);
    const history = getLocalDiseaseHistory();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe('dis-1');
    expect(history[0].thai_name).toBe('โรคแอนแทรคโนส');
  });
});

describe('verifyConversationOwnership', () => {
  it('identifies ownership for signed in user matching conversation userId', () => {
    const conv = { id: 'conv-1', userId: 'user-123' };
    const user = { id: 'user-123', name: 'สมชาย เกษตรกร' };
    const result = verifyConversationOwnership(conv, user);

    expect(result.isOwner).toBe(true);
    expect(result.isGuest).toBe(false);
    expect(result.ownerId).toBe('user-123');
    expect(result.ownerLabel).toContain('สมชาย');
  });

  it('flags guest conversations as not owned when user is signed in', () => {
    const conv = { id: 'conv-guest', userId: 'guest-anonymous' };
    const user = { id: 'user-123', name: 'สมชาย' };
    const result = verifyConversationOwnership(conv, user);

    expect(result.isOwner).toBe(false);
    expect(result.isGuest).toBe(true);
    expect(result.ownerLabel).toContain('Guest');
  });

  it('flags conversations from another signed-in user', () => {
    const conv = { id: 'conv-other', userId: 'user-456' };
    const user = { id: 'user-123', name: 'สมชาย' };
    const result = verifyConversationOwnership(conv, user);

    expect(result.isOwner).toBe(false);
    expect(result.isGuest).toBe(false);
    expect(result.ownerId).toBe('user-456');
    expect(result.ownerLabel).toContain('บัญชีอื่น');
  });

  it('recognizes guest conversation as owned when current visitor is guest', () => {
    const conv = { id: 'conv-guest', userId: 'guest-anonymous' };
    const result = verifyConversationOwnership(conv, null);

    expect(result.isOwner).toBe(true);
    expect(result.isGuest).toBe(true);
    expect(result.ownerLabel).toContain('Guest');
  });

  it('recognizes null conversation safely', () => {
    const result = verifyConversationOwnership(null, { id: 'user-1', name: 'มานะ' });
    expect(result.isOwner).toBe(true);
    expect(result.ownerId).toBe('user-1');
  });
});

/**
 * Two accounts on one device.
 *
 * Every key used to be global, so the second person to sign in on a shared
 * phone read and wrote the first person's threads, diagnoses and open
 * conversation — and `signOut` left it all behind for whoever came next.
 * The server has always enforced ownership; only the device mixed people up.
 */
describe('per-account scoping', () => {
  afterEach(() => {
    resetHistoryScope();
  });

  const conversation = (id: string) => ({
    id,
    title: id,
    lastMessage: '',
    messageCount: 1,
    createdAt: '2026-10-07T00:00:00.000Z',
    updatedAt: '2026-10-07T00:00:00.000Z',
    isPinned: false,
    chatMode: 'general',
  });

  it('keeps one account from reading another account conversations', () => {
    setHistoryScope('user-a');
    saveLocalConversation(conversation('conv-a'));

    setHistoryScope('user-b');
    expect(getLocalConversations()).toEqual([]);
    saveLocalConversation(conversation('conv-b'));
    expect(getLocalConversations().map((c) => c.id)).toEqual(['conv-b']);

    setHistoryScope('user-a');
    expect(getLocalConversations().map((c) => c.id)).toEqual(['conv-a']);
  });

  it('separates stored messages per account', () => {
    setHistoryScope('user-a');
    saveLocalMessages('shared-thread-id', [
      { id: 'a-1', role: 'user', time: '10:00 น.', text: 'ของบัญชี A' },
    ]);

    setHistoryScope('user-b');
    expect(getLocalMessages('shared-thread-id')).toEqual([]);
  });

  it('separates the disease scan history per account', () => {
    const record = (id: string) => ({
      id,
      detectedAt: '2026-10-07T00:00:00.000Z',
      farmId: 'farm-01',
      notes: '',
      status: 'diagnosed' as const,
      disease_id: 'anthracnose',
      thai_name: 'โรคแอนแทรคโนส',
      confidence_percentage: 90,
      severity: 'สูง',
      severity_level: 3,
      urgent_action: 'พ่นสารป้องกันกำจัดเชื้อราทันที',
      phi_days: 7,
      model_version: 'legacy4@test',
      from_verified_model: true,
    });

    setHistoryScope('user-a');
    saveLocalDiseaseRecord(record('dis-a'));

    setHistoryScope('user-b');
    expect(getLocalDiseaseHistory()).toEqual([]);

    setHistoryScope('user-a');
    expect(getLocalDiseaseHistory().map((r) => r.id)).toEqual(['dis-a']);
  });

  it('does not carry the open thread across a sign-out', () => {
    setHistoryScope('user-a');
    rememberConversationId('conv-of-a');

    setHistoryScope(null);
    expect(restoreConversationId(() => 'fresh-for-visitor')).toBe('fresh-for-visitor');

    setHistoryScope('user-a');
    expect(restoreConversationId(() => 'unused')).toBe('conv-of-a');
  });

  it('leaves a visitor on the unsuffixed keys so existing installs keep their history', () => {
    // Data written before accounts were scoped lives under the bare key.
    // Attributing it to whoever signs in next would be a guess; leaving it in
    // the visitor bucket keeps it readable without claiming an owner.
    window.localStorage.setItem(CONVERSATION_STORAGE_KEY, 'conv-from-old-build');
    setHistoryScope(null);
    expect(historyScope()).toBe(GUEST_SCOPE);
    expect(restoreConversationId(() => 'unused')).toBe('conv-from-old-build');
  });

  it('reads the account out of the persisted session when nothing set the scope', () => {
    // The chat store reads history while it is being constructed, before any
    // screen can tell it who is signed in, so the scope has to be derivable
    // from storage alone.
    window.localStorage.setItem(
      'watermelon-auth',
      JSON.stringify({ state: { user: { id: 'user-c' }, token: 't' }, version: 0 }),
    );
    resetHistoryScope();
    expect(historyScope()).toBe('u:user-c');
  });

  it('treats a malformed persisted session as a visitor rather than throwing', () => {
    window.localStorage.setItem('watermelon-auth', 'not json');
    resetHistoryScope();
    expect(historyScope()).toBe(GUEST_SCOPE);
  });

  it('gives each account its own in-memory thread when storage is unavailable', () => {
    // Private windows throw on every access. One shared variable meant a
    // sign-in kept writing into the thread the visitor had been using.
    const getItem = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    setHistoryScope('user-a');
    const forA = restoreConversationId(() => `a-${Math.random()}`);
    expect(restoreConversationId(() => 'should-not-be-used')).toBe(forA);

    setHistoryScope('user-b');
    const forB = restoreConversationId(() => 'b-thread');
    expect(forB).not.toBe(forA);

    getItem.mockRestore();
  });
});
