# Extensions Reloader for Chrome™

Reloads all unpacked extensions with a single click.

The extension is available for download [here](https://chrome.google.com/webstore/detail/fimgfedafeadlieiabdeeaodndnlbhid).

If you've ever developed a Google Chrome™ extension, you might have wanted to automate the process of reloading your unpacked extension without the need of going through the extensions page.

"Extensions Reloader" allows you to reload all unpacked extensions using three ways:

1. The extension's toolbar button

2. Browsing to "http://reload.extensions". This is intended for automating the reload process using "post build" scripts - just browse to "http://reload.extensions", and chrome will open with freshly reloaded extensions

3. Using the keyboard shortcut. The default is Alt-Shift-r or Opt-Shift-r on Mac. Open `chrome://extensions/shortcuts` to customize

Whenever a refresh is executed, a green "OK" badge will appear on Extensions Reloader's toolbar icon.

## Notice: Manifest.json Changes

Changes to your extension's `manifest.json` file **will not** be reflected using "Extensions Reloader" and a manual refresh must be done to apply them.