var jsPsychExploreShip = (function (jspsych) {
  "use strict";

  const info = {
    name: "explore-ship",
    version: "1.0.0",
    parameters: {
      left: {
        type: jspsych.ParameterType.STRING,
        default: undefined,
        description: "Color/type of the left ship"
      },
      right: {
        type: jspsych.ParameterType.STRING,
        default: undefined,
        description: "Color/type of the right ship"
      },
      near: {
        type: jspsych.ParameterType.STRING,
        default: undefined,
        description: "Type of the near island"
      },
      current: {
        type: jspsych.ParameterType.INT,
        default: 1,
        description: "Strength of ocean current (1-3)"
      },
      explore_decision: {
        type: jspsych.ParameterType.INT,
        default: 4000,
        description: "Time allowed for initial ship selection (ms)"
      },
      explore_effort: {
        type: jspsych.ParameterType.INT,
        default: 3000,
        description: "Time allowed for effort input after selection (ms)"
      },
      post_trial_gap: {
        type: jspsych.ParameterType.INT,
        default: 300,
        description: "Gap between trials (ms)"
      }
    },
    data: {
      trialphase: {
        type: jspsych.ParameterType.STRING,
        default: "explore"
      },
      response: {
        type: jspsych.ParameterType.STRING
      },
      rt: {
        type: jspsych.ParameterType.INT
      },
      responseTime: {
        type: jspsych.ParameterType.ARRAY
      },
      trial_presses: {
        type: jspsych.ParameterType.INT
      }
    }
  };

  class ExploreShipPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    createOceanCurrents(level) {
      // Helper function to create current lines based on level and direction
      const createCurrentLines = (isTrace = false, isLeft = true) => {
        let lines = '';
        const positions = {
          1: [{ top: 49, offset: 20 }],
          2: [
            { top: 45, offset: 50 },
            { top: 55, offset: 30 }
          ],
          3: [
            { top: 45, offset: 50 },
            { top: 49, offset: 20 },
            { top: 55, offset: 30 }
          ]
        };

        const currentPositions = positions[level] || positions[3];
        
        currentPositions.forEach(({ top, offset }) => {
          const position = isLeft ? 'right' : 'left';
          const styles = `top: ${top}%; ${position}: calc(5% + ${offset}px);`;
          
          if (isTrace) {
            lines += `<div class="current-trace" style="${styles}"></div>`;
          } else {
            lines += `<div class="current-line" style="${styles}"></div>`;
          }
        });
        return lines;
      };

      return `
        <div class="ocean-current">
          <div class="current-group left-currents">
            <!-- Static traces -->
            ${createCurrentLines(true, true)}
            <!-- Animated lines -->
            ${createCurrentLines(false, true)}
          </div>
          <div class="current-group right-currents">
            <!-- Static traces -->
            ${createCurrentLines(true, false)}
            <!-- Animated lines -->
            ${createCurrentLines(false, false)}
          </div>
        </div>
      `;
    }

    trial(display_element, trial) {
      // Initialize trial variables
      let selectedKey = null;
      let lastPressTime = 0;
      let trial_presses = 0;
      let responseTime = [];
      let choice = null;
      let choice_rt = 0;

      // Generate HTML for the trial
      const generateHTML = () => {
        const far = this.baseRule[trial.near];
        return `
          <main class="main-stage">
            <img class="background" src="imgs/ocean.png" alt="Background"/>
            <section class="scene">
              <img class="island-far" src="imgs/simple_island_${far}.png" alt="Farther island" />
              <div class="overlap-group">
                <div class="choice-left">
                  <div class="fuel-container-left">
                    <div class="fuel-indicator-container">
                      <div class="fuel-indicator-bar"></div>
                    </div>
                  </div>
                  <img class="ship-left" src="imgs/simple_ship_${trial.left}.png" alt="Left ship" />
                  <img class="arrow-left" src="imgs/left.png" alt="Left arrow" />
                </div>
                <img class="island-near" src="imgs/simple_island_${trial.near}.png" alt="Nearer island" />
                <div class="choice-right">
                  <div class="fuel-container-right">
                    <div class="fuel-indicator-container">
                      <div class="fuel-indicator-bar"></div>
                    </div>
                  </div>
                  <img class="ship-right" src="imgs/simple_ship_${trial.right}.png" alt="Right ship" />
                  <img class="arrow-right" src="imgs/left.png" alt="Right arrow" />
                </div>
              </div>
              ${this.createOceanCurrents(trial.current)}
            </section>
          </main>
        `;
      };

      // Define base rule mapping
      this.baseRule = {
        banana: "coconut",
        coconut: "grape",
        grape: "orange",
        orange: "banana"
      };

      // Display the trial
      display_element.innerHTML = generateHTML();

      // Function to create and animate fuel icons
      const createFuelIcon = (container) => {
        const fuelIcon = document.createElement('img');
        fuelIcon.src = 'imgs/fuel.png';
        fuelIcon.className = 'fuel-icon fuel-animation';
        container.appendChild(fuelIcon);

        fuelIcon.addEventListener('animationend', () => {
          container.removeChild(fuelIcon);
        });
      };

      // Handle initial ship selection
      const handleKeypress = (info) => {
        if (!selectedKey) {
          if (info.key === 'ArrowLeft') {
            selectedKey = 'left';
            document.querySelector('.arrow-left').classList.add('highlight');
            document.querySelector('.choice-right').style.visibility = 'hidden';
            document.querySelector('.fuel-container-left .fuel-indicator-container').style.opacity = '1';
            setupRepeatedKeypress('ArrowLeft');
          } else if (info.key === 'ArrowRight') {
            selectedKey = 'right';
            document.querySelector('.arrow-right').classList.add('highlight');
            document.querySelector('.choice-left').style.visibility = 'hidden';
            document.querySelector('.fuel-container-right .fuel-indicator-container').style.opacity = '1';
            setupRepeatedKeypress('ArrowRight');
          }
          choice = selectedKey;
          choice_rt = info.rt;
          this.jsPsych.pluginAPI.cancelKeyboardResponse(firstKey_listener);

          // Start effort phase timer
          this.jsPsych.pluginAPI.setTimeout(() => {
            endTrial();
          }, trial.explore_effort);
        }
      };

      // Handle repeated keypresses for effort
      const handleRepeatedKeypress = (info) => {
        trial_presses++;
        responseTime.push(info.rt - lastPressTime);
        lastPressTime = info.rt;

        const container = selectedKey === 'left' ? 
          document.querySelector('.fuel-container-left') :
          document.querySelector('.fuel-container-right');
        
        createFuelIcon(container);

        const fuelBar = container.querySelector('.fuel-indicator-bar');
        const progress = Math.min((trial_presses / 40) * 100, 100);
        fuelBar.style.width = `${progress}%`;

        if (progress === 100) {
          fuelBar.style.backgroundColor = '#00ff00';
        }
      };

      // Setup repeated keypress listener
      const setupRepeatedKeypress = (key) => {
        this.jsPsych.pluginAPI.getKeyboardResponse({
          callback_function: handleRepeatedKeypress,
          valid_responses: [key],
          rt_method: 'performance',
          persist: true,
          allow_held_key: false,
          minimum_valid_rt: 0
        });
      };

      // Initial keyboard listener
      const firstKey_listener = this.jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: handleKeypress,
        valid_responses: ['ArrowLeft', 'ArrowRight'],
        rt_method: 'performance',
        persist: false,
        allow_held_key: false,
        minimum_valid_rt: 100
      });

      // Start decision phase timer
      this.jsPsych.pluginAPI.setTimeout(() => {
        if (!selectedKey) {
          endTrial();
        }
      }, trial.explore_decision);

      // Function to end trial
      const endTrial = () => {
        this.jsPsych.pluginAPI.cancelAllKeyboardResponses();
        display_element.innerHTML = '';

        // Save data
        const trial_data = {
          trialphase: "explore",
          response: choice,
          rt: choice_rt,
          responseTime: responseTime,
          trial_presses: trial_presses
        };

        this.jsPsych.finishTrial(trial_data);
      };
    }
  }

  ExploreShipPlugin.info = info;

  return ExploreShipPlugin;
})(jsPsychModule);

