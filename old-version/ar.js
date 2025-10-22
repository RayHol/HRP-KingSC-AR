// Global POI scale multiplier - adjust this to scale all POIs uniformly
const GLOBAL_POI_SCALE = 0.5; // 1.0 = normal size, 2.0 = double size, 0.5 = half size

// Helper function to apply global scale to scale values from mediaConfig.json
function applyGlobalScale(scaleValue) {
    if (typeof scaleValue === 'string') {
        // Handle scale values like "1 1 1" or "2 2 2"
        const scaleArray = scaleValue.split(' ').map(Number);
        return scaleArray.map(scale => scale * GLOBAL_POI_SCALE).join(' ');
    } else if (typeof scaleValue === 'number') {
        // Handle single number scale values
        return scaleValue * GLOBAL_POI_SCALE;
    }
    return scaleValue; // Return as-is if not a recognized format
}

// Global variable definitions
let modelIndex = 0;
let videoEntity = null;
let frameEntity = null;
let lookImages = [];
let mediaEntity = null;
let fixedAngleDegrees = 0;
let heightAngleDegrees = 0; // New: vertical rotation angle (elevation)
let currentZoom = 25; // Initial distance from the user (radius)
let currentY = 0; // Keep for backward compatibility, but calculate from height angle
let initialMediaState = {
    position: null,
    rotation: null
};
let hasPopupShown = false; // congrats popup
let hasPopupClosed = false;
let currentLocationIndex = 0;
let locations = []; // This will be filled with the keys from mediaConfig.json
let mediaArray = []; // Current media array for the location

const minZoom = 10; // Minimum distance from the user
const maxZoom = 105; // Maximum distance from the user
const minHeightAngle = -140; // Minimum height angle (extended down)
const maxHeightAngle = 140; // Maximum height angle (extended up)
const zoomSpeed = 0.01; // Adjust the zoom speed as needed
const dragSpeedX = 0.07; // Adjust the drag speed for the x-axis
const dragSpeedY = 0.1; // Adjust the drag speed for the y-axis (height angle)

// Pinch-to-zoom variables
let initialPinchDistance = null;
let isPinching = false; // Flag to indicate if a pinch-to-zoom gesture is in progress

// Drag functionality variables
let isDragging = false;
let initialTouchX = null;
let initialTouchY = null;
let initialFixedAngle = 0;
let initialHeightAngle = 0; // New: initial height angle for drag
let dragAxis = null; // 'x' for rotation, 'y' for vertical movement

let currentAudio = null; // Keep track of the current playing audio
let isChangingMedia = false; // Flag to prevent repeated calls
let isFirstLoad = true; // Global flag to check if it's the first load

let currentFixedAngleDisplay;
let currentHeightAngleDisplay; // Changed from currentYPositionDisplay
let currentZDepthDisplay;

// New function to calculate position using spherical coordinates
function calculateSphericalPosition(azimuthDegrees, elevationDegrees, radius) {
    const azimuthRad = (azimuthDegrees * Math.PI) / 180;
    const elevationRad = (elevationDegrees * Math.PI) / 180;
    
    return {
        x: radius * Math.cos(elevationRad) * Math.sin(azimuthRad),
        y: radius * Math.sin(elevationRad),
        z: -radius * Math.cos(elevationRad) * Math.cos(azimuthRad)
    };
}

// Function to get rotation from config (maintains original behavior)
function getRotationFromConfig(commonValues) {
    if (commonValues.rotation) {
        // Parse rotation string like "0 90 0" into object
        const rotationArray = commonValues.rotation.split(' ').map(Number);
        return {
            x: rotationArray[0] || 0,
            y: rotationArray[1] || 0,
            z: rotationArray[2] || 0
        };
    }
    return { x: 0, y: 0, z: 0 };
}

function saveAngle(location, angle) {
    const savedAngles = JSON.parse(localStorage.getItem('savedAngles')) || {};
    savedAngles[location] = angle;
    localStorage.setItem('savedAngles', JSON.stringify(savedAngles));
}

