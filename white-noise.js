class WhiteNoisePlayer {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.currentSound = null;
        this.gainNode = null;
        this.audioElements = {};
        this.sounds = {
            rain: { name: "Rain", icon: "fa-cloud-rain", file: "sounds/rain.mp3" },
            waves: { name: "Ocean Waves", icon: "fa-water", file: "sounds/waves.mp3" },
            forest: { name: "Forest", icon: "fa-tree", file: "sounds/forest.mp3" },
            fan: { name: "White Noise", icon: "fa-wind", file: "sounds/fan.mp3" },
            fireplace: { name: "Fireplace", icon: "fa-fire", file: "sounds/fireplace.mp3" }
        };
    }
    
    init() {
        this.createPlayerUI();
        this.preloadSounds();
    }
    
    createPlayerUI() {
        const playerHTML = `
            <div class="card white-noise-player">
                <div class="card-header">
                    <h2 class="card-title"><i class="fas fa-volume-up"></i> Sleep Sounds</h2>
                </div>
                <div class="sounds-grid">
                    ${Object.entries(this.sounds).map(([key, sound]) => `
                        <div class="sound-option" data-sound="${key}">
                            <div class="sound-icon">
                                <i class="fas ${sound.icon}"></i>
                            </div>
                            <div class="sound-name">${sound.name}</div>
                            <div class="sound-controls">
                                <button class="btn-play" onclick="whiteNoisePlayer.playSound('${key}')">
                                    <i class="fas fa-play"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="player-controls hidden" id="playerControls">
                    <div class="now-playing">
                        <span id="nowPlayingText">Now Playing: Rain</span>
                    </div>
                    <div class="volume-control">
                        <label>Volume:</label>
                        <input type="range" id="volumeSlider" min="0" max="100" value="50">
                    </div>
                    <div class="timer-control">
                        <label>Sleep Timer:</label>
                        <select id="sleepTimer">
                            <option value="0">Off</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="45">45 minutes</option>
                            <option value="60">60 minutes</option>
                            <option value="90">90 minutes</option>
                        </select>
                    </div>
                    <button class="btn btn-secondary" onclick="whiteNoisePlayer.stopAll()">
                        <i class="fas fa-stop"></i> Stop All
                    </button>
                </div>
            </div>
        `;
        
        // Add to dashboard
        const dashboardGrid = document.querySelector('.dashboard-grid');
        if (dashboardGrid) {
            dashboardGrid.insertAdjacentHTML('beforeend', playerHTML);
        }
    }
    
    preloadSounds() {
        // For demo purposes, we'll use online sounds or create oscillator sounds
        // In a real app, you'd load actual audio files
        Object.keys(this.sounds).forEach(sound => {
            this.audioElements[sound] = new Audio();
            // Use placeholder online sounds or create synthetic ones
            this.setupSyntheticSound(sound);
        });
    }
    
    setupSyntheticSound(soundType) {
        // Create synthetic sounds using Web Audio API
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
        } catch (error) {
            console.log("Web Audio API not supported, using HTML5 audio fallback");
        }
    }
    
    playSound(soundType) {
        this.stopAll();
        
        if (this.audioContext && this.gainNode) {
            this.playSyntheticSound(soundType);
        } else {
            this.playHTML5Sound(soundType);
        }
        
        this.isPlaying = true;
        this.currentSound = soundType;
        this.showPlayerControls();
        this.updateNowPlaying(soundType);
    }
    
    playSyntheticSound(soundType) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        switch(soundType) {
            case 'rain':
                oscillator.type = 'brownnoise';
                break;
            case 'waves':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
                break;
            case 'fan':
                oscillator.type = 'whitenoise';
                break;
            default:
                oscillator.type = 'pinknoise';
        }
        
        gainNode.gain.value = 0.1;
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start();
        
        this.currentOscillator = oscillator;
        this.currentGainNode = gainNode;
    }
    
    playHTML5Sound(soundType) {
        // Fallback to HTML5 audio with placeholder sounds
        const audio = new Audio();
        
        // Use free online white noise sounds or local files
        const soundUrls = {
            rain: 'https://www.soundjay.com/nature/rain-01.mp3',
            waves: 'https://www.soundjay.com/nature/ocean-wave-1.mp3',
            forest: 'https://www.soundjay.com/nature/forest-ambience-1.mp3',
            fan: 'https://www.soundjay.com/mechanical/fan-noise-1.mp3',
            fireplace: 'https://www.soundjay.com/mechanical/fireplace-1.mp3'
        };
        
        audio.src = soundUrls[soundType];
        audio.loop = true;
        audio.volume = 0.3;
        audio.play();
        
        this.currentAudio = audio;
    }
    
    stopAll() {
        if (this.currentOscillator) {
            this.currentOscillator.stop();
            this.currentOscillator = null;
        }
        
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        this.isPlaying = false;
        this.currentSound = null;
        this.hidePlayerControls();
    }
    
    showPlayerControls() {
        const controls = document.getElementById('playerControls');
        if (controls) {
            controls.classList.remove('hidden');
        }
    }
    
    hidePlayerControls() {
        const controls = document.getElementById('playerControls');
        if (controls) {
            controls.classList.add('hidden');
        }
    }
    
    updateNowPlaying(soundType) {
        const nowPlaying = document.getElementById('nowPlayingText');
        if (nowPlaying) {
            nowPlaying.textContent = `Now Playing: ${this.sounds[soundType].name}`;
        }
    }
    
    setVolume(volume) {
        const volumeLevel = volume / 100;
        
        if (this.gainNode) {
            this.gainNode.gain.value = volumeLevel;
        }
        
        if (this.currentAudio) {
            this.currentAudio.volume = volumeLevel;
        }
    }
    
    setSleepTimer(minutes) {
        if (minutes > 0) {
            setTimeout(() => {
                this.stopAll();
                addNotification("Sleep Timer", "Sleep sounds have been turned off.", "info");
            }, minutes * 60 * 1000);
        }
    }
}

// Initialize white noise player
const whiteNoisePlayer = new WhiteNoisePlayer();

// Add event listeners for volume and timer
document.addEventListener('DOMContentLoaded', () => {
    whiteNoisePlayer.init();
    
    // Volume control
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            whiteNoisePlayer.setVolume(e.target.value);
        });
    }
    
    // Sleep timer
    const sleepTimer = document.getElementById('sleepTimer');
    if (sleepTimer) {
        sleepTimer.addEventListener('change', (e) => {
            whiteNoisePlayer.setSleepTimer(parseInt(e.target.value));
        });
    }
});