var jsPsychExploreShipFeedback = (function (jspsych) {
  "use strict";

  const info = {
    name: "explore-ship-feedback",
    version: "1.0.0",
    parameters: {
      effort_threshold: {
        type: jspsych.ParameterType.INT,
        default: 10,
        description: "Threshold for effort to influence control rule"
      },
      scale: {
        type: jspsych.ParameterType.FLOAT,
        default: 0.6,
        description: "Scaling factor for effort influence"
      },
      feedback_duration: {
        type: jspsych.ParameterType.INT,
        default: 2000,
        description: "Duration to show feedback (ms)"
      },
      post_trial_gap: {
        type: jspsych.ParameterType.INT,
        default: 300,
        description: "Gap between trials (ms)"
      }
    }
  };

  class ExploreShipFeedbackPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;

      // Define rule mappings
      this.baseRule = {
        banana: "coconut",
        coconut: "grape",
        grape: "orange",
        orange: "banana"
      };

      this.controlRule = {
        green: "coconut",
        blue: "grape",
        red: "orange",
        yellow: "banana"
      };
    }

    sigmoid(x) {
      return 1 / (1 + Math.exp(-x));
    }

    chooseControlRule(effort, current, threshold, scale) {
      const extra_effort = (effort - threshold) * scale / current;
      const prob = this.sigmoid(extra_effort);
      return Math.random() < prob ? 'control' : 'base';
    }

    trial(display_element, trial) {
      // Get data from previous trial
      const lastTrial = this.jsPsych.data.getLastTrialData().values()[0];
      const choice = lastTrial.response; // 'left' or 'right'
      const chosenColor = this.jsPsych.evaluateTimelineVariable(choice);
      const nearIsland = this.jsPsych.evaluateTimelineVariable('near');
      const currentStrength = this.jsPsych.evaluateTimelineVariable('current');
      const effortLevel = lastTrial.trial_presses;

      // Determine destination island based on control rule
      const currentRule = this.chooseControlRule(
        effortLevel, 
        currentStrength,
        trial.effort_threshold,
        trial.scale
      );

      const destinationIsland = currentRule === 'base' 
        ? this.baseRule[nearIsland]
        : this.controlRule[chosenColor];

      // Generate feedback display
      const html = `
        <main class="main-stage">
          <img class="background" src="imgs/ocean_above.png" alt="Background"/>
          <section class="scene">
            <svg class="trajectory-path">
              <line x1="0" y1="100%" x2="0" y2="0" 
                    stroke="rgba(255,255,255,0.5)" 
                    stroke-width="2" 
                    class="path-animation"/>
            </svg>
            <img class="destination-island" 
                src="imgs/island_icon_${destinationIsland}.png" 
                alt="Destination island" />
            <div class="ship-container">
              <img class="ship-feedback" 
                  src="imgs/simple_ship_icon_${chosenColor}.png" 
                  alt="Chosen ship" />
            </div>
          </section>
        </main>
      `;

      display_element.innerHTML = html;

      // Clean up any leftover style elements
      const oldStyles = document.querySelectorAll('style[data-feedback-animation]');
      oldStyles.forEach(style => style.remove());

      // Ensure ship starts at correct position
      const shipContainer = display_element.querySelector('.ship-container');
      if (shipContainer) {
        shipContainer.style.visibility = 'visible';
      }

      // Save data and end trial after duration
      const trial_data = {
        trialphase: "explore_feedback",
        destination_island: destinationIsland,
        control_rule_used: currentRule,
        effort_level: effortLevel,
        current_strength: currentStrength,
        ship_color: chosenColor,
        near_island: nearIsland,
        probability_control: this.sigmoid((effortLevel - trial.effort_threshold) * trial.scale / currentStrength)
      };

      this.jsPsych.pluginAPI.setTimeout(() => {
        display_element.innerHTML = '';
        this.jsPsych.finishTrial(trial_data);
      }, trial.feedback_duration);
    }
  }

  ExploreShipFeedbackPlugin.info = info;

  return ExploreShipFeedbackPlugin;
})(jsPsychModule);