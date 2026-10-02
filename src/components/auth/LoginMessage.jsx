import React, { useState } from 'react';
import { loginMessages } from '@/components/auth/loginMessages';
export default function LoginMessage() {
  const [message] = useState(() => {
    const saved = sessionStorage.getItem('propwiz.loginMessage');
    if (saved && loginMessages.includes(saved)) return saved;
    const selected = loginMessages[Math.floor(Math.random() * loginMessages.length)];
    sessionStorage.setItem('propwiz.loginMessage', selected);
    return selected;
  });
  return <div className="mb-5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-center text-sm leading-relaxed text-muted-foreground">{message}</div>;
}