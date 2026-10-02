import React from 'react';
export default function AlertBadge({ count }) {
  if (!count) return null;
  return <span aria-label={`${count} items need attention`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-tight text-destructive-foreground">{count}</span>;
}