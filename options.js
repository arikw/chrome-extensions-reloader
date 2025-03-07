// Saves options to chrome.storage.sync.
function saveOptions() {
	console.log('in save options');

  const reloadPageVal = document.getElementById('reload_page_after_extension_reload').checked;
  chrome.storage.sync.set({
    'reloadPage': reloadPageVal
  }, function () {
    // Update status to let user know options were saved.
    const statusEl = document.getElementById('status');

    statusEl.textContent = 'Options saved.';
    setTimeout(function () {
      statusEl.textContent = '';
    }, 1000);
  });
}

// Restores select box and checkbox state using the preferences stored in chrome.storage.
function restoreOptions() {
  chrome.storage.sync.get({
    'reloadPage': false
  }, function (items) {
    document.getElementById('reload_page_after_extension_reload').checked = items.reloadPage;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
