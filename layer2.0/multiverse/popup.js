// Popup.js - Controls the extension popup interface
// This handles all user interactions in the popup

// Load saved settings when popup opens
chrome.storage.sync.get([
  'ttsEnabled',
  'voiceEnabled',
  'speechRate',
  'fontSize',
  'theme',
  'focusMode',
  'keyboardNav'
], (result) => {
  // Initialize UI with saved settings
  if (result.ttsEnabled) {
    document.getElementById('tts-toggle').classList.add('active');
    document.getElementById('tts-indicator').classList.add('active');
  }
  
  if (result.voiceEnabled) {
    document.getElementById('voice-toggle').classList.add('active');
    document.getElementById('voice-indicator').classList.add('active');
  }
  
  if (result.focusMode) {
    document.getElementById('focus-toggle').classList.add('active');
  }
  
  if (result.keyboardNav !== false) {
    document.getElementById('keyboard-toggle').classList.add('active');
  }
  
  // Set speech rate slider
  const speechRate = result.speechRate || 1.0;
  document.getElementById('speech-rate').value = speechRate;
  document.getElementById('rate-value').textContent = speechRate.toFixed(1) + 'x';
  
  // Set theme dropdown
  document.getElementById('theme-select').value = result.theme || 'normal';
});

// TTS Toggle Switch
document.getElementById('tts-toggle').addEventListener('click', function() {
  this.classList.toggle('active');
  const enabled = this.classList.contains('active');
  document.getElementById('tts-indicator').classList.toggle('active', enabled);
  
  chrome.storage.sync.set({ ttsEnabled: enabled });
  sendMessageToContent({ action: 'toggleTTS', enabled });
});

// Voice Input Toggle Switch
document.getElementById('voice-toggle').addEventListener('click', function() {
  this.classList.toggle('active');
  const enabled = this.classList.contains('active');
  document.getElementById('voice-indicator').classList.toggle('active', enabled);
  
  chrome.storage.sync.set({ voiceEnabled: enabled });
  sendMessageToContent({ action: 'toggleVoice', enabled });
});

// Focus Mode Toggle Switch
document.getElementById('focus-toggle').addEventListener('click', function() {
  this.classList.toggle('active');
  const enabled = this.classList.contains('active');
  
  chrome.storage.sync.set({ focusMode: enabled });
  sendMessageToContent({ action: 'toggleFocus', enabled });
});

// Keyboard Navigation Toggle Switch
document.getElementById('keyboard-toggle').addEventListener('click', function() {
  this.classList.toggle('active');
  const enabled = this.classList.contains('active');
  
  chrome.storage.sync.set({ keyboardNav: enabled });
  sendMessageToContent({ action: 'toggleKeyboard', enabled });
});

// Speech Rate Slider
document.getElementById('speech-rate').addEventListener('input', function() {
  const rate = parseFloat(this.value);
  document.getElementById('rate-value').textContent = rate.toFixed(1) + 'x';
  
  chrome.storage.sync.set({ speechRate: rate });
  sendMessageToContent({ action: 'setSpeechRate', rate });
});

// Font Size Buttons
document.getElementById('increase-font').addEventListener('click', () => {
  sendMessageToContent({ action: 'changeFontSize', change: 'increase' });
});

document.getElementById('decrease-font').addEventListener('click', () => {
  sendMessageToContent({ action: 'changeFontSize', change: 'decrease' });
});

document.getElementById('reset-font').addEventListener('click', () => {
  sendMessageToContent({ action: 'changeFontSize', change: 'reset' });
});

// Theme Selector Dropdown
document.getElementById('theme-select').addEventListener('change', function() {
  const theme = this.value;
  chrome.storage.sync.set({ theme });
  sendMessageToContent({ action: 'changeTheme', theme });
});

// Speak Selection Button
document.getElementById('speak-selection').addEventListener('click', () => {
  sendMessageToContent({ action: 'speakSelection' });
});

// Stop Speech Button
document.getElementById('stop-speech').addEventListener('click', () => {
  sendMessageToContent({ action: 'stopSpeech' });
});

// Start Voice Input Button
document.getElementById('start-voice').addEventListener('click', () => {
  sendMessageToContent({ action: 'startVoiceInput' });
});

// Read Entire Page Button
document.getElementById('read-page').addEventListener('click', () => {
  sendMessageToContent({ action: 'readPage' });
});

// Reset All Settings Button
document.getElementById('reset-all').addEventListener('click', () => {
  if (confirm('Are you sure you want to reset all settings?')) {
    // Clear all stored settings
    chrome.storage.sync.clear(() => {
      sendMessageToContent({ action: 'resetAll' });
      // Reload popup to show default settings
      window.location.reload();
    });
  }
});

// Helper function to send messages to content script
function sendMessageToContent(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      // Check if we can send messages to this tab
      const url = tabs[0].url;
      
      // Don't try to inject into chrome:// pages
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        console.log('Cannot run on chrome:// pages');
        return;
      }
      
      chrome.tabs.sendMessage(tabs[0].id, message).then(() => {
        console.log('Message sent successfully');
      }).catch((error) => {
        console.log('Could not send message:', error.message);
        
        // Try to inject content script if it's not loaded
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        }).then(() => {
          console.log('Content script injected, retrying...');
          // Retry sending message after injection
          setTimeout(() => {
            chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {
              console.log('Still cannot send message');
            });
          }, 100);
        }).catch((err) => {
          console.log('Cannot inject script:', err.message);
        });
      });
    }
  });
}

// Log that popup is loaded
console.log('✓ Accessibility Extension Popup Loaded');