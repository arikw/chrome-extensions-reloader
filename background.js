function reloadExtensions()
{
	// find all unpacked extensions and reload them
	chrome.management.getAll(function(a) {
		var ext = {};
		for (var i = 0; i < a.length; i++) {
			ext = a[i];
			if ((ext.installType=="development") &&
				(ext.enabled == true) &&
				(ext.name != "Extensions Reloader")) {
					console.log(ext.name + " reloaded");
					(function(extensionId) {
						// disable
						chrome.management.setEnabled(ext.id, false, function() {
							// re-enable
							chrome.management.setEnabled(extensionId, true);
						});
					})(ext.id);
			}
		}
	});
	
	// show an "OK" badge
	chrome.browserAction.setBadgeText({text: "OK"});
	chrome.browserAction.setBadgeBackgroundColor({color: "#4cb749"});
	setTimeout(function() {
		chrome.browserAction.setBadgeText({text: ""});
	}, 1000);
}

// intercept url
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.url.indexOf("http://reload.extensions") >= 0) {
		reloadExtensions();
		chrome.tabs.get(details.tabId, function(tab) {
			if (tab.selected == false) {
				chrome.tabs.remove(details.tabId);
			}
		});
		return {
			// close the newly opened window
			redirectUrl: chrome.extension.getURL("close.html")
		};
    }
	
	return {cancel: false};
  },
  {
    urls: ["http://reload.extensions/"],
    types: ["main_frame"]
  },
  ["blocking"]
);

chrome.browserAction.onClicked.addListener(function(tab) {
	reloadExtensions();
});