// New function to save height angle
function saveHeightAngle(location, angle) {
    const savedHeightAngles = JSON.parse(localStorage.getItem('savedHeightAngles')) || {};
    savedHeightAngles[location] = angle;
    localStorage.setItem('savedHeightAngles', JSON.stringify(savedHeightAngles));
}

function refreshMediaPosition() {
    if (mediaEntity) {
        const mediaItem = mediaArray[modelIndex];
        const fixedAngleDegrees = mediaItem.fixedAngleDegrees || 0;
        const heightAngleDegrees = mediaItem.heightAngleDegrees || 0;

        currentZoom = 25;  // Reset zoom
        heightAngleDegrees = 0;      // Reset height angle

        const position = calculateSphericalPosition(fixedAngleDegrees, heightAngleDegrees, currentZoom);
        currentY = position.y; // Update currentY for backward compatibility
        
        // Use original rotation from config, not calculated rotation
        const rotation = { x: 0, y: 0, z: 0 };

        initialMediaState.position = { ...position };
        initialMediaState.rotation = { ...rotation };

        mediaEntity.setAttribute("position", position);
        mediaEntity.setAttribute("rotation", rotation);

        if (frameEntity) {
            frameEntity.setAttribute("position", position);
            frameEntity.setAttribute("rotation", rotation);
        }

        removeAllMedia();
        loadLocationMedia();

        updateCurrentValues();
    }
}


function updateLookImages() {
    // Disabled for setup mode - no need to update look images
    return;
}


function toggleMuteButton(isMuted) {
    const buttonText = isMuted ? "Unmute" : "Mute";
    const buttonIcon = isMuted ? "./assets/images/UI/unmute-icon.svg" : "./assets/images/UI/mute-icon.svg";
    const muteButton = document.getElementById("mute");

    muteButton.innerHTML = `<img src="${buttonIcon}" alt="${buttonText} button" class="button-icon"> ${buttonText}`;
}

// Congrats page pop up
function showCongratulationsPopup() {
    if (!hasPopupShown && !hasPopupClosed) {
        const popup = document.getElementById('congratulations-overlay');
        popup.style.display = 'flex';
        hasPopupShown = true;
    }
}

function closeCongratsPopup() {
    const popup = document.getElementById('congratulations-overlay');
    popup.style.display = 'none';
    hasPopupClosed = true;
}

function loadNextLocation() {
    modelIndex = 0;
    currentLocationIndex = (currentLocationIndex + 1) % locations.length;
    loadLocationMedia();
}

function loadPreviousLocation() {
    modelIndex = 0;
    currentLocationIndex = (currentLocationIndex - 1 + locations.length) % locations.length;
    loadLocationMedia();
}

function loadLocationMedia() {
    fetch("./Scripts/mediaConfig.json")
        .then((response) => response.json())
        .then((data) => {
            hasPopupShown = false;
            const locationData = data[locations[currentLocationIndex]];
            const commonValues = locationData.common;
            mediaArray = locationData.media;
            modelIndex = 0;
            fixedAngleDegrees = commonValues.fixedAngleDegrees || 0;
            heightAngleDegrees = commonValues.heightAngleDegrees || 0; // New: load height angle
            const position = calculateSphericalPosition(fixedAngleDegrees, heightAngleDegrees, currentZoom);
            currentY = position.y; // Update currentY for backward compatibility
            const rotation = { x: 0, y: 0, z: 0 };

            initialMediaState.position = position;
            initialMediaState.rotation = rotation;

            initializeMedia(mediaArray, commonValues);
        })
        .catch((error) => console.error("Error loading media config:", error));
}

function navigateToLocation(locationId) {
    currentLocationIndex = locations.indexOf(locationId);
    if (currentLocationIndex === -1) {
        console.error("Invalid location specified");
        return;
    }
    loadLocationMedia();
}

