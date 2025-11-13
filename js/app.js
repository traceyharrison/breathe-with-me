// State variables
let intervalId = null;
let currentPhase = 0;
let currentCount = 4;
let audioContext = null;
let currentPattern = 'box';
let pingEnabled = true;
let pingStyle = 'medium';

// Music variables
let backgroundMusic = null;
let musicEnabled = false;
let currentMusicTrack = 'unexplored-moon';
let musicVolume = 0.3;

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

// Audio initialization on user interaction (required for mobile)
let audioInitialized = false;

async function handleUserInteraction() {
    if (!audioInitialized) {
        const success = await initAudio();
        if (success) {
            audioInitialized = true;
            updateAudioStatus('Ready');
            console.log('Audio initialized on user interaction');
        } else {
            updateAudioStatus('Not supported');
        }
    }
    
    // Start background music if enabled (requires user interaction)
    if (musicEnabled && !backgroundMusic) {
        startBackgroundMusic();
    }
}

function updateAudioStatus(status) {
    const statusElement = document.getElementById('audioStatusText');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

// Add event listeners for user interaction to initialize audio
document.addEventListener('touchstart', handleUserInteraction, { once: true });
document.addEventListener('click', handleUserInteraction, { once: true });

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

// Ping customization functions
function updatePingFrequency(pingType, sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const valueSpan = document.getElementById(valueId);
    const frequency = parseInt(slider.value);
    
    valueSpan.textContent = frequency;
    pingConfigs[pingType].frequency = frequency;
    savePingSettings();
}

function updatePingVolume(pingType, sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const valueSpan = document.getElementById(valueId);
    const volume = parseInt(slider.value) / 100; // Convert percentage to decimal
    
    valueSpan.textContent = parseInt(slider.value);
    pingConfigs[pingType].volume = volume;
    savePingSettings();
    
    // iOS-specific: Add haptic feedback if available
    if (navigator.vibrate && isIOSDevice()) {
        navigator.vibrate(5);
    }
}

function testPing(pingType) {
    if (!audioContext) {
        initAudioContext();
        return;
    }
    
    const config = pingConfigs[pingType];
    if (!config) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(config.volume, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + config.duration);
    } catch (error) {
        console.warn('Failed to play test ping:', error);
    }
}

function setPingPreset(presetName) {
    let presets = {};
    
    switch(presetName) {
        case 'musical':
            presets = {
                'low': { frequency: 110, volume: 0.15, duration: 1.5 },     // A2
                'medium': { frequency: 220, volume: 0.12, duration: 1.2 },  // A3
                'high': { frequency: 440, volume: 0.08, duration: 1.0 }     // A4
            };
            break;
        case 'gentle':
            presets = {
                'low': { frequency: 87, volume: 0.18, duration: 1.8 },      // F2 - Soft and calming
                'medium': { frequency: 174, volume: 0.15, duration: 1.5 },  // F3 - Warm mid tone
                'high': { frequency: 349, volume: 0.10, duration: 1.2 }     // F4 - Gentle higher tone
            };
            break;
        case 'bright':
            presets = {
                'low': { frequency: 131, volume: 0.12, duration: 1.2 },     // C3 - Clear and crisp
                'medium': { frequency: 262, volume: 0.10, duration: 1.0 },  // C4 - Bright mid tone
                'high': { frequency: 523, volume: 0.06, duration: 0.8 }     // C5 - Crystal clear high
            };
            break;
        case 'custom':
        default:
            // Reset to saved custom settings or defaults
            loadPingSettings();
            return;
    }
    
    // Apply preset
    Object.keys(presets).forEach(type => {
        pingConfigs[type] = { ...presets[type] };
    });
    
    // Update UI sliders to match preset
    updatePingUI();
    savePingSettings();
}

