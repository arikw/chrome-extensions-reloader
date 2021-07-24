const state = {
	currentTabId: 0,
	previousTabId: 0,
	loglevel: !('update_url' in chrome.runtime.getManifest()) ? 'debug' : null
};

function reloadExtensions() {
    
	// find all unpacked extensions and reload them
	chrome.management.getAll(function(a) {
		var ext = {};
		for (var i = 0; i < a.length; i++) {
			ext = a[i];
			if ((ext.installType === "development") &&
				(ext.enabled === true) &&
				(ext.name !== "Extensions Reloader")) {
					console.log(ext.name + " reloaded");
					(function (extensionId, extensionType) {
						// disable
						chrome.management.setEnabled(extensionId, false, function() {
							// re-enable
							chrome.management.setEnabled(extensionId, true, function() {
								// re-launch packaged app
								if (extensionType === "packaged_app") {
									chrome.management.launchApp(extensionId);
								}
							});
						});
					})(ext.id, ext.type);
			}
		}
	});

	// Reload the current tab based on option value
	chrome.storage.sync.get("reloadPage", async function(item) {

		if (!item.reloadPage) { return; }
		
		const tab = await getCurrentTab() || {};
		const currentUrl = tab.url ? new URL(tab.url) : {};
		if (currentUrl.hostname !== 'reload.extensions') {
			chrome.tabs.reload(state.currentTabId);
		}
	});

	// show an "OK" badge
	chrome.browserAction.setBadgeText({text: "OK"});
	chrome.browserAction.setBadgeBackgroundColor({color: "#4cb749"});
	setTimeout(function() {
		chrome.browserAction.setBadgeText({text: ""});
	}, 1000);

}

chrome.windows.onFocusChanged.addListener(function (windowId) {
	if (windowId !== chrome.windows.WINDOW_ID_NONE) {
		refreshState();
	}
});

chrome.tabs.onActivated.addListener(function({ tabId }) {
	setCurrentTab(tabId);
});	

async function getCurrentTab() {
	return new Promise(function (resolve) {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			resolve((tabs.length > 0) ? tabs[0] : null);
		});
	});
}

async function getCurrentTabId() {
	const tab = await getCurrentTab();
	if (tab) {
		return tab.id;
	}
	
	return 0;
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

chrome.commands.onCommand.addListener(function(command) {
	if (command === "reload") {
		reloadExtensions();
	}
});

// intercept url
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.url.indexOf("http://reload.extensions") >= 0) {
		chrome.tabs.get(details.tabId, async function(tab) {
			const pendingURL = tab.pendingUrl ? new URL(tab.pendingUrl) : {};
			const isSafeToCloseTab =
				pendingURL.hostname === 'reload.extensions' &&
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

	return { cancel: true };
  },
  {
    urls: ["http://reload.extensions/"],
    types: ["main_frame"]
  },
  ["blocking"]
);

chrome.browserAction.onClicked.addListener(function(/*tab*/) {
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