function initializeAR() {
    const urlParams = new URLSearchParams(window.location.search);
    const locationId = urlParams.get("location");

    if (!locationId) {
        console.error("No location specified in URL");
        return;
    }

    fetch("./Scripts/mediaConfig.json")
        .then((response) => response.json())
        .then((data) => {
            locations = Object.keys(data);
            currentLocationIndex = locations.indexOf(locationId);

            if (!data[locationId]) {
                console.error("Invalid location specified");
                return;
            }

            const locationData = data[locationId];
            const commonValues = locationData.common;
            mediaArray = locationData.media;

            fixedAngleDegrees = commonValues.fixedAngleDegrees || 0;
            heightAngleDegrees = commonValues.heightAngleDegrees || 0; // New: load height angle
            currentZoom = Math.abs(commonValues.initialZ) || 25;

            const position = calculateSphericalPosition(fixedAngleDegrees, heightAngleDegrees, currentZoom);
            currentY = position.y; // Update currentY for backward compatibility
            
            initialMediaState.position = position;
            initialMediaState.rotation = { x: 0, y: 0, z: 0 };

            initializeMedia(mediaArray, commonValues);
        })
        .catch((error) => console.error("Error loading media config:", error));
}


function updateFixedAngleDegrees(newAngle) {
    fixedAngleDegrees = newAngle;
    saveAngle(locations[currentLocationIndex], newAngle);

    const position = calculateSphericalPosition(fixedAngleDegrees, heightAngleDegrees, currentZoom);
    currentY = position.y; // Update currentY for backward compatibility

    if (mediaEntity) {
        mediaEntity.setAttribute('position', position);
        mediaEntity.setAttribute('rotation', '0 0 0');
    }

    if (frameEntity) {
        frameEntity.setAttribute('position', position);
        frameEntity.setAttribute('rotation', '0 0 0');
    }

    updateLookImages();
    updateCurrentValues();
}

// New function to update height angle degrees
function updateHeightAngleDegrees(newAngle) {
    heightAngleDegrees = Math.max(minHeightAngle, Math.min(maxHeightAngle, newAngle));
    saveHeightAngle(locations[currentLocationIndex], heightAngleDegrees);

    const position = calculateSphericalPosition(fixedAngleDegrees, heightAngleDegrees, currentZoom);
    currentY = position.y; // Update currentY for backward compatibility

    if (mediaEntity) {
        mediaEntity.setAttribute('position', position);
        mediaEntity.setAttribute('rotation', '0 0 0');
    }

    if (frameEntity) {
        frameEntity.setAttribute('position', position);
        frameEntity.setAttribute('rotation', '0 0 0');
    }

    updateLookImages();
    updateCurrentValues();
}

document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const isSetupMode = urlParams.get("setup") === "true";
    const fixedAngleInput = document.getElementById('fixed-angle');
    const updateAngleButton = document.getElementById('update-angle');
    const controlsDiv = document.getElementById('controls');

    currentFixedAngleDisplay = document.getElementById('current-fixed-angle');
    currentHeightAngleDisplay = document.getElementById('current-height-angle');
    currentZDepthDisplay = document.getElementById('current-z-depth');

    if (isSetupMode) {
        controlsDiv.style.display = 'block';
    }

    updateAngleButton.addEventListener('click', () => {
        const newAngle = parseInt(fixedAngleInput.value, 10);
        if (!isNaN(newAngle)) {
            updateFixedAngleDegrees(newAngle);
        }
    });

    const arScene = document.getElementById('ar-scene');
    initializeAR();

    const closePopupButton = document.getElementById('close-congrats-overlay');
    if (closePopupButton) {
        closePopupButton.addEventListener('click', closeCongratsPopup);
    }

    const viewMapButton = document.getElementById("view-map");
    const helpButton = document.getElementById("help");
    const refreshButton = document.getElementById("refresh");

    if (viewMapButton) {
        viewMapButton.addEventListener("click", () => {
        });
    }

    if (helpButton) {
        helpButton.addEventListener("click", () => {
            const helpOverlay = document.getElementById("help-overlay");
            if (helpOverlay) {
                helpOverlay.style.display = "flex";
            }
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            refreshMediaPosition();
        });
    }

    const mapOverlay = document.getElementById('map-overlay');
    const closeMapOverlayButton = document.getElementById('close-map-overlay');

    if (viewMapButton && closeMapOverlayButton) {
        viewMapButton.addEventListener('click', () => {
            if (mapOverlay) {
                mapOverlay.style.display = 'flex';
            }
        });

        closeMapOverlayButton.addEventListener('click', () => {
            if (mapOverlay) {
                mapOverlay.style.display = 'none';
            }
        });
    }

    const closeHelpOverlayButton = document.getElementById("close-help-overlay");

    if (helpButton && closeHelpOverlayButton) {
        helpButton.addEventListener("click", () => {
            const helpOverlay = document.getElementById("help-overlay");
            if (helpOverlay) {
                helpOverlay.style.display = "flex";
            }
        });

        closeHelpOverlayButton.addEventListener("click", () => {
            const helpOverlay = document.getElementById("help-overlay");
            if (helpOverlay) {
                helpOverlay.style.display = "none";
            }
        });
    }

    const continueButton = document.getElementById('continue-button');
    const backButton = document.getElementById('back-button');

    if (continueButton) {
        continueButton.addEventListener('click', () => {
            loadNextLocation();
            document.getElementById('congratulations-overlay').style.display = 'none';
        });
    }

    if (backButton) {
        backButton.addEventListener('click', () => {
            loadPreviousLocation();
            document.getElementById('congratulations-overlay').style.display = 'none';
        });
    }

    document
        .querySelectorAll(".button-text, h1-1, h1-2, h2, p, button")
        .forEach((el) => el.classList.add("unselectable"));
});

