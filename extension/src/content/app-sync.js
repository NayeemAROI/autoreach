window.addEventListener('message', (event) => {
  // Only accept from our own window
  if (event.source !== window) return;

  if (event.data && event.data.type === 'AUTOREACH_AUTH_TOKEN') {
    const token = event.data.token;
    chrome.runtime.sendMessage({ type: 'TOKEN_UPDATED', token: token });
  }
});

// Optionally, tell the app we are ready to receive tokens
window.postMessage({ type: 'AUTOREACH_EXTENSION_READY' }, '*');
