import React,{useState} from 'react';
import TenancyLedgerList from '@/components/tenants/TenancyLedgerList';
export default function TenancyFinancialHistory({tenancyId}){
  const [open,setOpen]=useState(false);
  return <details className="text-sm" onToggle={event=>setOpen(event.currentTarget.open)}><summary className="cursor-pointer font-medium">Charge and payment history</summary>{open&&<div className="mt-2 space-y-4"><TenancyLedgerList tenancyId={tenancyId} kind="charges"/><TenancyLedgerList tenancyId={tenancyId} kind="payments"/></div>}</details>;
}