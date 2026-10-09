export default function entitySearch(value,fields){
  const text=String(value||'').trim().slice(0,100);
  if(!text)return {};
  const pattern=text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return {$or:fields.map(field=>({[field]:{$regex:pattern,$options:'i'}}))};
}