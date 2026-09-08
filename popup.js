const $ = (id) => document.getElementById(id);
let activeTabId = null;
const params = new URLSearchParams(location.search);
const detached = params.get("detached") === "1";

async function beginPicking() {
  const result = await chrome.runtime.sendMessage({ type: "AT_RESTORE_START_PICKER", tabId: activeTabId });
  if (result?.ok) $("statusText").textContent = "Select mode active — choose a text box";
  else $("statusText").textContent = "This page does not allow extensions";
  return result;
}

function setRecord(record) {
  if (!record) {
    $("statusText").textContent = "Ready to protect a field";
    $("fieldName").textContent = "Nothing selected";
    $("fieldMeta").textContent = "Pick a text box to begin";
    $("fieldCard").classList.add("empty");
    $("clearField").hidden = true;
    return;
  }
  $("statusText").textContent = "Saving every second";
  $("fieldName").textContent = record.label || "Selected text box";
  const time = record.updatedAt ? new Date(record.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "just now";
  $("fieldMeta").textContent = `${record.value?.length || 0} characters · saved ${time}`;
  $("fieldCard").classList.remove("empty");
  $("clearField").hidden = false;
}

async function send(message) {
  try {
    return await chrome.tabs.sendMessage(activeTabId, message);
  } catch {
    try {
      await chrome.scripting.insertCSS({ target: { tabId: activeTabId }, files: ["content.css"] });
      await chrome.scripting.executeScript({ target: { tabId: activeTabId }, files: ["content.js"] });
      return await chrome.tabs.sendMessage(activeTabId, message);
    } catch {
      return null;
    }
  }
}

async function init() {
  const requestedTabId = Number(params.get("tabId"));
  const tab = Number.isInteger(requestedTabId) && requestedTabId > 0
    ? await chrome.tabs.get(requestedTabId).catch(() => null)
    : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  activeTabId = tab?.id || null;
  if (!activeTabId || !/^https?:/.test(tab.url || "")) {
    $("statusText").textContent = "Open a regular web page";
    $("pickField").disabled = true;
    return;
  }
  const status = await chrome.runtime.sendMessage({ type: "AT_RESTORE_GET_SELECTION", tabId: activeTabId });
  setRecord(status?.record || null);
  if (detached && params.get("select") === "1") await beginPicking();
}

$("pickField").addEventListener("click", async () => {
  if (detached) {
    await beginPicking();
    return;
  }
  const result = await chrome.runtime.sendMessage({ type: "AT_RESTORE_OPEN_PICKER_WINDOW", tabId: activeTabId });
  if (result?.ok) window.close();
  else $("statusText").textContent = "Could not open selection window";
});
$("clearField").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "AT_RESTORE_CLEAR_SELECTION", tabId: activeTabId });
  await send({ type: "AT_RESTORE_CLEAR" });
  setRecord(null);
});
chrome.runtime.onMessage.addListener((message) => { if (message?.type === "AT_RESTORE_SELECTED") setRecord(message.record); });
init();
