// Chrome stable は4週(28日)周期・火曜リリース。予測日の2日前〜次版検出まで＋7日毎の軽い確認のみfetchする。
const ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAyklEQVR42u3a2w2DMBBEUTxNIJEykzLSJhLpIh9pILb3ZXG3gN05xiAsaMfz2lYubYsXAAAAAAAA4Frne18Y8EvvalDM2vsZFLZznAyK3PceBgXfteYGHqP9C2x7ERSc3tyg+PS2BqWkNzQoK72VQYnpTTooN/18H6Wnn+ymCulneqpI+uHO93uV8D5h9fZXqfQDU1Qtfe8sFUzfNVE10/8/t1l94BhAPl4fTmQAAAAAAAAAAAAAAAAAAADAbQGN3y4BAAAAAMDK9QW7ekalgMvmWwAAAABJRU5ErkJggg==';
const D = 864e5, CYCLE = 28 * D, LEAD = 2 * D, FALLBACK = 7 * D;
const url = p => `https://versionhistory.googleapis.com/v1/chrome/platforms/${p}/channels/stable/versions/all/releases?filter=fraction%3D1&order_by=starttime%20desc&pageSize=1`;
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 4; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
const platform = () => { const p = (navigator.userAgentData?.platform || navigator.userAgent).toLowerCase();
  return p.includes('win') ? 'win64' : p.includes('mac') ? 'mac' : p.includes('cros') ? 'chromeos' : 'linux'; };
async function current() {
  try { return (await navigator.userAgentData.getHighEntropyValues(['fullVersionList'])).fullVersionList.find(e => /Chrome$/.test(e.brand))?.version; } catch {}
  return navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1];
}
async function check(force = false) {
  const now = Date.now(), s = await chrome.storage.local.get(['lastRelease', 'lastFetch', 'notified']);
  const due = !s.lastRelease || now >= s.lastRelease + CYCLE - LEAD || now - (s.lastFetch || 0) >= FALLBACK;
  if (!force && !due) return;
  const cur = await current();
  const rel = (await (await fetch(url(platform()))).json()).releases?.[0];
  if (!cur || !rel) return;
  const latest = rel.version, start = Date.parse(rel.serving.startTime);
  const upd = { lastFetch: now, lastRelease: start };
  if (cmp(latest, cur) > 0) {
    chrome.action.setBadgeText({ text: '!' }); chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
    if (force || s.notified !== latest) {
      upd.notified = latest;
      chrome.notifications.create('upd', { type: 'basic', iconUrl: ICON, requireInteraction: true,
        title: `Chrome ${latest} が利用可能`, message: `現在 ${cur}。クリックで更新ページを開きます。` });
    }
  } else {
    chrome.action.setBadgeText({ text: '' });
    if (force) chrome.notifications.create('ok', { type: 'basic', iconUrl: ICON, title: '最新です', message: `Chrome ${cur}\n次回予測: ${new Date(start + CYCLE).toLocaleDateString()}` });
  }
  await chrome.storage.local.set(upd);
}
chrome.runtime.onInstalled.addListener(() => { chrome.alarms.create('chk', { periodInMinutes: 1440 }); check(true); });
chrome.runtime.onStartup.addListener(() => check());
chrome.alarms.onAlarm.addListener(() => check());
chrome.notifications.onClicked.addListener(id => { if (id === 'upd') chrome.tabs.create({ url: 'chrome://settings/help' }); chrome.notifications.clear(id); });
chrome.action.onClicked.addListener(() => check(true));
