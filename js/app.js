// State variables
let intervalId = null;
let currentPhase = 0;
let currentCount = 4;
let audioContext = null;
let currentPattern = 'box';
let pingEnabled = true;
let pingStyle = 'medium';

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

// Settings menu toggle
function toggleSettingsMenu() {
    const menu = document.getElementById('settingsMenu');
    menu.classList.toggle('active');
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('settingsMenu');
    const icon = document.querySelector('.settings-icon');
    if (menu.classList.contains('active') && 
        !menu.contains(e.target) && 
        !icon.contains(e.target)) {
        menu.classList.remove('active');
    }
});

// Audio settings
function togglePing() {
    pingEnabled = document.getElementById('pingToggle').checked;
}

function changePingStyle() {
    pingStyle = document.getElementById('pingStyle').value;
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
}

// Audio context initialization
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Generate ping sound
function playBell() {
    if (!pingEnabled) return;
    
    initAudio();
    
    const now = audioContext.currentTime;
    const config = pingConfigs[pingStyle];
    
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
    playBell(); // Initial ping
    
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
            playBell(); // Ping at phase transition
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
