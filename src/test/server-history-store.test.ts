import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HistoryStore,
  disabledStore,
  firestoreProjectId,
  historyBackendPolicy,
  type CollectionRefLike,
  type DocRefLike,
  type FirestoreLike,
  type HistoryCache,
  type QuerySnapshot,
} from '../../server-history-store';

/**
 * Firestore ปลอมที่เก็บของไว้ใน Map
 *
 * เทสต์จึงไม่ต้องมี credential ไม่ต่อเครือข่าย และไม่มีค่าใช้จ่าย
 * เก็บโครงเป็น path -> เอกสาร เหมือนของจริงที่คอลเล็กชันซ้อนใต้เอกสารได้
 */
class FakeFirestore implements FirestoreLike {
  docs = new Map<string, Record<string, any>>();
  listeners: Array<(snapshot: QuerySnapshot) => void> = [];
  failNextSnapshotWith: Error | null = null;

  collection(path: string): CollectionRefLike {
    const store = this;
    return {
      doc(id: string): DocRefLike {
        const key = `${path}/${id}`;
        return {
          async set(data: any, options?: { merge?: boolean }) {
            const existing = options?.merge ? (store.docs.get(key) ?? {}) : {};
            store.docs.set(key, { ...existing, ...data });
            store.emit(path);
          },
          async delete() {
            store.docs.delete(key);
            store.emit(path);
          },
          collection(sub: string) {
            return store.collection(`${key}/${sub}`);
          },
        };
      },
      async get(): Promise<QuerySnapshot> {
        return store.snapshotOf(path);
      },
      onSnapshot(onNext, onError) {
        if (store.failNextSnapshotWith) {
          onError(store.failNextSnapshotWith);
          return () => undefined;
        }
        const listener = (snapshot: QuerySnapshot) => onNext(snapshot);
        store.listeners.push(listener);
        listener(store.snapshotOf(path));
        return () => {
          store.listeners = store.listeners.filter((l) => l !== listener);
        };
      },
    };
  }

  snapshotOf(path: string): QuerySnapshot {
    const prefix = `${path}/`;
    const docs = [...this.docs.entries()]
      // เฉพาะลูกตรง ๆ ของคอลเล็กชันนี้ ไม่เอาของในคอลเล็กชันย่อย
      .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
      .map(([key, value]) => ({ id: key.slice(prefix.length), data: () => value }));
    return { docs };
  }

  emit(path: string) {
    if (path !== 'conversations') return;
    for (const listener of this.listeners) listener(this.snapshotOf(path));
  }
}

const emptyCache = (): HistoryCache => ({ conversations: [], messages: {} });

const conversation = (id: string, userId: string, updatedAt = '2026-10-07T10:00:00.000Z') => ({
  id,
  userId,
  title: id,
  lastMessage: '',
  createdAt: '2026-10-07T09:00:00.000Z',
  updatedAt,
  isPinned: false,
  chatMode: 'general',
  messageCount: 0,
});

const message = (id: string, createdAt: string, content = 'สวัสดี') => ({
  id,
  conversationId: 'conv-1',
  role: 'user' as const,
  content,
  attachments: [],
  createdAt,
  status: 'completed',
});

