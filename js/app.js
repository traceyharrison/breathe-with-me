// State variables
let intervalId = null;
let currentPhase = 0;
let currentCount = 4;
let audioContext = null;
let currentPattern = 'box';
let pingEnabled = true;
let pingStyle = 'medium';

// Timer variables
let timerIntervalId = null;
let timerDuration = 0; // in seconds
let timerRemaining = 0; // in seconds
let isTimerActive = false;

// Breathing patterns
let phases = [
    { name: 'Breathe In', class: 'breathe-in', duration: 4 },
    { name: 'Hold', class: 'hold', duration: 4 },
    { name: 'Breathe Out', class: 'breathe-out', duration: 4 },
    { name: 'Hold', class: 'hold', duration: 4 }
];

// Ping style configurations
const pingConfigs = {
    'medium': { frequency: 220, volume: 0.12, duration: 1.2 },  // A3 - Current
    'low': { frequency: 110, volume: 0.15, duration: 1.5 },     // A2 - Lower, slightly longer
    'high': { frequency: 440, volume: 0.08, duration: 1.0 }     // A4 - Higher, softer, shorter
};

// Phase-specific ping style mapping
function getPingStyleForPhase(phaseName) {
    switch(phaseName) {
        case 'Breathe In':
            return 'low';
        case 'Hold':
            return 'medium';
        case 'Breathe Out':
            return 'high';
        default:
            return 'medium'; // Default to medium for any unrecognized phase
    }
}

// Settings menu toggle
function toggleSettingsMenu() {
    const menu = document.getElementById('settingsMenu');
    menu.classList.toggle('active');
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    const settingsMenu = document.getElementById('settingsMenu');
    const settingsIcon = document.querySelector('.settings-icon');
    const timerMenu = document.getElementById('timerMenu');
    const timerIcon = document.querySelector('.timer-icon');
    
    if (settingsMenu.classList.contains('active') && 
        !settingsMenu.contains(e.target) && 
        !settingsIcon.contains(e.target)) {
        settingsMenu.classList.remove('active');
    }
    
    if (timerMenu.classList.contains('active') && 
        !timerMenu.contains(e.target) && 
        !timerIcon.contains(e.target)) {
        timerMenu.classList.remove('active');
    }
});

// Audio settings
function togglePing() {
    pingEnabled = document.getElementById('pingToggle').checked;
}



// Timer menu toggle
function toggleTimerMenu() {
    const menu = document.getElementById('timerMenu');
    menu.classList.toggle('active');
}

// Timer functions
function updateTimerDisplay() {
    const minutes = document.getElementById('timerMinSlider').value;
    document.getElementById('timerMinValue').textContent = minutes;
}

function setTimerPreset(minutes) {
    timerDuration = minutes * 60; // convert to seconds
    timerRemaining = timerDuration;
    updateTimerUI();
    showTimerControls();
}

function setCustomTimer() {
    const minutes = parseInt(document.getElementById('timerMinSlider').value);
    timerDuration = minutes * 60;
    timerRemaining = timerDuration;
    updateTimerUI();
    showTimerControls();
}

function showTimerControls() {
    document.getElementById('timerControls').style.display = 'block';
    document.getElementById('timerDisplay').style.display = 'block';
    document.getElementById('timerStatus').textContent = `Timer set for ${Math.floor(timerDuration / 60)} minutes`;
}

function startTimer() {
    if (timerRemaining <= 0) return;
    
    isTimerActive = true;
    document.getElementById('timerStartBtn').style.display = 'none';
    document.getElementById('timerStopBtn').style.display = 'inline-block';
    document.getElementById('timerStatus').textContent = 'Timer running...';
    
    // Show the session timer display below the breathing circle and hide menu timer display
    document.getElementById('sessionTimerDisplay').style.display = 'block';
    updateSessionTimerDisplay(); // Initial display update
    
    timerIntervalId = setInterval(() => {
        timerRemaining--;
        updateTimerUI();
        updateSessionTimerDisplay();
        
        if (timerRemaining <= 0) {
            timerComplete();
        }
    }, 1000);
}

