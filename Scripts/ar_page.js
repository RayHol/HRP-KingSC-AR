// Media Player Functionality - Define first
let showMediaPlayer, hideMediaPlayer;

// Define functions immediately so they're available for AR controller
showMediaPlayer = function(audio, title) {
    console.log('showMediaPlayer called with:', title);
    const mediaPlayer = document.getElementById('mediaPlayer');
    const trackTitle = document.getElementById('trackTitle');
    const playIcon = document.querySelector('.play-icon');
    const progressFill = document.getElementById('progressFill');
    const progressHandle = document.getElementById('progressHandle');
    const timeDisplay = document.getElementById('timeDisplay');
    
    console.log('Media player element:', mediaPlayer);
    console.log('Track title element:', trackTitle);
    
    if (mediaPlayer && trackTitle) {
        trackTitle.textContent = title;
        mediaPlayer.classList.remove('hidden');
        console.log('Media player should now be visible');
        console.log('Media player classes:', mediaPlayer.className);
        
        // Reset player state
        if (playIcon) {
            playIcon.classList.remove('playing');
            playIcon.classList.add('paused');
        }
        if (progressFill) progressFill.style.width = '0%';
        if (progressHandle) progressHandle.style.left = '0%';
        if (timeDisplay) timeDisplay.textContent = '- 0:00';
    } else {
        console.log('Media player elements not found');
    }
};

hideMediaPlayer = function() {
    const mediaPlayer = document.getElementById('mediaPlayer');
    if (mediaPlayer) {
        mediaPlayer.classList.add('hidden');
    }
};

    // Make functions globally available immediately
    window.showMediaPlayer = showMediaPlayer;
    window.hideMediaPlayer = hideMediaPlayer;

