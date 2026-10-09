import React from 'react';
import {PageHeader,EmptyState} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
import {CalendarClock} from 'lucide-react';
import useSiteVisits from '@/hooks/useSiteVisits';
import SiteVisitCard from '@/components/applications/SiteVisitCard';

export default function SiteVisits(){
  const visits=useSiteVisits();
  return <div><PageHeader title="Site Visits" description={visits.pending?`${visits.pending} visit request(s) waiting for your response.`:'Accept or reschedule visit requests from prospective tenants.'}/>
    {visits.loading?<p role="status" className="py-16 text-center text-muted-foreground">Loading site visits…</p>:visits.error?<p role="alert" className="text-destructive">Could not load site visits. <Button variant="outline" onClick={visits.refresh}>Try again</Button></p>:!visits.items.length?<EmptyState icon={CalendarClock} title="No site visits" description="Visit requests from tenants will appear here."/>:<div className="space-y-3">{visits.items.map(application=><SiteVisitCard key={application.id} application={application} onUpdated={visits.refresh}/>)}</div>}
    {visits.hasMore&&<Button className="mt-4" variant="outline" disabled={visits.loadingMore} onClick={()=>visits.loadMore()}>{visits.loadingMore?'Loading…':'Load more visits'}</Button>}
  </div>;
}