import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
export default function InspectionPhotoGrid({images=[]}) {
  const {data=[],isLoading,error}=useQuery({queryKey:['inspection-condition-photos',images],enabled:images.length>0,staleTime:240000,refetchInterval:240000,queryFn:()=>Promise.all(images.map(async uri=>(await base44.integrations.Core.CreateFileSignedUrl({file_uri:uri,expires_in:300})).signed_url))});
  if (!images.length) return null;
  return <div><p className="mb-2 text-sm font-medium">Condition photographs</p>{isLoading?<p className="text-sm text-muted-foreground">Loading photographs…</p>:error?<p className="text-sm text-destructive">Could not load photographs.</p>:<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{data.map((url,i)=><a key={images[i]} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open condition photograph ${i+1}`}><Image src={url} alt={`Unit condition ${i+1}`} className="h-28 w-full rounded-lg"/></a>)}</div>}</div>;
}