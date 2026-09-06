const fs = require('node:fs');
const path = require('node:path');
const CONFIG = path.join(__dirname, '..', 'out', 'weather-location.json');
const TTL = 15 * 60 * 1000;
function normalize(raw, location, now = Date.now()) {
  const c = raw.current, d = raw.daily;
  if (!c || !Number.isFinite(c.temperature_2m) || !Number.isFinite(c.weather_code) || !c.time) throw new Error('Invalid weather data');
  const number = v => Number.isFinite(v) ? v : null;
  return { location: location.name, temperature: c.temperature_2m, code: c.weather_code,
    wind: number(c.wind_speed_10m), low: number(d?.temperature_2m_min?.[0]),
    high: number(d?.temperature_2m_max?.[0]), rain: number(d?.precipitation_probability_max?.[0]),
    observedAt: c.time, updatedAt: now, stale: false };
}
function createCollector({ fetcher = fetch, readConfig = () => JSON.parse(fs.readFileSync(CONFIG, 'utf8')), now = Date.now } = {}) {
  let cache = null, lastAttempt = -Infinity, key = '', pending = null;
  return async function collect() {
    let location;
    try { location = readConfig(); } catch { return {missing:true}; }
    if (!location?.name || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || Math.abs(location.latitude)>90 || Math.abs(location.longitude)>180) return {missing:true};
    const nextKey = JSON.stringify(location);
    if (key !== nextKey) { cache=null; lastAttempt=-Infinity; key=nextKey; }
    if (pending) return pending;
    if (now()-lastAttempt<TTL) return cache || {unavailable:true,location:location.name};
    lastAttempt=now();
    const query = new URLSearchParams({latitude:String(location.latitude),longitude:String(location.longitude),
      current:'temperature_2m,weather_code,wind_speed_10m',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone:'Asia/Shanghai',forecast_days:'1'});
    pending=(async()=>{
      try {
        const response=await fetcher('https://api.open-meteo.com/v1/forecast?'+query,{signal:AbortSignal.timeout(8000)});
        if(!response.ok) throw new Error('Weather unavailable');
        cache=normalize(await response.json(),location,now());
      } catch { cache=cache ? {...cache,stale:true} : {unavailable:true,location:location.name}; }
      return cache;
    })().finally(()=>{pending=null;});
    return pending;
  };
}
module.exports={collect:createCollector(),createCollector,normalize};