function updatePingUI() {
    // Update Breathe In controls
    const breatheInFreq = document.getElementById('breatheInFreq');
    const breatheInFreqValue = document.getElementById('breatheInFreqValue');
    const breatheInVol = document.getElementById('breatheInVol');
    const breatheInVolValue = document.getElementById('breatheInVolValue');
    
    if (breatheInFreq) {
        breatheInFreq.value = pingConfigs.low.frequency;
        breatheInFreqValue.textContent = pingConfigs.low.frequency;
        breatheInVol.value = Math.round(pingConfigs.low.volume * 100);
        breatheInVolValue.textContent = Math.round(pingConfigs.low.volume * 100);
    }
    
    // Update Hold controls
    const holdFreq = document.getElementById('holdFreq');
    const holdFreqValue = document.getElementById('holdFreqValue');
    const holdVol = document.getElementById('holdVol');
    const holdVolValue = document.getElementById('holdVolValue');
    
    if (holdFreq) {
        holdFreq.value = pingConfigs.medium.frequency;
        holdFreqValue.textContent = pingConfigs.medium.frequency;
        holdVol.value = Math.round(pingConfigs.medium.volume * 100);
        holdVolValue.textContent = Math.round(pingConfigs.medium.volume * 100);
    }
    
    // Update Breathe Out controls
    const breatheOutFreq = document.getElementById('breatheOutFreq');
    const breatheOutFreqValue = document.getElementById('breatheOutFreqValue');
    const breatheOutVol = document.getElementById('breatheOutVol');
    const breatheOutVolValue = document.getElementById('breatheOutVolValue');
    
    if (breatheOutFreq) {
        breatheOutFreq.value = pingConfigs.high.frequency;
        breatheOutFreqValue.textContent = pingConfigs.high.frequency;
        breatheOutVol.value = Math.round(pingConfigs.high.volume * 100);
        breatheOutVolValue.textContent = Math.round(pingConfigs.high.volume * 100);
    }
}

function savePingSettings() {
    localStorage.setItem('pingConfigs', JSON.stringify(pingConfigs));
}

function loadPingSettings() {
    const saved = localStorage.getItem('pingConfigs');
    if (saved) {
        try {
            const savedConfigs = JSON.parse(saved);
            Object.keys(savedConfigs).forEach(type => {
                if (pingConfigs[type]) {
                    pingConfigs[type] = { ...savedConfigs[type] };
                }
            });
            updatePingUI();
        } catch (error) {
            console.warn('Failed to load ping settings:', error);
        }
    }
}

// Comprehensive Settings Management
function saveAllSettings() {
    try {
        const allSettings = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            settings: {
                // Audio Settings
                pingEnabled: pingEnabled,
                pingConfigs: pingConfigs,
                
                // Theme Settings
                theme: document.documentElement.getAttribute('data-theme') || 'night-sky',
                
                // Music Settings
                musicEnabled: musicEnabled,
                currentMusicTrack: currentMusicTrack,
                musicVolume: musicVolume,
                
                // Breathing Patterns (get current active pattern and all saved patterns)
                currentPattern: {
                    breatheIn: parseInt(document.getElementById('breatheInSlider')?.value || 4),
                    holdIn: parseInt(document.getElementById('holdInSlider')?.value || 4),
                    breatheOut: parseInt(document.getElementById('breatheOutSlider')?.value || 4),
                    holdOut: parseInt(document.getElementById('holdOutSlider')?.value || 4)
                },
                savedPatterns: JSON.parse(localStorage.getItem('breathingSavedPatterns') || '[]')
            }
        };
        
        // Save to localStorage
        localStorage.setItem('breathingAppAllSettings', JSON.stringify(allSettings));
        
        // Show success message
        showSettingsStatus('All settings saved successfully!', 'success');
        console.log('All settings saved:', allSettings);
        
    } catch (error) {
        console.error('Failed to save settings:', error);
        showSettingsStatus('Error saving settings', 'error');
    }
}

