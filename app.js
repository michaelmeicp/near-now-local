(() => {
'use strict';
const N = window.Near, $ = id => document.getElementById(id);
const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const days = {morning:'上午', afternoon:'下午', evening:'夜間'};
const efforts = {gentle:'輕鬆', moderate:'適中', active:'較費力'};
const district = id => N.districts.find(d=>d.id===id)?.name || '未指定';
const byId = id => N.sessions.find(s=>s.id===id);
const stamp = iso => iso ? N.venueDate(iso)+' '+N.timeLabel(iso) : '無紀錄';
const interval = s => stamp(s.start)+' 至 '+(s.start.slice(0,10)===s.end.slice(0,10)?N.timeLabel(s.end):stamp(s.end))+'（UTC+8）';
let storage; try {storage=window.localStorage;} catch {}
let saved=N.load(storage), detailId=null, opener=null;
const announce = message => {$('announce').textContent=message;};
const selectOptions=N.districts.map(d=>'<option value="'+h(d.id)+'">'+h(d.name)+'</option>').join('');
$('area').innerHTML='<option value="all">全部集合區</option>'+selectOptions;
$('origin').innerHTML='<option value="">未選出發區</option>'+selectOptions;
function reset(){ $('date').value=N.anchor.slice(0,10); for(const id of ['area','effort','period','length']) $(id).value='all'; $('origin').value=''; $('family').checked=false; $('openOnly').checked=false; }
reset();
$('anchor').textContent='示範現在：'+stamp(N.anchor)+'（臺灣時間 UTC+8）。場次及狀態固定於此刻，不是即時資訊。';
const badge=s=>{const st=N.statusOf(s);return '<span class="badge" data-status="'+h(st.id)+'">'+h(st.label)+'</span>'};
const walk=s=>{const from=$('origin').value; if(!from)return '選出發區可估步程'; const n=N.dist(from,s.district); return n==null?'步程待查':from===s.district?'同區步行約 5 分（示意）':'區間步行約 '+n+' 分';};
const btn=(action,s,label,cls='button')=>'<button type="button" class="'+cls+'" data-act="'+action+'" data-id="'+h(s.id)+'">'+h(label)+'</button>';
function card(s){return '<article class="session"><div class="session-time"><strong>'+N.timeLabel(s.start)+'</strong><small>'+s.minutes+' 分鐘</small></div><div class="session-main"><div class="eyebrow">合成場次 · '+h(district(s.district))+'</div><h3>'+h(s.title)+'</h3>'+badge(s)+'<p class="meta">'+h(walk(s))+' · '+h(efforts[s.effort])+(s.family?' · 親子友善':'')+'</p><small class="notes">'+h(interval(s))+'<br>來源：'+h(s.operator)+' · 核對 '+h(stamp(s.checked))+(N.statusOf(s).stale?' · 資料較舊':'')+'</small></div><div class="session-actions">'+btn('detail',s,'查看詳情','button button-quiet')+'</div></article>'; }
function render(){const date=$('date').value;const items=!date?[]:N.filter({date,daypart:$('period').value,length:$('length').value,effort:$('effort').value,districtFilter:$('area').value,family:$('family').checked?'yes':'all',clearOnly:$('openOnly').checked});
const grouped=Object.keys(days).map(k=>{const list=items.filter(s=>N.daypart(s)===k);return list.length?'<section class="daypart"><h3 class="daypart-title">'+days[k]+' <small>'+list.length+' 場</small></h3>'+list.map(card).join('')+'</section>':'';}).join('');
$('summary').textContent=(date||'尚未選日期')+' · '+items.length+' 場 · 臺灣時間 UTC+8';
$('results').innerHTML=grouped||'<div class="empty"><strong>'+(!date?'請先選擇日期':!N.dates.includes(date)?'此日期超出示範範圍':!N.sessions.some(s=>s.start.startsWith(date))?'這天沒有示範場次':'沒有符合條件的場次')+'</strong><p>示範日期 '+h(N.dates[0])+' 至 '+h(N.dates.at(-1))+'。可改選日期或放寬篩選。</p></div>';
renderSaved();}
function renderSaved(){const rows=saved.map(byId).filter(Boolean).sort((a,b)=>a.start.localeCompare(b.start)), conflicts=N.overlaps(rows);
if($('savedCount'))$('savedCount').textContent=String(rows.length);
$('saved').innerHTML=rows.length?(conflicts.length?'<p class="warning">時段重疊：'+conflicts.map(([a,b])=>h(byId(a).title)+'／'+h(byId(b).title)).join('；')+'。請擇一或調整行程。</p>':'')+rows.map(s=>'<article class="saved-item"><div class="eyebrow">合成場次 · '+h(district(s.district))+'</div><h3>'+h(s.title)+'</h3>'+badge(s)+'<p class="meta">'+h(interval(s))+'</p>'+btn('detail',s,'詳情','button button-quiet')+' '+btn('toggle',s,'移除','button button-quiet')+'</article>').join('')+'<button class="button" data-act="export">匯出文字行程</button>':'<div class="empty"><strong>還沒有收藏的時段</strong><p>在場次詳情按「存入行程」，即可一起檢查時間是否重疊。</p></div>';}
function detail(s){const st=N.statusOf(s);$('details').innerHTML='<div class="detail-inner"><button data-act="close" class="button detail-close">關閉</button><div class="eyebrow">合成場地與營運資料 · 示範場次</div><h2 id="detailTitle">'+h(s.title)+'</h2>'+badge(s)+'<p>'+h(s.description)+'</p><dl class="detail-meta">'+Object.entries({'場地時間':interval(s),'集合地點':district(s.district)+' · '+s.meeting,'步程估算':walk(s),'參加條件':s.minutes+' 分鐘 · '+efforts[s.effort]+' · '+(s.family?'親子友善':'未標示親子友善'),'示範營運者':s.operator,'原始資料（合成）':s.source,'最近核對':stamp(s.checked)+'（UTC+8）','來源最後更新':stamp(s.updated)+'（UTC+8）'}).map(([k,v])=>'<dt>'+k+'</dt><dd>'+h(v)+'</dd>').join('')+'</dl><p class="notes">'+(st.stale?'資料較舊，不能據此推定仍有名額。':'狀態以示範基準時間判讀。')+' 核對時間是查看來源的時刻；最後更新是來源改版的時刻。行前請自行查看營運者公告。</p><div class="detail-actions">'+btn('toggle',s,saved.includes(s.id)?'從行程移除':'存入行程','button button-primary')+'</div></div>'; }
function exportText(){const rows=saved.map(byId).filter(Boolean);const content='Near Now｜合成示範行程（非憑證）\n示範基準：'+stamp(N.anchor)+'（UTC+8）\n行前請自行查看營運者公告。\n'+rows.map(s=>'\n合成場次｜'+s.title+'\n'+interval(s)+' · '+s.meeting+' · '+N.statusOf(s).label+'\n合成來源：'+s.operator+'／'+s.source+' · 核對 '+stamp(s.checked)+'（UTC+8）').join('\n')+(N.overlaps(rows).length?'\n注意：部分場次時段重疊。':'');const url=URL.createObjectURL(new Blob(['\uFEFF'+content],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='near-now-demo.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act,s=byId(b.dataset.id);if(act==='export'){exportText();return;}if(act==='close'){$('details').close();return;}if(!s)return;
if(act==='detail'){opener=b;detailId=s.id;detail(s);$('details').setAttribute('aria-labelledby','detailTitle');$('details').showModal();$('details').querySelector('button').focus();return;}
if(act==='toggle'){const before=saved.includes(s.id);saved=before?saved.filter(id=>id!==s.id):[...saved,s.id];const ok=N.save(storage,saved);renderSaved();if(detailId){detail(s);$('details').querySelector('[data-act="toggle"]').focus();}else{$('saved').setAttribute('tabindex','-1');$('saved').focus();}announce((before?'已移除':'已存入行程')+(ok?'':'；瀏覽器無法儲存，僅本次有效'));}});
$('details').addEventListener('close',()=>{detailId=null;if(opener?.isConnected)opener.focus();else{$('saved').setAttribute('tabindex','-1');$('saved').focus();}});
for(const id of ['date','period','length','area','origin','family','effort','openOnly']) $(id).addEventListener('change',()=>{render();announce($('summary').textContent);});
$('reset').addEventListener('click',()=>{reset();render();announce('已重設篩選');});render();
})();