describe('เลือกที่เก็บประวัติ', () => {
  it('ใช้ไฟล์เมื่อไม่ได้เปิดสวิตช์', () => {
    const policy = historyBackendPolicy({} as NodeJS.ProcessEnv);
    expect(policy.backend).toBe('file');
    expect(policy.reason).toContain('HISTORY_FIRESTORE');
  });

  it('ไม่ถือว่าการเจอ GOOGLE_CLOUD_PROJECT คือการอนุญาต', () => {
    // ตัวแปรนี้ถูกตั้งให้อัตโนมัติในหลายสภาพแวดล้อมของ Google ถ้าถือว่าเจอแล้วใช้เลย
    // การรันในเครื่องจะไปเขียนทับข้อมูลโปรเจกต์จริงโดยไม่มีใครตั้งใจ
    const policy = historyBackendPolicy({
      GOOGLE_CLOUD_PROJECT: 'acoustic-fruit-ripeness',
    } as NodeJS.ProcessEnv);
    expect(policy.backend).toBe('file');
  });

  it('บอกให้ตั้งโปรเจกต์เมื่อเปิดสวิตช์แต่ไม่รู้ว่าโปรเจกต์ไหน', () => {
    const policy = historyBackendPolicy({ HISTORY_FIRESTORE: '1' } as NodeJS.ProcessEnv);
    expect(policy.backend).toBe('file');
    expect(policy.reason).toContain('FIRESTORE_PROJECT_ID');
  });

  it('ใช้ firestore เมื่อครบทั้งสวิตช์และโปรเจกต์', () => {
    const policy = historyBackendPolicy({
      HISTORY_FIRESTORE: 'true',
      FIRESTORE_PROJECT_ID: 'acoustic-fruit-ripeness',
    } as NodeJS.ProcessEnv);
    expect(policy.backend).toBe('firestore');
    expect(policy.reason).toBe('');
  });

  it('อ่านชื่อโปรเจกต์ตามลำดับความเจาะจง', () => {
    expect(
      firestoreProjectId({
        FIRESTORE_PROJECT_ID: 'explicit',
        GOOGLE_CLOUD_PROJECT: 'ambient',
      } as NodeJS.ProcessEnv),
    ).toBe('explicit');
    expect(
      firestoreProjectId({ GOOGLE_CLOUD_PROJECT: 'ambient' } as NodeJS.ProcessEnv),
    ).toBe('ambient');
  });
});

describe('ที่เก็บแบบปิดสวิตช์', () => {
  it('ไม่ทำอะไรเลย พฤติกรรมเดิมจึงไม่เปลี่ยน', async () => {
    const store = disabledStore();
    const cache = emptyCache();
    expect(store.enabled).toBe(false);
    await store.hydrate(cache);
    await store.saveConversation(conversation('conv-1', 'user-a'));
    await store.saveMessages('conv-1', [message('m-1', '2026-10-07T10:00:00.000Z')]);
    expect(cache).toEqual(emptyCache());
    expect(await store.loadMessages('conv-1')).toEqual([]);
  });
});