function stopTimer() {
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
    }
    
    isTimerActive = false;
    document.getElementById('timerStartBtn').style.display = 'inline-block';
    document.getElementById('timerStopBtn').style.display = 'none';
    document.getElementById('timerStatus').textContent = 'Timer stopped';
    
    // Hide the session timer display
    document.getElementById('sessionTimerDisplay').style.display = 'none';
}

function resetTimer() {
    stopTimer();
    timerRemaining = 0;
    timerDuration = 0;
    document.getElementById('timerControls').style.display = 'none';
    document.getElementById('timerDisplay').style.display = 'none';
    document.getElementById('timerStatus').textContent = 'No timer set';
    
    // Hide the session timer display
    document.getElementById('sessionTimerDisplay').style.display = 'none';
}

function updateTimerUI() {
    const minutes = Math.floor(timerRemaining / 60);
    const seconds = timerRemaining % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timerDisplay').textContent = display;
}

function updateSessionTimerDisplay() {
    const minutes = Math.floor(timerRemaining / 60);
    const seconds = timerRemaining % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('sessionTimerCountdown').textContent = display;
}

function timerComplete() {
    stopTimer();
    document.getElementById('timerStatus').textContent = 'Time\'s up!';
    
    // Show completion message on the session display briefly
    document.getElementById('sessionTimerDisplay').style.display = 'block';
    document.getElementById('sessionTimerCountdown').textContent = 'Time\'s Up!';
    document.querySelector('.session-timer-text').textContent = 'Session Complete';
    
    playTimerBell();
    
    // Reset timer after a delay
    setTimeout(() => {
        document.querySelector('.session-timer-text').textContent = 'Session Time Remaining';
        resetTimer();
    }, 3000);
}

function playTimerBell() {
    initAudio();
    if (!audioContext) return;
    
    // Create a gentle, low bell sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Gentle bell frequency (lower than the ping)
    oscillator.frequency.setValueAtTime(174.61, audioContext.currentTime); // F3 note
    oscillator.type = 'sine';
    
    // Gentle volume with slow fade
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3.0);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 3.0);
}

// Breathing pattern presets
function setPreset(pattern) {
    // Stop if currently running
    if (intervalId) {
        stopBreathing();
    }

    currentPattern = pattern;
    
    // Update active button
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Set phases based on pattern
    switch(pattern) {
        case 'box':
            phases = [
                { name: 'Breathe In', class: 'breathe-in', duration: 4 },
                { name: 'Hold', class: 'hold', duration: 4 },
                { name: 'Breathe Out', class: 'breathe-out', duration: 4 },
                { name: 'Hold', class: 'hold', duration: 4 }
            ];
            document.getElementById('customControls').style.display = 'none';
            break;
        case 'relaxing':
            phases = [
                { name: 'Breathe In', class: 'breathe-in', duration: 4 },
                { name: 'Hold', class: 'hold', duration: 7 },
                { name: 'Breathe Out', class: 'breathe-out', duration: 8 },
                { name: 'Hold', class: 'hold', duration: 0 }
            ];
            document.getElementById('customControls').style.display = 'none';
            break;
        case 'energizing':
            phases = [
                { name: 'Breathe In', class: 'breathe-in', duration: 4 },
                { name: 'Hold', class: 'hold', duration: 4 },
                { name: 'Breathe Out', class: 'breathe-out', duration: 6 },
                { name: 'Hold', class: 'hold', duration: 0 }
            ];
            document.getElementById('customControls').style.display = 'none';
            break;
        case 'custom':
            document.getElementById('customControls').style.display = 'block';
            updateCustom();
            break;
    }
    
    // Reset custom button text if not in custom mode
    if (pattern !== 'custom') {
        const customBtn = document.querySelector('.preset-btn[onclick="setPreset(\'custom\')"]');
        customBtn.textContent = 'Custom';
    }

    // Update counter display
    document.getElementById('counter').textContent = phases[0].duration;
}

