const {test}=require('node:test');
const assert=require('node:assert/strict');
const {htmlFor,remaining,windowOf}=require('../backend/codex-page');
test('absent and expired windows are unknown, never zero usage',()=>{
 assert.equal(remaining(null,1000),null);
 assert.equal(remaining({usedPercent:0,resetsAt:1},1000),null);
 assert.equal(remaining({usedPercent:64,resetsAt:2},1000),36);
});
test('Spark five-hour bucket does not populate the main five-hour quota',()=>{
 const main={primary:{windowDurationMins:10080,usedPercent:64,resetsAt:2000}};
 assert.equal(windowOf(main,300),null);
 const html=htmlFor({rateLimitsByLimitId:{codex:main,codex_bengalfox:{primary:{windowDurationMins:300,usedPercent:25,resetsAt:2000}}}},1000,false,1000);
 assert.match(html,/36<small>/);assert.match(html,/75<small>/);assert.match(html,/最近日 Token 用量/);
 assert.doesNotMatch(html,/NaN/);
});

test('daily usage selects latest available day without assuming today or zero',()=>{
 const {latestDaily}=require('../backend/codex-page');
 assert.equal(latestDaily({dailyUsageBuckets:[]}),null);
 assert.deepEqual(latestDaily({dailyUsageBuckets:[{startDate:'2026-09-05',tokens:0},{startDate:'2026-09-04',tokens:10},{startDate:'invalid',tokens:999}]}),{startDate:'2026-09-05',tokens:0});
});

test('token analogy uses an explicit 100k-token unit and preserves unavailable data',()=>{
 const {tokenScale}=require('../backend/codex-page');
 assert.deepEqual(tokenScale(37439033767),{total:'374.39亿',books:'37.4万'});
 assert.deepEqual(tokenScale(0),{total:'0',books:'0'});
 assert.equal(tokenScale(null),null);assert.equal(tokenScale(-1),null);
});

test('all three cats rotate with their own sprite row and label',()=>{
 const {petSvg}=require('../backend/codex-page');
 assert.match(petSvg(0),/国庆/);assert.match(petSvg(60000),/贝果/);assert.match(petSvg(120000),/点点大哥/);
 assert.match(petSvg(120000),/background-position:0% 100%/);
 assert.match(petSvg(180000),/data-pose="1"/);
});
