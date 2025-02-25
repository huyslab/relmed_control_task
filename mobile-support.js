// Detect if user is on a mobile device
function isMobileDevice() {
  return (typeof window.orientation !== "undefined") 
    || (navigator.userAgent.indexOf('IEMobile') !== -1)
    || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Initialize the virtual keyboard
function initVirtualKeyboard() {
  if (!isMobileDevice()) return;
  
  // Create the virtual keyboard
  const keyboardHTML = `
    <div class="virtual-keyboard" id="virtual-keyboard">
      <div class="vk-row">
        <div class="virtual-key" data-key="j">J</div>
      </div>
      <div class="vk-row">
        <div class="virtual-key" data-key="ArrowLeft">←</div>
        <div class="virtual-key" data-key="ArrowRight">→</div>
      </div>
      <div class="vk-row">
        <div class="virtual-key" data-key="d">D</div>
        <div class="virtual-key" data-key="f">F</div>
        <div class="virtual-key" data-key="j">J</div>
        <div class="virtual-key" data-key="k">K</div>
      </div>
    </div>
  `;
  
  // Add the keyboard to the document
  document.body.insertAdjacentHTML('beforeend', keyboardHTML);
  
  // Add event listeners to the virtual keys
  const virtualKeys = document.querySelectorAll('.virtual-key');
  virtualKeys.forEach(key => {
    // For visual feedback only (can be passive)
    key.addEventListener('touchstart', function() {
      this.classList.add('active');
    }, { passive: true });

    // For the actual action
    key.addEventListener('click', function(e) {
      const keyValue = this.getAttribute('data-key');
      
      // Create and dispatch keyboard event
      const keyEvent = new KeyboardEvent('keydown', {
        key: keyValue,
        code: keyValue.length === 1 ? 'Key' + keyValue.toUpperCase() : keyValue,
        bubbles: true
      });
      
      document.dispatchEvent(keyEvent);
    }, { passive: false });

    // Clean up the visual state
    key.addEventListener('touchend', function() {
      setTimeout(() => this.classList.remove('active'), 150);
    }, { passive: true });
  });
}

// Call this function after the page loads
document.addEventListener('DOMContentLoaded', initVirtualKeyboard);