function exportSettings() {
    try {
        saveAllSettings(); // Ensure current settings are saved first
        
        const allSettings = JSON.parse(localStorage.getItem('breathingAppAllSettings') || '{}');
        
        // Create downloadable file
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allSettings, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `breathing_exercise_settings_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        showSettingsStatus('Settings exported successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to export settings:', error);
        showSettingsStatus('Error exporting settings', 'error');
    }
}

function importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedSettings = JSON.parse(e.target.result);
            
            if (!importedSettings.settings) {
                throw new Error('Invalid settings file format');
            }
            
            // Apply imported settings
            applyImportedSettings(importedSettings.settings);
            
            showSettingsStatus('Settings imported successfully!', 'success');
            console.log('Settings imported:', importedSettings);
            
        } catch (error) {
            console.error('Failed to import settings:', error);
            showSettingsStatus('Error importing settings - invalid file', 'error');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

function applyImportedSettings(settings) {
    try {
        // Apply ping settings
        if (settings.pingEnabled !== undefined) {
            pingEnabled = settings.pingEnabled;
            document.getElementById('pingToggle').checked = pingEnabled;
        }
        
        if (settings.pingConfigs) {
            Object.keys(settings.pingConfigs).forEach(type => {
                if (pingConfigs[type]) {
                    pingConfigs[type] = { ...settings.pingConfigs[type] };
                }
            });
            updatePingUI();
            savePingSettings();
        }
        
        // Apply theme
        if (settings.theme) {
            setTheme(settings.theme);
        }
        
        // Apply music settings
        if (settings.musicEnabled !== undefined) {
            musicEnabled = settings.musicEnabled;
            document.getElementById('musicToggle').checked = musicEnabled;
        }
        
        if (settings.currentMusicTrack) {
            currentMusicTrack = settings.currentMusicTrack;
            document.getElementById('musicSelect').value = currentMusicTrack;
        }
        
        if (settings.musicVolume !== undefined) {
            musicVolume = settings.musicVolume;
            document.getElementById('musicVolume').value = musicVolume;
            document.getElementById('volumeValue').textContent = musicVolume + '%';
            if (backgroundMusic) {
                backgroundMusic.volume = musicVolume / 100;
            }
        }
        
        // Apply breathing pattern
        if (settings.currentPattern) {
            const pattern = settings.currentPattern;
            document.getElementById('breatheInSlider').value = pattern.breatheIn;
            document.getElementById('holdInSlider').value = pattern.holdIn;
            document.getElementById('breatheOutSlider').value = pattern.breatheOut;
            document.getElementById('holdOutSlider').value = pattern.holdOut;
            updateCustom();
        }
        
        // Apply saved patterns
        if (settings.savedPatterns && Array.isArray(settings.savedPatterns)) {
            localStorage.setItem('breathingSavedPatterns', JSON.stringify(settings.savedPatterns));
            checkForSavedPattern(); // Refresh the saved patterns display
        }
        
        // Save all music preferences
        saveMusicPreferences();
        
    } catch (error) {
        console.error('Error applying imported settings:', error);
        throw error;
    }
}

function resetAllSettings() {
    if (!confirm('Are you sure you want to reset ALL settings to default? This cannot be undone.')) {
        return;
    }
    
    try {
        // Clear all localStorage
        const keysToRemove = [
            'breathingAppAllSettings',
            'pingConfigs',
            'breathingAppTheme',
            'breathingAppMusicEnabled',
            'breathingAppMusicTrack',
            'breathingAppMusicVolume',
            'breathingSavedPatterns'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Reset to defaults
        pingEnabled = true;
        
        // Reset ping configs to defaults
        pingConfigs.low = { frequency: 110, volume: 0.15, duration: 1.5 };
        pingConfigs.medium = { frequency: 220, volume: 0.12, duration: 1.2 };
        pingConfigs.high = { frequency: 440, volume: 0.08, duration: 1.0 };
        
        // Reset theme
        setTheme('night-sky');
        
        // Reset music
        musicEnabled = false;
        currentMusicTrack = 'unexplored-moon';
        musicVolume = 30;
        
        // Reset UI elements
        document.getElementById('pingToggle').checked = true;
        document.getElementById('musicToggle').checked = false;
        document.getElementById('musicSelect').value = 'unexplored-moon';
        document.getElementById('musicVolume').value = 30;
        document.getElementById('volumeValue').textContent = '30%';
        
        // Reset breathing pattern to Box (4-4-4-4)
        document.getElementById('breatheInSlider').value = 4;
        document.getElementById('holdInSlider').value = 4;
        document.getElementById('breatheOutSlider').value = 4;
        document.getElementById('holdOutSlider').value = 4;
        updateCustom();
        setPreset('box');
        
        // Update UI
        updatePingUI();
        checkForSavedPattern();
        
        showSettingsStatus('All settings reset to defaults', 'success');
        console.log('All settings reset to defaults');
        
    } catch (error) {
        console.error('Failed to reset settings:', error);
        showSettingsStatus('Error resetting settings', 'error');
    }
}

function showSettingsStatus(message, type = 'info') {
    const statusElement = document.getElementById('settingsStatus');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = 'settings-status';
    
    if (type === 'success') {
        statusElement.style.background = 'rgba(34, 197, 94, 0.1)';
        statusElement.style.borderColor = 'rgba(34, 197, 94, 0.2)';
        statusElement.style.color = '#22c55e';
    } else if (type === 'error') {
        statusElement.style.background = 'rgba(239, 68, 68, 0.1)';
        statusElement.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        statusElement.style.color = '#ef4444';
    } else {
        statusElement.style.background = 'rgba(59, 130, 246, 0.1)';
        statusElement.style.borderColor = 'rgba(59, 130, 246, 0.2)';
        statusElement.style.color = '#3b82f6';
    }
    
    // Reset to default after 3 seconds
    setTimeout(() => {
        statusElement.textContent = 'Settings auto-save enabled';
        statusElement.style.background = 'rgba(34, 197, 94, 0.1)';
        statusElement.style.borderColor = 'rgba(34, 197, 94, 0.2)';
        statusElement.style.color = '#22c55e';
    }, 3000);
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
    stopBreathing(); // Stop the breathing exercise when timer completes
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
            displaySavedPatterns(); // Show saved patterns when opening custom controls
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

// Theme management
function setTheme(themeName) {
    // Remove active class from all theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected theme button
    const selectedBtn = document.querySelector(`.theme-btn[data-theme="${themeName}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Set default music for new theme
    setDefaultMusicForTheme(themeName);
    
    // Restart music with new track if music is enabled
    if (musicEnabled) {
        startBackgroundMusic();
    }
    
    // Save theme preference
    localStorage.setItem('breathingAppTheme', themeName);
    
    // Auto-save all settings
    autoSaveSettings();
}

// Load saved theme on startup
function loadTheme() {
    const savedTheme = localStorage.getItem('breathingAppTheme') || 'night-sky';
    setTheme(savedTheme);
    
    // Set default music based on theme
    setDefaultMusicForTheme(savedTheme);
}

// Set default music track based on theme
function setDefaultMusicForTheme(themeName) {
    const themeDefaults = {
        'night-sky': 'unexplored-moon',
        'sunset': 'dark-ambient', 
        'lofi': 'way-home'
    };
    
    const defaultTrack = themeDefaults[themeName] || 'unexplored-moon';
    document.getElementById('musicSelect').value = defaultTrack;
    currentMusicTrack = defaultTrack;
}

// Music control functions
function toggleMusic() {
    musicEnabled = document.getElementById('musicToggle').checked;
    
    // Update quick music button
    updateQuickMusicButton();
    
    if (musicEnabled) {
        startBackgroundMusic();
    } else {
        stopBackgroundMusic();
    }
    
    // Save preference
    localStorage.setItem('breathingAppMusicEnabled', musicEnabled);
}

function changeMusic() {
    const selectedTrack = document.getElementById('musicSelect').value;
    currentMusicTrack = selectedTrack;
    
    if (musicEnabled && backgroundMusic) {
        stopBackgroundMusic();
        startBackgroundMusic();
    }
    
    // Save preference
    localStorage.setItem('breathingAppMusicTrack', currentMusicTrack);
}

function adjustVolume() {
    const volumeSlider = document.getElementById('musicVolume');
    const volume = volumeSlider.value;
    musicVolume = volume / 100;
    document.getElementById('volumeValue').textContent = volume + '%';
    
    // iPhone-specific volume control fixes
    if (backgroundMusic) {
        try {
            // Primary volume setting
            backgroundMusic.volume = musicVolume;
            
            // iOS Safari backup - force volume update
            if (isIOSDevice()) {
                // Create a small delay to ensure volume is applied
                setTimeout(() => {
                    if (backgroundMusic && !backgroundMusic.paused) {
                        backgroundMusic.volume = musicVolume;
                        
                        // Force a tiny pause/play to trigger volume update on iOS
                        const currentTime = backgroundMusic.currentTime;
                        backgroundMusic.pause();
                        backgroundMusic.currentTime = currentTime;
                        backgroundMusic.play().catch(e => console.warn('iOS volume adjust play failed:', e));
                    }
                }, 10);
            }
        } catch (error) {
            console.warn('Failed to adjust volume:', error);
        }
    }
    
    // Save preference
    localStorage.setItem('breathingAppMusicVolume', volume);
}

// Detect iOS devices
function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Enhanced volume adjustment for iOS compatibility
function adjustVolumeWithTouch() {
    adjustVolume();
    
    // iOS-specific: Add a small vibration feedback if supported
    if (navigator.vibrate && isIOSDevice()) {
        navigator.vibrate(10);
    }
}

// iPhone volume diagnostics
function checkVolumeSupport() {
    const isIOS = isIOSDevice();
    const hasAudio = !!backgroundMusic;
    const audioContextState = audioContext ? audioContext.state : 'no context';
    
    console.log('iPhone Volume Diagnostic:', {
        isIOSDevice: isIOS,
        hasBackgroundMusic: hasAudio,
        audioContextState: audioContextState,
        currentVolume: musicVolume,
        sliderValue: document.getElementById('musicVolume')?.value || 'not found',
        audioVolume: backgroundMusic ? backgroundMusic.volume : 'no audio'
    });
    
    // Show user-friendly diagnostic
    if (isIOS && hasAudio) {
        const actualVolume = backgroundMusic.volume;
        const expectedVolume = musicVolume;
        
        if (Math.abs(actualVolume - expectedVolume) > 0.1) {
            showSettingsStatus('iPhone volume control may be restricted by iOS. Try using device volume buttons.', 'info');
        }
    }
    
    return {
        isIOS,
        hasAudio,
        volumeWorking: hasAudio ? Math.abs(backgroundMusic.volume - musicVolume) < 0.1 : false
    };
}

function startBackgroundMusic() {
    if (!musicEnabled) return;
    
    stopBackgroundMusic(); // Stop any existing music
    
    const musicFiles = {
        'unexplored-moon': 'files/Unexplored Moon by @MiguelJohnson.mp3',
        'dark-ambient': 'files/Dark Ambient Music (No Copyright).mp3',
        'way-home': 'files/Way Home by @tokyowalker4038.mp3'
    };
    
    const musicFile = musicFiles[currentMusicTrack];
    if (!musicFile) return;
    
    backgroundMusic = new Audio(musicFile);
    backgroundMusic.loop = true;
    
    // iOS-specific audio setup
    if (isIOSDevice()) {
        // Set volume multiple times for iOS
        backgroundMusic.volume = musicVolume;
        
        // Add event listeners for iOS audio events
        backgroundMusic.addEventListener('loadeddata', () => {
            backgroundMusic.volume = musicVolume;
        });
        
        backgroundMusic.addEventListener('canplay', () => {
            backgroundMusic.volume = musicVolume;
        });
        
        // iOS requires user interaction for volume changes
        backgroundMusic.addEventListener('play', () => {
            setTimeout(() => {
                backgroundMusic.volume = musicVolume;
            }, 100);
        });
    } else {
        backgroundMusic.volume = musicVolume;
    }
    
    backgroundMusic.play().then(() => {
        // Successfully started playing
        if (isIOSDevice()) {
            // Force volume setting after play starts on iOS
            setTimeout(() => {
                backgroundMusic.volume = musicVolume;
                checkVolumeSupport(); // Run diagnostic
            }, 200);
        }
    }).catch(error => {
        console.warn('Could not play background music:', error);
        if (isIOSDevice()) {
            showSettingsStatus('Tap anywhere to enable music on iPhone', 'info');
        }
    });
}

function stopBackgroundMusic() {
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        backgroundMusic = null;
    }
}

// Load music preferences
function loadMusicPreferences() {
    // Load music enabled state
    const savedMusicEnabled = localStorage.getItem('breathingAppMusicEnabled');
    if (savedMusicEnabled !== null) {
        musicEnabled = savedMusicEnabled === 'true';
        document.getElementById('musicToggle').checked = musicEnabled;
    }
    
    // Load music track
    const savedTrack = localStorage.getItem('breathingAppMusicTrack');
    if (savedTrack) {
        currentMusicTrack = savedTrack;
        document.getElementById('musicSelect').value = currentMusicTrack;
    }
    
    // Load volume
    const savedVolume = localStorage.getItem('breathingAppMusicVolume');
    if (savedVolume) {
        document.getElementById('musicVolume').value = savedVolume;
        musicVolume = savedVolume / 100;
        document.getElementById('volumeValue').textContent = savedVolume + '%';
    }
    
    // Update quick music button
    updateQuickMusicButton();
}

// Save custom pattern with name to localStorage
function saveCustomPattern() {
    const breatheIn = parseInt(document.getElementById('breatheInSlider').value);
    const holdIn = parseInt(document.getElementById('holdInSlider').value);
    const breatheOut = parseInt(document.getElementById('breatheOutSlider').value);
    const holdOut = parseInt(document.getElementById('holdOutSlider').value);
    const patternName = document.getElementById('patternName').value.trim();
    
    // Validate pattern name
    if (!patternName) {
        alert('Please enter a name for your pattern');
        document.getElementById('patternName').focus();
        return;
    }
    
    // Get existing patterns
    const savedPatterns = getSavedPatterns();
    
    // Check if name already exists
    if (savedPatterns.some(pattern => pattern.name.toLowerCase() === patternName.toLowerCase())) {
        if (!confirm(`A pattern named "${patternName}" already exists. Do you want to overwrite it?`)) {
            return;
        }
        // Remove existing pattern with same name
        deleteSavedPattern(patternName);
    }
    
    const newPattern = {
        id: Date.now().toString(),
        name: patternName,
        breatheIn: breatheIn,
        holdIn: holdIn,
        breatheOut: breatheOut,
        holdOut: holdOut,
        savedAt: new Date().toLocaleString()
    };
    
    // Add to saved patterns
    savedPatterns.push(newPattern);
    localStorage.setItem('breathingSavedPatterns', JSON.stringify(savedPatterns));
    
    // Clear the name input
    document.getElementById('patternName').value = '';
    
    // Refresh the saved patterns display
    displaySavedPatterns();
    
    // Provide feedback
    const saveBtn = document.querySelector('.save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saved!';
    saveBtn.style.background = '#10b981';
    setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '';
    }, 1500);
}

