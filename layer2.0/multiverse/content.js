// Content Script - Runs on every webpage
// This script adds accessibility features to any website

let settings = {
  ttsEnabled: false,
  voiceEnabled: false,
  speechRate: 1.0,
  fontSize: 100,
  theme: 'normal',
  focusMode: false,
  keyboardNav: true
};

// Speech synthesis instance
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

// Speech recognition instance
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
}

// Load settings on page load
chrome.storage.sync.get(Object.keys(settings), (result) => {
  settings = { ...settings, ...result };
  applyAllSettings();
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    switch (request.action) {
      case 'toggleTTS':
        settings.ttsEnabled = request.enabled;
        break;
      
      case 'toggleVoice':
        settings.voiceEnabled = request.enabled;
        break;
      
      case 'toggleFocus':
        settings.focusMode = request.enabled;
        applyFocusMode();
        break;
      
      case 'toggleKeyboard':
        settings.keyboardNav = request.enabled;
        applyKeyboardNavigation();
        break;
      
      case 'setSpeechRate':
        settings.speechRate = request.rate;
        break;
      
      case 'changeFontSize':
        changeFontSize(request.change);
        break;
      
      case 'changeTheme':
        settings.theme = request.theme;
        applyTheme();
        break;
      
      case 'speakSelection':
        speakSelectedText();
        break;
      
      case 'stopSpeech':
        stopSpeech();
        break;
      
      case 'startVoiceInput':
        startVoiceInput();
        break;
      
      case 'readPage':
        readEntirePage();
        break;
      
      case 'resetAll':
        resetAllSettings();
        break;
      
      case 'applySettings':
        if (request.settings) {
          settings = { ...settings, ...request.settings };
          applyAllSettings();
        }
        break;
    }
  } catch (error) {
    console.error('Accessibility Extension Error:', error);
  }
  return true;
});

// Apply all settings
function applyAllSettings() {
  try {
    applyTheme();
    applyFontSize();
    applyFocusMode();
    applyKeyboardNavigation();
    addARIALabels();
  } catch (error) {
    console.error('Error applying settings:', error);
  }
}

// ==================== TEXT-TO-SPEECH FUNCTIONS ====================

function speakSelectedText() {
  const selectedText = window.getSelection().toString().trim();
  
  if (selectedText) {
    speakText(selectedText);
  } else {
    showNotification('Please select some text first', 'info');
  }
}

function readEntirePage() {
  try {
    // Stop any existing speech first
    stopSpeech();
    
    // Try to get main content first
    let textToRead = '';
    
    // Try different selectors for main content
    const mainContent = document.querySelector('main, article, .content, #content, [role="main"]');
    
    if (mainContent) {
      textToRead = mainContent.innerText;
    } else {
      textToRead = document.body.innerText;
    }
    
    // Clean the text
    const cleanText = textToRead
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
    
    if (!cleanText || cleanText.length < 10) {
      showNotification('No readable text found on page', 'info');
      return;
    }
    
    // Limit to 3000 characters to avoid timeout
    const textToSpeak = cleanText.substring(0, 3000);
    
    if (textToSpeak) {
      speakText(textToSpeak);
      showNotification('Reading page... (first 3000 characters)', 'success');
    }
  } catch (error) {
    showNotification('Error reading page: ' + error.message, 'error');
    console.error('Read page error:', error);
  }
}
function speakText(text) {
  try {
    // Stop any ongoing speech
    stopSpeech();
    
    if (!text) return;
    
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = settings.speechRate;
    currentUtterance.pitch = 1;
    currentUtterance.volume = 1;
    
    currentUtterance.onstart = () => {
      showNotification('Speaking...', 'success');
    };
    
    currentUtterance.onend = () => {
      showNotification('Speech finished', 'success');
    };
    
    currentUtterance.onerror = (event) => {
      showNotification('Speech error: ' + event.error, 'error');
    };
    
    speechSynthesis.speak(currentUtterance);
  } catch (error) {
    showNotification('Text-to-speech not available', 'error');
    console.error('TTS error:', error);
  }
}

function stopSpeech() {
  try {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      showNotification('Speech stopped', 'info');
    }
  } catch (error) {
    console.error('Error stopping speech:', error);
  }
}

// ==================== VOICE INPUT FUNCTIONS ====================

function startVoiceInput() {
  if (!recognition) {
    showNotification('Speech recognition not supported in this browser', 'error');
    return;
  }
  
  try {
    // Find focused input field
    const activeElement = document.activeElement;
    
    if (!['INPUT', 'TEXTAREA'].includes(activeElement.tagName) && 
        !activeElement.isContentEditable) {
      showNotification('Please click on a text field first', 'info');
      return;
    }
    
    showNotification('Listening... Speak now', 'info');
    
    recognition.onresult = (event) => {
      try {
        const transcript = event.results[0][0].transcript;
        
        // Insert text into focused element
        if (activeElement.isContentEditable) {
          document.exceecommand('insertText', false, transcript);
        } else {
          const start = activeElement.selectionStart || 0;
          const end = activeElement.selectionEnd || 0;
          const text = activeElement.value || '';
          activeElement.value = text.substring(0, start) + transcript + text.substring(end);
          activeElement.selectionStart = activeElement.selectionEnd = start + transcript.length;
        }
        
        showNotification('Text inserted: ' + transcript, 'success');
      } catch (error) {
        showNotification('Error inserting text', 'error');
        console.error('Voice input error:', error);
      }
    };
    
    recognition.onerror = (event) => {
      showNotification('Recognition error: ' + event.error, 'error');
    };
    
    recognition.onend = () => {
      showNotification('Listening stopped', 'info');
    };
    
    recognition.start();
  } catch (error) {
    showNotification('Voice input error: ' + error.message, 'error');
    console.error('Voice input error:', error);
  }
}

