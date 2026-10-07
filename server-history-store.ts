/**
 * ที่เก็บประวัติการสนทนาที่อยู่รอดการรีสตาร์ตและใช้ร่วมกันได้หลาย instance
 *
 * เดิม `server.ts` เก็บห้องสนทนาและข้อความไว้ในหน่วยความจำ แล้วเขียนลงไฟล์
 * `data/watermelon_db.json` พร้อม writer lock ที่อิงเลข PID ของเครื่องเดียว
 * บนเครื่องเดียวที่รันยาว ๆ วิธีนี้ใช้ได้ แต่แอปนี้ deploy แบบคอนเทนเนอร์ซึ่ง
 * ระบบไฟล์หายไปทุกครั้งที่ instance ถูกแทน และเมื่อมีมากกว่าหนึ่ง instance
 * แต่ละตัวก็เขียนไฟล์ของตัวเอง ผู้ใช้จึงเห็นประวัติไม่ครบหรือหายไปเฉย ๆ
 * โดยที่ไม่มีอะไรรายงานว่าผิด lock ที่อิง PID ก็ไม่มีความหมายข้ามคอนเทนเนอร์
 *
 * โมดูลนี้ทำให้ Firestore เป็นแหล่งความจริงเมื่อเปิดใช้ โดยไม่ต้องแก้จุดที่อ่าน
 * `db.conversations` แบบ synchronous ทั้ง 40 จุดใน `server.ts`
 *
 *   - ตอนสตาร์ต `hydrate` ดึงของเดิมจาก Firestore ใส่ `db`
 *   - `watch` เปิด snapshot listener ไว้ instance อื่นเขียนอะไร แคชที่นี่ตามทัน
 *     ภายในเสี้ยววินาที การอ่านจึงยัง synchronous ได้และยังถูกต้องข้าม instance
 *   - การเขียนทุกครั้งส่งขึ้น Firestore ด้วย
 *
 * **ข้อความถูกเก็บเป็นเอกสารละหนึ่งข้อความ** ใต้ `conversations/{id}/messages`
 * ไม่ใช่อาร์เรย์ก้อนเดียว การต่อข้อความจากสอง instance พร้อมกันจึงไม่ทับกัน
 * ส่วนข้อมูลหัวห้อง (ชื่อ, ข้อความล่าสุด, จำนวนข้อความ) เป็นแบบเขียนทีหลังชนะ
 * ซึ่งยอมรับได้เพราะผู้ใช้คนหนึ่งมักคุยอยู่ instance เดียว และสิ่งที่เสียหากชน
 * คือชื่อห้องกับตัวนับ ไม่ใช่ตัวข้อความ
 *
 * เมื่อปิดใช้ ทุกเมธอดไม่ทำอะไร พฤติกรรมจึงเหมือนเดิมทุกประการ
 * ไม่มีค่าใช้จ่ายถ้าไม่เปิด และเมื่อเปิดก็อยู่ในโควตาฟรีของ Firestore
 */

export type HistoryBackend = "file" | "firestore";

export type HistoryPolicy = {
  backend: HistoryBackend;
  /** เหตุผลเป็นภาษาไทย สำหรับ log และ /health ว่างเมื่อใช้ firestore ได้ */
  reason: string;
};

const TRUTHY = new Set(["1", "true", "yes", "on"]);

function isOn(value: string | undefined): boolean {
  return TRUTHY.has((value ?? "").trim().toLowerCase());
}

/**
 * เลือกที่เก็บประวัติจากสภาพแวดล้อม
 *
 * ต้องเปิดสวิตช์อย่างจงใจ การเจอ GOOGLE_CLOUD_PROJECT เฉย ๆ ไม่นับ เพราะตัวแปร
 * นั้นถูกตั้งให้อัตโนมัติในหลายสภาพแวดล้อมของ Google รวมถึงตอนรันเครื่องมือ
 * บางตัวบนเครื่องนักพัฒนา ถ้าถือว่าเจอแล้วใช้เลย การรันในเครื่องจะไปเขียนทับ
 * ข้อมูลโปรเจกต์จริงโดยไม่มีใครตั้งใจ — รูปแบบความผิดพลาดเดียวกับที่เคยเกิด
 * กับคีย์ของโมเดลที่เสียเงิน (ดู server-cost-policy.ts)
 */
