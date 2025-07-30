document.addEventListener('DOMContentLoaded', function () {
  AFRAME.registerComponent("ar-controller", {
    init: function () {
        // Disable A-Frame's default loading screen
        this.el.sceneEl.setAttribute('loading-screen', 'enabled', false);
        // Get references to the necessary DOM elements
        const target1 = document.getElementById("target1");
        const target2 = document.getElementById("target2");
        const target3 = document.getElementById("target3");
        const video1 = document.getElementById("video1");
        const video2 = document.getElementById("video2");
        const video3 = document.getElementById("video3");
        const audioButton = document.getElementById("audioButton");
        const audioPrompt = document.getElementById("audioPrompt");
        const audioPromptIcon = document.getElementById("audioPromptIcon");
        const plane1 = document.getElementById("videooverlay1");
        const plane2 = document.getElementById("videooverlay2");
        const plane3 = document.getElementById("videooverlay3");
        const startText = document.getElementById("startText");
        const backgroundImage = document.getElementById("background");
        const backButton = document.getElementById("backButton");

        // Initialize variables
        var played1 = false;
        var played2 = false;
        var played3 = false;
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
                    
                    video1.muted = isMuted;
                    video2.muted = isMuted;
                    video3.muted = isMuted;
                    
                    if (wasVideo1Playing) video1.play();
                    if (wasVideo2Playing) video2.play();
                    if (wasVideo3Playing) video3.play();

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
        });

        // Event listener for third target lost event
        target3.addEventListener("targetLost", () => {
            console.log("target 3 lost");
            audioPrompt.style.display = "block";
            // document.getElementById('textPanel').style.display = "none";  // Hide the text panel
            this.found3 = false;
            if (!played3) {
                video3.pause();
                startText.style.display = "block";
            }
        });

        // Event listener for arframe event
        this.el.addEventListener("arframe", () => {
            if (!this.found1 && !this.found2 && !this.found3 && (played1 || played2 || played3)) {
                if (played1) plane1.object3D.position.copy(plane1.object3D.position);
                if (played2) plane2.object3D.position.copy(plane2.object3D.position);
                if (played3) plane3.object3D.position.copy(plane3.object3D.position);
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

