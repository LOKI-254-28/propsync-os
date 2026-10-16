import React,{useState} from 'react';
import {Users} from 'lucide-react';
import {EmptyState} from '@/components/ui-bits';
import RecordPageControls from '@/components/account/RecordPageControls';
import TenantDirectoryCard from '@/components/tenants/TenantDirectoryCard';
import TenantProfile from '@/components/tenants/TenantProfile';
import useTenantManagement from '@/hooks/useTenantManagement';
import useDebouncedValue from '@/hooks/useDebouncedValue';
export default function TenantDirectory(){
  const [search,setSearch]=useState(''),[selected,setSelected]=useState(null);
  const page=useTenantManagement('management_directory',{search:useDebouncedValue(search).trim().slice(0,100)});
  return <section>
    <RecordPageControls page={{...page,search,setSearch}} search placeholder="Search by name, email, phone..."/>
    {page.isPending?<p className="py-6 text-sm text-muted-foreground">Loading tenants…</p>:!page.error&&!page.items.length?<EmptyState icon={Users} title="No tenants found"/>:<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{page.items.map(tenant=><TenantDirectoryCard key={tenant.directory_id} tenant={tenant} onOpen={setSelected}/>)}</div>}
    <RecordPageControls page={{...page,error:null}}/>
    {selected&&<TenantProfile tenant={selected} onClose={()=>setSelected(null)}/>}
  </section>;
}