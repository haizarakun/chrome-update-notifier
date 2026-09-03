// Chrome stable は4週(28日)周期・火曜リリース。予測日の2日前〜次版検出まで＋7日毎の軽い確認のみfetchする。
const ICON = 'icon128.png';
const D = 864e5, CYCLE = 28 * D, LEAD = 2 * D, FALLBACK = 7 * D, VER = /^\d+\.\d+\.\d+\.\d+$/, SEMVER = /^v?(\d+\.\d+\.\d+)$/;
const REPO = 'haizarakun/chrome-update-notifier', REL = `https://api.github.com/repos/${REPO}/releases/latest`;
const url = p => `https://versionhistory.googleapis.com/v1/chrome/platforms/${p}/channels/stable/versions/all/releases?filter=fraction%3D1&order_by=starttime%20desc&pageSize=1`;
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 4; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
const platform = () => { const p = (navigator.userAgentData?.platform || navigator.userAgent).toLowerCase();
  return p.includes('win') ? 'win64' : p.includes('mac') ? 'mac' : p.includes('cros') ? 'chromeos' : 'linux'; };
async function current() {
  try { return (await navigator.userAgentData.getHighEntropyValues(['fullVersionList'])).fullVersionList.find(e => /Chrome$/.test(e.brand))?.version; } catch {}
  return navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1];
}
async function check(force = false) {
  const now = Date.now(), s = await chrome.storage.local.get(['lastRelease', 'lastFetch', 'notified', 'extNotified']);
  const due = !s.lastRelease || now >= s.lastRelease + CYCLE - LEAD || now - (s.lastFetch || 0) >= FALLBACK;
  if (!force && !due) return;
  const cur = await current();
  let rel;
  try { rel = (await (await fetch(url(platform()), { signal: AbortSignal.timeout(10000), credentials: 'omit' })).json()).releases?.[0]; } catch { return; }
  const latest = rel?.version, start = Date.parse(rel?.serving?.startTime);
  if (!VER.test(cur || '') || !VER.test(latest || '') || !Number.isFinite(start)) return; // 外部データは形式検証してから使う
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
  await selfCheck(force, s.extNotified);
}
// この拡張自体の新リリースをGitHubで確認（Chrome版の確認と同じタイミングのみ＝追加コストほぼゼロ）
async function selfCheck(force, extNotified) {
  let tag;
  try { tag = (await (await fetch(REL, { signal: AbortSignal.timeout(10000), credentials: 'omit', headers: { Accept: 'application/vnd.github+json' } })).json()).tag_name; } catch { return; }
  const latest = SEMVER.exec(tag || '')?.[1], cur = chrome.runtime.getManifest().version;
  if (!latest || cmp(latest, cur) <= 0 || (!force && extNotified === latest)) return;
  await chrome.storage.local.set({ extNotified: latest });
  chrome.notifications.create('ext', { type: 'basic', iconUrl: ICON, requireInteraction: true,
    title: `Chrome Update Notifier v${latest} が公開`, message: `現在 v${cur}。「更新」でダウンロードページを開きます。「拒否」でこの拡張を削除します。`,
    buttons: [{ title: '更新' }, { title: '拒否（拡張を削除）' }] });
}
chrome.runtime.onInstalled.addListener(() => { chrome.alarms.create('chk', { periodInMinutes: 1440 }); check(true); });
chrome.runtime.onStartup.addListener(() => check());
chrome.alarms.onAlarm.addListener(() => check());
const open = id => chrome.tabs.create({ url: id === 'upd' ? 'chrome://settings/help' : `https://github.com/${REPO}/releases/latest` });
chrome.notifications.onClicked.addListener(id => { if (id === 'upd' || id === 'ext') open(id); chrome.notifications.clear(id); });
chrome.notifications.onButtonClicked.addListener((id, i) => {
  chrome.notifications.clear(id);
  if (id !== 'ext') return;
  if (i === 0) open(id); else removeSelf();
});
// 削除: 確認ダイアログ付き → 失敗ならダイアログなし → それも不可なら拡張ページを開いて手動削除を案内
async function removeSelf() {
  for (const opts of [{ showConfirmDialog: true }, {}]) {
    try { await chrome.management.uninstallSelf(opts); return; } catch (e) { if (/canceled|cancelled/i.test(e?.message || '')) return; }
  }
  chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
}
chrome.action.onClicked.addListener(() => check(true));
if (typeof module !== 'undefined') module.exports = { cmp, check, selfCheck, removeSelf, CYCLE, LEAD, FALLBACK };