function removeAllMedia() {
    let scene = document.querySelector("a-scene");

    let mediaElements = scene.querySelectorAll('a-image, a-video, a-audio');
    mediaElements.forEach(element => {
        if (element.tagName === 'A-VIDEO') {
            element.pause();
            element.currentTime = 0;
        }
        element.parentNode.removeChild(element);
    });

    if (currentAudio) {
        currentAudio.pause();
        document.body.removeChild(currentAudio);
        currentAudio = null;
    }

    mediaEntity = null;
    videoEntity = null;

}

function checkOrientation() {
    const orientationOverlay = document.getElementById('orientation-overlay');
    if (window.innerHeight < window.innerWidth) {
        orientationOverlay.style.display = 'flex';
    } else {
        orientationOverlay.style.display = 'none';
    }
}

window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);
window.addEventListener('DOMContentLoaded', checkOrientation);

function initializeMedia(mediaArray, commonValues) {
    const button = document.querySelector('button[data-action="change"]');

    // Clear previous button text
    const existingButtonText = document.querySelector('.button-text');
    if (existingButtonText) {
        existingButtonText.remove();
    }

    const buttonText = document.createElement("div");
    buttonText.className = "button-text";
    button.insertAdjacentElement("beforebegin", buttonText);

    // Remove old event listeners
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);

    // Add new event listener for changing media
    newButton.addEventListener("click", () => {
        changeMedia(mediaArray, commonValues); // Pass the mediaArray to changeMedia function
    });

    displayMedia(mediaArray, modelIndex, commonValues); // Pass mediaArray, modelIndex and commonValues to displayMedia
}