export function historyBackendPolicy(env: NodeJS.ProcessEnv = process.env): HistoryPolicy {
  if (!isOn(env.HISTORY_FIRESTORE)) {
    return {
      backend: "file",
      reason:
        "ปิด HISTORY_FIRESTORE ไว้ ประวัติเก็บในไฟล์ของเครื่องนี้เท่านั้น " +
        "ซึ่งหายเมื่อคอนเทนเนอร์ถูกแทนและไม่ใช้ร่วมกันระหว่าง instance",
    };
  }
  const project =
    (env.FIRESTORE_PROJECT_ID ?? env.GOOGLE_CLOUD_PROJECT ?? env.GCLOUD_PROJECT ?? "").trim();
  if (!project) {
    return {
      backend: "file",
      reason:
        "เปิด HISTORY_FIRESTORE ไว้แต่ไม่รู้ว่าโปรเจกต์ไหน " +
        "ตั้ง FIRESTORE_PROJECT_ID หรือ GOOGLE_CLOUD_PROJECT ด้วย",
    };
  }
  return { backend: "firestore", reason: "" };
}

/** โปรเจกต์ที่จะต่อ อ่านแยกจาก policy เพื่อให้เทสต์ส่งค่าเองได้ */
export function firestoreProjectId(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.FIRESTORE_PROJECT_ID ??
    env.GOOGLE_CLOUD_PROJECT ??
    env.GCLOUD_PROJECT ??
    ""
  ).trim();
}

/* ─────────────────────────────────────────────────────────────────────────
 * หน้าตาของ Firestore เท่าที่โมดูลนี้ใช้
 *
 * ประกาศเองแทนการผูกกับชนิดของไลบรารี เพื่อให้เทสต์ส่งตัวปลอมเข้ามาได้
 * โดยไม่ต้องมี credential ไม่ต้องต่อเครือข่าย และไม่มีค่าใช้จ่าย
 * ────────────────────────────────────────────────────────────────────── */

export type DocSnapshot = { id: string; data(): any };
export type QuerySnapshot = { docs: DocSnapshot[] };

export interface DocRefLike {
  set(data: any, options?: { merge?: boolean }): Promise<unknown>;
  delete(): Promise<unknown>;
  collection(path: string): CollectionRefLike;
}

export interface CollectionRefLike {
  doc(id: string): DocRefLike;
  get(): Promise<QuerySnapshot>;
  onSnapshot(
    onNext: (snapshot: QuerySnapshot) => void,
    onError: (error: Error) => void,
  ): () => void;
}

export interface FirestoreLike {
  collection(path: string): CollectionRefLike;
}

export type StoredConversation = Record<string, any> & { id: string; userId?: string };
export type StoredMessage = Record<string, any> & { id: string };

/** ที่ที่ server.ts เก็บของอยู่ ส่งเข้ามาเพื่อให้โมดูลนี้ไม่ต้องรู้จัก persistentDb */
export type HistoryCache = {
  conversations: StoredConversation[];
  messages: Record<string, StoredMessage[]>;
};

const CONVERSATIONS = "conversations";
const MESSAGES = "messages";

export class HistoryStore {
  private readonly db: FirestoreLike | null;
  private unsubscribe: (() => void) | null = null;
  /** ตั้งเมื่อ Firestore ใช้ไม่ได้ระหว่างทาง เพื่อให้ /health รายงานได้ */
  public degradedReason = "";

  constructor(db: FirestoreLike | null) {
    this.db = db;
  }

  get enabled(): boolean {
    return this.db !== null;
  }

