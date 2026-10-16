import {useInfiniteQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import useDebouncedValue from '@/hooks/useDebouncedValue';
export default function usePublicCatalog({search='',type='',maxPrice=''}={}) {
  const text=useDebouncedValue(search),price=useDebouncedValue(maxPrice);
  const result=useInfiniteQuery({queryKey:['public-catalog',text,type,price],staleTime:60000,initialPageParam:null,
    queryFn:async({pageParam})=>(await base44.functions.invoke('getPropertyBrowse',{action:'catalog',search:text,type,maxPrice:price===''?null:Number(price),cursor:pageParam})).data,
    getNextPageParam:page=>page.has_more?page.next_cursor:undefined});
  return {...result,properties:result.data?.pages.flatMap(p=>p.properties)||[],samples:result.data?.pages.flatMap(p=>p.samples)||[],loading:result.isPending};
}