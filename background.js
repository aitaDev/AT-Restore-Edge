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

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type !== "AT_RESTORE_START_PICKER" || !message.tabId) return;
  sendToPage(message.tabId, { type: "AT_RESTORE_PICK" })
    .then(() => respond({ ok: true }))
    .catch(() => respond({ ok: false }));
  return true;
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
