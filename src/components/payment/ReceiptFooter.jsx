import React from 'react';
import {receiptNotes} from '@/components/payment/receiptPdfCanvas';
export default function ReceiptFooter() {
  return <footer className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground"><p className="mb-1 font-semibold uppercase tracking-wide text-primary">Receipt notes</p><p>{receiptNotes}</p><p className="mt-2">Computer-generated acknowledgement of verified payment.</p></footer>;
}