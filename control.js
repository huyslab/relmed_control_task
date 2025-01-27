// Configuration object for the control condition
const ctrlConfig = {
  baseRule: {
    banana: "coconut",
    coconut: "grape",
    grape: "orange",
    orange: "banana"
  },
  controlRule: {
    green: "coconut",
    blue: "grape",
    red: "orange",
    yellow: "banana",
  }
};

const ctrlTrials = [
  {"left": "green", "right": "blue", "near": "coconut", "current": 3}, 
  {"left": "red", "right": "yellow", "near": "orange", "current": 1}
];

function generateCtrlTrial(left, right, near, current) {
  const far = ctrlConfig.baseRule[near];
  stimulus = `
    <main class="main-stage">
      <img class="background" src="imgs/ocean.png" alt="Background"/>
      <section class="scene">
        <img class="island-far" src="imgs/island_${far}.png" alt="Farther island" />
        <div class="overlap-group">
          <div class="choice-left">
            <div class="fuel-container-left"></div>
            <img class="ship-left" src="imgs/ship_${left}.png" alt="Left ship" />
            <img class="arrow-left" src="imgs/left.png" alt="Left arrow" />
          </div>
          <img class="island-near" src="imgs/island_${near}.png" alt="Nearer island" />
          <div class="choice-right">
            <div class="fuel-container-right"></div>
            <img class="ship-right" src="imgs/ship_${right}.png" alt="Right ship" />
            <img class="arrow-right" src="imgs/left.png" alt="Right arrow" />
          </div>
        </div>
      </section>
    </main>
  `;
  return stimulus;
}

// Define the base structure for the game interface with enhanced interaction
const exploreTrial = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: () => {
    return generateCtrlTrial(
      jsPsych.evaluateTimelineVariable('left'), 
      jsPsych.evaluateTimelineVariable('right'), 
      jsPsych.evaluateTimelineVariable('near'),
      jsPsych.evaluateTimelineVariable('current')
    );
  },
  choices: ['ArrowLeft', 'ArrowRight'],
  response_ends_trial: false,
  trial_duration: 10000,  // 3 second time limit
  post_trial_gap: 300,
  on_load: () => {
    let selectedKey = null;
    let lastPressTime = 0;
    const leftArrow = document.querySelector('.arrow-left');
    const rightArrow = document.querySelector('.arrow-right');
    const leftContainer = document.querySelector('.fuel-container-left');
    const rightContainer = document.querySelector('.fuel-container-right');

    // Function to create and animate a fuel icon
    function createFuelIcon(container) {
      const fuelIcon = document.createElement('img');
      fuelIcon.src = 'imgs/fuel.png';
      fuelIcon.className = 'fuel-icon fuel-animation';
      container.appendChild(fuelIcon);

      // Remove the fuel icon after animation completes
      fuelIcon.addEventListener('animationend', () => {
        container.removeChild(fuelIcon);
      });
    }

    // Function to handle keyboard responses
    function handleKeypress(info) {
      const currentTime = info.rt;
      
      if (!selectedKey) {  // First key press - only select the ship
        if (info.key === 'ArrowLeft') {
          selectedKey = 'left';
          leftArrow.classList.add('highlight');
          // Hide the entire right choice (ship, arrow, and container)
          document.querySelector('.choice-right').style.visibility = 'hidden';
          
          // Set up listener for subsequent left key presses
          setupRepeatedKeypress('ArrowLeft', leftContainer);
        } else if (info.key === 'ArrowRight') {
          selectedKey = 'right';
          rightArrow.classList.add('highlight');
          // Hide the entire left choice (ship, arrow, and container)
          document.querySelector('.choice-left').style.visibility = 'hidden';
          
          // Set up listener for subsequent right key presses
          setupRepeatedKeypress('ArrowRight', rightContainer);
        }
        lastPressTime = currentTime;
      }
    }

    // Function to handle repeated keypresses
    function handleRepeatedKeypress(info) {
      createFuelIcon(selectedKey === 'left' ? leftContainer : rightContainer);
    }

    // Function to set up listener for repeated keypresses
    function setupRepeatedKeypress(key, container) {
      jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: handleRepeatedKeypress,
        valid_responses: [key],
        rt_method: 'performance',
        persist: true,
        allow_held_key: false,
        minimum_valid_rt: 0
      });
    }

    // Initial keyboard listener for the first choice
    setTimeout(() => {
        jsPsych.pluginAPI.getKeyboardResponse({
          callback_function: handleKeypress,
          valid_responses: ['ArrowLeft', 'ArrowRight'],
          rt_method: 'performance',
          persist: false,
          allow_held_key: false,
          minimum_valid_rt: 0
        });
      }, 100);
    }
};

// Create the timeline
var expTimeline = [];
ctrlTrials.forEach(trial => {
  expTimeline.push({
    timeline: [exploreTrial],
    timeline_variables: [trial]
  });
});