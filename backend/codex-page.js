// Server-rendered small-screen view: the screenshot never races an API fetch.
const { readAccountData } = require('./collectors/codex');
const labels = require('../locales/zh-CN.json').compact;
const morning = require('../locales/zh-CN.json').morning;
const weather = require('./weather');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let last = null;
let inflight = null;
function windowOf(bucket, minutes) {
  return [bucket?.primary, bucket?.secondary].find(w => w && w.windowDurationMins === minutes) || null;
}
function remaining(window, now) {
  if (!window || typeof window.usedPercent !== 'number' || !Number.isFinite(window.usedPercent) || !window.resetsAt || window.resetsAt * 1000 <= now) return null;
  return Math.max(0, Math.min(100, 100 - window.usedPercent));
}
const clock = ms => new Date(ms).toLocaleString('zh-CN', {timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
function card(title, w, now) {
  const left=remaining(w,now);
  return `<section><div class="quota-top"><b>${escape(title)}</b><strong>${left===null?'—':left+'<small>%</small>'}<span>${escape(left===null?morning.noWindow:morning.remaining)}</span></strong></div><div class="bar"><i style="width:${left===null?0:left}%"></i></div><div class="reset">${escape(left===null?labels.noWindow:morning.reset+' '+clock(w.resetsAt*1000))}</div></section>`;
}
function tokenScale(tokens) {
  if (!Number.isFinite(tokens) || tokens < 0) return null;
  const compact = n => n >= 1e8 ? (n/1e8).toFixed(2)+'亿' : n >= 1e4 ? (n/1e4).toFixed(1)+'万' : String(Math.round(n));
  return {total:compact(tokens),books:compact(tokens/100000)};
}
function tokenHtml(tokens) {
  const scale=tokenScale(tokens);
  const books='<svg viewBox="0 0 92 29" aria-hidden="true" fill="none" stroke="black" stroke-width="2"><path d="M1 27h90"/>'+Array.from({length:8},(_,i)=>`<rect x="${3+i*11}" y="${3+(i%3)*3}" width="8" height="${23-(i%3)*3}"/><path d="M${5+i*11} 21h4"/>`).join('')+'</svg>';
  return `<div class="box tokens"><div class="token-head"><b>${escape(morning.tokens)}</b><strong>${scale?scale.total:'—'}</strong></div><div class="token-analogy">${books}<span>${scale?escape(morning.bookPrefix+scale.books+morning.bookSuffix):escape(morning.noWindow)}</span></div><small>${escape(morning.bookBasis)}</small></div>`;
}
function latestDaily(usage) {
  const buckets=Array.isArray(usage?.dailyUsageBuckets)?usage.dailyUsageBuckets:[];
  return buckets.filter(b=>/^\d{4}-\d{2}-\d{2}$/.test(b?.startDate||'') && Number.isFinite(b.tokens) && b.tokens>=0).sort((a,b)=>b.startDate.localeCompare(a.startDate))[0] || null;
}
function dailyUsageCard(usage) {
  const day=latestDaily(usage);
  const tokens=day?.tokens;
  const text=day ? (tokens>=1e8?(tokens/1e8).toFixed(2)+'亿':tokens>=1e4?(tokens/1e4).toFixed(1)+'万':String(tokens)):'—';
  return `<section class="daily"><div>${escape(morning.dailyTokens)}</div><strong>${text}</strong><div class="reset">${escape(day ? day.startDate+' · '+morning.dailyRecorded : morning.noWindow)}</div></section>`;
}
function petSvg(now) {
  const minute=Math.floor(now/60000);
  const cat=((minute%3)+3)%3;
  const turn=Math.floor(minute/3);
  const frame=cat===0 ? turn%6 : turn%3+(cat===2?3:0);
  const asset=cat===0 ? 'guoqing-sprites.png' : 'beiguo-diandian-sprites.png';
  const name=morning.petNames[cat];
  const x=(frame%3)*50, y=Math.floor(frame/3)*100;
  return `<div class="pet-wrap"><div class="pet" role="img" aria-label="${escape(name)}" data-cat="${cat}" data-pose="${frame}" style="background-image:url(/assets/${asset});background-position:${x}% ${y}%"></div><span>${escape(name)}</span></div>`;
}
function dailyQuote(now) {
  const slot=Math.floor(now/(5*60000));
  return morning.quotes[((slot%morning.quotes.length)+morning.quotes.length)%morning.quotes.length];
}
function weatherHtml(w) {
  const n=v=>Number.isFinite(v)?Math.round(v):'—';
  if(!w || w.missing) return `<strong class="temp">—°</strong><div>${escape(morning.pending)}</div>`;
  if(w.unavailable) return `<strong class="temp">—°</strong><div>${escape(w.location)}</div><small>${escape(morning.unavailable)}</small>`;
  return `<strong class="temp">${n(w.temperature)}° <span>${escape(morning.conditions[String(w.code)] || morning.weather)}</span></strong><div>${escape(w.location)} · ${n(w.low)}–${n(w.high)}°</div><small>${morning.rain} ${n(w.rain)}% · ${n(w.wind)} km/h</small><small>${escape(w.stale?morning.stale:morning.weather)} ${escape(w.observedAt?.slice(11,16)||'—')}</small>`;
}
function htmlFor(data, updatedAt, stale=false, now=Date.now(), w={missing:true}) {
  const buckets=data?.rateLimitsByLimitId || {};
  const main=buckets.codex || data?.rateLimits;
  const spark=buckets.codex_bengalfox;
  const tokens=data?.usage?.summary?.lifetimeTokens;
  const date=new Date(now).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric',weekday:'long'});
  const time=new Date(now).toLocaleTimeString('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false});
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:600px;height:800px;overflow:hidden;background:white;color:#000;font-family:"PingFang SC",sans-serif}body{padding:20px;display:flex;flex-direction:column;gap:13px}.top{display:grid;grid-template-columns:1fr 1fr;gap:13px;height:160px}.box{min-height:0;border:1px solid #777;padding:16px}.top .box{padding:12px}.clock strong{display:block;font-size:51px;line-height:1.1;letter-spacing:2px;font-variant-numeric:tabular-nums}.clock div{font-size:19px;margin-top:10px}.clock small{font-size:14px;display:block;margin-top:12px}.temp{display:block;font-size:43px;line-height:1.1;margin-bottom:9px}.temp span{font-size:20px;font-weight:400}.weather div{font-size:18px}.weather small{display:block;font-size:13px;margin-top:7px}.quote{height:170px;position:relative;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 139px 12px 19px}.quote:before{content:'“';position:absolute;left:15px;top:2px;font-family:Georgia,serif;font-size:43px}.pet-wrap{position:absolute;right:5px;top:10px;width:128px;text-align:center}.pet{width:128px;height:128px;background-image:url(/assets/guoqing-sprites.png);background-size:300% 200%;background-repeat:no-repeat}.pet-wrap span{font-size:12px;display:block;margin-top:1px}.quote h1{font-size:26px;margin:0 0 10px;letter-spacing:2px}.quote p{font-family:"Songti SC",serif;font-size:22px;line-height:1.4;margin:0;max-width:475px}.quote small{display:block;font-size:14px;letter-spacing:1px;margin-top:8px}.quotas{display:grid;grid-template-columns:1fr 1fr;gap:13px;height:257px}.quotas .box{padding:13px 15px}.quotas h2{font-size:25px;margin:0 0 11px}.quota-top{display:flex;align-items:baseline;justify-content:space-between}.quota-top b{font-size:16px;font-weight:400}.quota-top strong{font-size:25px}.quota-top small{font-size:16px}.quota-top span{font-size:12px;font-weight:400;margin-left:5px}.bar{height:9px;border:1px solid #777;margin:5px 0}.bar i{display:block;background:#000;height:100%}.reset{font-size:12px;white-space:nowrap}section{margin-bottom:13px}.daily{font-size:16px}.daily strong{display:block;font-size:29px;line-height:1.3;margin:4px 0}.tokens{height:94px;padding:8px 15px}.token-head{display:flex;align-items:baseline;justify-content:space-between}.token-head b{font-size:18px}.token-head strong{font-size:32px;line-height:1.1}.token-analogy{display:flex;align-items:center;gap:12px;margin-top:2px}.token-analogy svg{width:80px;height:25px}.token-analogy span{font-size:17px}.tokens small{display:block;font-size:11px;margin-top:3px}footer{font-size:11px;display:flex;justify-content:space-between;line-height:1.6}
</style><div class="top"><div class="box clock"><strong>${time}</strong><div>${escape(date)}</div><small>DALEI · DAILY DASHBOARD</small></div><div class="box weather">${weatherHtml(w)}</div></div><div class="box quote"><h1>${escape(morning.greeting)}</h1><p>${escape(dailyQuote(now))}</p><small>— ${escape(morning.runTitle)}</small>${petSvg(now)}</div><div class="quotas"><div class="box"><h2>Codex</h2>${card(morning.week,windowOf(main,10080),now)}${dailyUsageCard(data?.usage)}</div><div class="box"><h2>Spark</h2>${card(morning.five,windowOf(spark,300),now)}${card(morning.week,windowOf(spark,10080),now)}</div></div>${tokenHtml(tokens)}<footer><span>${escape(morning.source)}</span><span>${escape(stale?labels.stale:labels.live)} ${updatedAt?clock(updatedAt):'—'}</span></footer></html>`;
}
async function readCodex() {
  if (last && Date.now()-last.at<45000) return {...last,stale:false};
  if (!inflight) inflight=readAccountData().then(data=>{last={data,at:Date.now()};return {...last,stale:false};}).catch(error=>{console.error('Codex refresh failed:',error.message);return {...last,stale:true};}).finally(()=>{inflight=null;});
  return inflight;
}
async function renderPage() {
  const [codex,w]=await Promise.all([readCodex(),weather.collect()]);
  return htmlFor(codex.data,codex.at,codex.stale,Date.now(),w);
}
module.exports={renderPage,htmlFor,remaining,windowOf,dailyQuote,weatherHtml,latestDaily,petSvg,tokenScale};
