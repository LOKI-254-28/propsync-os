import React, { useLayoutEffect } from 'react';
import '@/components/account/AccountExperience.css';

export default function AccountSurface({ children, className = '' }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('account-theme');
    return () => root.classList.remove('account-theme');
  }, []);
  return <div className={`account-surface min-h-screen bg-background text-foreground font-body ${className}`}>{children}</div>;
}