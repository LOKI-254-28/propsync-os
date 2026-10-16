import React,{useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {Plus} from 'lucide-react';
import {PageHeader} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/lib/AuthContext';
import {useTenantManagementUpdates} from '@/hooks/useTenantManagement';
import TenantStats from '@/components/tenants/TenantStats';
import TenantDirectory from '@/components/tenants/TenantDirectory';
import TenancyRecords from '@/components/tenants/TenancyRecords';
import AddTenantDialog from '@/components/tenants/AddTenantDialog';
export default function Tenants(){
  const [open,setOpen]=useState(false),[tab,setTab]=useState(()=>new URLSearchParams(window.location.search).get('tab')==='tenancies'?'tenancies':'directory');
  const client=useQueryClient(),{user}=useAuth();
  useTenantManagementUpdates();
  const reload=async()=>{
    await client.invalidateQueries({queryKey:['portfolio',user?.id],refetchType:'none'});
    await client.invalidateQueries({queryKey:['tenant-management',user?.id]},{cancelRefetch:false});
  };
  return <div>
    <PageHeader title="Tenants" description="Tenant directory with current balances and tenancy history." actions={<Button onClick={()=>setOpen(true)}><Plus className="mr-1.5 h-4 w-4"/>Add Tenant</Button>}/>
    <TenantStats/>
    <div className="mb-4 flex gap-2" role="tablist" aria-label="Tenant management"><Button role="tab" aria-selected={tab==='directory'} variant={tab==='directory'?'default':'outline'} onClick={()=>setTab('directory')}>Tenant directory</Button><Button role="tab" aria-selected={tab==='tenancies'} variant={tab==='tenancies'?'default':'outline'} onClick={()=>setTab('tenancies')}>Tenancy records</Button></div>
    {tab==='directory'?<TenantDirectory/>:<TenancyRecords/>}
    {open&&<AddTenantDialog onClose={()=>setOpen(false)} onSaved={reload}/>}
  </div>;
}