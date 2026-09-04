# AT-Restore

AT-Restore protects one text field per page. It remembers the selected field across browser restarts and saves its contents to `chrome.storage.local` every second.

1. Open a web page and click the AT-Restore toolbar icon.
2. Choose **Pick text box on page**, then click the field to protect.
3. Type normally. The draft is saved locally once per second when it changes.
4. After a crash or reload, right-click the empty protected field and choose **Recover**.

The Recover command appears only for the selected field when it is empty and a saved draft exists.

To install locally, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this folder.
