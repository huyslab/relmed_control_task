// Helper functions for creating instruction page elements
const createOceanCurrents = (level = 3) => {
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
};
const createInstructionDialog = (content) => {
    return `
    <div class="instruction-dialog">
        <div class="instruction-content">
            ${content}
        </div>
    </div>
`;
};

const createProgressBar = (current, total) => {
    return `
    <div class="progress-bar-container">
        <div class="progress-bar" style="width: ${(current / total) * 100}%"></div>
        <p id="keypress-prompt">Press <span class="spacebar-icon"><strong>J</strong></span> to continue</p>
    </div>
`;
};

// Create key press animation element
const createKeyAnimation = (direction) => {
    return `
    <div class="key-animation ${direction}-key">
        <div class="key-icon">←</div>
        <div class="press-animation"></div>
    </div>
`;
};

// New helper to abstract the fuel trial common behavior
function setupFuelTrial(config) {
    let selectedKey = null;
    let trialPresses = 0;
    const leftArrow = document.querySelector('.arrow-left');
    const rightArrow = document.querySelector('.arrow-right');
    const leftContainer = document.querySelector('.fuel-container-left');
    const rightContainer = document.querySelector('.fuel-container-right');

    // Listener for the first key press
    const firstKeyListener = jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: handleFirstKey,
        valid_responses: ['ArrowRight'],
        rt_method: 'performance',
        persist: false,
        allow_held_key: false,
        minimum_valid_rt: 100
    });
    
    function createFuelIcon(container) {
        const fuelIcon = document.createElement('img');
        fuelIcon.src = 'imgs/fuel.png';
        fuelIcon.className = 'fuel-icon fuel-animation';
        container.appendChild(fuelIcon);
        fuelIcon.addEventListener('animationend', () => {
            container.removeChild(fuelIcon);
        });
    }
    
    function handleFirstKey(info) {
        jsPsych.pluginAPI.cancelKeyboardResponse(firstKeyListener);
        const selectionIndicator = document.querySelector('.selection-indicator');
        if (selectionIndicator) { selectionIndicator.remove(); }
        if (info.key === 'ArrowLeft') {
            selectedKey = 'left';
            leftArrow.classList.add('highlight');
            document.querySelector('.choice-right').style.visibility = 'hidden';
            document.querySelector('.fuel-container-left .fuel-indicator-container').style.opacity = '1';
        } else if (info.key === 'ArrowRight') {
            selectedKey = 'right';
            rightArrow.classList.add('highlight');
            document.querySelector('.choice-left').style.visibility = 'hidden';
            document.querySelector('.fuel-container-right .fuel-indicator-container').style.opacity = '1';
        }
        document.querySelector('.instruction-content').innerHTML = config.initialMessage;
        setupRepeatedKeyListener();
    }
    
    let repeatedKeyListener;
    function setupRepeatedKeyListener() {
        repeatedKeyListener = jsPsych.pluginAPI.getKeyboardResponse({
            callback_function: handleRepeatedKeypress,
            valid_responses: selectedKey === 'left' ? ['ArrowLeft'] : ['ArrowRight'],
            rt_method: 'performance',
            persist: true,
            allow_held_key: false,
            minimum_valid_rt: 0
        });
    }
    
    function handleRepeatedKeypress(info) {
        trialPresses++;
        const container = selectedKey === 'left' ?
            document.querySelector('.fuel-container-left') :
            document.querySelector('.fuel-container-right');
        const fuelBar = container.querySelector('.fuel-indicator-bar');
        // Update progress via a progressCalculation function
        const progress = Math.min(config.progressCalculation(trialPresses), 100);
        fuelBar.style.width = `${progress}%`;

        if (progress === 100) {
            fuelBar.style.backgroundColor = '#00ff00';
        }

        createFuelIcon(selectedKey === 'left' ? leftContainer : rightContainer);
        // When finishCondition returns true, finish the trial.
        if (config.finishCondition(trialPresses, progress)) {
            jsPsych.pluginAPI.cancelKeyboardResponse(repeatedKeyListener);
            document.querySelector('.instruction-content').innerHTML = config.finishMessage;
            jsPsych.pluginAPI.setTimeout(() => {
                jsPsych.finishTrial();
            }, config.finishDelay || 2000);
        }
    }
}

