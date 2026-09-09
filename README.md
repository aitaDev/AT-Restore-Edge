# AT-Restore for Microsoft Edge

AT-Restore protects one text field per page in Microsoft Edge. It remembers the selected field across browser restarts and saves its contents to local extension storage every second.

1. Open a web page in Edge and click the AT-Restore toolbar icon.
2. Right-click the field and choose **Protect this text box**.
3. Type normally. The draft is saved locally once per second when it changes.
4. After a crash or reload, right-click the empty protected field and choose **Recover**.

**Recover** is available from the same right-click menu and restores content only when that field is protected, empty, and has a saved draft.

To install locally, open `edge://extensions`, enable **Developer mode**, choose **Load unpacked**, and select this folder.

This Manifest V3 build uses APIs supported by Chromium-based Microsoft Edge and does not send saved drafts anywhere.

Selection status is tracked against the top-level page, so fields chosen inside embedded editors and iframes still appear correctly in the popup.
