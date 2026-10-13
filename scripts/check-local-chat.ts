/** Smoke-test the same free provider and prompt path used by server.ts. */
import { generateText } from 'ai';
import { buildChatMessages, CHAT_INSTRUCTIONS } from '../server-chat-context';
import { localChatModelName, localChatProvider, localChatStatus } from '../server-chat-provider';
import { knowledgeInstructions, knowledgeSources, retrieveKnowledge } from '../server-knowledge';

const status = await localChatStatus();
if (!status.ready) throw new Error(status.reason);
const question = process.argv.slice(2).join(' ') || 'ปุ๋ย NPK คืออะไร และก่อนเลือกอัตราปุ๋ยให้แตงโมต้องรู้อะไรบ้าง';
const evidence = retrieveKnowledge(question);
const start = performance.now();
const result = await generateText({
  model: localChatProvider.chatModel(localChatModelName),
  instructions: `${CHAT_INSTRUCTIONS}\n\n${knowledgeInstructions(evidence)}`,
  messages: buildChatMessages([], question),
  maxOutputTokens: 500,
  temperature: 0.4,
  providerOptions: { ollama: { reasoningEffort: 'none' } },
});
if (!result.text.trim()) throw new Error('Local chat model returned an empty answer');
console.log(JSON.stringify({
  model: localChatModelName,
  seconds: Math.round((performance.now() - start) / 100) / 10,
  question,
  evidence: evidence.map(({ id }) => id),
  answer: result.text + knowledgeSources(evidence),
}, null, 2));