// ==================== FONT SIZE FUNCTIONS ====================

function changeFontSize(change) {
  if (change === 'increase') {
    settings.fontSize = Math.min(settings.fontSize + 10, 200);
  } else if (change === 'decrease') {
    settings.fontSize = Math.max(settings.fontSize - 10, 80);
  } else if (change === 'reset') {
    settings.fontSize = 100;
  }
  
  chrome.storage.sync.set({ fontSize: settings.fontSize });
  applyFontSize();
  showNotification('Font size: ' + settings.fontSize + '%', 'info');
}

function applyFontSize() {
  document.documentElement.style.fontSize = settings.fontSize + '%';
}

// ==================== THEME FUNCTIONS ====================

function applyTheme() {
  // Remove existing theme classes
  document.body.classList.remove(
    'accessible-high-contrast',
    'accessible-dark',
    'accessible-yellow-black'
  );
  
  switch (settings.theme) {
    case 'high-contrast':
      document.body.classList.add('accessible-high-contrast');
      break;
    case 'dark':
      document.body.classList.add('accessible-dark');
      break;
    case 'yellow-black':
      document.body.classList.add('accessible-yellow-black');
      break;
  }
}

// ==================== FOCUS MODE ====================

function applyFocusMode() {
  if (settings.focusMode) {
    document.body.classList.add('accessible-focus-mode');
    showNotification('Focus mode enabled', 'success');
  } else {
    document.body.classList.remove('accessible-focus-mode');
  }
}

// ==================== KEYBOARD NAVIGATION ====================

function applyKeyboardNavigation() {
  if (settings.keyboardNav) {
    try {
      // Add tab index to interactive elements
      const interactiveElements = document.querySelectorAll(
        'a, button, input, select, textarea, [onclick]'
      );
      
      interactiveElements.forEach((el) => {
        if (!el.hasAttribute('tabindex') || el.getAttribute('tabindex') === '-1') {
          el.setAttribute('tabindex', '0');
        }
      });
      
      // Add visual focus indicators
      document.body.classList.add('accessible-keyboard-nav');
    } catch (error) {
      console.error('Error applying keyboard navigation:', error);
    }
  }
}

// ==================== ARIA LABELS ====================

function addARIALabels() {
  try {
    // Add labels to images without alt text
    const images = document.querySelectorAll('img:not([alt])');
    images.forEach((img) => {
      img.setAttribute('alt', 'Image');
    });
    
    // Add labels to buttons without text
    const buttons = document.querySelectorAll('button:not([aria-label])');
    buttons.forEach((btn) => {
      if (!btn.textContent.trim()) {
        btn.setAttribute('aria-label', 'Button');
      }
    });
    
    // Add labels to links
    const links = document.querySelectorAll('a:not([aria-label])');
    links.forEach((link) => {
      if (!link.textContent.trim()) {
        link.setAttribute('aria-label', 'Link');
      }
    });
  } catch (error) {
    console.error('Error adding ARIA labels:', error);
  }
}

// ==================== RESET SETTINGS ====================

function resetAllSettings() {
  settings = {
    ttsEnabled: false,
    voiceEnabled: false,
    speechRate: 1.0,
    fontSize: 100,
    theme: 'normal',
    focusMode: false,
    keyboardNav: true
  };
  
  applyAllSettings();
  showNotification('All settings reset', 'success');
}

// ==================== NOTIFICATION SYSTEM ====================

function showNotification(message, type = 'info') {
  try {
    // Remove existing notification
    const existing = document.getElementById('accessibility-notification');
    if (existing) {
      existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'accessibility-notification';
    notification.className = `accessibility-notification accessibility-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

// ==================== KEYBOARD SHORTCUTS ====================

document.addEventListener('keydown', (e) => {
  try {
    // Ctrl+Shift+S - Speak selection
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      speakSelectedText();
    }
    
    // Ctrl+Shift+V - Voice input
    if (e.ctrlKey && e.shiftKey && e.key === 'V') {
      e.preventDefault();
      startVoiceInput();
    }
  } catch (error) {
    console.error('Keyboard shortcut error:', error);
  }
});

// ==================== INITIALIZE ====================

try {
  applyAllSettings();
  console.log('✓ Universal Accessibility Extension loaded successfully');
} catch (error) {
  console.error('Error initializing extension:', error);
}