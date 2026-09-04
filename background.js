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

async function sendToPage(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] }).catch(() => {});
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    return chrome.tabs.sendMessage(tabId, message);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  const type = info.menuItemId === PROTECT_MENU
    ? "AT_RESTORE_PROTECT_CONTEXT"
    : info.menuItemId === RECOVER_MENU
      ? "AT_RESTORE_RECOVER"
      : null;
  if (type) sendToPage(tab.id, { type }).catch(() => {});
});
