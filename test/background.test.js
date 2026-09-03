const { test, mock } = require('node:test');
const assert = require('node:assert');

function load(store = {}, fetchImpl) {
  const calls = { notif: [], badge: [], tabs: [] };
  global.chrome = {
    storage: { local: { get: async () => ({ ...store }), set: async v => Object.assign(store, v) } },
    notifications: { create: (id, o) => calls.notif.push({ id, ...o }), clear: () => {}, onClicked: { addListener() {} }, onButtonClicked: { addListener: f => calls.onBtn = f } },
    action: { setBadgeText: b => calls.badge.push(b.text), setBadgeBackgroundColor() {}, onClicked: { addListener() {} } },
    alarms: { create() {}, onAlarm: { addListener() {} } },
    runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} }, getManifest: () => ({ version: '1.3.0' }) },
    management: { uninstallSelf: () => calls.uninstall = true },
    tabs: { create: t => calls.tabs.push(t.url) },
  };
  Object.defineProperty(global, 'navigator', { configurable: true, value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/140.0.7339.80', userAgentData: { platform: 'Windows' } } });
  global.fetch = fetchImpl;
  delete require.cache[require.resolve('../background.js')];
  return { m: require('../background.js'), calls, store };
}
const api = (version, startTime, tag = 'v1.3.0') => async u => ({ json: async () => u.includes('github') ? { tag_name: tag } : { releases: [{ version, serving: { startTime } }] } });

test('cmp: semantic 4-part compare', () => {
  const { m } = load({}, api('0.0.0.0', '2026-01-01T00:00:00Z'));
  assert.ok(m.cmp('141.0.1.0', '140.9.9.9') > 0);
  assert.ok(m.cmp('140.0.7339.80', '140.0.7339.80') === 0);
  assert.ok(m.cmp('140.0.7339.80', '140.0.7339.81') < 0);
});

test('newer version -> notify once, badge set', async () => {
  const f = mock.fn(api('141.0.7390.54', '2026-09-01T00:00:00Z'));
  const { m, calls, store } = load({}, f);
  await m.check(); await m.check(true);
  assert.strictEqual(calls.notif.filter(n => n.id === 'upd').length, 2); // 1st auto + forced
  assert.strictEqual(store.notified, '141.0.7390.54');
  assert.deepStrictEqual(calls.badge, ['!', '!']);
  assert.match(calls.notif[0].message, /140\.0\.7339\.80/);
});

test('same version -> no notification, badge cleared', async () => {
  const { m, calls } = load({}, api('140.0.7339.80', '2026-08-04T00:00:00Z'));
  await m.check();
  assert.strictEqual(calls.notif.length, 0);
  assert.deepStrictEqual(calls.badge, ['']);
});

test('predictive gating: no fetch outside window, fetch inside', async () => {
  const f = mock.fn(api('140.0.7339.80', '2026-08-04T00:00:00Z'));
  const now = Date.now();
  const { m } = load({ lastRelease: now - 5 * 864e5, lastFetch: now - 864e5 }, f);
  await m.check(); assert.strictEqual(f.mock.callCount(), 0);
  const { m: m2 } = load({ lastRelease: now - (m.CYCLE - m.LEAD), lastFetch: now }, f);
  await m2.check(); assert.strictEqual(f.mock.callCount(), 2); // versionhistory + github
  const { m: m3 } = load({ lastRelease: now - 5 * 864e5, lastFetch: now - m.FALLBACK }, f);
  await m3.check(); assert.strictEqual(f.mock.callCount(), 4);
});

test('self-update: notify once on newer release; decline button uninstalls', async () => {
  const { m, calls, store } = load({}, api('140.0.7339.80', '2026-08-04T00:00:00Z', 'v1.4.0'));
  await m.check(); await m.check(); await m.check(true);
  const ext = calls.notif.filter(n => n.id === 'ext');
  assert.strictEqual(ext.length, 2); // auto once (2nd auto suppressed) + forced
  assert.strictEqual(store.extNotified, '1.4.0');
  calls.onBtn('ext', 1); assert.strictEqual(calls.uninstall, true);
  const { m: m2, calls: c2 } = load({}, api('140.0.7339.80', '2026-08-04T00:00:00Z', 'v1.3.0'));
  await m2.check(); assert.strictEqual(c2.notif.filter(n => n.id === 'ext').length, 0);
});

test('rejects malformed API data / network error safely', async () => {
  for (const bad of [async () => ({ json: async () => ({ releases: [{ version: '<b>x</b>', serving: { startTime: 'now' } }] }) }),
                     async () => { throw new Error('offline'); },
                     async () => ({ json: async () => ({}) })]) {
    const { m, calls, store } = load({}, bad);
    await m.check();
    assert.strictEqual(calls.notif.length, 0); assert.strictEqual(store.notified, undefined);
  }
});
