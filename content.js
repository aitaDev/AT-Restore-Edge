(() => {
  if (globalThis.__atRestoreLoaded) return;
  globalThis.__atRestoreLoaded = true;

  const pageKey = `${location.origin}${location.pathname}`;
  const storageKey = `field:${pageKey}`;
  let record = null;
  let selectedElement = null;
  let contextElement = null;
  let hovered = null;
  let lastSavedValue = null;

  const isTextBox = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly;
    if (element instanceof HTMLInputElement) return ["text", "search", "email", "url", "tel", "number", ""].includes(element.type) && !element.disabled && !element.readOnly;
    return element.isContentEditable;
  };

  const readValue = (element) => element.isContentEditable ? element.innerHTML : element.value;
  const plainValue = (element) => element.isContentEditable ? (element.textContent || "") : element.value;

  function writeValue(element, value) {
    element.focus();
    if (element.isContentEditable) {
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

  function stopPicking() {
    document.documentElement.classList.remove("at-restore-picking");
    hovered?.classList.remove("at-restore-hover");
    hovered = null;
    document.removeEventListener("mouseover", onHover, true);
    document.removeEventListener("click", onPick, true);
    document.removeEventListener("keydown", onPickerKey, true);
  }

  function onHover(event) {
    if (!isTextBox(event.target)) return;
    hovered?.classList.remove("at-restore-hover");
    hovered = event.target;
    hovered.classList.add("at-restore-hover");
  }

  function onPick(event) {
    if (!isTextBox(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const element = event.target;
    stopPicking();
    selectField(element);
  }

  function onPickerKey(event) { if (event.key === "Escape") stopPicking(); }

  function startPicking() {
    stopPicking();
    document.documentElement.classList.add("at-restore-picking");
    document.addEventListener("mouseover", onHover, true);
    document.addEventListener("click", onPick, true);
    document.addEventListener("keydown", onPickerKey, true);
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
  }

  document.addEventListener("contextmenu", async (event) => {
    contextElement = isTextBox(event.target) ? event.target : null;
    if (!record) await loadRecord();
    const matches = Boolean(contextElement && record && selectorFor(contextElement) === record.selector);
    const canRecover = matches && plainValue(contextElement).trim() === "" && Boolean(record.value);
    chrome.runtime.sendMessage({ type: "AT_RESTORE_CONTEXT", canRecover }).catch(() => {});
  }, true);

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === "AT_RESTORE_PICK") { startPicking(); respond({ ok: true }); return; }
    if (message?.type === "AT_RESTORE_STATUS") { loadRecord().then((saved) => respond({ pageKey, record: saved })); return true; }
    if (message?.type === "AT_RESTORE_CLEAR") {
      chrome.storage.local.remove(storageKey).then(() => {
        record = null; selectedElement = null; lastSavedValue = null; respond({ ok: true });
      });
      return true;
    }
    if (message?.type === "AT_RESTORE_RECOVER") {
      if (contextElement && record && plainValue(contextElement).trim() === "" && record.value) {
        writeValue(contextElement, record.value);
        lastSavedValue = record.value;
        flash(contextElement, "Draft recovered");
        respond({ ok: true });
      } else respond({ ok: false });
    }
  });

  loadRecord().then(() => { lastSavedValue = record?.value ?? null; });
  setInterval(saveTick, 1000);
})();
