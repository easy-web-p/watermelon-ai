import { describe, expect, it } from 'vitest';
import { hasLocalModel, resolveOllamaBaseUrl } from '../../server-chat-provider';

describe('local chat model discovery', () => {
  it('accepts only a model actually installed in Ollama', () => {
    expect(hasLocalModel({ models: [{ name: 'qwen3.5:4b' }] }, 'qwen3.5:4b')).toBe(true);
    expect(hasLocalModel({ models: [{ name: 'qwen3.5:2b' }] }, 'qwen3.5:4b')).toBe(false);
  });

  it('rejects malformed model listings', () => {
    expect(hasLocalModel(null)).toBe(false);
    expect(hasLocalModel({ models: [null, {}] })).toBe(false);
  });

  it('allows only loopback or the private Docker Ollama service', () => {
    expect(resolveOllamaBaseUrl()).toBe('http://127.0.0.1:11434');
    expect(resolveOllamaBaseUrl('http://localhost:11434')).toBe('http://localhost:11434');
    expect(resolveOllamaBaseUrl('http://ollama:11434')).toBe('http://ollama:11434');
  });

  it('refuses public, credentialed, TLS, and path-bearing Ollama URLs', () => {
    expect(() => resolveOllamaBaseUrl('https://ollama:11434')).toThrow();
    expect(() => resolveOllamaBaseUrl('http://example.com:11434')).toThrow();
    expect(() => resolveOllamaBaseUrl('http://user:pass@ollama:11434')).toThrow();
    expect(() => resolveOllamaBaseUrl('http://ollama:11434/v1')).toThrow();
  });
});
