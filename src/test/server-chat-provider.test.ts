import { describe, expect, it } from 'vitest';
import { hasLocalModel } from '../../server-chat-provider';

describe('local chat model discovery', () => {
  it('accepts only a model actually installed in Ollama', () => {
    expect(hasLocalModel({ models: [{ name: 'qwen3.5:4b' }] }, 'qwen3.5:4b')).toBe(true);
    expect(hasLocalModel({ models: [{ name: 'qwen3.5:2b' }] }, 'qwen3.5:4b')).toBe(false);
  });

  it('rejects malformed model listings', () => {
    expect(hasLocalModel(null)).toBe(false);
    expect(hasLocalModel({ models: [null, {}] })).toBe(false);
  });
});
