const test=require('node:test');
const assert=require('node:assert/strict');
const {activityHtml}=require('../backend/codex-page');
test('activity distinguishes missing days, real zero and peak usage over 52 weeks',()=>{
 const html=activityHtml({summary:{currentStreakDays:0},dailyUsageBuckets:[{startDate:'2026-09-05',tokens:0},{startDate:'2026-09-06',tokens:100},{startDate:'2026-09-04',tokens:-1}]},Date.parse('2026-09-06T04:00:00Z'));
 assert.equal((html.match(/data-day=/g)||[]).length,364);
 assert.match(html,/class="heat-cell level-0" title="2026-09-05: 0"/);
 assert.match(html,/class="heat-cell level-4" title="2026-09-06: 100"/);
 assert.match(html,/class="heat-cell level--1" title="2026-09-04: —"/);
 assert.match(html,/>0天</);
});
