export async function dashboardOccupancy(sr,scope,today) {
  const active={...scope,status:{$in:['Active','Expiring Soon','Notice Given']},$and:[{$or:[{start_date:{$lte:today}},{start_date:null},{start_date:''}]},{$or:[{actual_end_date:{$gt:today}},{actual_end_date:null},{actual_end_date:''}]}]};
  const ids=[];let cursor;
  do {const page=await sr.entities.Tenancy.filter(active,{distinct:'unit_id',limit:500,cursor});ids.push(...page.items.filter(Boolean));cursor=page.has_more?page.next_cursor:null;}while(cursor);
  const live={...scope,status:{$ne:'Inactive'}};
  const [all,occupied]=await Promise.all([
    sr.entities.Unit.aggregate({query:live,groupBy:'status'}),
    ids.length?sr.entities.Unit.aggregate({query:{...live,id:{$in:ids}},groupBy:'status'}):Promise.resolve({rows:[]})
  ]);
  const counts=new Map(occupied.rows.map(r=>[r.status,r.count]));
  const unitsCount=all.rows.reduce((s,r)=>s+r.count,0),occupiedCount=occupied.rows.reduce((s,r)=>s+r.count,0);
  const vacant=all.rows.filter(r=>!['Reserved','Application Pending','Under Maintenance'].includes(r.status));
  const vacantCount=vacant.reduce((s,r)=>s+r.count-(counts.get(r.status)||0),0);
  const availableCount=vacant.filter(r=>['Available','Vacant','Occupied','Notice Given'].includes(r.status)).reduce((s,r)=>s+r.count-(counts.get(r.status)||0),0);
  return {unitsCount,occupiedCount,vacantCount,availableCount,activeTenancies:occupiedCount,occupancyRate:unitsCount?Math.round(occupiedCount/unitsCount*1000)/10:0};
}