// Custom pattern controls
function updateCustom() {
    const breatheIn = parseInt(document.getElementById('breatheInSlider').value);
    const holdIn = parseInt(document.getElementById('holdInSlider').value);
    const breatheOut = parseInt(document.getElementById('breatheOutSlider').value);
    const holdOut = parseInt(document.getElementById('holdOutSlider').value);

    document.getElementById('breatheInValue').textContent = breatheIn;
    document.getElementById('holdInValue').textContent = holdIn;
    document.getElementById('breatheOutValue').textContent = breatheOut;
    document.getElementById('holdOutValue').textContent = holdOut;

    phases = [
        { name: 'Breathe In', class: 'breathe-in', duration: breatheIn },
        { name: 'Hold', class: 'hold', duration: holdIn },
        { name: 'Breathe Out', class: 'breathe-out', duration: breatheOut },
        { name: 'Hold', class: 'hold', duration: holdOut }
    ];

    document.getElementById('counter').textContent = breatheIn;
    
    // Update custom button text to show current pattern
    updateCustomButtonText(breatheIn, holdIn, breatheOut, holdOut);
}

// Update the custom button text to show current pattern
function updateCustomButtonText(breatheIn, holdIn, breatheOut, holdOut) {
    const customBtn = document.querySelector('.preset-btn[onclick="setPreset(\'custom\')"]');
    customBtn.textContent = `Custom (${breatheIn}-${holdIn}-${breatheOut}-${holdOut})`;
}

// Save custom pattern to localStorage
function saveCustomPattern() {
    const breatheIn = parseInt(document.getElementById('breatheInSlider').value);
    const holdIn = parseInt(document.getElementById('holdInSlider').value);
    const breatheOut = parseInt(document.getElementById('breatheOutSlider').value);
    const holdOut = parseInt(document.getElementById('holdOutSlider').value);
    
    const customPattern = {
        breatheIn: breatheIn,
        holdIn: holdIn,
        breatheOut: breatheOut,
        holdOut: holdOut,
        savedAt: new Date().toLocaleString()
    };
    
    localStorage.setItem('breathingCustomPattern', JSON.stringify(customPattern));
    
    // Show saved actions and provide feedback
    const savedActions = document.getElementById('savedActions');
    savedActions.style.display = 'flex';
    savedActions.querySelector('.load-btn').title = `Saved pattern: ${breatheIn}-${holdIn}-${breatheOut}-${holdOut} (${customPattern.savedAt})`;
    
    // Temporary feedback
    const saveBtn = document.querySelector('.save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saved!';
    saveBtn.style.background = '#10b981';
    setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '';
    }, 1500);
}

// Load custom pattern from localStorage
function loadCustomPattern() {
    const savedPattern = localStorage.getItem('breathingCustomPattern');
    
    if (savedPattern) {
        const pattern = JSON.parse(savedPattern);
        
        // Set slider values
        document.getElementById('breatheInSlider').value = pattern.breatheIn;
        document.getElementById('holdInSlider').value = pattern.holdIn;
        document.getElementById('breatheOutSlider').value = pattern.breatheOut;
        document.getElementById('holdOutSlider').value = pattern.holdOut;
        
        // Update the display and pattern
        updateCustom();
        
        // Provide feedback
        const loadBtn = document.querySelector('.load-btn');
        const originalText = loadBtn.textContent;
        loadBtn.textContent = 'Loaded!';
        loadBtn.style.background = '#3b82f6';
        setTimeout(() => {
            loadBtn.textContent = originalText;
            loadBtn.style.background = '';
        }, 1500);
    }
}

// Clear saved pattern
function clearCustomPattern() {
    localStorage.removeItem('breathingCustomPattern');
    document.getElementById('savedActions').style.display = 'none';
    
    // Provide feedback
    const saveBtn = document.querySelector('.save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Pattern Cleared';
    saveBtn.style.background = '#ef4444';
    setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '';
    }, 1500);
}

