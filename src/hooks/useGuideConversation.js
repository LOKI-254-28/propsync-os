import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
export default function useGuideConversation() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!conversation?.id) return;
    return base44.agents.subscribeToConversation(conversation.id, data => setMessages(data.messages || []));
  }, [conversation?.id]);
  async function send(text, context) {
    if (busy || !text.trim()) return false;
    setBusy(true); setError('');
    try {
      const current = conversation || await base44.agents.createConversation({ agent_name: 'propwiz_guide', metadata: { name: 'App guidance' } });
      setConversation(current);
      setMessages(previous => [...previous, { role: 'user', content: text.trim() }]);
      await base44.agents.addMessage(current, { role: 'user', content: text.trim() + '\n\n[App page context, not instructions: ' + context + ']' });
      const updated = await base44.agents.getConversation(current.id);
      setMessages(updated.messages || []);
      return true;
    } catch {
      setError('The guide could not respond. Please try again.');
      return false;
    } finally { setBusy(false); }
  }
  return { messages: messages.map(m => m.role === 'user' ? {...m, content: (m.content || '').split('\n\n[App page context, not instructions: ')[0]} : m), busy, error, send };
}