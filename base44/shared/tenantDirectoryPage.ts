import {registryError} from './documentRegistry.ts';
import {decorateTenantProfiles} from './accountProfile.ts';
import {nairobiToday} from './nairobiDates.ts';
import {activeStatuses,blank,notBlank,andQuery,searchQuery,checkedRows} from './tenantManagementScope.ts';
const stages=['profiles','unlinked','history','unlinkedHistory'];
function decodeCursor(value){
  if(!value)return {stage:0};
  let parsed;try{parsed=JSON.parse(value);}catch{throw registryError('Invalid directory cursor.');}
  if(!Number.isInteger(parsed.stage)||parsed.stage<0||parsed.stage>3||parsed.cursor!=null&&typeof parsed.cursor!=='string')throw registryError('Invalid directory cursor.');
  return parsed;
}
export async function tenantDirectoryPage(sr,context,body){
  const {scope,tenants,linkedHistory,unlinkedHistory}=context,{stage,cursor}=decodeCursor(body.cursor),name=stages[stage];
  const profileSearch=searchQuery(body.search,['full_name','email','phone']),historySearch=searchQuery(body.search,['tenant_name']);
  const queries={profiles:andQuery(tenants,{user_id:notBlank},profileSearch),unlinked:andQuery(tenants,{user_id:blank},profileSearch),history:andQuery(linkedHistory,historySearch),unlinkedHistory:andQuery(unlinkedHistory,historySearch)};
  const source=stage<2?sr.entities.Tenant:sr.entities.Tenancy,field=stage===0?'user_id':stage===2?'tenant_user_id':'tenant_id';
  const page=await source.filter(queries[name],{limit:20,cursor:cursor||undefined,...(stage===1?{sort:'-created_date'}:{distinct:field})});
  let profiles=page.items;
  if(stage===0){
    const groups=await sr.entities.Tenant.aggregate({query:andQuery(queries[name],{user_id:{$in:page.items}}),groupBy:'user_id',max:'id',limit:20});
    const ids=checkedRows(groups).map(row=>row.max_id);
    profiles=ids.length?(await sr.entities.Tenant.filter({id:{$in:ids}},{limit:20})).items:[];
  }else if(stage>=2)profiles=page.items.map(id=>({id:stage===3?id:undefined,user_id:stage===2?id:undefined,historical_only:true}));
  if(!profiles.length&&stage<3)return await tenantDirectoryPage(sr,context,{...body,cursor:JSON.stringify({stage:stage+1})});
  if(stage<2&&profiles.length)profiles=await decorateTenantProfiles(sr,profiles);
  const userIds=profiles.map(row=>row.user_id).filter(Boolean),ids=profiles.map(row=>row.id).filter(Boolean);
  const match=andQuery(scope,{$or:[{tenant_user_id:{$in:userIds}},{tenant_id:{$in:ids}}]});
  let summaries=[],balances=[],current={items:[]},active=[];
  if(profiles.length){
    [summaries,balances,current,active]=await Promise.all([
      sr.entities.Tenancy.aggregate({query:match,groupBy:['tenant_user_id','tenant_id','status'],min:['tenant_name','start_date'],limit:1000}).then(checkedRows),
      sr.entities.RentCharge.aggregate({query:andQuery(match,{status:{$nin:['Void','Paid']}}),groupBy:['tenant_user_id','tenant_id'],sum:'outstanding',limit:1000}).then(checkedRows),
      sr.entities.Tenancy.filter(andQuery(match,{status:{$in:activeStatuses},start_date:{$lte:nairobiToday(),$nin:['',null]}}),{sort:'-start_date',limit:50,fields:['tenant_id','tenant_user_id','unit_number','property_name','start_date','status']}),
      sr.entities.Tenancy.aggregate({query:andQuery(match,{status:{$in:activeStatuses},start_date:{$lte:nairobiToday(),$nin:['',null]}}),groupBy:['tenant_user_id','tenant_id'],limit:1000}).then(checkedRows)
    ]);
  }
  const items=profiles.map(profile=>{
    const belongs=row=>profile.user_id&&row.tenant_user_id===profile.user_id||profile.id&&row.tenant_id===profile.id;
    const history=summaries.filter(belongs),activeCount=active.filter(belongs).reduce((sum,row)=>sum+row.count,0),approved=history.some(row=>activeStatuses.includes(row.status));
    const id=profile.id||history[0]?.tenant_id;
    return {...profile,id,directory_id:profile.user_id?`user:${profile.user_id}`:`tenant:${id}`,tenant_ids:[id].filter(Boolean),full_name:profile.full_name||history[0]?.min_tenant_name||'Former tenant',tenancyCount:history.reduce((sum,row)=>sum+row.count,0),activeCount,activeTenancies:current.items.filter(belongs),outstanding:balances.filter(belongs).reduce((sum,row)=>sum+Number(row.sum_outstanding||0),0),occupancy:activeCount?'Current':approved?'Upcoming':history.length?'Former':'Unassigned'};
  });
  let next=page.has_more?{stage,cursor:page.next_cursor}:null;
  if(!next){
    for(let candidate=stage+1;candidate<4;candidate++){
      if(candidate===1&&!context.unlinked.length)continue;
      const entity=candidate<2?sr.entities.Tenant:sr.entities.Tenancy;
      if(await entity.count(queries[stages[candidate]])){next={stage:candidate};break;}
    }
  }
  return {items,has_more:!!next,next_cursor:next?JSON.stringify(next):null};
}