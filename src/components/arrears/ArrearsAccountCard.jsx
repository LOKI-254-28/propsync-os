import React from 'react';
import {Bell,Send} from 'lucide-react';
import {SectionCard,StatusBadge} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
import {KES} from '@/lib/finance';
import ArrearsChargeTable from '@/components/arrears/ArrearsChargeTable';
export default function ArrearsAccountCard({account,onNotice,onReminder}){
  return <SectionCard><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><p className="font-semibold text-foreground">{account.tenant_name}</p><StatusBadge status={account.worstClass}/></div><p className="text-xs text-muted-foreground">{account.charge_count} overdue charge(s) · Last payment: {account.lastPayment?`${KES(account.lastPayment.amount)} on ${account.lastPayment.payment_date}`:'None'} · {account.notice_count} notice(s) issued</p></div><div className="flex flex-wrap items-center gap-3"><div className="text-right"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-bold text-destructive">{KES(account.total)}</p></div><Button size="sm" variant="outline" onClick={()=>onReminder(account)}><Bell/>Send reminder</Button><Button size="sm" variant="outline" onClick={()=>onNotice(account)}><Send/>Issue Notice</Button></div></div><ArrearsChargeTable key={`${account.tenant_id}:${account.total}`} account={account}/></SectionCard>;
}