// Main instruction pages configuration
const nPages = 7;
const instructionPages = [
    // Page 1: Initial Welcome
    {
        content: `
        <div class="instruction-stage">
            <img class="background" src="imgs/ocean.png" alt="Background"/>
            <section class="scene">
            <div class="overlap-group">
                <img class="island-near" src="imgs/simple_island_banana.png" alt="Nearer island" />
            </div>
            ${createOceanCurrents(2)}
            </section>
            ${createInstructionDialog(`
                <h2>Welcome to Your New Position!</h2>
                <p>You have just started as the manager of a shipping network, trading different types of fruits.</p>
                <p>Your role is to oversee the transportation of valuable cargo between islands.</p>
                `)}
            ${createProgressBar(1, nPages)}
        </div>
        `
    },

    // Page 2: Interactive Ship Selection, and adding fuel
    {
        content: `
        <div class="instruction-stage">
            <img class="background" src="imgs/ocean.png" alt="Background"/>
            <section class="scene">
            <div class="overlap-group">
                <div class="choice-left">
                    <img class="ship-left" src="imgs/simple_ship_green.png" alt="Left ship" />
                </div>
                <img class="island-near" src="imgs/simple_island_banana.png" alt="Nearer island" />
                <div class="choice-right">
                    <div class="selection-indicator">
                        <div class="selection-label">Press ➡️ to select</div>
                        <span class="selection-dot"></span>
                    </div>
                    <div class="fuel-container-right">
                    <div class="fuel-indicator-container">
                        <div class="fuel-indicator-bar"></div>
                    </div>
                    </div>
                    <img class="ship-right" src="imgs/simple_ship_blue.png" alt="Right ship" />
                    <img class="arrow-right" src="imgs/left.png" alt="right arrow" />
                </div>
            </div>
            ${createOceanCurrents(2)}
            </section>
            ${createInstructionDialog(`
                <p>As a manager, you will need to choose the right boat, and decide how much fuel to load it up with.</p>
                <p>Choose one of the boats by pressing the left or right arrow key.</p>
                <p>Let's try it out to <strong>select the blue boat by pressing the right arrow key.</strong></p>
            `)}
            ${createProgressBar(2, nPages)}
        </div>
        `
    },

    // Page 3: Ending up on the next island
    {
        content: `
        <div class="instruction-stage">
            <img class="background" src="imgs/ocean_above.png" alt="Background"/>
            <section class="scene">
                <svg class="trajectory-path">
                    <line x1="0" y1="100%" x2="0" y2="0" 
                    stroke="rgba(255,255,255,0.5)" 
                    stroke-width="2" 
                    class="path-animation"/>
                </svg>
                <img class="destination-island" 
                    src="imgs/island_icon_coconut.png" 
                    alt="Destination island" />
                <div class="ship-container">
                    <img class="ship-feedback" 
                    src="imgs/simple_ship_icon_blue.png" 
                    alt="Chosen ship" />
                </div>
            </section>
            ${createInstructionDialog(`
                <p>The boat didn't have enough fuel and ran out of fuel midway. Luckily, the ocean currents tend to carry boats with insufficient fuel to the next island in the chain.</p>
                <p>So the boat just drifted from the <span style="color: gold">banana island</span>🍌 to the <span style="color: brown">coconut island</span>🥥, which is the next island in the chain.</p>`)}
            ${createProgressBar(3, nPages)}
        </div>
        `
    },

    // Page 4: Islands in the Chain
    {
        content: `
        <div class="instruction-stage">
            <img class="background" src="imgs/default_islands.png" alt="Background"/>
            ${createInstructionDialog(`
                <p>Thanks to many former managers, this is a map of the four islands in the network. The arrows show how the ocean currents work.</p>
                <p><strong>When a boat does not have sufficient fuel, the current carries it to the next island along the arrows.</strong></p>
                <p>For example, without fuel, a boat leaving the <span style="color: orange">orange island</span>🍊 will end up on the <span style="color: gold">banana island</span>🍌.</p>
            `)}
            ${createProgressBar(4, nPages)}
        </div>
    `
    },

    // Page 5: Let's try again
    {
        content: `
        <div class="instruction-stage">
            <img class="background" src="imgs/ocean.png" alt="Background"/>
            <section class="scene">
            <img class="island-far" src="imgs/simple_island_coconut.png" alt="Farther island" />
            <div class="overlap-group">
                <div class="choice-left">
                    <img class="ship-left" src="imgs/simple_ship_green.png" alt="Left ship" />
                </div>
                <img class="island-near" src="imgs/simple_island_banana.png" alt="Nearer island" />
                <div class="choice-right">
                    <div class="selection-indicator">
                        <div class="selection-label">Press ➡️ to select</div>
                        <span class="selection-dot"></span>
                    </div>
                    <div class="fuel-container-right">
                    <div class="fuel-indicator-container">
                        <div class="fuel-indicator-bar"></div>
                    </div>
                    </div>
                    <img class="ship-right" src="imgs/simple_ship_blue.png" alt="Right ship" />
                    <img class="arrow-right" src="imgs/left.png" alt="right arrow" />
                </div>
            </div>
            ${createOceanCurrents(2)}
            </section>
            ${createInstructionDialog(`
                <p>Let's try it again. <strong>Now in the distance, you can see the next island in the chain.</strong> This is where you'll end up if you don't fuel up enough.</p>
                <p>Try to fuel up fully this time by rapidly pressing the arrow key repeatedly.</p>
                <p>Don't worry! We'll give you some extra time.</p>
            `)}
            ${createProgressBar(5, nPages)}
        </div>
        `
    },


    // Page 6: Ending up on the homebase
    {
        content: `
        <div class="instruction-stage">
            <img class="background" src="imgs/ocean_above.png" alt="Background"/>
            <section class="scene">
                <svg class="trajectory-path">
                    <line x1="0" y1="100%" x2="0" y2="0" 
                    stroke="rgba(255,255,255,0.5)" 
                    stroke-width="2" 
                    class="path-animation"/>
                </svg>
                <img class="destination-island" 
                    src="imgs/island_icon_grape.png" 
                    alt="Destination island" />
                <div class="ship-container">
                    <img class="ship-feedback" 
                    src="imgs/simple_ship_icon_blue.png" 
                    alt="Chosen ship" />
                </div>
            </section>
            ${createInstructionDialog(`
                <p>Great, the boat had enough fuel this time! When a boat have enough fuel, it will try to return to its homebase.</p>
                <p>This <span style="color: royalblue">blue boat</span> has a <span style="color: purple">grape island</span>🍇 as the homebase. Because it's fueled up this time, it went to its homebase island instead of drifting with the current to the next island.</p>
                <p><strong>Note that the boats can also start from and sail back to their home bases.</strong></p>
            `)}
            ${createProgressBar(6, nPages)}
        </div>
        `
    },

    // Page 7: Home Base Explanation
    {
        content: `
        <div class="instruction-stage">
            <img class="background" src="imgs/ocean.png" alt="Background"/>
            ${createOceanCurrents(2)}
            <div class="current-indicator">
                <div class="label">Ocean Current level: 2 = Mid</div>
            </div>
            ${createInstructionDialog(`
                <p>So now, please keep trying these out. We will always give you information on how strong the ocean currents are that day (<span style="color: darkgray">1 = Low</span>, <span style="color: dimgray">2 = Mid</span>, and <span style="color: black">3 = High</span>).</p>
                <p>The stronger the current, the more you'll have to fuel the boat <strong>if you want it to go to its homebase.</strong></p>
                <p>Your first job as a new manager is to get a sense of all of this. When you're ready, press the button to start.</p>
            `)}
            ${createProgressBar(7, nPages)}
        </div>
        `
    }
];