// Check for saved pattern on page load
function checkForSavedPattern() {
    const savedPattern = localStorage.getItem('breathingCustomPattern');
    if (savedPattern) {
        const pattern = JSON.parse(savedPattern);
        const savedActions = document.getElementById('savedActions');
        savedActions.style.display = 'flex';
        savedActions.querySelector('.load-btn').title = `Saved pattern: ${pattern.breatheIn}-${pattern.holdIn}-${pattern.breatheOut}-${pattern.holdOut} (${pattern.savedAt})`;
    }
}

// Close custom controls
function closeCustomControls() {
    // Hide the custom controls
    document.getElementById('customControls').style.display = 'none';
    
    // Remove active state from custom button and set box preset as active
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.preset-btn[onclick="setPreset(\'box\')"]').classList.add('active');
    
    // Switch back to box breathing pattern
    setPreset('box');
}

// Audio context initialization
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Generate ping sound
function playBell(phaseIndex = 0) {
    if (!pingEnabled) return;
    
    initAudio();
    
    const now = audioContext.currentTime;
    
    // Determine which ping style to use based on the phase
    const currentPingStyle = getPingStyleForPhase(phases[phaseIndex].name);
    const config = pingConfigs[currentPingStyle];
    
    // Create a single oscillator for a calming ping
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(config.frequency, now);
    
    // Soft volume with gentle fade based on ping style
    gainNode.gain.setValueAtTime(config.volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
    
    oscillator.start(now);
    oscillator.stop(now + config.duration);
}

// Update display
function updateDisplay() {
    const phase = phases[currentPhase];
    document.getElementById('instruction').textContent = phase.name;
    document.getElementById('counter').textContent = currentCount;
}

function updatePhase() {
    const phase = phases[currentPhase];
    const box = document.getElementById('breathingBox');
    
    // For hold phases, don't change the class - just maintain current size
    if (phase.class === 'hold') {
        // Remove transition temporarily to prevent any movement
        box.style.transition = 'none';
        // Force a reflow to apply the no-transition immediately
        box.offsetHeight;
        return;
    }
    
    // Set transition duration to match the phase duration for breathe in/out
    box.style.transition = `all ${phase.duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
    
    box.className = 'box ' + phase.class;
}

// Start breathing exercise
function startBreathing() {
    initAudio();
    
    // Reset to beginning
    currentPhase = 0;
    
    // Skip phases with 0 duration at start
    while (phases[currentPhase].duration === 0) {
        currentPhase = (currentPhase + 1) % phases.length;
    }
    
    currentCount = phases[currentPhase].duration;
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    
    updatePhase(); // Set the visual state for the phase
    updateDisplay(); // Update text displays
    playBell(currentPhase); // Initial ping
    
    intervalId = setInterval(() => {
        currentCount--;
        
        if (currentCount === 0) {
            // Move to next phase
            currentPhase = (currentPhase + 1) % phases.length;
            
            // Skip phases with 0 duration
            while (phases[currentPhase].duration === 0) {
                currentPhase = (currentPhase + 1) % phases.length;
            }
            
            currentCount = phases[currentPhase].duration;
            updatePhase(); // Update the circle animation for new phase
            playBell(currentPhase); // Ping at phase transition
        }
        
        updateDisplay(); // Only update counter text
    }, 1000);
}

// Stop breathing exercise
function stopBreathing() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('instruction').textContent = 'Press Start to Begin';
    document.getElementById('counter').textContent = phases[0].duration;
    
    const box = document.getElementById('breathingBox');
    box.style.transition = 'all 1s cubic-bezier(0.4, 0, 0.2, 1)';
    box.className = 'box';
}

// Handle page visibility to pause when tab is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && intervalId) {
        stopBreathing();
    }
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    checkForSavedPattern();
});
