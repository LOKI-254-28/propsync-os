import React from 'react';
import {Button} from '@/components/ui/button';
import ApprovedPayments from '@/components/payment/ApprovedPayments';
export default function ApprovedReceiptList({receipts,onReceipt}){
  if(receipts.loading)return <p role="status" className="mt-6 text-sm text-muted-foreground">Loading approved payments…</p>;
  return <div>{receipts.error&&<p role="alert" className="mt-6 text-sm text-destructive">Could not load approved payments. <Button variant="outline" onClick={receipts.refresh}>Try again</Button></p>}{!receipts.error&&<ApprovedPayments payments={receipts.payments} onReceipt={onReceipt}/>} {receipts.hasMore&&<Button className="mt-4" variant="outline" disabled={receipts.loadingMore} onClick={()=>receipts.loadMore()}>{receipts.loadingMore?'Loading…':'Load more receipts'}</Button>}</div>;
}