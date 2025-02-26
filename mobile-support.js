// mobile-support.js

// Detect if user is on a mobile device
function isMobileDevice() {
  return (typeof window.orientation !== "undefined") 
    || (navigator.userAgent.indexOf('IEMobile') !== -1)
    || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Store active jsPsych keyboard listeners
let activeJsPsychListeners = [];

// Override jsPsych's getKeyboardResponse to track active listeners
if (typeof jsPsych !== 'undefined') {
  const originalGetKeyboardResponse = jsPsych.pluginAPI.getKeyboardResponse;
  
  jsPsych.pluginAPI.getKeyboardResponse = function(parameters) {
    const listener_id = originalGetKeyboardResponse.call(this, parameters);
    
    // Store this listener for virtual keyboard access
    activeJsPsychListeners.push({
      id: listener_id,
      callback: parameters.callback_function,
      valid_responses: parameters.valid_responses,
      rt_method: parameters.rt_method,
      persist: parameters.persist,
      allow_held_key: parameters.allow_held_key
    });
    
    return listener_id;
  };
  
  // Also override the cancel function to remove from our tracking
  const originalCancelKeyboardResponse = jsPsych.pluginAPI.cancelKeyboardResponse;
  jsPsych.pluginAPI.cancelKeyboardResponse = function(listener_id) {
    originalCancelKeyboardResponse.call(this, listener_id);
    activeJsPsychListeners = activeJsPsychListeners.filter(listener => listener.id !== listener_id);
  };
  
  const originalCancelAllKeyboardResponses = jsPsych.pluginAPI.cancelAllKeyboardResponses;
  jsPsych.pluginAPI.cancelAllKeyboardResponses = function() {
    originalCancelAllKeyboardResponses.call(this);
    activeJsPsychListeners = [];
  };
}

// Initialize the virtual keyboard
function initVirtualKeyboard() {
  if (!isMobileDevice()) return;
  
  // Create the virtual keyboard
  // Replace the keyboardHTML in initVirtualKeyboard()
const keyboardHTML = `
  <div class="virtual-keyboard" id="virtual-keyboard">
    <div class="vk-row">
    <div class="virtual-key" data-key="ArrowLeft">←</div>
      <div class="virtual-key" data-key="d">D</div>
      <div class="virtual-key" data-key="f">F</div>
      <div class="virtual-key" data-key="j">J</div>
      <div class="virtual-key" data-key="k">K</div>
      <div class="virtual-key" data-key="ArrowRight">→</div>
    </div>
  </div>
`;
  
  // Add the keyboard to the document
  document.body.insertAdjacentHTML('beforeend', keyboardHTML);
  
  // Add event listeners to the virtual keys
  const virtualKeys = document.querySelectorAll('.virtual-key');
  virtualKeys.forEach(key => {
    // Handle the touch events
    key.addEventListener('touchstart', function(e) {
      e.preventDefault(); // We need this to prevent double-firing with click
      
      // Visual feedback
      this.classList.add('active');
      
      // Get key value
      const keyValue = this.getAttribute('data-key');
      
      // Trigger jsPsych listeners directly
      triggerJsPsychListeners(keyValue);
      
      // Remove visual feedback after delay
      setTimeout(() => {
        this.classList.remove('active');
      }, 150);
    }, { passive: false });
  });
}

// Function to directly trigger jsPsych keyboard listeners
function triggerJsPsychListeners(keyValue) {
  if (activeJsPsychListeners.length === 0) {
    console.log("No active jsPsych listeners found");
    return;
  }
  
  const timestamp = performance.now();
  
  activeJsPsychListeners.forEach(listener => {
    // Check if the pressed key is among the valid responses for this listener
    const valid_responses = listener.valid_responses;
    if (valid_responses === 'ALL_KEYS' || valid_responses.includes(keyValue)) {
      // Create the info object that jsPsych's listeners expect
      const info = {
        key: keyValue,
        rt: listener.rt_method === 'performance' ? timestamp : (new Date().getTime()),
        timeStamp: timestamp
      };
      
      // Call the callback
      listener.callback(info);
      
      // If this listener should not persist, remove it
      if (!listener.persist) {
        jsPsych.pluginAPI.cancelKeyboardResponse(listener.id);
      }
    }
  });
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure jsPsych is fully initialized
  setTimeout(initVirtualKeyboard, 500);
});