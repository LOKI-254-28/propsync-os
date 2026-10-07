import React,{useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {Image} from '@/components/ui/image';
export default function ProfileAvatar({image,name='',className='h-10 w-10'}) {
  const [failed,setFailed]=useState(false);
  const isPrivate=typeof image==='string'&&image.startsWith('mp/private/');
  const {data}=useQuery({queryKey:['profile-photo',image],enabled:isPrivate,staleTime:240000,refetchInterval:240000,queryFn:async()=> (await base44.integrations.Core.CreateFileSignedUrl({file_uri:image})).signed_url});
  const src=isPrivate?data:image;
  useEffect(()=>setFailed(false),[src]);
  const initials=name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'U';
  return <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground font-semibold ${className}`}>
    {src&&!failed?<Image src={src} alt={`${name||'Account'} profile photograph`} className="h-full w-full" onError={()=>setFailed(true)}/>:<span aria-label={name||'Account'}>{initials}</span>}
  </div>;
}