# AT-Restore for Microsoft Edge

AT-Restore protects one text field per page in Microsoft Edge. It remembers the selected field across browser restarts and saves its contents to local extension storage every second.

1. Open a web page in Edge and click the AT-Restore toolbar icon.
2. Choose **Pick text box on page**, then click the field to protect.
3. Type normally. The draft is saved locally once per second when it changes.
4. After a crash or reload, right-click the empty protected field and choose **Recover**.

You can also right-click any editable field and choose **Protect this text box** instead of using the popup picker. **Recover** is always available on editable fields and restores content only when that field is protected, empty, and has a saved draft.

To install locally, open `edge://extensions`, enable **Developer mode**, choose **Load unpacked**, and select this folder.

This Manifest V3 build uses APIs supported by Chromium-based Microsoft Edge and does not send saved drafts anywhere.

The picker supports fields inside same-origin and cross-origin frames. It shows a visible instruction banner and a teal overlay box around the text field currently under the pointer. Press **Esc** to cancel picking.

Selection status is tracked against the top-level page, so fields chosen inside embedded editors and iframes still appear correctly in the popup.

Picker eligibility follows the page cursor: when an element displays the browser's text cursor, AT-Restore allows it to be selected. Standard form fields remain eligible even when a site overrides their cursor style.

Starting the picker opens a detached AT-Restore control window. Unlike a browser toolbar popup, this window remains open while you interact with the page and updates when a field is selected.
