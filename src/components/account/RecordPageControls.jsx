import React from 'react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
export default function RecordPageControls({page,search=false,placeholder='Search…'}) {
  return <div className="my-4 space-y-3">
    {search&&<Input value={page.search} onChange={e=>page.setSearch(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="max-w-md"/>}
    {page.error&&<p role="alert" className="text-sm text-destructive">Could not load records. <button className="underline" onClick={()=>page.refetch()}>Try again</button></p>}
    {!search&&page.hasNextPage&&<Button variant="outline" disabled={page.isFetchingNextPage} onClick={()=>page.fetchNextPage()}>{page.isFetchingNextPage?'Loading…':'Load more'}</Button>}
  </div>;
}