// Background Service Worker
// Handles keyboard shortcuts and maintains extension state

console.log('Universal Accessibility Extension - Background service starting...');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.sync.set({
      ttsEnabled: false,
      voiceEnabled: false,
      speechRate: 1.0,
      fontSize: 100,
      theme: 'normal',
      focusMode: false,
      keyboardNav: true
    }, () => {
      console.log('✓ Default settings initialized');
    });
    
    console.log('✓ Universal Accessibility Extension installed successfully!');
  } else if (details.reason === 'update') {
    console.log('✓ Universal Accessibility Extension updated');
  }
});

// Listen for keyboard commands from manifest
chrome.commands.onCommand.addListener((command) => {
  console.log('Keyboard command received:', command);
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      switch (command) {
        case 'toggle-tts':
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'speakSelection' 
          }).catch((error) => {
            console.log('TTS command error:', error.message);
          });
          break;
        
        case 'toggle-voice-input':
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'startVoiceInput' 
          }).catch((error) => {
            console.log('Voice input command error:', error.message);
          });
          break;
        
        case 'increase-font':
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'changeFontSize', 
            change: 'increase' 
          }).catch((error) => {
            console.log('Font increase command error:', error.message);
          });
          break;
        
        case 'decrease-font':
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'changeFontSize', 
            change: 'decrease' 
          }).catch((error) => {
            console.log('Font decrease command error:', error.message);
          });
          break;
      }
    }
  });
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(null, (settings) => {
      sendResponse(settings);
    });
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'log') {
    console.log('Content script log:', request.message);
  }
  
  return true;
});

// Monitor tab updates to reapply settings on page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    // Reapply settings when page loads
    chrome.storage.sync.get(null, (settings) => {
      chrome.tabs.sendMessage(tabId, { 
        action: 'applySettings', 
        settings: settings 
      }).catch((error) => {
        // Silently ignore errors for pages where content scripts can't run
        // (e.g., chrome:// pages, chrome web store, etc.)
      });
    });
  }
});

// Handle browser action click (if popup fails to open)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.id);
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('✓ Browser started - Accessibility Extension active');
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    console.log('Settings changed:', changes);
  }
});

console.log('✓ Universal Accessibility Extension - Background service running!');