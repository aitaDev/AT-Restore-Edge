const RECOVER_MENU = "at-restore-recover";

function createMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: RECOVER_MENU, title: "Recover", contexts: ["editable"], visible: false });
  });
}

chrome.runtime.onInstalled.addListener(createMenu);
chrome.runtime.onStartup.addListener(createMenu);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "AT_RESTORE_CONTEXT") return;
  chrome.contextMenus.update(RECOVER_MENU, { visible: Boolean(message.canRecover) }, () => {
    void chrome.runtime.lastError;
    chrome.contextMenus.refresh?.();
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== RECOVER_MENU || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "AT_RESTORE_RECOVER" }).catch(() => {});
});
