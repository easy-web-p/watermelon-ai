/**
 * Whether a path that costs money per call may run.
 *
 * `server.ts` built its Gemini client like this:
 *
 *     const apiKey = process.env.GEMINI_API_KEY;
 *     if (apiKey) aiClient = new GoogleGenAI({ apiKey });
 *
 * and then every text turn in every chat called `gemini-2.5-flash`. Finding a
 * key was treated as permission to spend, so the only way to stop the charges
 * was to delete the key — which also takes away the ability to turn the
 * feature on deliberately. Keys get added to `.env` ahead of time, copied in
 * from another project, or left behind by whoever set the box up; none of that
 * is a decision to bill per message.
 *
 * The vision service already had the right shape for this: `claude` is
 * registered only when `VISION_ENABLE_CLAUDE=1`, and `_env_flag` defaults to
 * off with a comment saying the safer way to be wrong is to not spend money.
 * This module gives the Node API the same rule, so both halves of the system
 * answer the same question the same way.
 *
 * It is a module of its own, like `server-jwt.ts` and `server-ownership.ts`,
 * because `server.ts` exports nothing and cannot be imported by a test
 * without starting a listener.
 */

/** Values that count as "yes". Anything else, including a typo, means no. */
const TRUTHY = new Set(["1", "true", "yes", "on"]);

export type CostPolicy = {
  /** May the paid model be called at all? */
  enabled: boolean;
  /** Empty when enabled; otherwise why not, in Thai, for logs and /health. */
  reason: string;
};

function isOn(value: string | undefined): boolean {
  return TRUTHY.has((value ?? "").trim().toLowerCase());
}

/**
 * Decide whether the paid chat model may be used.
 *
 * Needs the key *and* an explicit opt-in. The two are reported separately
 * because "no key" and "key present but switched off" need different fixes,
 * and telling someone to set a key they already set sends them to the wrong
 * place.
 */
export function chatModelPolicy(env: NodeJS.ProcessEnv = process.env): CostPolicy {
  const key = (env.GEMINI_API_KEY ?? "").trim();
  const optIn = isOn(env.CHAT_ENABLE_GEMINI);

  if (!key && !optIn) {
    return {
      enabled: false,
      reason: "ยังไม่ได้ตั้ง GEMINI_API_KEY และยังไม่ได้เปิด CHAT_ENABLE_GEMINI",
    };
  }
  if (!key) {
    return { enabled: false, reason: "เปิด CHAT_ENABLE_GEMINI ไว้แต่ยังไม่ได้ตั้ง GEMINI_API_KEY" };
  }
  if (!optIn) {
    return {
      enabled: false,
      reason:
        "มี GEMINI_API_KEY แต่ปิดการเรียกโมเดลที่เสียเงินไว้ " +
        "(ตั้ง CHAT_ENABLE_GEMINI=1 เพื่อเปิด) ระหว่างนี้ตอบด้วยระบบกฎในเครื่องซึ่งไม่มีค่าใช้จ่าย",
    };
  }
  return { enabled: true, reason: "" };
}
