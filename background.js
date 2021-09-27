const
  state = {
    currentTabId: 0,
    previousTabId: 0,
    loglevel: !('update_url' in chrome.runtime.getManifest()) ? 'debug' : null
  },
  RELOAD_TRIGGER_HOSTNAME = 'reload.extensions';

function reloadExtensions() {
    
  // find all unpacked extensions and reload them
  chrome.management.getAll(async function (extensions) {
    for (const ext of extensions) {
      if ((ext.installType === 'development') &&
          (ext.enabled === true) &&
          (ext.name !== 'Extensions Reloader')) {

        const extensionId = ext.id;
        const extensionType = ext.type;

        await chrome.management.setEnabled(extensionId, false);
        await chrome.management.setEnabled(extensionId, true);

        // re-launch packaged app
        if (extensionType === 'packaged_app') {
          chrome.management.launchApp(extensionId);
        }

        console.log(ext.name + ' reloaded');
      }
    }
  });

  // Reload the current tab based on option value
  chrome.storage.sync.get('reloadPage', async function (item) {

    if (!item.reloadPage) { return; }

    const tab = await getCurrentTab() || {};
    const currentUrl = tab.url ? new URL(tab.url) : {};
    if (currentUrl.hostname !== RELOAD_TRIGGER_HOSTNAME) {
      chrome.tabs.reload(state.currentTabId);
    }
  });

  // show an "OK" badge
  chrome.browserAction.setBadgeText({ text: 'OK' });
  chrome.browserAction.setBadgeBackgroundColor({ color: '#4cb749' });
  setTimeout(() => chrome.browserAction.setBadgeText({ text: '' }), 1000);

}

chrome.windows.onFocusChanged.addListener(function (windowId) {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    refreshState();
  }
});

chrome.tabs.onActivated.addListener(function ({ tabId }) {
  setCurrentTab(tabId);
});

async function getCurrentTab() {
  return new Promise(function (resolve) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      resolve((tabs.length > 0) ? tabs[0] : null);
    });
  });
}

async function getCurrentTabId() {
  const tab = await getCurrentTab();
  return tab ? tab.id : 0;
}

function setCurrentTab(id) {

  if (state.currentTabId === id) {
    log('skipped setCurrentTab');
    return;
  }
  state.previousTabId = state.currentTabId;
  state.currentTabId = id;

  log('previousTabId', state.previousTabId, 'currentTabId', state.currentTabId);
}

chrome.commands.onCommand.addListener(function (command) {
  if (command === 'reload') {
    reloadExtensions();
  }
});

// intercept url
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (details.url.indexOf(`http://${RELOAD_TRIGGER_HOSTNAME}`) >= 0) {
      chrome.tabs.get(details.tabId, async function (tab) {
        const pendingURL = tab.pendingUrl ? new URL(tab.pendingUrl) : {};
        const isSafeToCloseTab =
        pendingURL.hostname === RELOAD_TRIGGER_HOSTNAME &&
        !tab.url; // tab has not yet committed => a newly created tab
        if (isSafeToCloseTab) {

          let tabId = await getCurrentTabId();
          log('before close: ', tabId);

          await chrome.tabs.remove(details.tabId);
          tabId = await getCurrentTabId();
          log('after close: ', tabId);

          if (tabId !== state.currentTabId) {
            setCurrentTab(state.previousTabId);

            await chrome.tabs.update(state.currentTabId, { highlighted: true });

            tabId = await getCurrentTabId();
            log('after focus tab: ', tabId);

          }

          await refreshState();
        }

        reloadExtensions();
      });
    }

    return { cancel: false };
  },
  {
    urls: [`http://${RELOAD_TRIGGER_HOSTNAME}/`],
    types: ['main_frame']
  },
  ['blocking']
);

chrome.browserAction.onClicked.addListener(function (/*tab*/) {
  reloadExtensions();
});

function log(...args) {
  if (state.loglevel === 'debug') {
    console.log(...args);
  }
}

async function refreshState() {
  const tabId = await getCurrentTabId();
  setCurrentTab(tabId);
}

refreshState();
