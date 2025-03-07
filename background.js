  const LOG_LEVEL = !('update_url' in chrome.runtime.getManifest()) ? 'debug' : null;
  const RELOAD_TRIGGER_HOSTNAME = 'reload.extensions';


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
			const storedCurrentTabId = await getStoredCurrentTabId();
      chrome.tabs.reload(storedCurrentTabId);
    }
  });

  // show an "OK" badge
  chrome.action.setBadgeText({ text: 'OK' });
  chrome.action.setBadgeBackgroundColor({ color: '#4cb749' });
  // normally setTimeout is unreliable in a service worker, but 1 second should work fine
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1000);

}

chrome.windows.onFocusChanged.addListener(function (windowId) {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    refreshState();
  }
});

chrome.tabs.onActivated.addListener(async function ({ tabId }) {
  await setCurrentTab(tabId);
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

async function setCurrentTab(id) {
	const storedCurrentTabId = await getStoredCurrentTabId();
  if (storedCurrentTabId === id) {
    log('skipped setCurrentTab');
    return;
  }
	const previousTabId = storedCurrentTabId;
	const currentTabId = id;
	await chrome.storage.local.set({ currentTabId, previousTabId });

  log('previousTabId', previousTabId, 'currentTabId', currentTabId);
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
				const storedCurrentTabId = await getStoredCurrentTabId();
				const storedPreviousTabId = await getStoredPreviousTabId();
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

          if (tabId !== storedCurrentTabId) {
            await setCurrentTab(storedPreviousTabId);

            await chrome.tabs.update(storedCurrentTabId, { highlighted: true });

            tabId = await getCurrentTabId();
            log('after focus tab: ', tabId);

          }

          await refreshState();
        }

        reloadExtensions();
      });
    }

    return { cancel: true };
  },
  {
    urls: [`http://${RELOAD_TRIGGER_HOSTNAME}/`],
    types: ['main_frame']
  }
);

chrome.action.onClicked.addListener(function (/*tab*/) {
  reloadExtensions();
});

function log(...args) {
  if (LOG_LEVEL === 'debug') {
    console.log(...args);
  }
}

async function refreshState() {
  const tabId = await getCurrentTabId();
  await setCurrentTab(tabId);
}

async function getStoredCurrentTabId() {
	const storedCurrentTabId = (await chrome.storage.local.get('currentTabId'))['currentTabId'] || 0;
	return storedCurrentTabId;
}

async function getStoredPreviousTabId() {
	const savedPreviousTabId = (await chrome.storage.local.get('previousTabId'))['previousTabId'] || 0;
	return savedPreviousTabId;
}

refreshState();
