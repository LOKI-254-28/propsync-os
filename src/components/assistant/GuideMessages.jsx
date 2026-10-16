import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
export default function GuideMessages({ messages, paths }) {
  return <div className="space-y-3" role="log" aria-label="Conversation with AI guide" aria-live="polite">
    {messages.filter(m => m.role === 'user' || m.role === 'assistant').map((message, i) => <div key={i} className={`rounded-lg p-3 text-sm break-words ${message.role === 'user' ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground'}`}>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{message.role === 'user' ? 'You' : 'AI guide'}</p>
      <ReactMarkdown components={{ img: () => null, a: ({href, children}) => paths.includes(href) ? <Link to={href} className="underline">{children}</Link> : <span>{children}</span> }}>{message.content || ''}</ReactMarkdown>
      {message.tool_calls?.map((tool, j) => <p key={j} className="mt-1 text-xs text-muted-foreground">{['failed', 'error'].includes(tool.status) ? 'Could not retrieve account information.' : ['pending', 'running', 'in_progress'].includes(tool.status) ? 'Reading permitted account information…' : 'Account lookup finished.'}</p>)}
    </div>)}
  </div>;
}