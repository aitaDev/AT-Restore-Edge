(() => {
  if (globalThis.__atRestoreLoaded) return;
  globalThis.__atRestoreLoaded = true;

  const pageKey = `${location.origin}${location.pathname}`;
  const storageKey = `field:${pageKey}`;
  let record = null;
  let selectedElement = null;
  let contextElement = null;
  let lastSavedValue = null;

  const isTextBox = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly;
    if (element instanceof HTMLInputElement) return ["text", "search", "email", "url", "tel", "number", ""].includes(element.type) && !element.disabled && !element.readOnly;
    return element.isContentEditable;
  };

  const readValue = (element) => element.isContentEditable || !("value" in element) ? element.innerHTML : element.value;
  const plainValue = (element) => element.isContentEditable || !("value" in element) ? (element.textContent || "") : element.value;

  function writeValue(element, value) {
    element.focus();
    if (element.isContentEditable || !("value" in element)) {
      element.innerHTML = value;
      element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: null }));
    } else {
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function selectorFor(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    for (const attribute of ["name", "aria-label", "placeholder"]) {
      const value = element.getAttribute(attribute);
      if (value) {
        const candidate = `${element.tagName.toLowerCase()}[${attribute}="${CSS.escape(value)}"]`;
        if (document.querySelectorAll(candidate).length === 1) return candidate;
      }
    }
    const parts = [];
    let node = element;
    while (node && node !== document.body) {
      let part = node.tagName.toLowerCase();
      const siblings = node.parentElement ? [...node.parentElement.children].filter((item) => item.tagName === node.tagName) : [];
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      parts.unshift(part);
      const candidate = parts.join(" > ");
      if (document.querySelectorAll(candidate).length === 1) return candidate;
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  function describe(element) {
    return element.getAttribute("aria-label") || element.getAttribute("placeholder") || element.getAttribute("name") || element.id || element.tagName.toLowerCase();
  }

  async function loadRecord() {
    const stored = await chrome.storage.local.get(storageKey);
    record = stored[storageKey] || null;
    selectedElement = record ? document.querySelector(record.selector) : null;
    return record;
  }

  async function selectField(element) {
    const selector = selectorFor(element);
    record = { pageKey, selector, label: describe(element), value: readValue(element), updatedAt: Date.now() };
    selectedElement = element;
    lastSavedValue = record.value;
    await chrome.storage.local.set({ [storageKey]: record });
    flash(element, "AT-Restore is saving this field");
    chrome.runtime.sendMessage({ type: "AT_RESTORE_SELECTED", record }).catch(() => {});
  }

  function flash(element, text) {
    const badge = document.createElement("div");
    badge.className = "at-restore-toast";
    badge.textContent = text;
    document.documentElement.appendChild(badge);
    element.classList.add("at-restore-selected");
    setTimeout(() => { badge.remove(); element.classList.remove("at-restore-selected"); }, 2200);
  }

  async function saveTick() {
    if (!record) return;
    if (!selectedElement?.isConnected) selectedElement = document.querySelector(record.selector);
    if (!selectedElement || !isTextBox(selectedElement)) return;
    const value = readValue(selectedElement);
    if (value === lastSavedValue) return;
    record = { ...record, value, updatedAt: Date.now() };
    lastSavedValue = value;
    await chrome.storage.local.set({ [storageKey]: record });
    chrome.runtime.sendMessage({ type: "AT_RESTORE_SAVED", record }).catch(() => {});
  }

  document.addEventListener("contextmenu", (event) => {
    contextElement = event.composedPath().find(isTextBox) || null;
  }, true);

  function getContextElement() {
    if (contextElement?.isConnected && isTextBox(contextElement)) return contextElement;
    return isTextBox(document.activeElement) ? document.activeElement : null;
  }

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === "AT_RESTORE_PROTECT_CONTEXT") {
      const element = getContextElement();
      if (element) selectField(element).then(() => respond({ ok: true }));
      else respond({ ok: false });
      return true;
    }
    if (message?.type === "AT_RESTORE_STATUS") { loadRecord().then((saved) => respond({ pageKey, record: saved })); return true; }
    if (message?.type === "AT_RESTORE_CLEAR") {
      chrome.storage.local.remove(storageKey).then(() => {
        record = null; selectedElement = null; lastSavedValue = null; respond({ ok: true });
      });
      return true;
    }
    if (message?.type === "AT_RESTORE_RECOVER") {
      (async () => {
        if (!record) await loadRecord();
        const element = getContextElement();
        if (element && record && selectorFor(element) === record.selector && plainValue(element).trim() === "" && record.value) {
          writeValue(element, record.value);
          lastSavedValue = record.value;
          flash(element, "Draft recovered");
          respond({ ok: true });
        } else {
          if (element) flash(element, "No saved draft for this field");
          respond({ ok: false });
        }
      })();
      return true;
    }
  });

  loadRecord().then(() => {
    lastSavedValue = record?.value ?? null;
    if (record) chrome.runtime.sendMessage({ type: "AT_RESTORE_SELECTED", record }).catch(() => {});
  });
  setInterval(saveTick, 1000);
})();
