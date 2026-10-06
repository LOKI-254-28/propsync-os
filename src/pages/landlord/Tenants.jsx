import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { KES } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus, Search, Phone, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { secureCreate } from "@/lib/secureCreate";
import TenantStats from "@/components/tenants/TenantStats";
import TenantDirectoryCard from '@/components/tenants/TenantDirectoryCard';
import TenantProfile from '@/components/tenants/TenantProfile';
import Tenancies from '@/pages/landlord/Tenancies';
import { buildTenantDirectory } from '@/lib/tenantDirectory';

export default function Tenants() {
  const data = usePortfolioData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected,setSelected]=useState(null),[tab,setTab]=useState(()=>new URLSearchParams(window.location.search).get('tab')==='tenancies'?'tenancies':'directory');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", id_number: "", occupation: "", employer: "", monthly_income: 0, emergency_contact_name: "", emergency_contact_phone: "", current_address: "", notes: "" });

  const tenantsWithStats = useMemo(() => buildTenantDirectory(data.tenants,data.tenancies,data.charges), [data.tenants,data.tenancies,data.charges]);

  const filtered = tenantsWithStats.filter((t) => t.full_name?.toLowerCase().includes(search.toLowerCase()) || t.email?.toLowerCase().includes(search.toLowerCase()) || t.phone?.includes(search));

  const create = async () => {
    if (busy || !form.full_name.trim()) return;
    setBusy(true);setError('');
    try {
    await secureCreate("Tenant", { ...form, full_name:form.full_name.trim(), status: "Active" });
    setOpen(false);
    setForm({ full_name: "", email: "", phone: "", id_number: "", occupation: "", employer: "", monthly_income: 0, emergency_contact_name: "", emergency_contact_phone: "", current_address: "", notes: "" });
    data.reload();
    } catch(e){setError(e.response?.data?.error || e.message);}finally{setBusy(false);}
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Tenants" description="Tenant directory with current balances and tenancy history." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Add Tenant</Button>} />

      <TenantStats tenants={tenantsWithStats} tenancies={data.tenancies} charges={data.charges} />
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Tenant management"><Button role="tab" aria-selected={tab==='directory'} variant={tab==='directory'?'default':'outline'} onClick={()=>setTab('directory')}>Tenant directory</Button><Button role="tab" aria-selected={tab==='tenancies'} variant={tab==='tenancies'?'default':'outline'} onClick={()=>setTab('tenancies')}>Tenancy records</Button></div>
      {tab==='tenancies'?<Tenancies portfolioData={data}/>:<>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No tenants found" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t=><TenantDirectoryCard key={t.directory_id} tenant={t} onOpen={setSelected}/>)}
        </div>
      )}

      </>}
      <TenantProfile tenant={selected ? tenantsWithStats.find(t=>t.directory_id===selected.directory_id) || selected : null} data={data} onClose={()=>setSelected(null)}/>
      <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Tenant</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2 max-h-[60vh] overflow-y-auto">
            <Field label="Full name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="ID number"><Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></Field>
            <Field label="Occupation"><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></Field>
            <Field label="Employer"><Input value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} /></Field>
            <Field label="Monthly income"><Input type="number" value={form.monthly_income} onChange={(e) => setForm({ ...form, monthly_income: Number(e.target.value) })} /></Field>
            <Field label="Emergency contact"><Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></Field>
            <Field label="Emergency phone"><Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Current address"><Textarea value={form.current_address} onChange={(e) => setForm({ ...form, current_address: e.target.value })} rows={2} /></Field></div>
            <div className="col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></Field></div>
          </div>
          {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button onClick={create} disabled={busy||!form.full_name.trim()} className="bg-emerald-600 hover:bg-emerald-700">{busy?'Creating…':'Create Tenant'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}