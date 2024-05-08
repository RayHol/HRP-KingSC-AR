window.addEventListener('load', function () {
    AFRAME.registerComponent("ar-controller", {
        init: function () {
            const target = document.getElementById("target");
            const dummyObject = document.getElementById("dummyObject"); 
            const videoElement = document.getElementById("videoElement");
            const audio = document.getElementById("backgroundAudio");
            const startText = document.getElementById("startText");
            const audioPrompt = document.getElementById("audioPrompt");
            const backgroundImage = document.getElementById("background");
            const backButton = document.getElementById("backButton");
            var played = false;
            var userInteracted = false;
            var videoEntity;
            this.found = false; 

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

            target.addEventListener("targetFound", () => {
                console.log("target found");
                this.found = true;
                if (!played) {
                    startText.style.display = "none";
                    backgroundImage.style.display = "none";
                    if (audio.paused && isIOS() && !userInteracted) {
                        audioPrompt.style.display = "block";
                    } else {
                        audio.play();
                        console.log("audio is playing"); 
                    }

                    if (!videoEntity) {
                        let dummyPosition = new AFRAME.THREE.Vector3();
                        dummyObject.object3D.getWorldPosition(dummyPosition);
                        let videoPosition = dummyPosition.add(new AFRAME.THREE.Vector3(0, 1.580, 0)); 
                
                        videoEntity = document.createElement("a-video");
                        videoEntity.setAttribute('src', videoElement.getAttribute('src'));
                        videoEntity.setAttribute("height", "1");
                        videoEntity.setAttribute("autoplay", ""); // This was changed
                        videoEntity.setAttribute("muted", "true");
                        videoEntity.setAttribute("loop", "true");
                        videoEntity.setAttribute("playsinline", "true");

                        videoEntity.object3D.position.copy(videoPosition);
                        videoEntity.object3D.quaternion.copy(dummyObject.object3D.getWorldQuaternion(new AFRAME.THREE.Quaternion()));
                        
                        this.el.sceneEl.appendChild(videoEntity);

                        // Check if video is ready to play
                        console.log(`Video readyState: ${videoElement.readyState}`);
                        if (videoElement.readyState === 4) { // 4 = HAVE_ENOUGH_DATA
                            console.log('Video is ready to play');
                        } else {
                            videoElement.oncanplaythrough = function() {
                                console.log('Video is ready to play');
                            }
                        }
                    }

                    if (videoEntity) {
                        videoEntity.play();
                        console.log("video is playing"); 
                    
                        videoEntity.addEventListener("ended", function videoend(e) {
                            played = true;
                            console.log("video has ended"); 
                        }, false);
                    }
                } else if (audio.paused && videoEntity) {
                    audio.play();
                    videoEntity.play();
                    console.log("video resumed"); 
                }
            });

            target.addEventListener("targetLost", () => {
                console.log("target lost");
                this.found = false;
                if (!played && videoEntity) {
                    videoEntity.pause();
                    audio.pause();
                    startText.style.display = "block";
                    backgroundImage.style.display = "block";
                    console.log("video and audio paused"); 
                }
            });

            backButton.addEventListener('click', () => {
                window.location.href = 'index.html';
            });

            setTimeout(function() {
                startText.style.display = "block";
                backgroundImage.style.display = "block";
            }, 3000);
        },
    });
});