// Get all saved patterns from localStorage
function getSavedPatterns() {
    const patterns = localStorage.getItem('breathingSavedPatterns');
    return patterns ? JSON.parse(patterns) : [];
}

// Load a specific saved pattern
function loadSavedPattern(patternId) {
    const savedPatterns = getSavedPatterns();
    const pattern = savedPatterns.find(p => p.id === patternId);
    
    if (pattern) {
        // Set slider values
        document.getElementById('breatheInSlider').value = pattern.breatheIn;
        document.getElementById('holdInSlider').value = pattern.holdIn;
        document.getElementById('breatheOutSlider').value = pattern.breatheOut;
        document.getElementById('holdOutSlider').value = pattern.holdOut;
        
        // Update the display and pattern
        updateCustom();
        
        // Set the pattern name in the input for easy editing
        document.getElementById('patternName').value = pattern.name;
        
        // Provide visual feedback that pattern is loaded
        const loadButtons = document.querySelectorAll('.load-pattern-btn');
        loadButtons.forEach(btn => {
            if (btn.onclick.toString().includes(patternId)) {
                const originalText = btn.textContent;
                btn.textContent = 'Loaded!';
                btn.style.background = '#10b981';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
            }
        });
    }
}

// Delete a saved pattern
function deleteSavedPattern(patternId) {
    let savedPatterns = getSavedPatterns();
    
    // Handle deletion by name (for overwrites) or by ID
    if (typeof patternId === 'string' && !savedPatterns.find(p => p.id === patternId)) {
        // Delete by name
        savedPatterns = savedPatterns.filter(p => p.name.toLowerCase() !== patternId.toLowerCase());
    } else {
        // Delete by ID
        savedPatterns = savedPatterns.filter(p => p.id !== patternId);
    }
    
    localStorage.setItem('breathingSavedPatterns', JSON.stringify(savedPatterns));
    displaySavedPatterns();
}