document.addEventListener('DOMContentLoaded', function () {
    const mediaPlayer = document.getElementById('mediaPlayer');
    const trackTitle = document.getElementById('trackTitle');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = playPauseBtn ? playPauseBtn.querySelector('.play-icon') : null;
    const progressFill = document.getElementById('progressFill');
    const progressHandle = document.getElementById('progressHandle');
    const progressBar = document.querySelector('.progress-bar');
    const timeDisplay = document.getElementById('timeDisplay');
    const speedBtn = document.getElementById('speedBtn');
    const transcriptionBtn = document.getElementById('transcriptionBtn');
    const transcriptionPanel = document.getElementById('transcriptionPanel');
    const closeTranscriptionBtn = document.getElementById('closeTranscriptionBtn');
    const transcriptionText = document.getElementById('transcriptionText');
    
    // Debug: Check if elements exist
    console.log('Media player elements check:');
    console.log('mediaPlayer:', mediaPlayer);
    console.log('trackTitle:', trackTitle);
    console.log('playPauseBtn:', playPauseBtn);
    console.log('playIcon:', playIcon);

    // Audio elements for each video - Define globally so they're accessible to target events
    window.audio1 = new Audio('./Assets/Audio/Tromp L\'oeil.mp3');
    window.audio2 = new Audio('./Assets/Audio/Peacock.mp3');
    window.audio3 = new Audio('./Assets/Audio/Banquet of the Gods.mp3');
    window.audio4 = new Audio('./Assets/Audio/Peacock.mp3');
    
    // Handle audio loading errors
    window.audio1.addEventListener('error', () => {
        console.log('Audio1 failed to load');
    });
    window.audio2.addEventListener('error', () => {
        console.log('Audio2 failed to load');
    });
    window.audio3.addEventListener('error', () => {
        console.log('Audio3 failed to load');
    });
    window.audio4.addEventListener('error', () => {
        console.log('Audio4 failed to load');
    });
    
    let currentAudio = null;
    let isPlaying = false;
    let currentSpeed = 1;
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

    // Transcription texts for each audio
    const transcriptions = {
        'audio1': "This is the transcription for the first audio track. It contains the full text of what is being spoken in the audio file.",
        'audio2': "This is the transcription for the second audio track. It contains the full text of what is being spoken in the audio file.",
        'audio3': "This is the transcription for the third audio track. It contains the full text of what is being spoken in the audio file.",
        'audio4': "This is the transcription for the fourth audio track. It contains the full text of what is being spoken in the audio file."
    };

    // Function to format time
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Function to update progress bar
    function updateProgress() {
        if (currentAudio && !isNaN(currentAudio.duration)) {
            const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
            progressFill.style.width = progress + '%';
            progressHandle.style.left = progress + '%';
            
            const remaining = currentAudio.duration - currentAudio.currentTime;
            timeDisplay.textContent = `- ${formatTime(remaining)}`;
        }
    }

    // Function to play/pause audio
    function togglePlayPause() {
        if (!currentAudio) return;
        
        if (isPlaying) {
            currentAudio.pause();
            // For now, keep the same image since we only have one play button image
            // You can add a pause button image later if needed
        } else {
            currentAudio.play();
        }
        isPlaying = !isPlaying;
    }

    // Function to change playback speed
    function changeSpeed() {
        const currentIndex = speeds.indexOf(currentSpeed);
        const nextIndex = (currentIndex + 1) % speeds.length;
        currentSpeed = speeds[nextIndex];
        speedBtn.textContent = currentSpeed + 'x';
        
        if (currentAudio) {
            currentAudio.playbackRate = currentSpeed;
        }
    }

    // Function to show transcription
    function showTranscription() {
        const currentAudioKey = getCurrentAudioKey();
        if (currentAudioKey && transcriptions[currentAudioKey]) {
            transcriptionText.textContent = transcriptions[currentAudioKey];
            transcriptionPanel.classList.remove('hidden');
        }
    }

    // Function to hide transcription
    function hideTranscription() {
        transcriptionPanel.classList.add('hidden');
    }

    // Function to get current audio key
    function getCurrentAudioKey() {
        if (currentAudio === audio1) return 'audio1';
        if (currentAudio === audio2) return 'audio2';
        if (currentAudio === audio3) return 'audio3';
        if (currentAudio === audio4) return 'audio4';
        return null;
    }

    // Function to show media player with specific audio
    showMediaPlayer = function(audio, title) {
        console.log('showMediaPlayer called with:', title);
        currentAudio = audio;
        trackTitle.textContent = title;
        mediaPlayer.classList.remove('hidden');
        console.log('Media player should now be visible');
        
        // Reset player state
        isPlaying = false;
        // Reset play icon (using the same image for now)
        progressFill.style.width = '0%';
        progressHandle.style.left = '0%';
        timeDisplay.textContent = '- 0:00';
        
        // Set up audio event listeners (only if audio exists)
        if (currentAudio && currentAudio.src) {
            currentAudio.addEventListener('timeupdate', updateProgress);
            currentAudio.addEventListener('ended', () => {
                isPlaying = false;
                // Reset to play state (same image for now)
            });
        }
    };

    // Function to hide media player
    hideMediaPlayer = function() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        mediaPlayer.classList.add('hidden');
        hideTranscription();
    };

    // Event listeners
    playPauseBtn.addEventListener('click', togglePlayPause);
    speedBtn.addEventListener('click', changeSpeed);
    transcriptionBtn.addEventListener('click', showTranscription);
    closeTranscriptionBtn.addEventListener('click', hideTranscription);

    // Progress bar click handling
    progressBar.addEventListener('click', (e) => {
        if (!currentAudio) return;
        
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const progress = (clickX / rect.width) * 100;
        const newTime = (progress / 100) * currentAudio.duration;
        
        currentAudio.currentTime = newTime;
        updateProgress();
    });

    // Make functions globally available for AR controller
    window.showMediaPlayer = showMediaPlayer;
    window.hideMediaPlayer = hideMediaPlayer;
    

    

});

