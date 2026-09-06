const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createCollector,normalize}=require('../backend/weather');
const {dailyQuote,weatherHtml}=require('../backend/codex-page');
const config={name:'Test city',latitude:30,longitude:120};
const payload={current:{temperature_2m:0,weather_code:0,time:'2026-09-06T06:00',wind_speed_10m:0},daily:{temperature_2m_min:[0],temperature_2m_max:[10],precipitation_probability_max:[0]}};
test('weather retains valid zeroes, missing values remain unknown',()=>{
 const w=normalize(payload,config);assert.equal(w.temperature,0);assert.equal(w.rain,0);
 assert.match(weatherHtml(w),/0%/);assert.throws(()=>normalize({},config));
});
test('weather failure preserves old observation with stale label; caches requests',async()=>{
 let time=1,calls=0;
 const collect=createCollector({readConfig:()=>config,now:()=>time,fetcher:async()=>{calls++;if(calls>1)throw Error('offline');return {ok:true,json:async()=>payload};}});
 const a=await collect();assert.equal(a.stale,false);
 await collect();assert.equal(calls,1);
 time+=900001;const b=await collect();assert.equal(b.stale,true);assert.equal(b.updatedAt,a.updatedAt);
});
test('missing location makes no network request; quote changes every five minutes',async()=>{
 const c=createCollector({readConfig:()=>{throw Error('missing');},fetcher:()=>{throw Error('must not fetch');}});
 assert.deepEqual(await c(),{missing:true});
 assert.equal(dailyQuote(Date.parse('2026-09-06T00:00:00+08:00')),dailyQuote(Date.parse('2026-09-06T00:04:59+08:00')));
 assert.notEqual(dailyQuote(Date.parse('2026-09-06T00:04:59+08:00')),dailyQuote(Date.parse('2026-09-06T00:05:00+08:00')));
});