// Create the instruction trial
var instructionTrial = instructionPages.map((page, i) => {
    return {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: page.content,
        choices: "j",
        trial_duration: null,
        on_finish: () => {
            jsPsych.pluginAPI.clearAllTimeouts()
            jsPsych.pluginAPI.cancelAllKeyboardResponses();
        }
    };
});

// Refactored trial 1 using setupFuelTrial
instructionTrial[1] = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: instructionPages[1].content,
    choices: "NO_KEYS",
    trial_duration: null,
    on_load: () => {
        document.querySelector('#keypress-prompt').style.visibility = 'hidden';
        setupFuelTrial({
            initialMessage: `<p>You can now load up fuel by <strong>pressing the same arrow key again and again.</strong> The fuel gauge will fill up as you press the key.</p>
            <p>Give it a try!</p>`,
            progressCalculation: (trialPresses) => (trialPresses / 40) * 100,
            // Finish trial when 6 fuel presses have been recorded.
            finishCondition: (trialPresses, progress) => trialPresses >= 6,
            finishMessage: `<p>Fueling time is limited. The boat has to leave now!</p>`
        });
    },
    on_finish: () => {
        jsPsych.pluginAPI.clearAllTimeouts();
        jsPsych.pluginAPI.cancelAllKeyboardResponses();
    }
};

// Refactored trial 4 using setupFuelTrial
instructionTrial[4] = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: instructionPages[4].content,
    choices: "NO_KEYS",
    trial_duration: null,
    on_load: () => {
        document.querySelector('#keypress-prompt').style.visibility = 'hidden';
        setupFuelTrial({
            initialMessage: `<p>Keep adding fuel to the boat until it's full!</p>`,
            // Update progress based on 40 presses (i.e. progress runs from 0 to 100%).
            progressCalculation: (trialPresses) => (trialPresses / 40) * 100,
            // Finish trial when the fuel bar reaches 100% width.
            finishCondition: (trialPresses, progress) => progress >= 100,
            finishMessage: `<p>Now the fuel is full for this boat, and it's about to leave now!</p>`
        });
    },
    on_finish: () => {
        jsPsych.pluginAPI.clearAllTimeouts();
        jsPsych.pluginAPI.cancelAllKeyboardResponses();
    }
};