// AR Controller
document.addEventListener('DOMContentLoaded', function () {
  AFRAME.registerComponent("ar-controller", {
    init: function () {
        // Disable A-Frame's default loading screen
        this.el.sceneEl.setAttribute('loading-screen', 'enabled', false);
        // Get references to the necessary DOM elements
        const target1 = document.getElementById("target1");
        const target2 = document.getElementById("target2");
        const target3 = document.getElementById("target3");
        const target4 = document.getElementById("target4");
        const video1 = document.getElementById("video1");
        const video2 = document.getElementById("video2");
        const video3 = document.getElementById("video3");
        const video4 = document.getElementById("video4");
        const audioButton = document.getElementById("audioButton");
        const audioPrompt = document.getElementById("audioPrompt");
        const audioPromptIcon = document.getElementById("audioPromptIcon");
        const plane1 = document.getElementById("videooverlay1");
        const plane2 = document.getElementById("videooverlay2");
        const plane3 = document.getElementById("videooverlay3");
        const plane4 = document.getElementById("videooverlay4");
        const startText = document.getElementById("startText");
        const backgroundImage = document.getElementById("background");
        const backButton = document.getElementById("backButton");

        // Initialize variables
        var played1 = false;
        var played2 = false;
        var played3 = false;
        var played4 = false;
        var userInteracted = false;
        var isMuted = true;
        
        // Function to check if the device is iOS
        function isIOS() {
            return [
                'iPad Simulator',
                'iPhone Simulator',
                'iPod Simulator',
                'iPad',
                'iPhone',
                'iPod'
            ].includes(navigator.platform)
            || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
        }
        
        audioButton.addEventListener("click", () => {
                    isMuted = !isMuted;  // Toggle mute status
                    let wasVideo1Playing = !video1.paused;
                    let wasVideo2Playing = !video2.paused;
                    let wasVideo3Playing = !video3.paused;
                    let wasVideo4Playing = !video4.paused;
                    
                    video1.muted = isMuted;
                    video2.muted = isMuted;
                    video3.muted = isMuted;
                    video4.muted = isMuted;
                    
                    if (wasVideo1Playing) video1.play();
                    if (wasVideo2Playing) video2.play();
                    if (wasVideo3Playing) video3.play();
                    if (wasVideo4Playing) video4.play();

                    if (isMuted) {
                        audioButton.innerHTML = '<img id="audioPromptIcon" src="./Assets/mute-icon.svg" alt="Audio Icon"> Enable Audio';
                    } else {
                        audioButton.innerHTML = '<img id="audioPromptIcon" src="./Assets/unmute-icon.svg" alt="Audio Icon"> Disable Audio';
                    }
                });

        // Event listener for first target found event
        target1.addEventListener("targetFound", () => {
            console.log("target 1 found");
            this.found1 = true;
            audioPrompt.style.display = "block";
            // document.getElementById('textPanel').style.display = "block";  // Show the text panel
            if (!played1) {
                startText.style.display = "none";
                plane1.emit("fadein1");
                video1.play();
                video1.addEventListener("ended", function videoend(e) {
                    played1 = true;
                }, false);
                plane1.object3D.position.copy(plane1.object3D.position);
            }
            
            // Show media player for target 1 (always show when target is found)
            console.log('Target 1 found, attempting to show media player');
            // Temporarily disabled media player display for testing
            // if (window.showMediaPlayer) {
            //     console.log('showMediaPlayer function exists, calling it');
            //     window.showMediaPlayer(window.audio1, "Tromp L'oeil");
            // } else {
            //     console.log('showMediaPlayer function does not exist');
            // }
        });

        // Event listener for first target lost event
        target1.addEventListener("targetLost", () => {
            console.log("target 1 lost");
            audioPrompt.style.display = "block";
            // document.getElementById('textPanel').style.display = "none";  // Hide the text panel
            this.found1 = false;
            if (!played1) {
                video1.pause();
                startText.style.display = "block";
            }
            
            // Hide media player (always hide when target is lost)
            console.log('Target 1 lost, hiding media player');
            // Temporarily disabled media player hiding for testing
            // if (window.hideMediaPlayer) {
            //     window.hideMediaPlayer();
            // }
        });

        // Event listener for second target found event
        target2.addEventListener("targetFound", () => {
            console.log("target 2 found");
            this.found2 = true;
            audioPrompt.style.display = "block";
            // document.getElementById('textPanel').style.display = "block";  // Show the text panel
            if (!played2) {
                startText.style.display = "none";
                plane2.emit("fadein2");
                video2.play();
                video2.addEventListener("ended", function videoend(e) {
                    played2 = true;
                }, false);
                plane2.object3D.position.copy(plane2.object3D.position);
            }
            
            // Show media player for target 2 (always show when target is found)
            // Temporarily disabled media player display for testing
            // if (window.showMediaPlayer) {
            //     window.showMediaPlayer(window.audio2, "Peacock");
            // }
        });

        // Event listener for second target lost event
        target2.addEventListener("targetLost", () => {
            console.log("target 2 lost");
            audioPrompt.style.display = "block";
            // document.getElementById('textPanel').style.display = "none";  // Hide the text panel
            this.found2 = false;
            if (!played2) {
                video2.pause();
                startText.style.display = "block";
            }
            
            // Hide media player (always hide when target is lost)
            console.log('Target 2 lost, hiding media player');
            // Temporarily disabled media player hiding for testing
            // if (window.hideMediaPlayer) {
            //     window.hideMediaPlayer();
            // }
        });

        // Event listener for third target found event
        target3.addEventListener("targetFound", () => {
            console.log("target 3 found");
            this.found3 = true;
            audioPrompt.style.display = "block";
            // document.getElementById('textPanel').style.display = "block";  // Show the text panel
            if (!played3) {
                startText.style.display = "none";
                plane3.emit("fadein3");
                video3.play();
                video3.addEventListener("ended", function videoend(e) {
                    played3 = true;
                }, false);
                plane3.object3D.position.copy(plane3.object3D.position);
            }
            
            // Show media player for target 3 (always show when target is found)
            // Temporarily disabled media player display for testing
            // if (window.showMediaPlayer) {
            //     window.showMediaPlayer(window.audio3, "Banquet of the Gods");
            // }
        });

        // Event listener for third target lost event
        target3.addEventListener("targetLost", () => {
            console.log("target 3 lost");
            audioPrompt.style.display = "block";
            // document.getElementById('textPanel').style.display = "block";  // Hide the text panel
            this.found3 = false;
            if (!played3) {
                video3.pause();
                startText.style.display = "block";
            }
            
            // Hide media player (always hide when target is lost)
            console.log('Target 3 lost, hiding media player');
            // Temporarily disabled media player hiding for testing
            // if (window.hideMediaPlayer) {
            //     window.hideMediaPlayer();
            // }
        });

        // Event listener for fourth target found event
        target4.addEventListener("targetFound", () => {
            console.log("target 4 found");
            this.found4 = true;
            audioPrompt.style.display = "block";
            // document.getElementById('textPanel').style.display = "block";  // Show the text panel
            if (!played4) {
                startText.style.display = "none";
                plane4.emit("fadein4");
                video4.play();
                video4.addEventListener("ended", function videoend(e) {
                    played4 = true;
                }, false);
                plane4.object3D.position.copy(plane4.object3D.position);
            }
            
            // Show media player for target 4 (always show when target is found)
            // Temporarily disabled media player display for testing
            // if (window.showMediaPlayer) {
            //     window.showMediaPlayer(window.audio4, "Peacock");
            // }
        });

        // Event listener for fourth target lost event
        target4.addEventListener("targetLost", () => {
            console.log("target 4 lost");
            audioPrompt.style.display = "block";
            // document.getElementById('textPanel').style.display = "none";  // Hide the text panel
            this.found4 = false;
            if (!played4) {
                video4.pause();
                startText.style.display = "block";
            }
            
            // Hide media player (always hide when target is lost)
            console.log('Target 4 lost, hiding media player');
            // Temporarily disabled media player hiding for testing
            // if (window.hideMediaPlayer) {
            //     window.hideMediaPlayer();
            // }
        });

        // Event listener for arframe event
        this.el.addEventListener("arframe", () => {
            if (!this.found1 && !this.found2 && !this.found3 && !this.found4 && (played1 || played2 || played3 || played4)) {
                if (played1) plane1.object3D.position.copy(plane1.object3D.position);
                if (played2) plane2.object3D.position.copy(plane2.object3D.position);
                if (played3) plane3.object3D.position.copy(plane3.object3D.position);
                if (played4) plane4.object3D.position.copy(plane4.object3D.position);
            }
        });
      
        // Event listener for back button click
        backButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // Delay the display of start text and background image
        setTimeout(function() {
            startText.style.display = "block";
            backgroundImage.style.display = "block";
        }, 3000);  // Delay of 3000ms (3 seconds)

        window.addEventListener("orientationchange", () => {
          // Reload the page
            location.reload();
        });
        },
    });
});



