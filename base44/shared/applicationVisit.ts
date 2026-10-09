import {registryError} from './documentRegistry.ts';
import {nairobiToday} from './nairobiDates.ts';
const fields=['site_visit_date','site_visit_time','site_visit_status','site_visit_proposed_by'];
export function validateApplicationVisit(app,updates,staff){
  const target=updates.status,visit=updates.site_visit_status,actor=staff?'landlord':'tenant';
  if(!fields.some(key=>key in updates)&&!['Site Visit Requested','Site Visit Scheduled','Site Visit Completed'].includes(target))return;
  const slot=(date,time)=>{if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||typeof time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw registryError('Choose a valid visit date and time.');const at=new Date(`${date}T${time}+03:00`);if(!Number.isFinite(at.getTime())||nairobiToday(at)!==date)throw registryError('Choose a real calendar date.');return at.getTime();};
  if(visit==='Requested'&&staff&&target==='Site Visit Requested'&&['Under Review','Information Provided','Site Visit Requested','Site Visit Scheduled'].includes(app.status)&&!fields.filter(k=>k!=='site_visit_status').some(k=>k in updates))return;
  if(!['Site Visit Requested','Site Visit Scheduled'].includes(app.status))throw registryError('This application is not negotiating a site visit.',409);
  if(visit==='Completed'||target==='Site Visit Completed'){
    if(!staff)throw registryError('Only the landlord can mark the site visit completed.',403);
    if(visit!=='Completed'||target!=='Site Visit Completed'||app.status!=='Site Visit Scheduled'||app.site_visit_status!=='Confirmed'||fields.filter(k=>k!=='site_visit_status').some(k=>k in updates)||slot(app.site_visit_date,app.site_visit_time)>Date.now())throw registryError('Complete a confirmed visit only after its scheduled time.',409);
    return;
  }
  if(visit==='Confirmed'||target==='Site Visit Scheduled'){
    if(visit!=='Confirmed'||target!=='Site Visit Scheduled'||(app.status!=='Site Visit Requested'&&!(app.status==='Site Visit Scheduled'&&['Proposed','Rescheduled'].includes(app.site_visit_status)))||!['tenant','landlord'].includes(app.site_visit_proposed_by)||app.site_visit_proposed_by===actor||fields.filter(k=>k!=='site_visit_status').some(k=>k in updates))throw registryError('Only the other party can confirm the proposed visit without changing its time.',409);
    if(slot(app.site_visit_date,app.site_visit_time)<=Date.now())throw registryError('This proposed time has passed. Propose another time.',409);
    return;
  }
  if(!['Proposed','Rescheduled'].includes(visit)||target!=='Site Visit Requested'||updates.site_visit_proposed_by!==actor)throw registryError('Propose a visit time or respond to the other party\'s proposal.',403);
  if(app.status==='Site Visit Scheduled'&&app.site_visit_status==='Confirmed'&&slot(app.site_visit_date,app.site_visit_time)<=Date.now())throw registryError('The confirmed visit time has passed; the landlord must record its completion.',409);
  if(slot(updates.site_visit_date,updates.site_visit_time)<=Date.now())throw registryError('Choose a future visit time in East Africa Time.');
}