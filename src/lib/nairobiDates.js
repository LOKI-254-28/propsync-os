export const nairobiToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};
export const noticeExpiry = days => {
  const date = new Date(`${nairobiToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days ?? 30));
  return date.toISOString().slice(0, 10);
};