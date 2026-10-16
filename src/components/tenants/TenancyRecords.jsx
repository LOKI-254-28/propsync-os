import React,{useState} from 'react';
import {PageHeader,SectionCard,StatusBadge,EmptyState} from '@/components/ui-bits';
import {Dialog,DialogContent} from '@/components/ui/dialog';
import {KES} from '@/lib/finance';
import {ScrollText,Eye} from 'lucide-react';
import TenancyDetail from '@/components/tenants/TenancyDetail';
import RecordPageControls from '@/components/account/RecordPageControls';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import useTenantManagement from '@/hooks/useTenantManagement';
export default function TenancyRecords(){
  const [search,setSearch]=useState(''),[view,setView]=useState(null);
  const page=useTenantManagement('management_tenancies',{search:useDebouncedValue(search).trim().slice(0,100)});
  return <section>
    <PageHeader title="Tenancy records" description="Current tenancies and historical agreements. New tenancies start through the approved application and inspection workflow."/>
    <RecordPageControls page={{...page,search,setSearch}} search placeholder="Search tenancies..."/>
    {page.isPending?<p className="py-6 text-sm text-muted-foreground">Loading tenancies…</p>:!page.error&&!page.items.length?<EmptyState icon={ScrollText} title="No tenancies found"/>:<SectionCard><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">{['Reference','Tenant','Unit','Property','Start','Rent','Status',''].map((label,index)=><th key={index} className="pb-2 pr-3 font-medium">{label}</th>)}</tr></thead><tbody>{page.items.map(tenancy=><tr key={tenancy.id} className="border-b border-border"><td className="py-3 pr-3 font-mono text-xs">{tenancy.tenancy_reference}</td><td className="pr-3 font-medium">{tenancy.tenant_name}</td><td className="pr-3">{tenancy.unit_number}</td><td className="pr-3">{tenancy.property_name}</td><td className="pr-3">{tenancy.start_date}</td><td className="whitespace-nowrap pr-3">{KES(tenancy.monthly_rent)}</td><td className="pr-3"><StatusBadge status={tenancy.status}/></td><td><button aria-label={`View tenancy ${tenancy.tenancy_reference}`} onClick={()=>setView(tenancy)} className="text-primary"><Eye className="h-4 w-4"/></button></td></tr>)}</tbody></table></div></SectionCard>}
    <RecordPageControls page={{...page,error:null}}/>
    <Dialog open={!!view} onOpenChange={open=>{if(!open)setView(null);}}><DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">{view&&<TenancyDetail tenancy={view}/>}</DialogContent></Dialog>
  </section>;
}