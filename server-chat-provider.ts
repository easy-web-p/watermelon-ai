import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
export const localChatModelName = (process.env.LOCAL_CHAT_MODEL ?? 'qwen3.5:4b').trim();

// Localhost only: a farmer's conversation must not be forwarded to an
// arbitrary URL supplied through an environment variable.
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
