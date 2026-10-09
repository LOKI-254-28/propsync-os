const small=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function words(number){
  if(number<20)return small[number];
  if(number<100)return tens[Math.floor(number/10)]+(number%10?`-${small[number%10]}`:'');
  if(number<1000)return `${small[Math.floor(number/100)]} hundred${number%100?` and ${words(number%100)}`:''}`;
  for(const [scale,label] of [[1e12,'trillion'],[1e9,'billion'],[1e6,'million'],[1e3,'thousand']])if(number>=scale)return `${words(Math.floor(number/scale))} ${label}${number%scale?` ${words(number%scale)}`:''}`;
}
export function receiptAmountWords(value){
  const cents=Math.round(Number(value||0)*100),whole=Math.floor(Math.abs(cents)/100),fraction=Math.abs(cents)%100;
  if(!Number.isSafeInteger(cents))return 'Amount exceeds supported range';
  const text=`${cents<0?'minus ':''}${words(whole)} Kenya shillings${fraction?` and ${words(fraction)} cents`:''} only`;
  return text.charAt(0).toUpperCase()+text.slice(1);
}