// Timed text element - COMMENTED OUT
/*
document.addEventListener('DOMContentLoaded', function () {
    const videoElement1 = document.getElementById('video1');
    const videoElement2 = document.getElementById('video2');
    const videoElement3 = document.getElementById('video3');
    const textPanelContent = document.getElementById('textPanelContent');
    
    // Text updates for video 1 (ceiling1.mp4)
    const textUpdates1 = [
        { time: 0, text: "The King's Staircase at Kensington Palace was enlarged and decorated by William Kent in 1725-27, including a trompe ľoeil balcony depicting members of the court of George I" },
        { time: 15, text: "Details about the historical context." },
        { time: 23, text: "Explanation of its significance." },
        { time: 35, text: "Closing remarks." }
    ];

    // Text updates for video 2 (cw_all.mp4)
    const textUpdates2 = [
        { time: 0, text: "Exploring the comprehensive view of the King's Staircase" },
        { time: 10, text: "Historical significance of the architectural elements" },
        { time: 20, text: "Artistic details and craftsmanship" },
        { time: 30, text: "Cultural importance and preservation" }
    ];

    // Text updates for video 3 (cw_guitar.mp4)
    const textUpdates3 = [
        { time: 0, text: "The musical heritage of the King's Staircase" },
        { time: 8, text: "Historical performances and entertainment" },
        { time: 16, text: "Acoustic properties and design" },
        { time: 24, text: "Modern interpretations and cultural significance" }
    ];

    let lastTriggerTime1 = -1;
    let lastTriggerTime2 = -1;
    let lastTriggerTime3 = -1;
    let currentVideo = null;
  
    // Function to update text based on current video
    function updateTextForVideo(videoElement, textUpdates, lastTriggerTime) {
        const currentTime = Math.floor(videoElement.currentTime);
        if (currentTime !== lastTriggerTime) {
            const update = textUpdates.find(u => u.time === currentTime);
            if (update) {
                textPanelContent.textContent = update.text;
                return currentTime;
            }
        }
        return lastTriggerTime;
    }

    // Add timeupdate listeners for all videos
    videoElement1.addEventListener('timeupdate', function () {
        if (currentVideo === videoElement1) {
            lastTriggerTime1 = updateTextForVideo(videoElement1, textUpdates1, lastTriggerTime1);
        }
    });

    videoElement2.addEventListener('timeupdate', function () {
        if (currentVideo === videoElement2) {
            lastTriggerTime2 = updateTextForVideo(videoElement2, textUpdates2, lastTriggerTime2);
        }
    });

    videoElement3.addEventListener('timeupdate', function () {
        if (currentVideo === videoElement3) {
            lastTriggerTime3 = updateTextForVideo(videoElement3, textUpdates3, lastTriggerTime3);
        }
    });

    // Track which video is currently playing
    videoElement1.addEventListener('play', () => { currentVideo = videoElement1; });
    videoElement2.addEventListener('play', () => { currentVideo = videoElement2; });
    videoElement3.addEventListener('play', () => { currentVideo = videoElement3; });
});
*/

