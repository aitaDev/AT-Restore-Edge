const PROTECT_MENU = "at-restore-protect";
const RECOVER_MENU = "at-restore-recover";

function createMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: PROTECT_MENU, title: "Protect this text box", contexts: ["editable"] });
    chrome.contextMenus.create({ id: RECOVER_MENU, title: "Recover", contexts: ["editable"] });
  });
}

chrome.runtime.onInstalled.addListener(createMenu);
chrome.runtime.onStartup.addListener(createMenu);

function selectionKey(url) {
  try {
    const parsed = new URL(url);
    return `selection:${parsed.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
}

async function saveSelection(tabUrl, record, frameId) {
  const key = selectionKey(tabUrl);
  if (!key || !record) return;
  await chrome.storage.local.set({ [key]: { ...record, frameId, topPage: tabUrl } });
}

async function sendToPage(tabId, message, frameId) {
  const messageOptions = Number.isInteger(frameId) ? { frameId } : undefined;
  const target = Number.isInteger(frameId) ? { tabId, frameIds: [frameId] } : { tabId, allFrames: true };
  try {
    return await chrome.tabs.sendMessage(tabId, message, messageOptions);
  } catch {
    await chrome.scripting.insertCSS({ target, files: ["content.css"] }).catch(() => {});
    await chrome.scripting.executeScript({ target, files: ["content.js"] });
    return chrome.tabs.sendMessage(tabId, message, messageOptions);
  }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === "AT_RESTORE_SELECTED" || message?.type === "AT_RESTORE_SAVED") {
    saveSelection(sender.tab?.url, message.record, sender.frameId)
      .then(() => respond({ ok: true }))
      .catch(() => respond({ ok: false }));
    return true;
  }
  if (message?.type === "AT_RESTORE_GET_SELECTION" && message.tabId) {
    chrome.tabs.get(message.tabId).then(async (tab) => {
      const key = selectionKey(tab.url);
      const stored = key ? await chrome.storage.local.get(key) : {};
      respond({ record: key ? stored[key] || null : null });
    }).catch(() => respond({ record: null }));
    return true;
  }
  if (message?.type === "AT_RESTORE_CLEAR_SELECTION" && message.tabId) {
    chrome.tabs.get(message.tabId).then(async (tab) => {
      const key = selectionKey(tab.url);
      if (key) await chrome.storage.local.remove(key);
      respond({ ok: true });
    }).catch(() => respond({ ok: false }));
    return true;
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  const type = info.menuItemId === PROTECT_MENU
    ? "AT_RESTORE_PROTECT_CONTEXT"
    : info.menuItemId === RECOVER_MENU
      ? "AT_RESTORE_RECOVER"
      : null;
  if (type) sendToPage(tab.id, { type }, info.frameId).catch(() => {});
});
