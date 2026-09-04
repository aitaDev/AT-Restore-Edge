const $ = (id) => document.getElementById(id);
let activeTabId = null;

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

async function send(message) { try { return await chrome.tabs.sendMessage(activeTabId, message); } catch { return null; } }

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id;
  if (!activeTabId || !/^https?:/.test(tab.url || "")) {
    $("statusText").textContent = "Open a regular web page";
    $("pickField").disabled = true;
    return;
  }
  const status = await send({ type: "AT_RESTORE_STATUS" });
  setRecord(status?.record || null);
}

$("pickField").addEventListener("click", async () => { const result = await send({ type: "AT_RESTORE_PICK" }); if (result?.ok) window.close(); });
$("clearField").addEventListener("click", async () => { await send({ type: "AT_RESTORE_CLEAR" }); setRecord(null); });
chrome.runtime.onMessage.addListener((message) => { if (message?.type === "AT_RESTORE_SELECTED") setRecord(message.record); });
init();
