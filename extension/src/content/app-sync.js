// Check immediately on load
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('autoreach.io')) {
  setTimeout(() => {
    const token = window.localStorage.getItem('token');
    if (token) {
      chrome.runtime.sendMessage({ type: 'TOKEN_UPDATED', token: token });
    }
  }, 1000); // 1s delay to let React app write it if just logging in
}

// Continue to listen for active login events
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data && event.data.type === 'AUTOREACH_AUTH_TOKEN') {
    const token = event.data.token;
    chrome.runtime.sendMessage({ type: 'TOKEN_UPDATED', token: token });
  }
});

window.postMessage({ type: 'AUTOREACH_EXTENSION_READY' }, '*');
