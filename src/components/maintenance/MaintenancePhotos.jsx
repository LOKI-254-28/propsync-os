import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
export default function MaintenancePhotos({ images = [] }) {
  const { data = [], isLoading, error } = useQuery({ queryKey: ['maintenance-photos', images], enabled: images.length > 0, staleTime: 240000, refetchInterval: 240000, queryFn: () => Promise.all(images.map(async uri => /^https?:\/\//i.test(uri) ? uri : (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 300 })).signed_url)) });
  if (!images.length) return null;
  return <div className="space-y-2"><p className="text-sm font-medium">Issue photos</p>{isLoading ? <p className="text-sm text-muted-foreground">Loading photos…</p> : error ? <p className="text-sm text-destructive">Could not load photos.</p> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{data.map((url, i) => <a key={images[i]} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open issue photo ${i + 1}`}><Image src={url} alt={`Issue photo ${i + 1}`} className="h-28 w-full rounded-lg object-cover" /></a>)}</div>}</div>;
}