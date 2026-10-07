export default function alertSeen(user) {
  const sectionSeen={...(user.section_alert_seen||user.data?.section_alert_seen||{})};
  const itemSeen={...(user.alert_item_seen||user.data?.alert_item_seen||{})};
  const buckets=new Map(),now=new Date().toISOString();let changed=false;
  const add=(route,key,version)=>{
    if(!route)return;
    const timestamp=version||'1970-01-01T00:00:00.000Z';
    if(timestamp<=(sectionSeen[route]||'')||timestamp<=(itemSeen[key]||''))return;
    if(!buckets.has(route))buckets.set(route,new Set());buckets.get(route).add(key);
  };
  const remember=key=>{if(key){itemSeen[key]=now;changed=true;}};
  const visit=route=>{if(buckets.get(route)?.size){sectionSeen[route]=now;buckets.delete(route);changed=true;}};
  const save=async b=>{
    if(!changed)return;
    const bounded=Object.fromEntries(Object.entries(itemSeen).sort((a,b)=>a[1].localeCompare(b[1])).slice(-2000));
    await b.auth.updateMe({section_alert_seen:sectionSeen,alert_item_seen:bounded});
  };
  return {buckets,add,remember,visit,save};
}