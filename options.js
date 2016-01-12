// Saves options to chrome.storage.sync.
function save_options() {
  chrome.extension.getBackgroundPage().console.log('in save options...');

  var reloadPageVal = document.getElementById('reload_page_after_extension_reload').checked;
  chrome.storage.sync.set({
    'reloadPage': reloadPageVal
  }, function() {
    // Update status to let user know options were saved.
    var statusEl = document.getElementById('status');

    statusEl.textContent = 'Options saved.';
    setTimeout(function() {
      statusEl.textContent = '';
    }, 1000);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get({
    'reloadPage': false
  }, function(items) {
    document.getElementById('reload_page_after_extension_reload').checked = items.reloadPage;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);
// chrome.extension.getBackgroundPage().console.log('options loaded...');
