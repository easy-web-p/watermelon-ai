import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';

/**
 * Keep farmer conversations on the local host or the private Docker service.
 * An unrestricted URL here would let a deployment setting silently forward
 * chat content to an arbitrary third party.
 */
export function resolveOllamaBaseUrl(configured = process.env.OLLAMA_BASE_URL): string {
  const raw = configured?.trim() || DEFAULT_OLLAMA_BASE_URL;
  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('OLLAMA_BASE_URL ต้องเป็น URL ที่ถูกต้อง');
  }

  const allowedHosts = new Set(['127.0.0.1', 'localhost', '[::1]', 'ollama']);
  const port = parsed.port || '80';
  if (
    parsed.protocol !== 'http:' ||
    !allowedHosts.has(parsed.hostname) ||
    port !== '11434' ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('OLLAMA_BASE_URL อนุญาตเฉพาะ Ollama ภายในเครื่องหรือ private Docker network ที่พอร์ต 11434');
  }

  return parsed.origin;
}

const OLLAMA_BASE_URL = resolveOllamaBaseUrl();
export const localChatModelName = (process.env.LOCAL_CHAT_MODEL ?? 'qwen3.5:4b').trim();

// The resolver above limits this to loopback or the private `ollama` Docker
// service. It cannot be pointed at a public host through configuration.
export const localChatProvider = createOpenAICompatible({
  name: 'ollama',
  baseURL: `${OLLAMA_BASE_URL}/v1`,
});

export function hasLocalModel(tags: unknown, modelName = localChatModelName): boolean {
  if (!tags || typeof tags !== 'object' || !('models' in tags) || !Array.isArray(tags.models)) return false;
  return tags.models.some((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return false;
    const name = 'name' in entry ? entry.name : null;
    const model = 'model' in entry ? entry.model : null;
    return name === modelName || model === modelName;
  });
}

export async function localChatStatus(): Promise<{ ready: boolean; model: string; reason: string }> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) return { ready: false, model: localChatModelName, reason: `Ollama ตอบ HTTP ${response.status}` };
    const tags: unknown = await response.json();
    if (!hasLocalModel(tags)) {
      return { ready: false, model: localChatModelName, reason: `Ollama ยังไม่มีโมเดล ${localChatModelName}` };
    }
    return { ready: true, model: localChatModelName, reason: 'โมเดลในเครื่องพร้อมใช้งาน' };
  } catch {
    return { ready: false, model: localChatModelName, reason: 'ไม่สามารถเชื่อมต่อ Ollama ในเครื่องได้' };
  }
}
