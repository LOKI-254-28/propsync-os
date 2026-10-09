import React from 'react';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {Wrench} from 'lucide-react';
export default function AssignedWorkLink({onNavigate}) {
  const {user}=useAuth();
  const {data}=useQuery({queryKey:['contractor-work-access',user?.id],queryFn:async()=>(await base44.functions.invoke('maintenanceOps',{action:'assigned'})).data,refetchInterval:60000});
  if(!data?.is_contractor)return null;
  return <Link to="/assigned-maintenance" onClick={onNavigate} className="flex min-h-10 items-center gap-3 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-primary hover:bg-accent/70"><Wrench className="h-4 w-4"/>Assigned Maintenance</Link>;
}