import React from 'react';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { KES } from '@/lib/finance';
import RatingPanel from '@/components/reviews/RatingPanel';
import TenantTenancyHistory from '@/components/tenants/TenantTenancyHistory';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import TenantNextOfKin from '@/components/tenants/TenantNextOfKin';
import TenantExitActions from '@/components/vacation/TenantExitActions';
export default function TenantProfile({tenant,data,onClose}) {
  if(!tenant)return null;
  const fields=[['Email',tenant.email],['Phone',tenant.phone],['ID / passport',tenant.id_number],['Date of birth',tenant.date_of_birth],['Occupation',tenant.occupation],['Employer',tenant.employer],['Monthly income',tenant.monthly_income ? KES(tenant.monthly_income):'—'],['Emergency contact',tenant.emergency_contact_name],['Emergency phone',tenant.emergency_contact_phone],['Current address',tenant.current_address],['Status',tenant.status || tenant.occupancy]];
  return <Dialog open={!!tenant} onOpenChange={value=>{if(!value)onClose();}}><DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{tenant.full_name} · Tenant profile</DialogTitle></DialogHeader><ProfileAvatar image={tenant.profile_image} name={tenant.full_name} className="h-20 w-20 text-2xl"/><dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">{fields.map(([label,value])=><div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words">{value || '—'}</dd></div>)}</dl>{tenant.notes&&<p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{tenant.notes}</p>}<TenantNextOfKin key={tenant.directory_id || tenant.id} tenant={tenant}/><TenantExitActions tenant={tenant} data={data}/><TenantTenancyHistory tenant={tenant} data={data}/><RatingPanel entity="TenantReview" filter={{tenant_id:{$in:tenant.tenant_ids},tenancy_id:{$in:['',null]}}} title="Earlier tenant ratings (history preserved)"/></DialogContent></Dialog>;
}