// Display saved patterns in the UI
function displaySavedPatterns() {
    const savedPatterns = getSavedPatterns();
    const container = document.getElementById('savedPatternsList');
    
    if (savedPatterns.length === 0) {
        container.innerHTML = '<div class="no-saved-patterns">No saved patterns yet</div>';
        return;
    }
    
    container.innerHTML = savedPatterns.map(pattern => `
        <div class="saved-pattern-item">
            <div class="saved-pattern-name">${pattern.name}</div>
            <div class="saved-pattern-details">${pattern.breatheIn}-${pattern.holdIn}-${pattern.breatheOut}-${pattern.holdOut}</div>
            <div class="saved-pattern-actions">
                <button class="load-pattern-btn" onclick="loadSavedPattern('${pattern.id}')" title="Load this pattern">Load</button>
                <button class="delete-pattern-btn" onclick="confirmDeletePattern('${pattern.id}', '${pattern.name}')" title="Delete this pattern">×</button>
            </div>
        </div>
    `).join('');
}

// Confirm pattern deletion
function confirmDeletePattern(patternId, patternName) {
    if (confirm(`Are you sure you want to delete the pattern "${patternName}"?`)) {
        deleteSavedPattern(patternId);
    }
}

// Check for saved patterns on page load and initialize display
function checkForSavedPattern() {
    // Display any existing saved patterns
    displaySavedPatterns();
    
    // Migrate old single custom pattern to new system if it exists
    const oldPattern = localStorage.getItem('breathingCustomPattern');
    if (oldPattern) {
        try {
            const pattern = JSON.parse(oldPattern);
            const savedPatterns = getSavedPatterns();
            
            // Only migrate if no patterns exist yet
            if (savedPatterns.length === 0) {
                const migratedPattern = {
                    id: Date.now().toString(),
                    name: 'Migrated Pattern',
                    breatheIn: pattern.breatheIn,
                    holdIn: pattern.holdIn,
                    breatheOut: pattern.breatheOut,
                    holdOut: pattern.holdOut,
                    savedAt: pattern.savedAt || new Date().toLocaleString()
                };
                
                savedPatterns.push(migratedPattern);
                localStorage.setItem('breathingSavedPatterns', JSON.stringify(savedPatterns));
                displaySavedPatterns();
            }
            
            // Clean up old storage
            localStorage.removeItem('breathingCustomPattern');
        } catch (e) {
            console.warn('Failed to migrate old custom pattern:', e);
        }
    }
}