  /**
   * ดึงประวัติทั้งหมดจาก Firestore ใส่แคชในหน่วยความจำ
   *
   * เรียกครั้งเดียวตอนสตาร์ต ของที่อยู่ในไฟล์อยู่แล้วแต่ไม่มีใน Firestore จะถูก
   * ส่งขึ้นไปให้ เพื่อให้การเปิดใช้ครั้งแรกไม่ทำให้ประวัติเดิมของผู้ใช้หายไป
   */
  async hydrate(cache: HistoryCache): Promise<void> {
    if (!this.db) return;
    const snapshot = await this.db.collection(CONVERSATIONS).get();

    const remote = new Map<string, StoredConversation>();
    for (const doc of snapshot.docs) {
      remote.set(doc.id, { ...doc.data(), id: doc.id });
    }

    // ของที่มีแต่ในไฟล์ (รอบก่อนหน้าที่ยังไม่ได้เปิด Firestore) ส่งขึ้นไปก่อน
    // ไม่ทำแบบนี้ ประวัติเดิมของผู้ใช้จะหายในวันที่เปิดสวิตช์
    const localOnly = cache.conversations.filter((c) => c.id && !remote.has(c.id));
    for (const conv of localOnly) {
      await this.saveConversation(conv);
      const messages = cache.messages[conv.id] ?? [];
      if (messages.length) await this.saveMessages(conv.id, messages);
      remote.set(conv.id, conv);
    }

    for (const [id, conv] of remote) {
      if (cache.messages[id] === undefined) {
        cache.messages[id] = await this.loadMessages(id);
      }
    }
    cache.conversations = [...remote.values()].sort(
      (a, b) => Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? ""),
    );
  }

  /**
   * ตามการเปลี่ยนแปลงที่ instance อื่นเขียน
   *
   * นี่คือสิ่งที่ทำให้การอ่านแบบ synchronous ยังถูกต้องข้าม instance ได้
   * ถ้ามีแต่ hydrate ตอนสตาร์ต แคชจะค้างอยู่ที่ภาพตอนบูตแล้วเพี้ยนขึ้นเรื่อย ๆ
   */
  watch(cache: HistoryCache, onError?: (err: Error) => void): void {
    if (!this.db || this.unsubscribe) return;
    this.unsubscribe = this.db.collection(CONVERSATIONS).onSnapshot(
      (snapshot) => {
        cache.conversations = snapshot.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }) as StoredConversation)
          .sort((a, b) => Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? ""));
        for (const conv of cache.conversations) {
          if (cache.messages[conv.id] === undefined) cache.messages[conv.id] = [];
        }
      },
      (error) => {
        // ไม่กลืนเงียบ ๆ: แคชจะค้างที่ภาพเก่าแล้วผู้ใช้เห็นประวัติไม่ครบ
        // โดยไม่มีอะไรบอก จึงบันทึกเหตุผลไว้ให้ /health รายงานออกไป
        this.degradedReason = `snapshot listener หลุด: ${error.message}`;
        onError?.(error);
      },
    );
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async saveConversation(conv: StoredConversation): Promise<void> {
    if (!this.db || !conv?.id) return;
    const { id, ...rest } = conv;
    await this.db.collection(CONVERSATIONS).doc(id).set(rest, { merge: true });
  }

  /** ต่อข้อความ เอกสารละหนึ่งข้อความ การต่อพร้อมกันจากสอง instance จึงไม่ทับกัน */
  async saveMessages(conversationId: string, messages: StoredMessage[]): Promise<void> {
    if (!this.db || !conversationId) return;
    const collection = this.db.collection(CONVERSATIONS).doc(conversationId).collection(MESSAGES);
    for (const message of messages) {
      if (!message?.id) continue;
      const { id, ...rest } = message;
      await collection.doc(id).set(rest, { merge: true });
    }
  }

  async loadMessages(conversationId: string): Promise<StoredMessage[]> {
    if (!this.db || !conversationId) return [];
    const snapshot = await this.db
      .collection(CONVERSATIONS)
      .doc(conversationId)
      .collection(MESSAGES)
      .get();
    return snapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }) as StoredMessage)
      .sort((a, b) => Date.parse(a.createdAt ?? "") - Date.parse(b.createdAt ?? ""));
  }

  async dropConversation(conversationId: string): Promise<void> {
    if (!this.db || !conversationId) return;
    const doc = this.db.collection(CONVERSATIONS).doc(conversationId);
    const messages = await doc.collection(MESSAGES).get();
    for (const message of messages.docs) {
      await doc.collection(MESSAGES).doc(message.id).delete();
    }
    await doc.delete();
  }

  /** ลบทุกห้องของผู้ใช้คนหนึ่ง ใช้ตอนล้างประวัติและตอนลบบัญชี */
  async dropConversationsOf(userId: string, cache: HistoryCache): Promise<void> {
    if (!this.db || !userId) return;
    const mine = cache.conversations.filter((c) => c.userId === userId);
    for (const conv of mine) {
      await this.dropConversation(conv.id);
    }
  }
}

/** ที่เก็บแบบไม่ทำอะไร ใช้เมื่อปิดสวิตช์ พฤติกรรมของระบบจึงเหมือนเดิมทุกประการ */
export function disabledStore(): HistoryStore {
  return new HistoryStore(null);
}
