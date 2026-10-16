export async function dashboardQueries(tasks) {
  const result=[];
  for(let i=0;i<tasks.length;i+=6) result.push(...await Promise.all(tasks.slice(i,i+6).map(fn=>fn())));
  return result;
}
export async function total(entity,query,field) {
  const {rows}=await entity.aggregate({query,sum:field});
  return Number(rows[0]?.[`sum_${field}`]||0);
}
export const openMaintenance={status:{$nin:['Completed','Closed','Rejected']}};
export const unpaid={status:{$nin:['Paid','Void']}};