// Close custom controls
function closeCustomControls() {
    // Hide the custom controls dialog
    document.getElementById('customControls').style.display = 'none';
    
    // Keep the custom pattern active - don't switch back to box breathing
    // The custom button should remain highlighted to show custom pattern is active
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.preset-btn[onclick="setPreset(\'custom\')"]').classList.add('active');
    
    // Make sure the custom pattern is applied (in case user made changes)
    if (currentPattern === 'custom') {
        updateCustom();
    }
}

// Audio context initialization with mobile support
function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('AudioContext not supported:', error);
            return false;
        }
    }
    
    // Resume audio context if it's suspended (required for mobile browsers)
    if (audioContext.state === 'suspended') {
        return audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
            return true;
        }).catch(error => {
            console.warn('Failed to resume AudioContext:', error);
            return false;
        });
    }
    
    return Promise.resolve(true);
}

// Generate ping sound
async function playBell(phaseIndex = 0) {
    if (!pingEnabled) return;
    
    const audioReady = await initAudio();
    if (!audioReady || !audioContext) {
        console.warn('AudioContext not ready, skipping bell sound');
        return;
    }
    
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
async function startBreathing() {
    // Ensure audio is initialized with user interaction
    await handleUserInteraction();
    
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
    await playBell(currentPhase); // Initial ping
    
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

// Quick music toggle function
function quickToggleMusic() {
    // Toggle music state
    musicEnabled = !musicEnabled;
    
    // Update both music toggles (settings and quick toggle)
    document.getElementById('musicToggle').checked = musicEnabled;
    document.getElementById('quickMusicToggle').classList.toggle('active', musicEnabled);
    
    // Update button text and icon
    updateQuickMusicButton();
    
    // Start or stop music
    if (musicEnabled) {
        startBackgroundMusic();
    } else {
        stopBackgroundMusic();
    }
    
    // Save preference
    saveMusicPreferences();
    autoSaveSettings();
}

function updateQuickMusicButton() {
    const quickButton = document.getElementById('quickMusicToggle');
    const musicIcon = quickButton.querySelector('.music-icon');
    const musicOffIcon = quickButton.querySelector('.music-off-icon');
    const statusText = document.getElementById('musicStatusText');
    
    if (musicEnabled) {
        quickButton.classList.add('active');
        musicIcon.style.display = 'block';
        musicOffIcon.style.display = 'none';
        statusText.textContent = 'Music On';
    } else {
        quickButton.classList.remove('active');
        musicIcon.style.display = 'none';
        musicOffIcon.style.display = 'block';
        statusText.textContent = 'Music Off';
    }
}

// Auto-save all settings whenever something changes
function autoSaveSettings() {
    setTimeout(() => {
        saveAllSettings();
    }, 500); // Debounce auto-save by 500ms
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    checkForSavedPattern();
    updateAudioStatus('Tap to enable');
    loadTheme();
    loadMusicPreferences();
    loadPingSettings();
    
    // Load all settings if they exist
    const savedAllSettings = localStorage.getItem('breathingAppAllSettings');
    if (savedAllSettings) {
        try {
            const settings = JSON.parse(savedAllSettings);
            if (settings.settings) {
                console.log('Loading comprehensive settings...');
                // Settings are already loaded individually above, this just verifies completeness
            }
        } catch (error) {
            console.warn('Failed to load comprehensive settings:', error);
        }
    }
    
    // Set up auto-save listeners (excluding rapid UI updates like slider drags)
    document.addEventListener('change', (e) => {
        if (e.target.matches('#pingToggle, #musicToggle, #musicSelect')) {
            autoSaveSettings();
        }
    });
});

// Fidget Games functionality
function openFidgetGames() {
    // Navigate to fidget games in the same window for seamless transition
    window.location.href = 'fidget-games.html';
}
