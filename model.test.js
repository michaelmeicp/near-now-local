'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Near = require('./model.js');
const byId = id => Near.sessions.find(session => session.id === id);

test('venue dates and clocks use venue time regardless of device timezone', () => {
  const trip = byId('harbor-lamps');
  assert.equal(Near.venueDate('2026-11-18T16:15:00Z'), '2026-11-19');
  assert.equal(Near.venueDate(trip.start), '2026-11-18');
  assert.equal(Near.venueDate(trip.end), '2026-11-19');
  assert.equal(Near.timeLabel(trip.start), '23:40');
  assert.equal(Near.timeLabel(trip.end), '00:30');
  assert.equal(trip.minutes, 50);
  assert.equal(Near.daypart(byId('harbor-midnight')), 'evening');
  assert(Near.filter({date: Near.dates[0]}).includes(trip));
  assert(!Near.filter({date: Near.dates[1]}).includes(trip));
});

test('walking estimates use a manual origin and preserve unknown distances', () => {
  assert.equal(Near.dist(null, 'oldtown'), null);
  assert.equal(Near.dist('river', 'harbor'), null);
  assert.equal(Near.dist('harbor', 'river'), null);
  assert.equal(Near.dist('harbor', 'harbor'), 5);
  assert.equal(Near.dist('river', 'oldtown'), 15);
  assert.equal(Near.dist('oldtown', 'river'), 15);
  assert(Near.dist('river', 'hill') > Near.dist('river', 'oldtown'));
  assert.equal(Near.dist('hill', 'unlisted'), null);
});

test('all availability statuses are distinct, and stale open falls back to unknown', () => {
  const labels = [
    ['riverside-birds', 'open'], ['old-town-story', 'full'], ['hill-steps', 'cancelled'],
    ['river-boats', 'paused'], ['harbor-tide', 'weather'], ['old-town-shadows', 'unknown'],
    ['river-morning', 'expired']
  ];
  for (const [session, id] of labels) {
    const status = Near.statusOf(byId(session));
    assert.equal(status.id, id);
    assert.equal(status.label, Near.statuses[id]);
  }
  assert.equal(new Set(Object.values(Near.statuses)).size, labels.length);
  const stale = Near.statusOf(byId('hill-sounds'));
  assert.equal(stale.id, 'unknown');
  assert.equal(stale.original, 'open');
  assert.equal(stale.stale, true);
  assert.equal(Near.statusOf(byId('old-town-shadows')).ageHours, null);
});

test('status priority expires at meeting time and preserves adverse notices before it', () => {
  const session = byId('hill-steps');
  const older = {...session, checked:'2026-11-12T10:20:00+08:00'};
  assert.equal(Near.statusOf(older).id, 'cancelled');
  assert.equal(Near.statusOf(older).stale, true);
  const ended = Near.statusOf(older, session.start);
  assert.equal(ended.id, 'expired');
  assert.equal(ended.original, 'cancelled');
  assert.equal(Near.statusOf({...session, end: session.start}).id, 'unknown');
  const open = byId('riverside-birds');
  assert.equal(Near.statusOf({...open, checked:'2026-11-16T10:20:00+08:00'}).id, 'unknown');
  assert.equal(Near.statusOf({...open, checked:'2026-11-16T10:21:00+08:00'}).id, 'open');
  assert.equal(Near.statusOf({...open, checked:'2026-11-18T10:21:00+08:00'}).id, 'unknown');
});

test('clear opportunities exclude every status other than fresh open', () => {
  const clear = Near.filter({date: Near.dates[0], clearOnly: true});
  assert.deepEqual(clear.map(row => row.id), [
    'riverside-birds', 'old-town-numbers', 'old-town-tiles', 'hill-dusk', 'harbor-lamps'
  ]);
  assert.equal(Near.filter({date:'2026-11-20', clearOnly: true}).length, 0);
  assert.equal(Near.filter({date:'2026-11-24'}).length, 0);
  assert.equal(Near.filter({date:Near.dates[0], clearOnly:true}, '2026-11-19T00:02:00+08:00').length, 0);
  assert(Near.filter({date:Near.dates[0]}, '2026-11-19T00:02:00+08:00').length > 0);
});

test('filters intersect without treating the manual origin as a destination filter', () => {
  const selection = {
    date: Near.dates[0], daypart:'afternoon', length:'60', family:'yes', effort:'gentle',
    district:'river', clearOnly:true
  };
  assert.deepEqual(Near.filter(selection).map(row => row.id), ['old-town-tiles']);
  assert.deepEqual(Near.filter({...selection, districtFilter:true}), []);
  assert.deepEqual(Near.filter({...selection, districtFilter:'oldtown'}).map(row => row.id), ['old-town-tiles']);
  assert.deepEqual(Near.filter({...selection, length:'40'}), []);
});

test('overlap uses complete dates, half-open interval boundaries and all saved rows', () => {
  const overnight = byId('harbor-lamps');
  const midnight = byId('harbor-midnight');
  const next = {...midnight, id:'next', start: overnight.end};
  assert.deepEqual(Near.overlaps([overnight, midnight]), [[overnight.id, midnight.id]]);
  assert.deepEqual(Near.overlaps([overnight, next]), []);
  assert.deepEqual(Near.overlaps([
    byId('old-town-numbers'), byId('old-town-tiles'), byId('riverside-birds')
  ]), [['old-town-numbers', 'old-town-tiles']]);
  assert.deepEqual(Near.overlaps([
    byId('old-town-numbers'), {...byId('old-town-tiles'),
      start:'2026-11-19T14:35:00+08:00', end:'2026-11-19T15:20:00+08:00'}
  ]), []);
});

test('persistence round-trips, deduplicates, rejects foreign ids and handles unavailable storage', () => {
  const backing = new Map();
  const storage = {getItem: key => backing.get(key), setItem: (key, data) => backing.set(key, data)};
  assert.deepEqual(Near.load(storage), []);
  assert.equal(Near.save(storage, ['riverside-birds','riverside-birds','other','harbor-lamps']), true);
  assert.deepEqual(Near.load(storage), ['riverside-birds','harbor-lamps']);
  assert.equal(Near.save(storage, ['harbor-lamps']), true);
  assert.deepEqual(Near.load(storage), ['harbor-lamps']);
  backing.set(Near.storageKey, '{{malformed');
  assert.deepEqual(Near.load(storage), []);
  const denied = {getItem() { throw Error('Denied'); }, setItem() { throw Error('Denied'); }};
  assert.deepEqual(Near.load(denied), []);
  assert.equal(Near.save(denied, ['harbor-lamps']), false);
});
