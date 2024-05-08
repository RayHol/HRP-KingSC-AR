document.addEventListener('DOMContentLoaded', function () {
  AFRAME.registerComponent("ar-controller", {
    init: function () {
        // Disable A-Frame's default loading screen
        this.el.sceneEl.setAttribute('loading-screen', 'enabled', false);
        // Get references to the necessary DOM elements
        const target1 = document.getElementById("target1");
        const video1 = document.getElementById("video1");
        const audioButton = document.getElementById("audioButton");
        const audioPrompt = document.getElementById("audioPrompt");
        const audioPromptIcon = document.getElementById("audioPromptIcon");
        const plane = document.getElementById("videooverlay");
        const startText = document.getElementById("startText");
        const backgroundImage = document.getElementById("background");
        const backButton = document.getElementById("backButton");

        // Initialize variables
        var played = false;
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
                    
                    video1.muted = isMuted;
                    
                    if (wasVideo1Playing) video1.play();
                    

                    if (isMuted) {
                        audioButton.innerHTML = '<img id="audioPromptIcon" src="./Assets/mute-icon.svg" alt="Audio Icon"> Enable Audio';
                    } else {
                        audioButton.innerHTML = '<img id="audioPromptIcon" src="./Assets/unmute-icon.svg" alt="Audio Icon"> Disable Audio';
                    }
                });

            // Event listener for first target found event
        target1.addEventListener("targetFound", () => {
            console.log("target 1 found");
            this.found = true;
            audioPrompt.style.display = "block";
            if (!played) {
                startText.style.display = "none";
                // backgroundImage.style.display = "none";
                plane.emit("fadein");
                video1.play();
                video1.addEventListener("ended", function videoend(e) {
                    played = true;
                }, false);
                plane.object3D.position.copy(plane.object3D.position);

            }
        });

        // Event listener for firt target lost event
        target1.addEventListener("targetLost", () => {
            console.log("target 1 lost");
            audioPrompt.style.display = "block";
            this.found = false;
            if (!played) {
                video1.pause();
                // audio.pause();
                startText.style.display = "block";
                // backgroundImage.style.display = "block";
            }
        });
      // Event listener for arframe event
        this.el.addEventListener("arframe", () => {
            if (!this.found && !this.found2 && played) {
                plane.object3D.position.copy(plane.object3D.position);
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

// Timed text element
document.addEventListener('DOMContentLoaded', function () {
    const videoElement = document.getElementById('videoElement');
    const textPanelContent = document.getElementById('textPanelContent');
    const textUpdates = [
        { time: 5, text: "Introduction to the artefact." },
        { time: 15, text: "Details about the historical context." },
        { time: 30, text: "Explanation of its significance." },
        { time: 45, text: "Closing remarks." }
    ];

    let lastTriggerTime = -1;

    videoElement.addEventListener('timeupdate', function () {
        const currentTime = Math.floor(videoElement.currentTime);
        if (currentTime !== lastTriggerTime) {
            const update = textUpdates.find(u => u.time === currentTime);
            if (update) {
                textPanelContent.textContent = update.text;
                lastTriggerTime = currentTime;
            }
        }
    });
});