describe('ประวัติบน Firestore', () => {
  let fake: FakeFirestore;
  let store: HistoryStore;

  beforeEach(() => {
    fake = new FakeFirestore();
    store = new HistoryStore(fake);
  });

  it('เขียนแล้วอ่านกลับได้', async () => {
    await store.saveConversation(conversation('conv-1', 'user-a'));
    await store.saveMessages('conv-1', [
      message('m-2', '2026-10-07T10:05:00.000Z', 'สอง'),
      message('m-1', '2026-10-07T10:00:00.000Z', 'หนึ่ง'),
    ]);

    const loaded = await store.loadMessages('conv-1');
    // เรียงตามเวลาที่สร้าง ไม่ใช่ตามลำดับที่เขียนลงไป
    expect(loaded.map((m) => m.id)).toEqual(['m-1', 'm-2']);
    expect(loaded[0].content).toBe('หนึ่ง');
  });

  it('เก็บข้อความเป็นเอกสารละหนึ่งข้อความ การต่อพร้อมกันจึงไม่ทับกัน', async () => {
    // สอง instance ต่อข้อความคนละข้อความในห้องเดียวกันพร้อมกัน
    await Promise.all([
      store.saveMessages('conv-1', [message('from-a', '2026-10-07T10:00:00.000Z', 'จาก A')]),
      store.saveMessages('conv-1', [message('from-b', '2026-10-07T10:00:01.000Z', 'จาก B')]),
    ]);
    const loaded = await store.loadMessages('conv-1');
    expect(loaded.map((m) => m.id)).toEqual(['from-a', 'from-b']);
  });

  it('ดึงของเดิมใส่แคชตอนสตาร์ต', async () => {
    await store.saveConversation(conversation('conv-1', 'user-a', '2026-10-07T10:00:00.000Z'));
    await store.saveConversation(conversation('conv-2', 'user-a', '2026-10-07T11:00:00.000Z'));
    await store.saveMessages('conv-1', [message('m-1', '2026-10-07T10:00:00.000Z')]);

    const cache = emptyCache();
    await store.hydrate(cache);

    // ใหม่สุดขึ้นก่อน เหมือนที่รายการสนทนาแสดง
    expect(cache.conversations.map((c) => c.id)).toEqual(['conv-2', 'conv-1']);
    expect(cache.messages['conv-1'].map((m) => m.id)).toEqual(['m-1']);
  });

  it('ส่งประวัติที่มีแต่ในไฟล์ขึ้นไปตอนเปิดใช้ครั้งแรก', async () => {
    // วันที่เปิดสวิตช์ ประวัติเดิมของผู้ใช้อยู่ในไฟล์เท่านั้น
    // ถ้า hydrate เขียนทับแคชด้วยของจาก Firestore ที่ยังว่าง ประวัติจะหายทั้งหมด
    const cache: HistoryCache = {
      conversations: [conversation('old-conv', 'user-a')],
      messages: { 'old-conv': [message('old-msg', '2026-10-07T09:00:00.000Z', 'ของเดิม')] },
    };
    await store.hydrate(cache);

    expect(cache.conversations.map((c) => c.id)).toEqual(['old-conv']);
    const remote = await store.loadMessages('old-conv');
    expect(remote.map((m) => m.id)).toEqual(['old-msg']);
    expect(remote[0].content).toBe('ของเดิม');
  });

  it('เห็นสิ่งที่ instance อื่นเขียน ผ่าน snapshot listener', async () => {
    const cache = emptyCache();
    await store.hydrate(cache);
    store.watch(cache);
    expect(cache.conversations).toEqual([]);

    // instance อื่นเขียนเข้า Firestore ตรง ๆ
    const other = new HistoryStore(fake);
    await other.saveConversation(conversation('from-other-instance', 'user-b'));

    expect(cache.conversations.map((c) => c.id)).toEqual(['from-other-instance']);
    store.stop();
  });

  it('หยุดฟังแล้วไม่ตามอีก', async () => {
    const cache = emptyCache();
    store.watch(cache);
    store.stop();
    await new HistoryStore(fake).saveConversation(conversation('later', 'user-b'));
    expect(cache.conversations).toEqual([]);
  });

  it('ไม่กลืน error ของ listener เงียบ ๆ', () => {
    // แคชที่ค้างอยู่ที่ภาพเก่าทำให้ผู้ใช้เห็นประวัติไม่ครบโดยไม่มีอะไรบอก
    fake.failNextSnapshotWith = new Error('permission denied');
    const onError = vi.fn();
    store.watch(emptyCache(), onError);
    expect(onError).toHaveBeenCalled();
    expect(store.degradedReason).toContain('permission denied');
  });

  it('ลบห้องแล้วข้อความในห้องต้องหายตามไปด้วย', async () => {
    await store.saveConversation(conversation('conv-1', 'user-a'));
    await store.saveMessages('conv-1', [message('m-1', '2026-10-07T10:00:00.000Z')]);

    await store.dropConversation('conv-1');

    expect(await store.loadMessages('conv-1')).toEqual([]);
    const cache = emptyCache();
    await store.hydrate(cache);
    expect(cache.conversations).toEqual([]);
  });

  it('ลบเฉพาะห้องของผู้ใช้ที่ระบุ ไม่แตะของคนอื่น', async () => {
    await store.saveConversation(conversation('mine-1', 'user-a'));
    await store.saveConversation(conversation('mine-2', 'user-a'));
    await store.saveConversation(conversation('theirs', 'user-b'));
    const cache = emptyCache();
    await store.hydrate(cache);

    await store.dropConversationsOf('user-a', cache);

    const after = emptyCache();
    await store.hydrate(after);
    expect(after.conversations.map((c) => c.id)).toEqual(['theirs']);
  });

  it('ข้ามห้องที่ไม่มี id แทนที่จะเขียนเอกสารชื่อว่าง', async () => {
    await store.saveConversation({ id: '', userId: 'user-a' } as any);
    const cache = emptyCache();
    await store.hydrate(cache);
    expect(cache.conversations).toEqual([]);
  });
});
