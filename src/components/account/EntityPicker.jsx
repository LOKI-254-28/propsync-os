import React,{useState} from 'react';
import usePagedEntity from '@/hooks/usePagedEntity';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import entitySearch from '@/lib/entitySearch';
import {Input} from '@/components/ui/input';
import RecordPageControls from '@/components/account/RecordPageControls';
export default function EntityPicker({entity,query={},fields=['name'],value,onChange,placeholder='Select…',selectedLabel,disabled=false}) {
  const [search,setSearch]=useState(''),[selected,setSelected]=useState(null);
  const page=usePagedEntity(entity,{...query,...entitySearch(useDebouncedValue(search),fields)},'-created_date',!disabled);
  const label=record=>fields.map(field=>record[field]).filter(Boolean).join(' · ');
  const onSelect=e=>{const record=page.items.find(item=>item.id===e.target.value);setSelected(record||null);onChange(e.target.value,record);};
  return <div className="space-y-2">
    <Input value={search} disabled={disabled} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${entity.toLowerCase()}…`} aria-label={`Search ${entity.toLowerCase()}`}/>
    <select value={value||''} disabled={disabled||page.isPending} onChange={onSelect} aria-label={placeholder} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
      <option value="">{page.isPending&&!disabled?'Loading…':placeholder}</option>
      {value&&!page.items.some(row=>row.id===value)&&<option value={value}>{selected?.id===value?label(selected):selectedLabel||'Selected record'}</option>}
      {page.items.map(record=><option key={record.id} value={record.id}>{label(record)}</option>)}
    </select>
    <RecordPageControls page={page}/>
  </div>;
}