function displayMedia(mediaArray, index, commonValues, currentPosition, currentRotation) {
    removeAllMedia();

    let scene = document.querySelector("a-scene");
    let mediaItem = mediaArray[index];
    

    // Calculate initial position and rotation based on the provided values or commonValues
    const fixedAngleDegrees = commonValues.fixedAngleDegrees || 0;
    const heightAngleDegrees = commonValues.heightAngleDegrees || 0; // New: load height angle
    const position = currentPosition || calculateSphericalPosition(fixedAngleDegrees, heightAngleDegrees, currentZoom);
    const rotation = currentRotation || { x: 0, y: 0, z: 0 };


    initialMediaState.position = { ...position };
    initialMediaState.rotation = { ...rotation };

    let entity;
    const buttonText = document.querySelector('.button-text');
    let imageEntity;

    if (mediaItem.type === "image") {
        entity = document.createElement("a-image");
        entity.setAttribute("src", mediaItem.url);
        entity.setAttribute("position", position);
        entity.setAttribute("rotation", rotation);
        entity.setAttribute("scale", applyGlobalScale(commonValues.scale));
        entity.setAttribute("visible", "true");

        scene.appendChild(entity);
        entity.flushToDOM();
        imageEntity = entity;

        buttonText.innerText = mediaItem.info;
        createLookImages();
    } else if (mediaItem.type === "video") {
        

        imageEntity = document.createElement("a-image");
        const placeholderUrl = mediaArray[0].type === "image" ? mediaArray[0].url : './assets/Smartify-logo.svg';
        imageEntity.setAttribute("src", placeholderUrl); 
        imageEntity.setAttribute("position", position);
        imageEntity.setAttribute("rotation", rotation);
        imageEntity.setAttribute("scale", applyGlobalScale(commonValues.scale));
        imageEntity.setAttribute("visible", "true");
        scene.appendChild(imageEntity);
        imageEntity.flushToDOM();

        entity = document.createElement("a-video");
        entity.setAttribute("src", mediaItem.url);
        entity.setAttribute("autoplay", "false");
        entity.setAttribute("loop", "true");
        entity.setAttribute("playsinline", "true");
        entity.setAttribute("muted", "true");
        entity.setAttribute("position", position);
        entity.setAttribute("rotation", rotation);
        entity.setAttribute("scale", applyGlobalScale(commonValues.scale));
        entity.setAttribute("preload", "auto");
        entity.setAttribute("visible", "false");

        scene.appendChild(entity);
        entity.flushToDOM();
        videoEntity = entity;

        setTimeout(() => {
            entity.setAttribute("visible", "true");

            setTimeout(() => {
                entity.play().catch((error) => console.error("Error playing video:", error));
            }, 1000);

            fadeOutElement(imageEntity);
        }, 2000);

        buttonText.innerText = mediaItem.info;
        createLookImages();
    }

    if (mediaItem.audioUrl) {
        if (currentAudio) {
            currentAudio.pause();
            document.body.removeChild(currentAudio);
        }
        const audio = document.createElement('audio');
        audio.setAttribute('src', mediaItem.audioUrl);
        audio.setAttribute('id', 'audio-' + index);
        audio.setAttribute('preload', 'auto');
        audio.setAttribute('muted', 'true');
        audio.setAttribute('loop', 'true');
        document.body.appendChild(audio);
        currentAudio = audio;

        if (!isIOS() && !isAndroid()) {
            currentAudio.play();
        }
    }

    mediaEntity = entity;

    mediaEntity.setAttribute("position", position);
    mediaEntity.setAttribute("rotation", rotation);

    const confirmedPosition = mediaEntity.getAttribute("position");
    const confirmedRotation = mediaEntity.getAttribute("rotation");
    

    setTimeout(() => {
        const doubleCheckPosition = mediaEntity.getAttribute("position");
        const doubleCheckRotation = mediaEntity.getAttribute("rotation");
    }, 100);

    setTimeout(() => {
        scene.flushToDOM();
    }, 200);

    updateCurrentValues();
    updateLookImages();
}


function fadeOutElement(element) {
    element.setAttribute("animation", {
        property: "opacity",
        to: 0,
        dur: 2000,
        easing: "easeInOutQuad",
        startEvents: "startFadeOut",
    });

    element.addEventListener("animationcomplete", () => {
        element.parentNode.removeChild(element);
    });

    element.emit("startFadeOut");
}

function changeMedia(mediaArray, commonValues) {
    if (isChangingMedia) {
        return;
    }
    isChangingMedia = true;

    // Preserve current position and rotation
    const currentPosition = mediaEntity.getAttribute("position");
    const currentRotation = mediaEntity.getAttribute("rotation");

    // Update modelIndex to the next media element in the array
    modelIndex = (modelIndex + 1) % mediaArray.length;

    // Display the new media element while preserving the position and rotation
    displayMedia(mediaArray, modelIndex, commonValues, currentPosition, currentRotation);

    // Ensure any audio is handled correctly
    if (currentAudio) {
        if (currentAudio.paused) {
            currentAudio.muted = false; // Ensure the audio is unmuted
            currentAudio.play().catch(error => {
            });
        } else {
            currentAudio.pause();
        }
    }

    // Reset the flag after a delay to allow further media changes
    setTimeout(() => {
        isChangingMedia = false;
    }, 1000); // Adjust the timeout as needed

    // Show the congratulations pop-up after a short delay for testing
    setTimeout(showCongratulationsPopup, 60000); // Set to 0 for immediate testing
}



