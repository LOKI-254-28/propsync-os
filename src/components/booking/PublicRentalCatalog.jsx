import React from 'react';
import {Link} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import RentalTypeSamples from '@/components/booking/RentalTypeSamples';
export default function PublicRentalCatalog({catalog}) {
  return <>
    {catalog.loading?<p className="py-10 text-muted-foreground">Loading rentals…</p>:catalog.error?<p role="alert" className="py-10 text-destructive">Could not load rentals. <button className="underline" onClick={()=>catalog.refetch()}>Try again</button></p>:catalog.properties.length===0?<p className="py-10 text-muted-foreground">No properties match your search.</p>:catalog.properties.map(p=><section key={p.id} className="mb-8 space-y-3">
      <div><Link className="font-heading text-lg font-semibold text-primary hover:underline" to={`/browse/${p.id}`}>{p.name}</Link><p className="text-sm text-muted-foreground">{p.address}</p></div>
      <RentalTypeSamples samples={catalog.samples.filter(s=>s.property_id===p.id)} propertyId={p.id}/>
    </section>)}
    {catalog.hasNextPage&&<Button variant="outline" disabled={catalog.isFetchingNextPage} onClick={()=>catalog.fetchNextPage()}>{catalog.isFetchingNextPage?'Loading…':'Load more properties'}</Button>}
  </>;
}