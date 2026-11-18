(function () {
  'use strict';

  const anchor = '2026-11-18T10:20:00+08:00';
  const timezone = 'Asia/Taipei';
  const dates = Object.freeze(Array.from({length: 7}, (_, i) => '2026-11-' + (18 + i)));
  const districts = [
    {id: 'river', name: '河岸區', point: [0, 0]},
    {id: 'oldtown', name: '舊街區', point: [700, 350]},
    {id: 'hill', name: '山腳區', point: [1250, 950]},
    {id: 'harbor', name: '港邊區', point: null}
  ];
  const statuses = Object.freeze({
    open: '場次開放', full: '已滿額', cancelled: '已取消', paused: '暫停',
    weather: '天氣待確認', unknown: '待查', expired: '已過集合時間'
  });

  const fromDemo = (day, clock) => '2026-11-' + day + 'T' + clock + ':00+08:00';
  const minute = 60 * 1000;
  const dateFmt = new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'});
  const clockFmt = new Intl.DateTimeFormat('en-GB', {timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
  function venueDate(iso) {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return '';
    const parts = Object.fromEntries(dateFmt.formatToParts(ms).map(({type, value}) => [type, value]));
    return parts.year + '-' + parts.month + '-' + parts.day;
  }
  function timeLabel(iso) {
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? clockFmt.format(ms) : '';
  }

  function make(id, title, description, district, day, begins, untilDay, ends,
      family, effort, availability, meeting, operator, source, timing = {}) {
    const start = fromDemo(day, begins);
    const end = fromDemo(untilDay, ends);
    return {
      id, title, description, district, start, end,
      minutes: (Date.parse(end) - Date.parse(start)) / minute,
      family, effort, availability, meeting, operator, source, art: district,
      checked: timing.checked === null ? null : timing.checked || fromDemo(18, '09:55'),
      updated: timing.updated === null ? null : timing.updated || fromDemo(18, '09:30'),
      synthetic: true
    };
  }

  const sessions = [
    make('riverside-birds', '河邊慢走：看堤岸的鳥', '沿著河灣慢慢走，把辨認鳥叫和看潮痕當成今天的小任務。路面大多平整，中途有能坐下休息的地方。', 'river', 18, '11:10', 18, '12:00', true, 'gentle', 'open', '河灣步道口的藍色長椅', '河灣觀察站', '晨間巡場紀錄・合成摘錄'),
    make('old-town-numbers', '老街門牌散步', '從一排門牌讀懂街廓改建前的樣子，最後停在老拱廊下看留下的招牌。路線經過數段高低石階。', 'oldtown', 18, '14:00', 18, '15:15', false, 'moderate', 'open', '舊街拱廊入口的石柱旁', '門牌散步室', '導覽人員時段表・合成摘錄'),
    make('hill-dusk', '山腳看暮色', '跟著緩坡小徑走到能看見整段山線的空地。回程天色可能較暗，部分路面不平。', 'hill', 18, '18:20', 18, '19:25', false, 'moderate', 'open', '山腳階梯前的候車亭', '山腳慢行社', '暮色路線公告・合成摘錄'),
    make('old-town-tiles', '小巷花磚尋寶', '在小巷中找不同顏色的門楣花磚。活動步調慢，適合一起觀察細節。', 'oldtown', 18, '14:35', 18, '15:20', true, 'gentle', 'open', '花磚小巷入口的白門旁', '門牌散步室', '午後時段表・合成摘錄'),
    make('harbor-tide', '港口風向筆記', '沿著港邊欄杆辨認風向。這條路線會受強風影響，這筆演示資料尚未確認是否照常。', 'harbor', 18, '16:15', 18, '17:00', true, 'gentle', 'weather', '港邊觀景台入口', '港角觀測所', '風況待覆核・合成摘錄'),
    make('old-town-story', '屋簷下的小店故事', '從老招牌和玻璃櫥窗，聽小店如何跟著街道一起改變。', 'oldtown', 18, '13:00', 18, '13:50', true, 'gentle', 'full', '拱廊下的長桌旁', '門牌散步室', '名額異動公告・合成摘錄', {updated: fromDemo(18, '09:48')}),
    make('hill-steps', '石階上的植物課', '在坡地石階觀察蕨類，路線包含較陡的上坡。此場次已取消。', 'hill', 18, '15:10', 18, '16:40', false, 'active', 'cancelled', '石階步道第一段入口', '山腳慢行社', '取消通知・合成摘錄', {updated: fromDemo(18, '09:50')}),
    make('river-boats', '看見河灣的小艇', '從陸上步道看不同型式的小艇，活動不下水。因步道檢查，演示場次暫停。', 'river', 19, '10:45', 19, '11:30', true, 'gentle', 'paused', '河灣步道路標旁', '河灣觀察站', '路線例行維護・合成摘錄'),
    make('hill-sounds', '山坡的聲音地圖', '在林蔭和空地各停一次，試著畫出聲音傳來的方向。原始資料太久沒核對。', 'hill', 18, '17:00', 18, '18:00', true, 'moderate', 'open', '山坡入口的方向牌旁', '山腳慢行社', '上次開放紀錄（未複查）・合成摘錄', {checked: fromDemo(15, '08:00'), updated: fromDemo(14, '16:10')}),
    make('harbor-lamps', '夜港燈標觀察', '在午夜前集合，順著海堤辨認燈光的節奏。午夜後沿原路返回，這是跨日場次。', 'harbor', 18, '23:40', 19, '00:30', false, 'moderate', 'open', '港邊南側入口的矮牆旁', '港角觀測所', '跨日時段表・合成摘錄'),
    make('harbor-midnight', '午夜海面筆記', '在岸上聽潮聲、看倒影。雖然日期是隔天，仍可能和前一晚的路線撞時。', 'harbor', 19, '00:15', 19, '01:05', false, 'gentle', 'open', '港邊南側入口的引導牌旁', '港角觀測所', '午夜觀察時段・合成摘錄'),
    make('river-morning', '早河光影', '沿著河灣看第一段日光打在水面上。這場演示活動已過集合時間。', 'river', 18, '08:00', 18, '08:45', true, 'gentle', 'open', '河灣步道東口', '河灣觀察站', '晨間時段表・合成摘錄'),
    make('old-town-shadows', '老街窗影筆記', '觀察窗格在地上留下的光影，不知道演示場次是否照常。', 'oldtown', 20, '11:30', 20, '12:20', true, 'gentle', 'unknown', '老街北側入口', '門牌散步室', '僅有活動簡介・合成摘錄', {checked: null, updated: null}),
    make('hill-loop', '坡地小環線', '順著陡坡走到山腳觀景台，另一條石階回程。', 'hill', 21, '15:00', 21, '16:35', false, 'active', 'open', '山腳公園入口階梯旁', '山腳慢行社', '週末路線公告・合成摘錄')
  ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  const staleAfterHours = 48;
  function toMillis(value) {
    return typeof value === 'number' ? value : Date.parse(value);
  }
  function statusOf(session, now = anchor) {
    const current = toMillis(now);
    const start = toMillis(session.start);
    const end = toMillis(session.end);
    const checked = toMillis(session.checked);
    const age = (current - checked) / (minute * 60);
    const stale = !Number.isFinite(age) || age < 0 || age >= staleAfterHours;
    const validWindow = Number.isFinite(current) && Number.isFinite(start) &&
      Number.isFinite(end) && end > start;
    const known = Object.prototype.hasOwnProperty.call(statuses, session.availability) &&
      session.availability !== 'expired' ? session.availability : 'unknown';
    let id = known;
    if (!validWindow) id = 'unknown';
    else if (start <= current) id = 'expired';
    else if (stale && known === 'open') id = 'unknown';
    return {id, label: statuses[id], stale, original: known, ageHours: Number.isFinite(age) && age >= 0 ? age : null};
  }

  // Fictional centre-to-centre walking heuristic, not routes. Within a zone use a five-minute placeholder.
  function dist(originId, destinationId) {
    const from = districts.find(item => item.id === originId);
    const to = districts.find(item => item.id === destinationId);
    if (!from || !to) return null;
    if (from.id === to.id) return 5;
    if (!from.point || !to.point) return null;
    const delta = Math.hypot(from.point[0] - to.point[0], from.point[1] - to.point[1]);
    return Math.max(5, 5 * Math.ceil((delta * 1.25 / 75) / 5));
  }

  function daypart(session) {
    const time = timeLabel(session.start);
    if (!time) return '';
    const hour = Number(time.slice(0, 2));
    return hour < 6 || hour >= 18 ? 'evening' : hour < 12 ? 'morning' : 'afternoon';
  }

  const selected = value => value != null && value !== '' && value !== 'all' && value !== 'any';
  function filter(options = {}, now = anchor) {
    const {date, daypart: part, length, family, effort, district, districtFilter, clearOnly} = options;
    // An overnight session belongs to its meeting date; its actual end is preserved everywhere.
    return sessions.filter(session => {
      if (selected(date) && venueDate(session.start) !== date) return false;
      if (selected(part) && daypart(session) !== part) return false;
      if (selected(length) && session.minutes > Number(length)) return false;
      if ((family === true || family === 'yes' || family === 'family') && !session.family) return false;
      if ((family === false || family === 'no') && session.family) return false;
      if (selected(effort) && effort !== session.effort) return false;
      const meetingDistrict = districtFilter === true ? district : districtFilter;
      if (selected(meetingDistrict) && meetingDistrict !== false && meetingDistrict !== session.district) return false;
      return !clearOnly || statusOf(session, now).id === 'open';
    });
  }

  // Half-open time windows: an event ending as the next one starts does not overlap.
  function overlaps(list) {
    const pairs = [];
    const windows = list.map(item => ({id: item.id, start: Date.parse(item.start), end: Date.parse(item.end)}))
      .filter(item => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start);
    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        const a = windows[i], b = windows[j];
        if (a.id !== b.id && a.start < b.end && b.start < a.end) pairs.push([a.id, b.id]);
      }
    }
    return pairs;
  }

  const storageKey = 'near-now.plan.v1';
  const sessionIds = new Set(sessions.map(session => session.id));
  const validIds = ids => Array.isArray(ids) ? [...new Set(ids.filter(id => sessionIds.has(id)))] : [];
  function load(storage) {
    try {
      return validIds(JSON.parse((storage || globalThis.localStorage).getItem(storageKey)));
    } catch {
      return [];
    }
  }

  function save(storage, ids) {
    try {
      (storage || globalThis.localStorage).setItem(storageKey, JSON.stringify(validIds(ids)));
      return true;
    } catch {
      return false;
    }
  }

  const api = {
    anchor, timezone, dates, districts, sessions, statuses, statusOf, dist, venueDate,
    timeLabel, daypart, filter, overlaps, load, save, storageKey, staleAfterHours
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.Near = api;
})();