function createLookImages() {
    // Disabled for setup mode - no need for look images
    return;
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
    return /Android/.test(navigator.userAgent);
}

document.addEventListener("touchstart", function (e) {
    e.preventDefault(); // Prevent default touch actions
    if (e.touches.length === 2) {
        initialPinchDistance = getPinchDistance(e);
        isPinching = true; // Set the flag to indicate a pinch gesture
    } else if (e.touches.length === 1) {
        isDragging = true;
        initialTouchX = e.touches[0].pageX;
        initialTouchY = e.touches[0].pageY;
        initialFixedAngle = fixedAngleDegrees;
        initialHeightAngle = heightAngleDegrees; // New: store initial height angle
        dragAxis = null; // Reset drag axis
    }
});


document.addEventListener("touchmove", function (e) {
    if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault();
        const currentPinchDistance = getPinchDistance(e);
        updateZoom(currentPinchDistance);
    } else if (isDragging && e.touches.length === 1 && !isPinching) {
        e.preventDefault();
        const currentTouchX = e.touches[0].pageX;
        const currentTouchY = e.touches[0].pageY;
        const deltaX = currentTouchX - initialTouchX;
        const deltaY = currentTouchY - initialTouchY;

        if (dragAxis === null) {
            dragAxis = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
        }

        let position = mediaEntity.getAttribute("position");

        if (dragAxis === "x") {
            fixedAngleDegrees = initialFixedAngle - deltaX * dragSpeedX;
            const position = calculateSphericalPosition(fixedAngleDegrees, heightAngleDegrees, currentZoom);
            currentY = position.y;

            mediaEntity.setAttribute("position", position);
            mediaEntity.setAttribute("rotation", "0 0 0");

            if (frameEntity) {
                frameEntity.setAttribute("position", position);
                frameEntity.setAttribute("rotation", "0 0 0");
            }

        } else if (dragAxis === "y") {
            // Now control height angle instead of linear Y position
            const adjustedDragSpeedY = dragSpeedY * (currentZoom / 45);
            const newHeightAngle = initialHeightAngle - deltaY * adjustedDragSpeedY;
            updateHeightAngleDegrees(newHeightAngle);
        }

        initialMediaState.position = { ...mediaEntity.getAttribute("position") };
        initialMediaState.rotation = { ...mediaEntity.getAttribute("rotation") };

        updateCurrentValues();
    }
}, { passive: false });



document.addEventListener("touchend", function () {
    initialPinchDistance = null;
    isDragging = false;
    isPinching = false;
    dragAxis = null;
});

function getPinchDistance(e) {
    const dx = e.touches[0].pageX - e.touches[1].pageX;
    const dy = e.touches[0].pageY - e.touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
}

function updateZoom(currentPinchDistance) {
    if (mediaEntity) {
        let distanceChange = -(currentPinchDistance - initialPinchDistance) * zoomSpeed;
        let newZoom = currentZoom + distanceChange;

        newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

        const position = calculateSphericalPosition(fixedAngleDegrees, heightAngleDegrees, newZoom);
        currentY = position.y; // Update currentY for backward compatibility

        mediaEntity.setAttribute("position", position);
        if (frameEntity) {
            frameEntity.setAttribute("position", position);
        }
        currentZoom = newZoom;

        initialMediaState.position = position;

        updateCurrentValues();
    }
}

document.querySelectorAll('a-entity, a-image, a-video').forEach(el => {
    const position = el.getAttribute('position');
    if (position.x === 0 && position.y === 0 && position.z === 0) {
    }
});

function updateCurrentValues() {
    currentFixedAngleDisplay.textContent = fixedAngleDegrees.toFixed(2);
    currentHeightAngleDisplay.textContent = heightAngleDegrees.toFixed(2);
    currentZDepthDisplay.textContent = currentZoom.toFixed(2);
}
