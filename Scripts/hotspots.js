// Global variable definitions for hotspots
let hotspotIndex = 0;
let hotspotEntity = null;
let frameEntity = null;
let lookImages = [];
let mediaEntity = null;
let fixedAngleDegrees = 0;
let currentZoom = 25; // Initial distance from the user
let currentY = 0; // Initial Y position
let initialMediaState = {
    position: null,
    rotation: null
};
let hasPopupShown = false;
let hasPopupClosed = false;
let currentHotspotIndex = 0;
let hotspots = []; // This will be filled with the keys from hotspotsConfig.json
let mediaArray = []; // Current media array for the hotspot

// Sequential hotspot activation tracking
let activatedHotspots = new Set(); // Track which hotspots have been activated
let currentHotspotOrder = []; // Track the order of hotspots as they appear in JSON

const minZoom = 10; // Minimum distance from the user
const maxZoom = 100; // Maximum distance from the user
const minY = -15; // Set minimum Y value
const maxY = 20; // Set maximum Y value
const zoomSpeed = 0.01; // Adjust the zoom speed as needed
const dragSpeedX = 0.07; // Adjust the drag speed for the x-axis
const dragSpeedY = 0.005; // Adjust the drag speed for the y-axis

// ===== GLOBAL SETTINGS =====
// Global hotspot scale multiplier - adjust this to scale all hotspots uniformly
const GLOBAL_HOTSPOT_SCALE = 0.2// 1.0 = normal size, 2.0 = double size, 0.5 = half size

// Pinch-to-zoom variables
let initialPinchDistance = null;
let isPinching = false; // Flag to indicate if a pinch-to-zoom gesture is in progress

// Drag functionality variables
let isDragging = false;
let initialTouchX = null;
let initialTouchY = null;
let initialFixedAngle = 0;
let dragAxis = null; // 'x' for rotation, 'y' for vertical movement

let currentAudio = null; // Keep track of the current playing audio
let isChangingMedia = false; // Flag to prevent repeated calls
let isFirstLoad = true; // Global flag to check if it's the first load
let hasUserInteracted = false; // Track if user has interacted (for iOS audio)

let currentFixedAngleDisplay;
let currentYPositionDisplay;
let currentZDepthDisplay;

// Map your hotspot ids to MindAR target indices
const targetIndexById = {
    romulus: 0,
    caesar: 1,
    nero: 2,
    silenus: 3,
    furies: 4,
    herakles: 5,
    alexander: 6,
    diana: 7
  };
  
  // Track which indices are finished (optional, useful if you never want them again)
  const completedTargets = new Set();

function saveAngle(hotspot, angle) {
    const savedAngles = JSON.parse(localStorage.getItem('savedHotspotAngles')) || {};
    savedAngles[hotspot] = angle;
    localStorage.setItem('savedHotspotAngles', JSON.stringify(savedAngles));
}

function refreshHotspotPosition() {
    if (mediaEntity) {
        const mediaItem = mediaArray[hotspotIndex];
        const fixedAngleDegrees = mediaItem.fixedAngleDegrees || 0;

        const radians = (fixedAngleDegrees * Math.PI) / 180;
        currentZoom = 25;  // Reset zoom
        currentY = 0;      // Reset Y position

        const position = {
            x: -currentZoom * Math.sin(radians),
            y: currentY,
            z: -currentZoom * Math.cos(radians)
        };
        const rotation = { x: 0, y: fixedAngleDegrees, z: 0 };

        initialMediaState.position = { ...position };
        initialMediaState.rotation = { ...rotation };

        mediaEntity.setAttribute("position", position);
        mediaEntity.setAttribute("rotation", rotation);

        if (frameEntity) {
            frameEntity.setAttribute("position", position);
            frameEntity.setAttribute("rotation", rotation);
        }

        removeAllHotspots();
        loadHotspotMedia();

        updateCurrentValues();
    }
}

function updateLookImages() {
    lookImages.forEach((lookImage, index) => {
        const angle = (index + 1) * 90;
        const lookRadians = ((fixedAngleDegrees + angle) * Math.PI) / 180;
        const lookX = -currentZoom * Math.sin(lookRadians);
        const lookZ = -currentZoom * Math.cos(lookRadians);

        lookImage.setAttribute("position", { x: lookX, y: 0, z: lookZ });
        lookImage.setAttribute("rotation", { x: 0, y: angle + fixedAngleDegrees, z: 0 });
    });
}

function toggleMuteButton(isMuted) {
    const buttonText = isMuted ? "Unmute" : "Mute";
    const buttonIcon = isMuted ? "./Assets/unmute-icon.svg" : "./Assets/mute-icon.svg";
    const muteButton = document.getElementById("mute");

    if (muteButton) {
        muteButton.innerHTML = `<img src="${buttonIcon}" alt="${buttonText} button" class="button-icon"> ${buttonText}`;
    }
}

// Congrats page pop up
// function showCongratulationsPopup() {
//     if (!hasPopupShown && !hasPopupClosed) {
//         const popup = document.getElementById('congratulations-overlay');
//         if (popup) {
//             popup.style.display = 'flex';
//             hasPopupShown = true;
//         }
//     }
// }

// function closeCongratsPopup() {
//     const popup = document.getElementById('congratulations-overlay');
//     if (popup) {
//         popup.style.display = 'none';
//         hasPopupClosed = true;
//     }
// }

// function loadNextHotspot() {
//     hotspotIndex = 0;
//     currentHotspotIndex = (currentHotspotIndex + 1) % hotspots.length;
//     loadHotspotMedia();
// }

// function loadPreviousHotspot() {
//     hotspotIndex = 0;
//     currentHotspotIndex = (currentHotspotIndex - 1 + hotspots.length) % hotspots.length;
//     loadHotspotMedia();
// }

// function loadHotspotMedia() {
//     fetch("./Scripts/hotspotsConfig.json")
//         .then((response) => response.json())
//         .then((data) => {
//             hasPopupShown = false;
//             const hotspotData = data[hotspots[currentHotspotIndex]];
//             const commonValues = hotspotData.common;
//             mediaArray = hotspotData.media;
//             hotspotIndex = 0;
//             fixedAngleDegrees = commonValues.fixedAngleDegrees || 0;
//             const radians = (fixedAngleDegrees * Math.PI) / 180;
//             initialMediaState.position = { x: -currentZoom * Math.sin(radians), y: commonValues.initialY, z: commonValues.initialZ };
//             initialMediaState.rotation = { x: 0, y: fixedAngleDegrees, z: 0 };

//             initializeHotspotMedia(mediaArray, commonValues);
//         })
//         .catch((error) => console.error("Error loading hotspot config:", error));
// }

// function navigateToHotspot(hotspotId) {
//     currentHotspotIndex = hotspots.indexOf(hotspotId);
//     if (currentHotspotIndex === -1) {
//         console.error("Invalid hotspot specified");
//         return;
//     }
//     loadHotspotMedia();
// }

// Function to determine which config file to load based on URL parameters
function getConfigFileName() {
    const urlParams = new URLSearchParams(window.location.search);
    const location = urlParams.get('location');
    
    console.log(`Location parameter detected: ${location}`);
    
    switch(location) {
        case 'stairs':
            console.log('Loading stairs configuration');
            return './Scripts/hotspotsConfig-stairs.json';
        case 'balcony':
            console.log('Loading balcony configuration'); 
            return './Scripts/hotspotsConfig-balcony.json';
        default:
            console.log('Loading default configuration');
            return './Scripts/hotspotsConfig.json'; // Default fallback
    }
}

function preloadAllHotspotImages(hotspotsConfigData) {
    const imageUrls = [];
    
    // Use the passed config data instead of fetching again
    Object.keys(hotspotsConfigData).forEach((hotspotId) => {
        const hotspotData = hotspotsConfigData[hotspotId];
        if (hotspotData && hotspotData.media) {
            hotspotData.media.forEach((mediaItem) => {
                if (mediaItem.type === "image") {
                    imageUrls.push(mediaItem.url);
                }
            });
        }
    });
    
    // Preload all images
    const preloadPromises = imageUrls.map(url => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Continue even if some fail
            img.src = url;
        });
    });
    
    return Promise.all(preloadPromises);
}

function initializeHotspots() {
    const configFile = getConfigFileName();
    
    console.log(`Attempting to load config file: ${configFile}`);
    
    fetch(configFile)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            hotspotsConfig = data;
            hotspots = Object.keys(data);
            currentHotspotOrder = [...hotspots];
            
            console.log(`Successfully loaded ${hotspots.length} hotspots from ${configFile}`);
            console.log('Hotspot order:', currentHotspotOrder);
            
            // Ensure crosshair starts in default yellow state
            const centerTarget = document.getElementById('center-target');
            if (centerTarget) {
                centerTarget.classList.remove('hotspot-hover');
                console.log('Crosshair initialized in default yellow state');
            }

            // PASS the already loaded data instead of fetching again
            return preloadAllHotspotImages(data);
        })
        .then(() => {
            console.log('All images preloaded, creating hotspot entities...');
            
            // Wait for A-Frame scene to be ready
            const scene = document.querySelector("a-scene");
            if (!scene) {
                console.error("A-Frame scene not found when trying to create hotspots!");
                return;
            }
            
            // NOW create the hotspots after images are loaded
            hotspots.forEach((hotspotId, index) => {
                const hotspotData = hotspotsConfig[hotspotId];
                const commonValues = hotspotData.common;
                const mediaArray = hotspotData.media;

                // For each hotspot, use the provided fixedAngleDegrees, initialY, and initialZ
                const fixedAngleDegrees = commonValues.fixedAngleDegrees || 0;
                const currentY = commonValues.initialY || 0;
                const currentZoom = Math.abs(commonValues.initialZ) || 25;

                // Calculate the position based on the fixedAngleDegrees and currentZoom (initialZ)
                const radians = (fixedAngleDegrees * Math.PI) / 180;
                const position = {
                    x: -currentZoom * Math.sin(radians),
                    y: currentY,
                    z: -currentZoom * Math.cos(radians)
                };

                // FIXED: Use consistent rotation for all hotspots - NO fixedAngleDegrees in rotation
                const rotation = { x: 0, y: 0, z: 0 }; // All icons face the same direction

                console.log(`Creating hotspot ${hotspotId} at position:`, position);

                // Loop through each media item and only display 'image' media
                mediaArray
                    .filter(mediaItem => mediaItem.type === "image") // Filter only image type media
                    .forEach((mediaItem, mediaIndex) => {
                        displayHotspotMedia(mediaItem, mediaIndex, commonValues, position, rotation, hotspotId, index);
                    });
            });
            
            // After all hotspots are created, refresh their visual states to ensure proper initialization
            setTimeout(() => {
                console.log('Refreshing all hotspot visual states...');
                refreshAllHotspotVisualStates();
            }, 100);
        })
        .catch((error) => {
            console.error("Error loading hotspot config:", error);
            console.error("Config file path:", configFile);
            
            // Remove the problematic fallback mechanism that was causing both configs to load
            // The stairs config loads successfully, so no fallback is needed
        });
}

function updateFixedAngleDegrees(newAngle) {
    fixedAngleDegrees = newAngle;
    saveAngle(hotspots[currentHotspotIndex], newAngle);

    const radians = (fixedAngleDegrees * Math.PI) / 180;
    const x = -currentZoom * Math.sin(radians);
    const z = -currentZoom * Math.cos(radians);

    if (mediaEntity) {
        mediaEntity.setAttribute('position', { x, y: currentY, z });
        mediaEntity.setAttribute('rotation', `0 ${fixedAngleDegrees} 0`);
    }

    if (frameEntity) {
        frameEntity.setAttribute('position', { x, y: currentY, z });
        frameEntity.setAttribute('rotation', `0 ${fixedAngleDegrees} 0`);
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
    currentYPositionDisplay = document.getElementById('current-y-position');
    currentZDepthDisplay = document.getElementById('current-z-depth');

    if (isSetupMode) {
        controlsDiv.style.display = 'block';
    }

    if (updateAngleButton) {
        updateAngleButton.addEventListener('click', () => {
            const newAngle = parseInt(fixedAngleInput.value, 10);
            if (!isNaN(newAngle)) {
                updateFixedAngleDegrees(newAngle);
            }
        });
    }

    const arScene = document.getElementById('ar-scene');
    // Move initializeHotspots to the second DOMContentLoaded listener with proper timing

    const closePopupButton = document.getElementById('close-congrats-overlay');
    if (closePopupButton) {
        closePopupButton.addEventListener('click', closeCongratsPopup);
    }

    const viewMapButton = document.getElementById("view-map");
    const helpButton = document.getElementById("help");
    const refreshButton = document.getElementById("refresh");

    if (viewMapButton) {
        viewMapButton.addEventListener("click", () => {
            const mapOverlay = document.getElementById("map-overlay");
            if (mapOverlay) {
                mapOverlay.style.display = "flex";
            }
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
            refreshHotspotPosition();
        });
    }

    const mapOverlay = document.getElementById('map-overlay');
    const closeMapOverlayButton = document.getElementById('close-map-overlay');

    if (closeMapOverlayButton) {
        closeMapOverlayButton.addEventListener('click', () => {
            if (mapOverlay) {
                mapOverlay.style.display = 'none';
            }
        });
    }

    const closeHelpOverlayButton = document.getElementById("close-help-overlay");

    if (closeHelpOverlayButton) {
        closeHelpOverlayButton.addEventListener('click', () => {
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
            loadNextHotspot();
            const congratsOverlay = document.getElementById('congratulations-overlay');
            if (congratsOverlay) {
                congratsOverlay.style.display = 'none';
            }
        });
    }

    if (backButton) {
        backButton.addEventListener('click', () => {
            loadPreviousHotspot();
            const congratsOverlay = document.getElementById('congratulations-overlay');
            if (congratsOverlay) {
                congratsOverlay.style.display = 'none';
            }
        });
    }

    // Hotspot modal functionality
    const closeHotspotModal = document.getElementById('close-hotspot-modal');
    if (closeHotspotModal) {
        closeHotspotModal.addEventListener('click', function() {
            document.getElementById('hotspot-modal').style.display = 'none';
        });
    }

    // Close modal when clicking outside of the modal content
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('hotspot-modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    document
        .querySelectorAll(".button-text, h1-1, h1-2, h2, p, button")
        .forEach((el) => el.classList.add("unselectable"));
});

function removeAllHotspots() {
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
    if (orientationOverlay) {
        if (window.innerHeight < window.innerWidth) {
            orientationOverlay.style.display = 'flex';
        } else {
            orientationOverlay.style.display = 'none';
        }
    }
}

window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);
window.addEventListener('DOMContentLoaded', checkOrientation);

// Reset crosshair when page loses focus or visibility changes
window.addEventListener('blur', resetCrosshairToDefault);
window.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        resetCrosshairToDefault();
    }
});

// REMOVED: This function was creating duplicate hotspots at origin (0,0,0)
// which caused conflicts with the correctly positioned hotspots from initializeHotspots
// This was the root cause of the X-axis scaling jitter

function displayHotspotMedia(mediaItem, index, commonValues, currentPosition, currentRotation, hotspotId, hotspotIndex) {
    let scene = document.querySelector("a-scene");
    
    if (!scene) {
        console.error("A-Frame scene not found!");
        return;
    }
    
    console.log(`Creating hotspot entity for ${hotspotId} at position:`, currentPosition);

    // Create the entity for the image
    let entity = document.createElement("a-image");

    // Set the media URL for the image
    entity.setAttribute("src", mediaItem.url);

    // Add the 'clickable' class to make the image detectable by the raycaster
    entity.classList.add('clickable');

    // Set the scale exactly as defined in the hotspotsConfig.json, then apply global scale
    let scaleComponents = commonValues.scale.split(' ').map(Number);
    const scaledX = scaleComponents[0] * GLOBAL_HOTSPOT_SCALE;
    const scaledY = scaleComponents[1] * GLOBAL_HOTSPOT_SCALE;
    const scaledZ = scaleComponents[2] * GLOBAL_HOTSPOT_SCALE;
    entity.setAttribute("scale", `${scaledX} ${scaledY} ${scaledZ}`); 

    // Set the position based on the hotspotsConfig.json values
    entity.setAttribute("position", currentPosition);
    entity.setAttribute("visible", "true");
    
    // FIXED: Use the rotation passed from initializeHotspots (includes fixedAngleDegrees)
    // This ensures position and rotation are consistent and eliminates jittering
    entity.setAttribute("rotation", currentRotation);
    
    // REMOVED: No look-at effect - this was causing conflicts with fixed rotation
    // The undefined yPosition variable was causing JavaScript errors

    // Set initial material and visual state based on sequential activation
    entity.setAttribute("material", "color", "white");
    entity.setAttribute("material", "opacity", "1.0");
    
    // Store hotspot ID as data attribute for reference
    entity.setAttribute("data-hotspot-id", hotspotId);
    
    updateHotspotVisualState(entity, hotspotId, hotspotIndex);

    // Add the entity to the scene
    scene.appendChild(entity);
    console.log(`Hotspot entity ${hotspotId} added to scene successfully`);

    // Add a raycaster event to show the hotspot modal when the image is hovered (intersected)
    entity.addEventListener('raycaster-intersected', function () {
        // Check if this hotspot can be activated (sequential order)
        if (!canActivateHotspot(hotspotId)) {
            return; // Don't allow activation if not in sequence
        }

        console.log('Hotspot intersected:', mediaItem.url);
        
        // DON'T change opacity on hover - maintain original visual state
        // Only change crosshair and button states

        // Change crosshair to green when hovering over hotspot
        const centerTarget = document.getElementById('center-target');
        if (centerTarget) {
            centerTarget.classList.add('hotspot-hover');
        }

        // Update badges/replay button based on whether hotspot has been triggered
        const isAlreadyTriggered = activatedHotspots.has(hotspotId);
        updateBadgesReplayButton(isAlreadyTriggered);

        // Activate the hotspot with MindAR directly (no notification)
        activateHotspotWithMindAR(hotspotId, entity);
    });

    entity.addEventListener('raycaster-intersected-cleared', function () {
        console.log('Hotspot no longer intersected:', mediaItem.url);
        
        // DON'T change opacity - maintain original visual state
        // Only reset crosshair and button states

        // Change crosshair back to yellow when no longer hovering over hotspot
        const centerTarget = document.getElementById('center-target');
        if (centerTarget) {
            centerTarget.classList.remove('hotspot-hover');
            console.log('Crosshair returned to yellow (hotspot-hover class removed)');
        }

        // Reset badges/replay button back to badges mode
        updateBadgesReplayButton(false);
    });
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


function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
    return /Android/.test(navigator.userAgent);
}



function getPinchDistance(e) {
    const dx = e.touches[0].pageX - e.touches[1].pageX;
    const dy = e.touches[0].pageY - e.touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
}

function updateZoom(currentPinchDistance) {
    if (mediaEntity) {
        const directionX = -Math.sin((fixedAngleDegrees * Math.PI) / 180);
        const directionZ = -Math.cos((fixedAngleDegrees * Math.PI) / 180);
        let distanceChange =
            -(currentPinchDistance - initialPinchDistance) * zoomSpeed;
        let newZoom = currentZoom + distanceChange;

        newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

        const x = newZoom * directionX;
        const z = newZoom * directionZ;

        mediaEntity.setAttribute("position", { x, y: currentY, z });
        if (frameEntity) {
            frameEntity.setAttribute("position", { x, y: currentY, z });
        }
        currentZoom = newZoom;

        initialMediaState.position = { x, y: currentY, z };

        updateCurrentValues();
    }
}

function updateCurrentValues() {
    if (currentFixedAngleDisplay) {
        currentFixedAngleDisplay.textContent = fixedAngleDegrees.toFixed(2);
    }
    if (currentYPositionDisplay) {
        currentYPositionDisplay.textContent = currentY.toFixed(2);
    }
    if (currentZDepthDisplay && mediaEntity) {
        currentZDepthDisplay.textContent = mediaEntity.getAttribute('position').z.toFixed(2);
    }
}

// Function to reset crosshair to default yellow state
function resetCrosshairToDefault() {
    const centerTarget = document.getElementById('center-target');
    if (centerTarget) {
        centerTarget.classList.remove('hotspot-hover');
        console.log('Crosshair reset to default yellow state');
    }
}

// Function to show simple hotspot notification
function showHotspotNotification(hotspotName) {
    // Remove any existing notification
    const existingNotification = document.getElementById('hotspot-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'hotspot-notification';
    notification.className = 'hotspot-notification';
    notification.innerHTML = `<span>${hotspotName} found, animation will load</span>`;

    // Add to page
    document.body.appendChild(notification);

    // Show notification with fade-in effect
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 500); // Wait for fade-out animation
    }, 3000);
}

// Function to check if a hotspot can be activated (sequential order)
function canActivateHotspot(hotspotId) {
    // If hotspot is already activated, it cannot be activated again
    if (activatedHotspots.has(hotspotId)) {
        return false;
    }
    
    const hotspotIndex = currentHotspotOrder.indexOf(hotspotId);
    
    // First hotspot (index 0) can always be activated (if not already activated)
    if (hotspotIndex === 0) {
        return true;
    }
    
    // Check if all previous hotspots have been activated
    for (let i = 0; i < hotspotIndex; i++) {
        const previousHotspotId = currentHotspotOrder[i];
        if (!activatedHotspots.has(previousHotspotId)) {
            return false; // Previous hotspot not activated yet
        }
    }
    
    return true; // All previous hotspots activated
}

// Function to activate a hotspot
function activateHotspot(hotspotId, entity) {
    if (activatedHotspots.has(hotspotId)) {
        return; // Already activated
    }
    
    // Add to activated set
    activatedHotspots.add(hotspotId);
    
    console.log(`Hotspot ${hotspotId} activated! Total activated: ${activatedHotspots.size}/${currentHotspotOrder.length}`);
    
    // Use MindAR integration if available, otherwise fallback to original behavior
    if (typeof activateHotspotWithMindAR === 'function') {
        activateHotspotWithMindAR(hotspotId, entity);
    } else {
        // Fallback: unlock corresponding badge directly
        const badgeId = hotspotToBadgeMapping[hotspotId];
        if (badgeId) {
            unlockBadge(badgeId);
            console.log(`Badge unlocked: ${badgeId}`);
        } else {
            console.log(`No badge mapping found for hotspot: ${hotspotId}`);
        }
    }
    
    // Refresh ALL hotspot visual states after activation
    refreshAllHotspotVisualStates();
    
    // Check if all hotspots are activated
    if (activatedHotspots.size === currentHotspotOrder.length) {
        console.log('All hotspots activated! Experience complete!');
        // You could add a completion celebration here
    }
}

// Function to update hotspot visual state
function updateHotspotVisualState(entity, hotspotId, hotspotIndex) {
    // Remove existing halo rings first
    removeHotspotHalo(entity);
    
    if (activatedHotspots.has(hotspotId)) {
        // Activated hotspot: white with 40% opacity
        entity.setAttribute('material', 'color', 'white');
        entity.setAttribute('material', 'opacity', '0.2');
        console.log(`Hotspot ${hotspotId}: Activated (white, 20% opacity)`);
    } else if (canActivateHotspot(hotspotId)) {
        // Next available hotspot: normal white with rotating ring and 100% opacity
        entity.setAttribute('material', 'color', 'white');
        entity.setAttribute('material', 'opacity', '1.0');
        createHotspotRotatingRing(entity);
        console.log(`Hotspot ${hotspotId}: Active (white, 100% opacity, ROTATING RING)`);
    } else {
        // Future hotspot: 70% transparent white
        entity.setAttribute('material', 'color', 'white');
        entity.setAttribute('material', 'opacity', '0.2');
        console.log(`Hotspot ${hotspotId}: Future (white, 50% opacity)`);
    }
}

// Function to reset hotspot sequence (useful for testing or restarting)
function resetHotspotSequence() {
    activatedHotspots.clear();
    console.log('Hotspot sequence reset. All hotspots are now inactive.');
    
    // Refresh all hotspot visual states
    const scene = document.querySelector("a-scene");
    const hotspotEntities = scene.querySelectorAll('.clickable');
    
    hotspotEntities.forEach(entity => {
        // Remove halo effect and reset to initial state
        removeHotspotHalo(entity);
        entity.setAttribute('material', 'color', 'white');
        entity.setAttribute('material', 'opacity', '0.7'); // Reset to 70% opacity for future hotspots
    });
    
    // Re-apply visual states after reset
    setTimeout(() => {
        hotspotEntities.forEach(entity => {
            const hotspotId = entity.getAttribute('data-hotspot-id');
            if (hotspotId) {
                const hotspotIndex = currentHotspotOrder.indexOf(hotspotId);
                updateHotspotVisualState(entity, hotspotId, hotspotIndex);
            }
        });
    }, 100);
}

// Make reset function globally accessible for testing
window.resetHotspotSequence = resetHotspotSequence;

// Function to refresh all hotspot visual states (useful for debugging)
function refreshAllHotspotVisualStates() {
    const scene = document.querySelector("a-scene");
    const hotspotEntities = scene.querySelectorAll('.clickable');
    
    console.log(`Refreshing ${hotspotEntities.length} hotspot entities...`);
    console.log('Current activated hotspots:', Array.from(activatedHotspots));
    console.log('Current hotspot order:', currentHotspotOrder);
    
    hotspotEntities.forEach(entity => {
        const hotspotId = entity.getAttribute('data-hotspot-id');
        if (hotspotId) {
            const hotspotIndex = currentHotspotOrder.indexOf(hotspotId);
            console.log(`Processing entity for hotspot ${hotspotId} at index ${hotspotIndex}`);
            updateHotspotVisualState(entity, hotspotId, hotspotIndex);
        } else {
            console.log('Entity missing data-hotspot-id attribute');
        }
    });
    
    console.log('All hotspot visual states refreshed');
}

// Make refresh function globally accessible for testing
window.refreshAllHotspotVisualStates = refreshAllHotspotVisualStates;

// Function to manually test hotspot states (for debugging)
function testHotspotStates() {
    console.log('=== HOTSPOT STATE TEST ===');
    console.log('Total hotspots:', currentHotspotOrder.length);
    console.log('Activated hotspots:', Array.from(activatedHotspots));
    console.log('Current order:', currentHotspotOrder);
    
    currentHotspotOrder.forEach((hotspotId, index) => {
        const canActivate = canActivateHotspot(hotspotId);
        const isActivated = activatedHotspots.has(hotspotId);
        console.log(`${index}: ${hotspotId} - Can activate: ${canActivate}, Activated: ${isActivated}`);
    });
    
    console.log('=== END TEST ===');
}

// Make test function globally accessible
window.testHotspotStates = testHotspotStates;

// Function to create rotating ring effect around a hotspot
function createHotspotRotatingRing(entity) {
    // Remove any existing halo first
    removeHotspotHalo(entity);
    
    const scene = document.querySelector("a-scene");
    const entityPosition = entity.getAttribute('position');
    const entityScale = entity.getAttribute('scale');
    
    // Calculate proper ring size based on hotspot scale
    const hotspotSize = Math.max(entityScale.x, entityScale.y);
    const ringRadius = hotspotSize * 0.5; 
    
    // Position ring slightly in front of the hotspot
    const ringPosition = {
        x: entityPosition.x,
        y: entityPosition.y,
        z: entityPosition.z + 0.1  // Closer to the hotspot for better visibility
    };
    
    // Create gradient opacity effect using multiple ring segments
    const segmentCount = 20; // Number of segments for smooth gradient
    const gradientAngle = 288; // 80% of 360 degrees
    
    // Create multiple ring segments for gradient effect
    for (let i = 0; i < segmentCount; i++) {
        const segment = document.createElement('a-ring');
        const angleStart = (i / segmentCount) * gradientAngle;
        const angleEnd = ((i + 1) / segmentCount) * gradientAngle;
        
        // Calculate opacity based on position (100% to 0% over 80% of ring)
        const opacity = 1.0 - (i / segmentCount);
        
        segment.setAttribute('radius-inner', ringRadius * 0.9);
        segment.setAttribute('radius-outer', ringRadius);
        segment.setAttribute('position', ringPosition);
        segment.setAttribute('material', 'color', 'white');
        segment.setAttribute('material', 'opacity', opacity);
        segment.setAttribute('material', 'transparent', 'true');
        segment.setAttribute('rotation', `0 0 ${angleStart}`);
        segment.setAttribute('theta-start', '0');
        segment.setAttribute('theta-length', `${angleEnd - angleStart}`);
        
        // Add rotation animation to the segment (counter-clockwise)
        segment.setAttribute('animation', {
            property: 'rotation',
            to: `0 0 ${-360 + angleStart}`,
            dur: 2000,
            easing: 'linear',
            loop: true
        });
        
        segment.setAttribute('data-halo-type', 'rotating-ring');
        segment.setAttribute('data-parent-hotspot', entity.getAttribute('data-hotspot-id'));
        
        scene.appendChild(segment);
        
        // Store reference to segment
        if (!entity.haloRings) {
            entity.haloRings = [];
        }
        entity.haloRings.push(segment);
    }
    
    console.log(`Created gradient rotating ring effect for hotspot ${entity.getAttribute('data-hotspot-id')} with ${segmentCount} segments`);
}

// Function to remove halo effect from a hotspot
function removeHotspotHalo(entity) {
    if (entity.haloRings) {
        entity.haloRings.forEach(halo => {
            if (halo.parentNode) {
                halo.parentNode.removeChild(halo);
            }
        });
        entity.haloRings = null;
    }
    
    // Also remove any orphaned halos by searching for them
    const scene = document.querySelector("a-scene");
    const hotspotId = entity.getAttribute('data-hotspot-id');
    if (hotspotId) {
        const orphanedHalos = scene.querySelectorAll(`[data-parent-hotspot="${hotspotId}"]`);
        orphanedHalos.forEach(halo => {
            if (halo.parentNode) {
                halo.parentNode.removeChild(halo);
            }
        });
    }
}

// ===== SAFETY WARNING POPUP FUNCTIONALITY =====
let warningTimer = null;

function initializeSafetyWarning() {
    const warningPopup = document.getElementById('safety-warning-popup');
    const okBtn = document.getElementById('warning-ok-btn');
    
    if (!warningPopup || !okBtn) {
        console.warn('Safety warning elements not found');
        return;
    }
    
    // Show the warning popup immediately
    warningPopup.style.display = 'flex';
    
    // Start 3-second timer to enable OK button
    warningTimer = setTimeout(() => {
        okBtn.disabled = false;
        okBtn.style.backgroundColor = '#333';
        okBtn.style.cursor = 'pointer';
        okBtn.style.opacity = '1';
    }, 3000);
    
    // OK button click handler - THIS IS THE KEY USER INTERACTION
    okBtn.addEventListener('click', function() {
        console.log('Warning button clicked!');
        if (!okBtn.disabled) {
            // Mark that user has interacted (for iOS audio)
            hasUserInteracted = true;
            console.log('User interaction recorded - iOS audio context established');
            
            // Create and establish audio context for video playback
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        console.log('Audio context resumed for iOS compatibility');
                        // Test audio context with a silent audio buffer
                        const buffer = audioContext.createBuffer(1, 1, 22050);
                        const source = audioContext.createBufferSource();
                        source.buffer = buffer;
                        source.connect(audioContext.destination);
                        source.start();
                        console.log('Audio context test completed successfully');
                    }).catch((e) => {
                        console.log('Audio context resume failed:', e);
                    });
                } else {
                    // Test audio context with a silent audio buffer
                    const buffer = audioContext.createBuffer(1, 1, 22050);
                    const source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContext.destination);
                    source.start();
                    console.log('Audio context test completed successfully');
                }
            } catch (e) {
                console.log('Audio context creation failed:', e);
            }
            
            closeSafetyWarning();
        }
    });
}

function closeSafetyWarning() {
    const warningPopup = document.getElementById('safety-warning-popup');
    
    if (warningPopup) {
        warningPopup.style.display = 'none';
    }
    
    // Clear timer if it's still running
    if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
    }
    
    // Force user interaction for video playback
    hasUserInteracted = true;
    
    // Create a silent audio context to establish user interaction
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('Audio context resumed for video playback');
            });
        }
    } catch (e) {
        console.log('Audio context creation failed:', e);
    }
    
    // Initialize intro video after warning is closed
    initializeIntroVideo();
}

// ===== INTRO VIDEO OVERLAY FUNCTIONALITY =====
let hasWatchedIntro = false;
let isVideoPlaying = false;

function initializeIntroVideo() {
    const introOverlay = document.getElementById('intro-overlay');
    const video = document.getElementById('intro-video');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const closeBtn = document.getElementById('close-intro-btn');
    const skipBtn = document.getElementById('skip-intro-btn');
    
    if (!introOverlay || !video || !playPauseBtn) {
        console.warn('Intro video elements not found');
        return;
    }
    
    // Show the intro overlay on page load
    introOverlay.style.display = 'flex';
    
    // Show skip button immediately when intro video loads
    skipBtn.style.display = 'block';
    
    // Play/Pause button functionality
    playPauseBtn.addEventListener('click', function() {
        if (video.paused) {
            playVideo();
        } else {
            pauseVideo();
        }
    });
    
    // Close button functionality
    closeBtn.addEventListener('click', function() {
        closeIntroOverlay();
    });
    
    // Skip button functionality
    skipBtn.addEventListener('click', function() {
        closeIntroOverlay();
    });
    
    // Video event listeners
    video.addEventListener('play', function() {
        isVideoPlaying = true;
        video.classList.add('playing');
        playIcon.src = './Assets/UI/Play, Repeat, Circle.png'; // You might want a pause icon here
        // Keep skip button visible during playback
    });
    
    video.addEventListener('pause', function() {
        isVideoPlaying = false;
        video.classList.remove('playing');
        playIcon.src = './Assets/UI/Play, Repeat, Circle.png';
        // Keep skip button visible when paused
    });
    
    video.addEventListener('ended', function() {
        isVideoPlaying = false;
        video.classList.remove('playing');
        hasWatchedIntro = true;
        playIcon.src = './Assets/UI/Play, Repeat, Circle.png';
        skipBtn.style.display = 'none';
        closeBtn.style.display = 'block';
    });
    
    // Handle video loading errors
    video.addEventListener('error', function(e) {
        console.error('Video loading error:', e);
        // Show close button even if video fails to load
        closeBtn.style.display = 'block';
    });
    
    // iOS audio fix - ensure video can play with sound
    video.addEventListener('loadedmetadata', function() {
        // Set video properties for iOS compatibility
        video.muted = false;
        video.playsInline = true; // Allow fullscreen
    });
    
    // Force video to load and show preview immediately
    video.load();
    
    // Additional event to ensure first frame is loaded
    video.addEventListener('loadeddata', function() {
        // Video first frame is loaded, should show preview
        console.log('Video first frame loaded, preview should be visible');
    });
}

function playVideo() {
    const video = document.getElementById('intro-video');
    if (video) {
        // Mark that user has interacted (for iOS audio)
        hasUserInteracted = true;
        console.log('Intro video play - User interaction recorded for iOS audio');
        
        // Create a silent audio context to establish user interaction
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('Audio context resumed for iOS compatibility');
                });
            }
        } catch (e) {
            console.log('Audio context creation failed:', e);
        }
        
        // For iOS, we need to ensure the video can play with sound
        video.muted = false;
        video.play().catch(error => {
            console.warn('Video play failed:', error);
            // If play fails, try with muted first (iOS workaround)
            video.muted = true;
            video.play().then(() => {
                // Once playing, unmute
                video.muted = true;
            }).catch(err => {
                console.error('Video play failed even with muted:', err);
            });
        });
    }
}

function pauseVideo() {
    const video = document.getElementById('intro-video');
    if (video) {
        video.pause();
    }
}

function closeIntroOverlay() {
    const introOverlay = document.getElementById('intro-overlay');
    const video = document.getElementById('intro-video');
    
    if (introOverlay) {
        introOverlay.style.display = 'none';
    }
    
    if (video) {
        video.pause();
        video.currentTime = 0; // Reset video to beginning
    }
    
    // Mark as watched
    hasWatchedIntro = true;
    
    // Initialize tutorial after intro is closed
    if (typeof initializeTutorial === "function") {
        initializeTutorial();
    }
}

// ===== TUTORIAL OVERLAY FUNCTIONALITY =====
let currentTutorialStep = 1;
let isTutorialAnimating = false;

function initializeTutorial() {
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    const skipBtn = document.getElementById('tutorial-skip-btn');
    const nextBtn1 = document.getElementById('tutorial-next-1');
    const nextBtn2 = document.getElementById('tutorial-next-2');
    const backBtn2 = document.getElementById('tutorial-back-2');
    const backBtn3 = document.getElementById('tutorial-back-3');
    const startBtn = document.getElementById('tutorial-start-btn');
    
    if (!tutorialOverlay) {
        console.warn('Tutorial overlay not found');
        return;
    }
    
    // Show the tutorial overlay
    tutorialOverlay.style.display = 'flex';
    
    // Reset to first step
    currentTutorialStep = 1;
    updateTutorialProgress();
    showTutorialPrompt(1);
    
    // Event listeners
    skipBtn.addEventListener('click', closeTutorial);
    nextBtn1.addEventListener('click', () => goToTutorialStep(2));
    nextBtn2.addEventListener('click', () => goToTutorialStep(3));
    backBtn2.addEventListener('click', () => goToTutorialStep(1));
    backBtn3.addEventListener('click', () => goToTutorialStep(2));
    startBtn.addEventListener('click', closeTutorial);
}

function goToTutorialStep(step) {
    if (isTutorialAnimating) return;
    
    const currentPrompt = document.querySelector(`[data-prompt="${currentTutorialStep}"]`);
    const nextPrompt = document.querySelector(`[data-prompt="${step}"]`);
    
    if (!currentPrompt || !nextPrompt) return;
    
    isTutorialAnimating = true;
    
    // Remove all animation classes and reset
    currentPrompt.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right', 'animating', 'no-transition');
    nextPrompt.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right', 'animating', 'no-transition');
    
    // Determine animation direction
    if (step > currentTutorialStep) {
        // Moving forward - both sections move together to the left
        // Position next section to the right and make it visible
        nextPrompt.classList.add('slide-in-right', 'no-transition');
        nextPrompt.classList.add('active');
        
        // Force a reflow to ensure positioning
        nextPrompt.offsetHeight;
        
        // Enable transitions and start animation
        nextPrompt.classList.remove('no-transition');
        nextPrompt.classList.add('animating');
        currentPrompt.classList.add('animating');
        
        // Apply animation classes
        currentPrompt.classList.add('slide-out-left');
        nextPrompt.classList.remove('slide-in-right');
        nextPrompt.classList.add('active');
        
    } else {
        // Moving backward - both sections move together to the right
        // Position next section to the left and make it visible
        nextPrompt.classList.add('slide-in-left', 'no-transition');
        nextPrompt.classList.add('active');
        
        // Force a reflow to ensure positioning
        nextPrompt.offsetHeight;
        
        // Enable transitions and start animation
        nextPrompt.classList.remove('no-transition');
        nextPrompt.classList.add('animating');
        currentPrompt.classList.add('animating');
        
        // Apply animation classes
        currentPrompt.classList.add('slide-out-right');
        nextPrompt.classList.remove('slide-in-left');
        nextPrompt.classList.add('active');
    }
    
    // Clean up after animation completes
    setTimeout(() => {
        // Remove all animation classes
        currentPrompt.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right', 'animating', 'no-transition', 'active');
        nextPrompt.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right', 'animating', 'no-transition');
        
        // Update state
        currentTutorialStep = step;
        updateTutorialProgress();
        isTutorialAnimating = false;
    }, 500);
}

function showTutorialPrompt(step) {
    // Hide all prompts
    const prompts = document.querySelectorAll('.tutorial-prompt');
    prompts.forEach(prompt => {
        prompt.classList.remove('active', 'slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right');
    });
    
    // Show the target prompt
    const targetPrompt = document.querySelector(`[data-prompt="${step}"]`);
    if (targetPrompt) {
        targetPrompt.classList.add('active');
    }
}

function updateTutorialProgress() {
    const progressLines = document.querySelectorAll('.progress-line');
    progressLines.forEach((line, index) => {
        if (index < currentTutorialStep) {
            line.classList.add('active');
        } else {
            line.classList.remove('active');
        }
    });
}

function closeTutorial() {
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    if (tutorialOverlay) {
        tutorialOverlay.style.display = 'none';
    }
    
    // Initialize hotspots after tutorial is closed
    if (typeof initializeHotspots === "function") {
        initializeHotspots();
    }
}

// ========================================
// MAIN UI ELEMENTS FUNCTIONALITY
// ========================================

// Track current location for back button
let currentLocation = 'stairs'; // Default fallback

// Initialize main UI elements
function initializeMainUI() {
    // Get location from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    currentLocation = urlParams.get('location') || 'stairs';
    
    // Set up button event listeners
    setupUIButtonListeners();
    
    // Initialize badges/replay button state
    updateBadgesReplayButton(false); // Start in badges mode
}

// Set up event listeners for all UI buttons
function setupUIButtonListeners() {
    // Back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', handleBackButton);
    }
    
    // Help button
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', handleHelpButton);
    }
    
    // Help close button
    const helpCloseBtn = document.getElementById('help-close-btn');
    if (helpCloseBtn) {
        helpCloseBtn.addEventListener('click', hideHelpOverlay);
    }
    
    // Badges close button
    const badgesCloseBtn = document.getElementById('badges-close-btn');
    if (badgesCloseBtn) {
        badgesCloseBtn.addEventListener('click', hideBadgesOverlay);
    }
    
    // Congratulations overlay collect button
    const collectBadgeBtn = document.getElementById('collect-badge-btn');
    if (collectBadgeBtn) {
        collectBadgeBtn.addEventListener('click', hideCongratulationsOverlay);
    }
    
    // Badges/Replay button
    const badgesReplayBtn = document.getElementById('badges-replay-btn');
    if (badgesReplayBtn) {
        badgesReplayBtn.addEventListener('click', handleBadgesReplayButton);
    }
    
    // Transcript button
    const transcriptBtn = document.getElementById('transcript-btn');
    if (transcriptBtn) {
        transcriptBtn.addEventListener('click', handleTranscriptButton);
    }
}

// Back button handler
function handleBackButton() {
    console.log('Back button clicked');
    // Navigate back to index page with current location
    window.location.href = `index.html?location=${currentLocation}`;
}

// Help button handler
function handleHelpButton() {
    console.log('Help button clicked');
    showHelpOverlay();
}

// Badges/Replay button handler
function handleBadgesReplayButton() {
    const isReplayMode = document.getElementById('badges-replay-text').textContent === 'REPLAY';
    
    if (isReplayMode) {
        console.log('Replay button clicked');
        // TODO: Replay current hotspot video (to be implemented later)
        alert('Replay functionality will be implemented later');
    } else {
        console.log('Badges button clicked');
        showBadgesOverlay();
    }
}

// Transcript button handler
function handleTranscriptButton() {
    console.log('Transcript button clicked');
    
    // Get the current hotspot ID from the active MindAR target
    const currentHotspotId = getCurrentActiveHotspot();
    if (!currentHotspotId) {
        console.error('No active hotspot found for transcript');
        return;
    }
    
    // Show transcript overlay
    showTranscriptOverlay(currentHotspotId);
}

// Get the currently active hotspot ID
function getCurrentActiveHotspot() {
    // Check which hotspot is currently active in MindAR
    const activeTargets = document.querySelectorAll('[mindar-image-target]');
    for (let target of activeTargets) {
        if (target.style.display !== 'none') {
            const hotspotId = target.id.replace('target-', '');
            return hotspotId;
        }
    }
    return null;
}

// Show transcript overlay with hotspot description
function showTranscriptOverlay(hotspotId) {
    console.log(`📝 Showing transcript for hotspot: ${hotspotId}`);
    
    // Get hotspot config
    const hotspotConfig = hotspotsConfig[hotspotId];
    if (!hotspotConfig || !hotspotConfig.media || !hotspotConfig.media[0]) {
        console.error(`No config found for hotspot: ${hotspotId}`);
        return;
    }
    
    const description = hotspotConfig.media[0].description;
    if (!description) {
        console.error(`No description found for hotspot: ${hotspotId}`);
        return;
    }
    
    // Create or get transcript overlay
    let transcriptOverlay = document.getElementById('transcript-overlay');
    if (!transcriptOverlay) {
        transcriptOverlay = createTranscriptOverlay();
    }
    
    // Update content
    const transcriptContent = transcriptOverlay.querySelector('.transcript-content');
    const transcriptText = transcriptOverlay.querySelector('.transcript-text');
    
    transcriptText.textContent = description;
    
    // Show overlay with slide-up animation
    transcriptOverlay.style.display = 'flex';
    transcriptOverlay.classList.add('show');
    
    console.log(`📝 Transcript shown for ${hotspotId}`);
}

// Create transcript overlay element
function createTranscriptOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'transcript-overlay';
    overlay.className = 'transcript-overlay';
    
    const content = document.createElement('div');
    content.className = 'transcript-content';
    
    const text = document.createElement('div');
    text.className = 'transcript-text';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'transcript-close-btn';
    closeBtn.innerHTML = '✕';
    
    content.appendChild(closeBtn);
    content.appendChild(text);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    // Add event listeners
    closeBtn.addEventListener('click', hideTranscriptOverlay);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            hideTranscriptOverlay();
        }
    });
    
    return overlay;
}

// Hide transcript overlay
function hideTranscriptOverlay() {
    const transcriptOverlay = document.getElementById('transcript-overlay');
    if (transcriptOverlay) {
        transcriptOverlay.classList.remove('show');
        setTimeout(() => {
            transcriptOverlay.style.display = 'none';
        }, 300);
    }
}

// Update badges/replay button state
function updateBadgesReplayButton(isHoveringHotspot) {
    const icon = document.getElementById('badges-replay-icon');
    const text = document.getElementById('badges-replay-text');
    
    if (isHoveringHotspot) {
        // Switch to replay mode
        icon.src = './Assets/UI/Play, Repeat, Circle.png';
        text.textContent = 'REPLAY';
        console.log('Badges button switched to REPLAY mode');
    } else {
        // Switch to badges mode
        icon.src = './Assets/UI/crown-square-icon.png';
        text.textContent = 'BADGES';
        console.log('Badges button switched to BADGES mode');
    }
}

// Show/hide transcript button
function showTranscriptButton(show = true) {
    const transcriptBtn = document.getElementById('transcript-btn');
    console.log(`📝 showTranscriptButton called with show=${show}, button found:`, !!transcriptBtn);
    if (transcriptBtn) {
        // Try multiple approaches to ensure the button shows
        if (show) {
            transcriptBtn.style.setProperty('display', 'flex', 'important');
            transcriptBtn.style.setProperty('visibility', 'visible', 'important');
            transcriptBtn.style.setProperty('opacity', '1', 'important');
            transcriptBtn.style.setProperty('z-index', '999999', 'important');
            transcriptBtn.classList.add('show');
        } else {
            transcriptBtn.style.setProperty('display', 'none', 'important');
            transcriptBtn.style.setProperty('visibility', 'hidden', 'important');
            transcriptBtn.style.setProperty('opacity', '0', 'important');
            transcriptBtn.classList.remove('show');
        }
        console.log(`📝 Transcript button ${show ? 'shown' : 'hidden'}`);
        console.log(`📝 Button computed style:`, window.getComputedStyle(transcriptBtn).display);
        console.log(`📝 Button visibility:`, window.getComputedStyle(transcriptBtn).visibility);
        console.log(`📝 Button opacity:`, window.getComputedStyle(transcriptBtn).opacity);
        
        // If showing transcript button and MindAR is active, ensure it's cloned to overlay
        if (show && isMindarActive) {
            console.log('📝 MindAR is active, ensuring transcript button is cloned to overlay');
            ensureUIButtonsOnTop();
        }
    } else {
        console.error('📝 Transcript button not found!');
    }
}

// Function to ensure UI buttons are always on top
function ensureUIButtonsOnTop() {
    const uiOverlay = document.getElementById('ui-overlay');
    
    if (uiOverlay) {
        // Enable pointer events on overlay
        uiOverlay.style.setProperty('pointer-events', 'auto', 'important');
        
        // Clear any existing buttons in overlay
        uiOverlay.innerHTML = '';
        
        // Get all UI buttons
        const backBtn = document.getElementById('back-btn');
        const helpBtn = document.getElementById('help-btn');
        const badgesBtn = document.getElementById('badges-replay-btn');
        const transcriptBtn = document.getElementById('transcript-btn');
        
        // Clone buttons and copy event listeners properly
        if (backBtn) {
            const clonedBack = backBtn.cloneNode(true);
            clonedBack.style.cssText = 'position: absolute; top: 15px; left: 15px; width: 40px; height: 40px; z-index: 999999; pointer-events: auto; display: flex; background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px); border: none; border-radius: 12px; cursor: pointer; align-items: center; justify-content: center;';
            
            // Copy all event listeners from original button
            clonedBack.addEventListener('click', function() {
                backBtn.click();
            });
            
            uiOverlay.appendChild(clonedBack);
        }
        
        if (helpBtn) {
            const clonedHelp = helpBtn.cloneNode(true);
            clonedHelp.style.cssText = 'position: absolute; top: 15px; right: 15px; width: 40px; height: 40px; z-index: 999999; pointer-events: auto; display: flex; background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px); border: none; border-radius: 12px; cursor: pointer; align-items: center; justify-content: center;';
            
            // Copy all event listeners from original button
            clonedHelp.addEventListener('click', function() {
                helpBtn.click();
            });
            
            uiOverlay.appendChild(clonedHelp);
        }
        
        if (badgesBtn) {
            const clonedBadges = badgesBtn.cloneNode(true);
            clonedBadges.style.cssText = 'position: absolute; top: 15px; right: 65px; width: 100px; height: 40px; z-index: 999999; pointer-events: auto; display: flex; background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px); border: none; border-radius: 12px; cursor: pointer; align-items: center; justify-content: center;';
            
            // Copy all event listeners from original button
            clonedBadges.addEventListener('click', function() {
                badgesBtn.click();
            });
            
            uiOverlay.appendChild(clonedBadges);
        }
        
        if (transcriptBtn) {
            // Make sure transcript button is visible before cloning
            transcriptBtn.style.setProperty('display', 'flex', 'important');
            transcriptBtn.style.setProperty('visibility', 'visible', 'important');
            
            const clonedTranscript = transcriptBtn.cloneNode(true);
            clonedTranscript.style.cssText = 'position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: 120px; height: 40px; z-index: 999999; pointer-events: auto; display: flex; background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px); border: none; border-radius: 12px; cursor: pointer; align-items: center; justify-content: center;';
            
            // Copy all event listeners from original button
            clonedTranscript.addEventListener('click', function() {
                console.log('📝 Cloned transcript button clicked');
                transcriptBtn.click();
            });
            
            uiOverlay.appendChild(clonedTranscript);
            console.log('📝 Transcript button cloned to overlay');
        } else {
            console.error('📝 Transcript button not found for cloning');
        }
        
        // Hide original buttons
        const originalButtons = document.querySelectorAll('.ui-button');
        originalButtons.forEach(button => {
            button.style.display = 'none';
        });
        
        console.log('🔧 UI buttons cloned to overlay:', {
            back: !!backBtn,
            help: !!helpBtn,
            badges: !!badgesBtn,
            transcript: !!transcriptBtn
        });
        
        // Debug: Check if transcript button exists and is visible
        if (transcriptBtn) {
            console.log('📝 Transcript button found:', {
                id: transcriptBtn.id,
                display: transcriptBtn.style.display,
                visible: transcriptBtn.offsetParent !== null
            });
        } else {
            console.error('📝 Transcript button not found in DOM');
        }
    }
}

// Function to restore UI buttons to original positions
function restoreUIButtons() {
    const uiOverlay = document.getElementById('ui-overlay');
    
    if (uiOverlay) {
        // Reset overlay pointer events
        uiOverlay.style.setProperty('pointer-events', 'none', 'important');
        
        // Show original buttons again
        const originalButtons = document.querySelectorAll('.ui-button');
        originalButtons.forEach(button => {
            button.style.display = '';
        });
        
        // Clear the overlay
        uiOverlay.innerHTML = '';
        
        console.log('🔧 UI buttons restored to original positions');
    }
}

// Help overlay functions
function showHelpOverlay() {
    const helpOverlay = document.getElementById('help-overlay');
    if (helpOverlay) {
        helpOverlay.style.display = 'flex';
        // Trigger reflow to ensure display change is applied
        helpOverlay.offsetHeight;
        helpOverlay.classList.add('show');
    }
}

function hideHelpOverlay() {
    const helpOverlay = document.getElementById('help-overlay');
    if (helpOverlay) {
        helpOverlay.classList.remove('show');
        // Wait for animation to complete before hiding
        setTimeout(() => {
            helpOverlay.style.display = 'none';
        }, 400); // Match the CSS transition duration
    }
}

// Badges overlay functions
function showBadgesOverlay() {
    const badgesOverlay = document.getElementById('badges-overlay');
    if (badgesOverlay) {
        badgesOverlay.style.display = 'flex';
        // Trigger reflow to ensure display change is applied
        badgesOverlay.offsetHeight;
        badgesOverlay.classList.add('show');
        // Populate badges when showing
        populateBadgesGrid();
    }
}

function hideBadgesOverlay() {
    const badgesOverlay = document.getElementById('badges-overlay');
    if (badgesOverlay) {
        badgesOverlay.classList.remove('show');
        // Wait for animation to complete before hiding
        setTimeout(() => {
            badgesOverlay.style.display = 'none';
        }, 400); // Match the CSS transition duration
    }
}

// Badge configuration in the specific order requested
const badgeConfig = [
    { id: 'clouds', name: 'Clouds', filename: 'Ceiling clouds.png', grayFilename: 'Ceiling clouds_g.png' },
    { id: 'peacock', name: 'Peacock', filename: 'Peacocks.png', grayFilename: 'Peacocks_g.png' },
    { id: 'three-graces', name: 'Three Graces', filename: 'Three Graces.png', grayFilename: 'Three Graces_g.png' },
    { id: 'trumpeter', name: 'Trumpeter', filename: 'Trumpeter.png', grayFilename: 'TrumpeterG.png' },
    { id: 'romulus', name: 'Romulus', filename: 'Romulus.png', grayFilename: 'Romulus_g.png' },
    { id: 'caeser', name: 'Caeser', filename: 'Caeser.png', grayFilename: 'Caeser_g.png' },
    { id: 'nero', name: 'Nero', filename: 'Nero.png', grayFilename: 'Nero_g.png' },
    { id: 'silenus', name: 'Silenus', filename: 'Silenus.png', grayFilename: 'Silenus_g.png' },
    { id: 'furies', name: 'Furies', filename: 'Furies.png', grayFilename: 'Furies_g.png' },
    { id: 'alexander', name: 'Alexander', filename: 'Alexander the Great.png', grayFilename: 'Alexander the Great_g.png' },
    { id: 'herakles', name: 'Herakles', filename: 'Herakles.png', grayFilename: 'Herakles_g.png' },
    { id: 'diana', name: 'Diana', filename: 'Diana.png', grayFilename: 'Diana_g.png' },
    { id: 'harvest', name: 'Harvest', filename: 'Harvest Flowers.png', grayFilename: 'Harvest Flowers_g.png' },
    { id: 'cherubs', name: 'Cherubs', filename: 'Cherubs.png', grayFilename: 'Cherubs_g.png' },
    { id: 'musicians', name: 'Musicians', filename: 'Musician.png', grayFilename: 'Musician_g.png' },
    { id: 'outro', name: 'Outro Signature', filename: 'Signature - outro.png', grayFilename: 'Signature - outro_g.png' },
    { id: 'final', name: 'Final', filename: 'Final.png', grayFilename: 'Final_g.png' }
];

// Mapping between hotspot IDs and badge IDs
const hotspotToBadgeMapping = {
    'romulus': 'romulus',
    'caesar': 'caeser',
    'nero': 'nero',
    'silenus': 'silenus',
    'furies': 'furies', // Note: config uses 'furie' but badge uses 'furies'
    'herakles': 'herakles',
    'alexander': 'alexander',
    'diana': 'diana'
    // Add more mappings as needed for other hotspots
};

// Track which badges are unlocked (initially all locked except for testing)
let unlockedBadges = new Set();

// Populate the badges grid
function populateBadgesGrid() {
    const badgesGrid = document.getElementById('badges-grid');
    if (!badgesGrid) return;
    
    // Clear existing badges
    badgesGrid.innerHTML = '';
    
    // Create badge items
    badgeConfig.forEach((badge, index) => {
        const badgeItem = document.createElement('div');
        badgeItem.className = 'badge-item';
        badgeItem.setAttribute('data-badge-id', badge.id);
        
        const badgeImage = document.createElement('img');
        badgeImage.className = 'badge-image';
        
        // Determine if badge is unlocked
        const isUnlocked = unlockedBadges.has(badge.id) || (badge.id === 'final' && unlockedBadges.size >= 16);
        
        // Set appropriate image and class
        if (isUnlocked) {
            badgeImage.src = `./Assets/Badges/${badge.filename}`;
            badgeImage.classList.add('unlocked');
        } else {
            badgeImage.src = `./Assets/Badges/${badge.grayFilename}`;
            badgeImage.classList.add('grayed');
        }
        
        badgeImage.alt = badge.name;
        badgeImage.loading = 'lazy';
        
        badgeItem.appendChild(badgeImage);
        badgesGrid.appendChild(badgeItem);
    });
}

// Function to unlock a badge (to be called when hotspot is triggered)
function unlockBadge(badgeId) {
    if (badgeId && !unlockedBadges.has(badgeId)) {
        unlockedBadges.add(badgeId);
        console.log(`Badge unlocked: ${badgeId}`);
        
        // Show congratulations overlay with the unlocked badge
        showCongratulationsOverlay(badgeId);
        
        // Update the specific badge in the grid if overlay is open
        const badgesOverlay = document.getElementById('badges-overlay');
        if (badgesOverlay && badgesOverlay.style.display === 'flex') {
            const badgeItem = document.querySelector(`[data-badge-id="${badgeId}"]`);
            if (badgeItem) {
                const badgeImage = badgeItem.querySelector('.badge-image');
                const badgeConfigItem = badgeConfig.find(b => b.id === badgeId);
                if (badgeImage && badgeConfigItem) {
                    badgeImage.src = `./Assets/Badges/${badgeConfigItem.filename}`;
                    badgeImage.classList.remove('grayed');
                    badgeImage.classList.add('unlocked');
                }
            }
        }
    }
}

// Congratulations overlay functions
function showCongratulationsOverlay(badgeId) {
    const congratsOverlay = document.getElementById('congrats-overlay');
    const congratsBadgeImage = document.getElementById('congrats-badge-image');
    
    if (congratsOverlay && congratsBadgeImage) {
        // Find the badge configuration
        const badgeConfigItem = badgeConfig.find(b => b.id === badgeId);
        if (badgeConfigItem) {
            // Set the badge image
            congratsBadgeImage.src = `./Assets/Badges/${badgeConfigItem.filename}`;
            congratsBadgeImage.alt = badgeConfigItem.name;
            
            // Show the overlay
            congratsOverlay.style.display = 'flex';
            congratsOverlay.offsetHeight; // Trigger reflow
            congratsOverlay.classList.add('show');
            
            console.log(`Congratulations overlay shown for badge: ${badgeId}`);
        } else {
            console.error(`Badge configuration not found for ID: ${badgeId}`);
        }
    }
}

function hideCongratulationsOverlay() {
    const congratsOverlay = document.getElementById('congrats-overlay');
    if (congratsOverlay) {
        congratsOverlay.classList.remove('show');
        setTimeout(() => {
            congratsOverlay.style.display = 'none';
            
            // Stop any playing video when popup is closed
            if (currentMindarVideo) {
                currentMindarVideo.pause();
                currentMindarVideo.currentTime = 0;
                console.log('Video stopped when congratulations popup was closed');
            }
            
            // Clear the current active hotspot ID (hotspot already marked as completed in handleVideoEnded)
            if (currentActiveHotspotId) {
                currentActiveHotspotId = null;
            }
            
            // Return to hotspot finding mode (main AR scene should already be visible)
            console.log('Returned to hotspot finding mode');
            
        }, 300); // Match the CSS transition duration
    }
}

// Test function to unlock some badges for demonstration
function testUnlockBadges() {
    // Unlock a few badges for testing
    unlockBadge('clouds');
    unlockBadge('peacock');
    unlockBadge('three-graces');
    unlockBadge('alexander');
    console.log('Test badges unlocked for demonstration');
}

// Test function to simulate hotspot activation (for testing badge unlocking)
function testHotspotActivation() {
    // Simulate activating some hotspots to test badge unlocking
    console.log('Testing hotspot activation and badge unlocking...');
    
    // Simulate activating romulus hotspot
    setTimeout(() => {
        if (typeof activateHotspot === 'function') {
            console.log('Simulating romulus hotspot activation...');
            // Note: This won't work without a real entity, but shows the concept
            // In real usage, this would be called from the raycaster-intersected event
        }
    }, 3000);
}

// Initialize safety warning when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    // Small delay to ensure all elements are ready
    setTimeout(initializeSafetyWarning, 100);
    
    // Initialize hotspots after A-Frame scene is ready
    setTimeout(initializeHotspots, 500);
    
    // Start intelligent video preloading
    setTimeout(startIntelligentVideoPreloading, 1000);
    
    // Uncomment the line below to test badge unlocking
    // setTimeout(testUnlockBadges, 2000);
    setTimeout(initializeMainUI, 200);
});

// ========================================
// INTELLIGENT VIDEO PRELOADING
// ========================================

// Track video preloading status
const videoPreloadStatus = new Map();
const preloadQueue = [];
let isPreloading = false;

// Start intelligent video preloading system
function startIntelligentVideoPreloading() {
    console.log('🚀 Starting intelligent video preloading system...');
    
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    console.log(`📱 Device: ${isIOS ? 'iOS' : 'Non-iOS'}`);
    
    // Get all video elements
    const videoElements = document.querySelectorAll('video[id^="video-"]');
    console.log(`📹 Found ${videoElements.length} video elements to preload`);
    
    // Add videos to preload queue
    videoElements.forEach(video => {
        const videoId = video.id;
        const hotspotId = videoId.replace('video-', '');
        
        // Skip if hotspot is already completed
        if (activatedHotspots.has(hotspotId)) {
            console.log(`⏭️ Skipping preload for completed hotspot: ${hotspotId}`);
            return;
        }
        
        preloadQueue.push({
            video: video,
            videoId: videoId,
            hotspotId: hotspotId,
            priority: getVideoPriority(hotspotId)
        });
    });
    
    // Sort by priority (first hotspot has highest priority)
    preloadQueue.sort((a, b) => a.priority - b.priority);
    
    console.log(`📋 Preload queue created with ${preloadQueue.length} videos`);
    
    if (isIOS) {
        console.log('🍎 iOS detected - using iOS-compatible preloading strategy');
        // On iOS, we'll preload only metadata, not the full video
        startIOSPreloadProcess();
    } else {
        console.log('🤖 Non-iOS device - using full preloading');
        // Start preloading
        startPreloadProcess();
    }
}

// Get video priority based on hotspot order
function getVideoPriority(hotspotId) {
    const priorityOrder = ['romulus', 'caesar', 'nero', 'silenus', 'furies', 'herakles', 'alexander', 'diana'];
    const index = priorityOrder.indexOf(hotspotId);
    return index === -1 ? 999 : index; // Unknown hotspots get lowest priority
}

// iOS-specific preloading (metadata only)
function startIOSPreloadProcess() {
    console.log('🍎 Starting iOS-compatible preloading (metadata only)...');
    
    preloadQueue.forEach(({ video, videoId, hotspotId }) => {
        console.log(`📱 iOS preloading metadata for: ${videoId}`);
        
        // Set preload to metadata only (iOS compatible)
        video.setAttribute('preload', 'metadata');
        
        // Mark as ready for metadata preloading
        videoPreloadStatus.set(videoId, 'metadata-ready');
        
        // Set up event listeners for when video is actually needed
        video.addEventListener('loadstart', () => {
            console.log(`📱 iOS video load started: ${videoId}`);
        });
        
        video.addEventListener('loadedmetadata', () => {
            console.log(`📱 iOS video metadata loaded: ${videoId}`);
            videoPreloadStatus.set(videoId, 'metadata-loaded');
        });
        
        video.addEventListener('error', (error) => {
            console.warn(`📱 iOS video error: ${videoId}`, error);
            videoPreloadStatus.set(videoId, 'error');
        });
    });
    
    console.log('🍎 iOS preloading setup complete - videos will load on demand');
}

// Start the preload process
function startPreloadProcess() {
    if (isPreloading || preloadQueue.length === 0) {
        return;
    }
    
    isPreloading = true;
    console.log('🔄 Starting video preload process...');
    
    // Preload videos one by one to avoid overwhelming the network
    preloadNextVideo();
}

// Preload the next video in the queue
function preloadNextVideo() {
    if (preloadQueue.length === 0) {
        isPreloading = false;
        console.log('✅ All videos preloaded successfully');
        return;
    }
    
    const { video, videoId, hotspotId } = preloadQueue.shift();
    
    console.log(`📥 Preloading video: ${videoId} (hotspot: ${hotspotId})`);
    
    // Set up preload event listeners
    const onCanPlayThrough = () => {
        console.log(`✅ Video preloaded successfully: ${videoId}`);
        videoPreloadStatus.set(videoId, 'ready');
        video.removeEventListener('canplaythrough', onCanPlayThrough);
        video.removeEventListener('error', onError);
        
        // Continue with next video
        setTimeout(() => preloadNextVideo(), 100);
    };
    
    const onError = (error) => {
        console.warn(`⚠️ Video preload failed: ${videoId}`, error);
        videoPreloadStatus.set(videoId, 'error');
        video.removeEventListener('canplaythrough', onCanPlayThrough);
        video.removeEventListener('error', onError);
        
        // Continue with next video
        setTimeout(() => preloadNextVideo(), 100);
    };
    
    // Add event listeners
    video.addEventListener('canplaythrough', onCanPlayThrough);
    video.addEventListener('error', onError);
    
    // Start preloading by setting preload attribute
    video.setAttribute('preload', 'auto');
    
    // Force load by setting currentTime to 0 (triggers loading)
    video.currentTime = 0;
    
    // Set a timeout to prevent hanging
    setTimeout(() => {
        if (videoPreloadStatus.get(videoId) !== 'ready') {
            console.warn(`⏰ Preload timeout for ${videoId}, continuing...`);
            videoPreloadStatus.set(videoId, 'timeout');
            video.removeEventListener('canplaythrough', onCanPlayThrough);
            video.removeEventListener('error', onError);
            preloadNextVideo();
        }
    }, 10000); // 10 second timeout
}

// Check if video is preloaded
function isVideoPreloaded(videoId) {
    const status = videoPreloadStatus.get(videoId);
    return status === 'ready' || status === 'metadata-ready' || status === 'metadata-loaded';
}

// Get preload status for debugging
function getPreloadStatus() {
    const status = {};
    videoPreloadStatus.forEach((value, key) => {
        status[key] = value;
    });
    return status;
}

// Show tap-to-play text for iOS
function showTapToPlayText() {
    // Create tap-to-play text if it doesn't exist
    let tapText = document.getElementById('tap-to-play-text');
    if (!tapText) {
        tapText = document.createElement('div');
        tapText.id = 'tap-to-play-text';
        tapText.textContent = 'Tap to play';
        tapText.style.cssText = `
            position: fixed;
            top: 90px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-size: 14px;
            font-weight: normal;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            z-index: 99999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            font-family: Arial, sans-serif;
        `;
        // Append to body instead of center-target to ensure it's 2D
        document.body.appendChild(tapText);
    }
    
    // Show the text
    tapText.style.opacity = '1';
    console.log('📱 Tap to play text shown');
}

// Hide tap-to-play text
function hideTapToPlayText() {
    const tapText = document.getElementById('tap-to-play-text');
    if (tapText) {
        tapText.style.opacity = '0';
        console.log('📱 Tap to play text hidden');
    }
}

// Make preload status available globally for debugging
window.getPreloadStatus = getPreloadStatus;
window.isVideoPreloaded = isVideoPreloaded;

// ========================================
// MINDAR INTEGRATION
// ========================================

// MindAR state management
let mindarScene = null;
let mindarTargets = new Map(); // Map hotspot IDs to MindAR target indices
let currentMindarVideo = null;
let isMindarActive = false;
let currentHotspotVideo = null;
let currentActiveHotspotId = null; // Track which hotspot is currently being processed

// Initialize MindAR system
function initializeMindAR() {
    mindarScene = document.getElementById('mindar-scene');
    if (!mindarScene) {
        console.error('MindAR scene not found');
        return false;
    }
    
    // Add MindAR event listeners for debugging
    mindarScene.addEventListener('targetFound', function(event) {
        const expectedId = currentActiveHotspotId;
        if (!expectedId) {
            console.log('No active hotspot, ignoring target');
            return;
        }
    
        const targetEntity = document.querySelector(
          `[mindar-image-target][data-hotspot-id="${expectedId}"]`
        );
        if (!targetEntity) {
            console.log('Ignoring target, not the current hotspot');
            return;
        }
    
        // === existing logic runs only for the active hotspot ===
        console.log('MindAR target found:', event.detail);
    
        hasUserInteracted = true;
        console.log('User interaction set for MindAR target detection');
    
        const syntheticEvent = new Event('click', { bubbles: true });
        document.body.dispatchEvent(syntheticEvent);
        console.log('Synthetic user interaction created for iOS video autoplay');
    
        const targetStatus = document.getElementById('mindar-target-status');
        if (targetStatus) {
            targetStatus.textContent = 'Yes';
            targetStatus.style.color = 'green';
        }
    });
    
    
    mindarScene.addEventListener('targetLost', function(event) {
        console.log('MindAR target lost:', event.detail);
        const targetStatus = document.getElementById('mindar-target-status');
        if (targetStatus) {
            targetStatus.textContent = 'No';
            targetStatus.style.color = 'red';
        }
    });
    
    // Add scene ready event listener
    mindarScene.addEventListener('loaded', function() {
        console.log('MindAR scene loaded and ready');
    });
    
    console.log('MindAR system initialized with event listeners');
    console.log('MindAR scene element:', mindarScene);
    console.log('MindAR scene attributes:', mindarScene.getAttribute('mindar-image'));
    return true;
}

// Note: MindAR targets are now pre-defined in HTML, no need for dynamic creation

// Show MindAR scene and activate target detection
function showMindARScene(hotspotId) {
    if (!mindarScene) {
        currentActiveHotspotId = hotspotId;
        console.error('MindAR scene not initialized');
        return;
    }
    
    // Set user interaction flag for iOS video autoplay
    hasUserInteracted = true;
    console.log(`User interaction set for MindAR video: ${hotspotId}`);
    
    // Hide debug status (keep it hidden)
    const debugStatus = document.getElementById('mindar-debug-status');
    if (debugStatus) {
        debugStatus.style.display = 'none';
        debugStatus.style.visibility = 'hidden';
    }
    
    // Hide main AR scene
    const mainScene = document.getElementById('ar-scene');
    if (mainScene) {
        mainScene.style.display = 'none';
    }
    
    // Enable MindAR target detection
    mindarScene.setAttribute('mindar-image', 'enabled', true);
    
    // Hide ALL target entities first
    const allTargets = document.querySelectorAll('[mindar-image-target]');
    allTargets.forEach(target => {
        target.style.display = 'none';
    });
    
    // Show ONLY the specific target for this hotspot
    const targetEntity = document.getElementById(`target-${hotspotId}`);
    if (targetEntity) {
        targetEntity.style.display = 'block';
        console.log(`Enabled target detection for: ${hotspotId}`);
    }
    
    // Show MindAR scene
    mindarScene.style.display = 'block';
    mindarScene.classList.add('show');
    
    // Ensure UI buttons stay on top when MindAR scene is active
    ensureUIButtonsOnTop();
    
    isMindarActive = true;
    
    console.log(`MindAR scene activated for hotspot: ${hotspotId}`);
}

// Hide MindAR scene and return to main scene
function hideMindARScene() {
    currentActiveHotspotId = null;
    if (!mindarScene) {
        return;
    }
    
    // Hide debug status (keep it hidden)
    const debugStatus = document.getElementById('mindar-debug-status');
    if (debugStatus) {
        debugStatus.style.display = 'none';
        debugStatus.style.visibility = 'hidden';
    }
    
    // Stop any playing video
    if (currentMindarVideo) {
        currentMindarVideo.pause();
        currentMindarVideo.currentTime = 0;
        currentMindarVideo = null;
    }
    
    // Reset all video elements to ensure clean state
    const allVideos = document.querySelectorAll('video[id^="video-"]');
    allVideos.forEach(video => {
        video.pause();
        video.currentTime = 0;
        video.muted = true; // Reset to muted state
    });
    
    // Hide MindAR scene
    mindarScene.style.display = 'none';
    mindarScene.classList.remove('show');
    
    // Restore UI buttons to original positions
    restoreUIButtons();
    
    // Show main AR scene
    const mainScene = document.getElementById('ar-scene');
    if (mainScene) {
        mainScene.style.display = 'block';
    }
    
    isMindarActive = false;
    
    console.log('MindAR scene deactivated and all videos reset');
}

// Show MindAR loading indicator
function showMindarLoading(message = 'Loading...') {
    hideMindarLoading(); // Remove any existing loading indicator
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'mindar-loading-indicator';
    loadingDiv.className = 'mindar-loading';
    loadingDiv.textContent = message;
    
    document.body.appendChild(loadingDiv);
}

// Hide MindAR loading indicator
function hideMindarLoading() {
    const loadingDiv = document.getElementById('mindar-loading-indicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Update MindAR debug UI with audio information
function updateMindarDebugUI(hotspotId, video, status = null) {
    const debugStatus = document.getElementById('mindar-debug-status');
    if (!debugStatus) return;
    
    // Update hotspot ID
    const hotspotIdElement = document.getElementById('mindar-hotspot-id');
    if (hotspotIdElement) {
        hotspotIdElement.textContent = hotspotId;
    }
    
    // Add audio debug information
    let audioInfo = '';
    if (video) {
        audioInfo = `
            <div>Video muted: ${video.muted}</div>
            <div>Video paused: ${video.paused}</div>
            <div>Video volume: ${video.volume}</div>
            <div>Video readyState: ${video.readyState}</div>
            <div>User interacted: ${hasUserInteracted}</div>
            <div>Video src: ${video.src || video.currentSrc || 'No src'}</div>
        `;
    } else {
        audioInfo = '<div>Video: Not found</div>';
    }
    
    if (status) {
        audioInfo += `<div>Status: ${status}</div>`;
    }
    
    // Update or create audio debug section
    let audioDebugElement = document.getElementById('mindar-audio-debug');
    if (!audioDebugElement) {
        audioDebugElement = document.createElement('div');
        audioDebugElement.id = 'mindar-audio-debug';
        audioDebugElement.style.marginTop = '10px';
        audioDebugElement.style.fontSize = '12px';
        debugStatus.appendChild(audioDebugElement);
    }
    audioDebugElement.innerHTML = audioInfo;
}

// Show loading ring around center target
function showLoadingRing() {
    const centerTarget = document.getElementById('center-target');
    if (centerTarget) {
        centerTarget.classList.add('loading');
        console.log('🔄 Loading ring shown');
    }
}

// Hide loading ring around center target
function hideLoadingRing() {
    const centerTarget = document.getElementById('center-target');
    if (centerTarget) {
        centerTarget.classList.remove('loading');
        console.log('✅ Loading ring hidden');
    }
}

// Show video playing state (hide crosshair)
function showVideoPlaying() {
    const centerTarget = document.getElementById('center-target');
    if (centerTarget) {
        centerTarget.classList.add('video-playing');
        console.log('🎬 Video playing state shown - crosshair hidden');
        console.log('🎬 Center target classes:', centerTarget.className);
    } else {
        console.error('❌ Center target element not found!');
    }
}

// Hide video playing state (show crosshair)
function hideVideoPlaying() {
    const centerTarget = document.getElementById('center-target');
    if (centerTarget) {
        centerTarget.classList.remove('video-playing');
        console.log('🎯 Video playing state hidden - crosshair shown');
        console.log('🎯 Center target classes:', centerTarget.className);
    } else {
        console.error('❌ Center target element not found!');
    }
}

// Prevent video loading for completed hotspots
function preventVideoLoadingForCompletedHotspot(hotspotId) {
    console.log(`🚫 Preventing future video loading for completed hotspot: ${hotspotId}`);
    
    // Map hotspot IDs to video element IDs
    const videoIdMapping = {
        'romulus': 'video-romulus',
        'caesar': 'video-caesar',
        'nero': 'video-nero',
        'silenus': 'video-silenus',
        'furies': 'video-furies',
        'herakles': 'video-herakles',
        'alexander': 'video-alexander',
        'diana': 'video-diana'
    };
    
    const videoId = videoIdMapping[hotspotId] || `video-${hotspotId}`;
    const video = document.getElementById(videoId);
    
    if (video) {
        // Change preload to none to prevent any future loading
        video.setAttribute('preload', 'none');
        console.log(`✅ Video preload disabled for ${hotspotId}`);
        
        // Also remove the video source to prevent any loading
        const sources = video.querySelectorAll('source');
        sources.forEach(source => {
            source.remove();
        });
        console.log(`✅ Video sources removed for ${hotspotId}`);
        
        // Update preload status to indicate this video should not be loaded
        videoPreloadStatus.set(videoId, 'disabled');
    }
}

// Handle MindAR target lost
function handleMindarTargetLost(hotspotId) {
    console.log(`🎯 MindAR target lost for hotspot: ${hotspotId}`);
    
    // Hide tap-to-play text when target is lost
    hideTapToPlayText();
    
    // Hide transcript button when target is lost
    showTranscriptButton(false);
    
    // Map hotspot IDs to video element IDs
    const videoIdMapping = {
        'romulus': 'video-romulus',
        'caesar': 'video-caesar',
        'nero': 'video-nero',
        'silenus': 'video-silenus',
        'furies': 'video-furies',
        'herakles': 'video-herakles',
        'alexander': 'video-alexander',
        'diana': 'video-diana'
    };
    
    const videoId = videoIdMapping[hotspotId] || `video-${hotspotId}`;
    const video = document.getElementById(videoId);
    
    if (video && !video.paused) {
        console.log(`⏸️ Pausing video for lost target: ${hotspotId}`);
        video.pause();
        
        // Hide video playing state (show crosshair)
        hideVideoPlaying();
        
        // Trigger fade-out animation
        const videoOverlay = document.getElementById(`videooverlay-${hotspotId}`);
        if (videoOverlay) {
            videoOverlay.emit('fadeout-' + hotspotId);
        }
    }
}

// Handle MindAR target detection
function handleMindarTargetFound(hotspotId) {
    console.log(`🎯 MindAR target detected for hotspot: ${hotspotId}`);
    
    // Check if this hotspot has already been completed
    if (activatedHotspots.has(hotspotId)) {
        console.log(`🚫 Hotspot ${hotspotId} already completed - preventing video loading and playback`);
        return;
    }
    
    // Map hotspot IDs to video element IDs (handle naming inconsistencies)
    const videoIdMapping = {
        'romulus': 'video-romulus',
        'caesar': 'video-caesar',
        'nero': 'video-nero',
        'silenus': 'video-silenus',
        'furies': 'video-furies', // Config uses 'furie' but video element is 'furies'
        'herakles': 'video-herakles',
        'alexander': 'video-alexander',
        'diana': 'video-diana'
    };
    
    const videoId = videoIdMapping[hotspotId] || `video-${hotspotId}`;
    console.log(`🔍 Looking for video element: ${videoId}`);
    console.log(`🔍 Hotspot ID: ${hotspotId}, Mapped to video ID: ${videoId}`);
    
    // Get the video element
    const video = document.getElementById(videoId);
    if (video) {
        console.log(`✅ Video element found: ${videoId}`);
        currentMindarVideo = video;
        
        // Check if video is already playing - if so, just resume
        if (!video.paused) {
            console.log(`▶️ Video already playing for ${hotspotId}, no action needed`);
            return;
        }
        
        // Check if video has been started before (has currentTime > 0)
        if (video.currentTime > 0) {
            console.log(`▶️ Resuming video from ${video.currentTime}s for ${hotspotId}`);
            video.play().then(() => {
                console.log(`✅ Video resumed successfully for hotspot: ${hotspotId}`);
                
                // Hide loading ring when video resumes
                hideLoadingRing();
                
                // Show video playing state (hide crosshair)
                showVideoPlaying();
                
                // Trigger fade-in animation
                const videoOverlay = document.getElementById(`videooverlay-${hotspotId}`);
                if (videoOverlay) {
                    videoOverlay.emit('fadein-' + hotspotId);
                }
            }).catch(error => {
                console.error(`❌ Video resume failed for ${hotspotId}:`, error);
                // Hide loading ring on error
                hideLoadingRing();
            });
            return;
        }
        
        console.log(`🔍 Starting video playback process for first time...`);
        
        // Check if video is preloaded
        const isPreloaded = isVideoPreloaded(videoId);
        console.log(`📥 Video preload status: ${isPreloaded ? 'Ready' : 'Not ready'}`);
        
        // Additional debugging for video element
        console.log(`📹 Video readyState: ${video.readyState} (0=no data, 1=metadata, 2=current data, 3=future data, 4=enough data)`);
        console.log(`📹 Video paused: ${video.paused}`);
        console.log(`📹 Video muted: ${video.muted}`);
        console.log(`📹 Video src: ${video.src || video.currentSrc}`);
        console.log(`📹 Video duration: ${video.duration}`);
        console.log(`📹 Video currentTime: ${video.currentTime}`);
        console.log(`📹 Video autoplay: ${video.autoplay}`);
        console.log(`📹 Video playsinline: ${video.playsInline}`);
        
        // Update debug UI with audio information
        updateMindarDebugUI(hotspotId, video);
        
        // If video is not preloaded, show loading ring and wait
        if (!isPreloaded) {
            console.log(`⏳ Video not preloaded, showing loading ring and waiting...`);
            showLoadingRing();
            
            // For iOS, we need to trigger video loading with user interaction
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
                console.log(`🍎 iOS detected - triggering video load with user interaction`);
                // Force video to start loading
                video.load();
            }
            
            // Wait for video to be ready
            const waitForVideoReady = () => {
                if (video.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
                    console.log(`✅ Video is now ready to play`);
                    hideLoadingRing();
                    playVideo();
                } else {
                    console.log(`⏳ Video still loading, readyState: ${video.readyState}`);
                    setTimeout(waitForVideoReady, 500);
                }
            };
            
            // Start waiting for video to be ready
            setTimeout(waitForVideoReady, 100);
            return;
        }
        
        // Adjust video plane dimensions for webm format on Android
        const adjustVideoPlaneForFormat = (hotspotId, video) => {
            const videoPlane = document.getElementById(`videooverlay-${hotspotId}`);
            if (!videoPlane) return;
            
            // Check if video is webm format
            const isWebm = video.src && video.src.includes('.webm');
            const isAndroid = /Android/i.test(navigator.userAgent);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            
            // Store original dimensions if not already stored
            if (!videoPlane.getAttribute('data-original-width')) {
                const originalWidth = videoPlane.getAttribute('width');
                const originalHeight = videoPlane.getAttribute('height');
                videoPlane.setAttribute('data-original-width', originalWidth);
                videoPlane.setAttribute('data-original-height', originalHeight);
                console.log(`📱 Stored original dimensions for ${hotspotId}: ${originalWidth}x${originalHeight}`);
            }
            
            if (isWebm && isAndroid) {
                console.log(`📱 Adjusting video plane dimensions for webm on Android: ${hotspotId}`);
                
                // Get original dimensions
                const originalWidth = videoPlane.getAttribute('data-original-width');
                const originalHeight = videoPlane.getAttribute('data-original-height');
                
                // Apply webm-specific adjustments (increase width to compensate for squashing)
                const webmWidth = parseFloat(originalWidth) * 1.3; // 30% wider
                const webmHeight = originalHeight; // Keep height the same
                
                videoPlane.setAttribute('width', webmWidth);
                videoPlane.setAttribute('height', webmHeight);
                
                console.log(`📱 Webm adjustment applied - Width: ${originalWidth} → ${webmWidth}, Height: ${originalHeight} → ${webmHeight}`);
            } else if (isIOS) {
                console.log(`🍎 iOS video plane adjustment for: ${hotspotId}`);
                // Ensure iOS videos have proper dimensions
                const originalWidth = videoPlane.getAttribute('data-original-width');
                const originalHeight = videoPlane.getAttribute('data-original-height');
                
                if (originalWidth && originalHeight) {
                    videoPlane.setAttribute('width', originalWidth);
                    videoPlane.setAttribute('height', originalHeight);
                    console.log(`🍎 iOS: Set video plane dimensions to ${originalWidth}x${originalHeight}`);
                }
            } else if (!isWebm && isAndroid) {
                // Restore original dimensions for mp4 on Android
                const originalWidth = videoPlane.getAttribute('data-original-width');
                const originalHeight = videoPlane.getAttribute('data-original-height');
                
                if (originalWidth && originalHeight) {
                    videoPlane.setAttribute('width', originalWidth);
                    videoPlane.setAttribute('height', originalHeight);
                    console.log(`📱 Restored original dimensions for mp4: ${hotspotId}`);
                }
            }
        };

        // Simple video playback function
        const playVideo = () => {
            console.log(`=== PLAYING VIDEO FOR ${hotspotId.toUpperCase()} ===`);
            console.log(`hasUserInteracted: ${hasUserInteracted}`);
            console.log(`Video readyState before play: ${video.readyState}`);
            console.log(`Video paused before play: ${video.paused}`);
            console.log(`Video muted before play: ${video.muted}`);
            console.log(`Video volume before play: ${video.volume}`);
            console.log(`Video duration: ${video.duration}`);
            console.log(`Video currentTime: ${video.currentTime}`);
            
            // Check if we're on iOS
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            
            // Adjust video plane dimensions for webm format
            adjustVideoPlaneForFormat(hotspotId, video);
            
            // Reset video to beginning
            video.currentTime = 0;
            
            if (isIOS) {
                console.log(`🍎 iOS video playback - trying automatic playback first`);
                // For iOS, try to play with sound if user has interacted, otherwise muted
                if (hasUserInteracted) {
                    video.muted = false;
                    video.volume = 1.0;
                    console.log(`🍎 iOS: Attempting to play with sound (user has interacted)`);
                } else {
                    video.muted = true;
                    video.volume = 0;
                    console.log(`🍎 iOS: Attempting to play muted (no user interaction yet)`);
                }
                
                // Ensure video has the right attributes for iOS
                video.setAttribute('playsinline', 'true');
                video.setAttribute('webkit-playsinline', 'true');
            } else {
                console.log(`🤖 Non-iOS video playback`);
                // For non-iOS, we can try to play with sound if user has interacted
                if (hasUserInteracted) {
                    video.muted = false;
                    video.volume = 1.0;
                } else {
                    video.muted = true;
                    video.volume = 0;
                }
            }
            
            // Try to play the video
            console.log(`Calling video.play() for ${hotspotId}...`);
            const playPromise = video.play();
            
            // Set up tap-to-play fallback for iOS if video doesn't start automatically
            if (isIOS) {
                setTimeout(() => {
                    if (video.paused) {
                        console.log(`🍎 iOS: Video didn't start automatically - showing tap-to-play`);
                        addTapToPlayFallback(video, hotspotId);
                    }
                }, 1500); // Wait 1.5 seconds to see if video starts automatically
            }
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`✅ Video playing successfully for hotspot: ${hotspotId}`);
                    console.log(`Video is now playing: ${!video.paused}`);
                    console.log(`Video muted: ${video.muted}`);
                    console.log(`Video volume: ${video.volume}`);
                    
                    // Hide loading ring when video starts playing
                    hideLoadingRing();
                    
                    // Hide tap-to-play text when video starts playing
                    hideTapToPlayText();
                    
                    // Show video playing state (hide crosshair)
                    showVideoPlaying();
                    
                    // Try to unmute after video starts playing (iOS workaround)
                    if (hasUserInteracted) {
                        setTimeout(() => {
                            video.muted = false;
                            video.volume = 1.0;
                            console.log(`Video unmuted after play start for: ${hotspotId}`);
                        }, 100);
                    }
                    
                    // Update debug UI
                    updateMindarDebugUI(hotspotId, video, hasUserInteracted ? 'Playing with audio' : 'Playing muted');
                    
                    // Trigger fade-in animation
                    const videoOverlay = document.getElementById(`videooverlay-${hotspotId}`);
                    if (videoOverlay) {
                        videoOverlay.emit('fadein-' + hotspotId);
                    }
                    
                    // Set up video end handler
                    video.addEventListener('ended', () => {
                        // Hide tap-to-play text when video ends
                        hideTapToPlayText();
                        handleVideoEnded(hotspotId);
                    }, { once: true });
                    
                }).catch(error => {
                    console.error(`❌ Video play failed for ${hotspotId}:`, error);
                    console.error(`Error details:`, error.message);
                    updateMindarDebugUI(hotspotId, video, 'Play failed: ' + error.message);
                    
                    // Hide loading ring on error
                    hideLoadingRing();
                    
                    // On iOS, show tap-to-play when automatic play fails
                    if (isIOS) {
                        console.log(`🍎 iOS: Automatic play failed - showing tap-to-play`);
                        addTapToPlayFallback(video, hotspotId);
                        return; // Don't try muted fallback on iOS, let user tap
                    }
                    
                    // Try fallback: play muted first, then unmute if user has interacted
                    console.log('Trying fallback: play muted first');
                    video.muted = true;
                    video.play().then(() => {
                        console.log('Video playing muted, attempting to unmute...');
                        
                        // Hide loading ring when fallback succeeds
                        hideLoadingRing();
                        
                        // Hide tap-to-play text when video starts playing
                        hideTapToPlayText();
                        
                        // Show video playing state (hide crosshair)
                        showVideoPlaying();
                        
                        // Trigger fade-in animation
                        const videoOverlay = document.getElementById(`videooverlay-${hotspotId}`);
                        if (videoOverlay) {
                            videoOverlay.emit('fadein-' + hotspotId);
                        }
                        
                        // If user has interacted, try to unmute after a short delay
                        if (hasUserInteracted) {
                            setTimeout(() => {
                                video.muted = false;
                                video.volume = 1.0;
                                console.log('Video unmuted successfully');
                            }, 100);
                        }
                        
                        // Set up video end handler
                        video.addEventListener('ended', () => {
                            // Hide tap-to-play text when video ends
                            hideTapToPlayText();
                            handleVideoEnded(hotspotId);
                        }, { once: true });
                        
                    }).catch(fallbackError => {
                        console.error('Fallback play failed:', fallbackError);
                        updateMindarDebugUI(hotspotId, video, 'Fallback failed: ' + fallbackError.message);
                        // Final fallback: show congratulations after a delay
                        setTimeout(() => {
                            handleVideoEnded(hotspotId);
                        }, 3000);
                    });
                });
            } else {
                console.error('Video.play() returned undefined - this should not happen');
                updateMindarDebugUI(hotspotId, video, 'Play returned undefined');
            }
        };
        
        // Show loading ring while video is loading
        showLoadingRing();
        
        // Show transcript button when hotspot is found (with a small delay to ensure it's visible)
        setTimeout(() => {
            showTranscriptButton(true);
        }, 100);
        
        // Ensure video is loaded before playing
        if (video.readyState < 2) {
            console.log(`⏳ Video not ready (readyState: ${video.readyState}), loading...`);
            video.load();
            
            // Wait for video to be loaded
            video.addEventListener('loadeddata', () => {
                console.log(`Video loaded, calling playVideo function...`);
                playVideo();
            }, { once: true });
            return;
        }
        
        // If video is ready, play immediately
        console.log(`Video is ready (readyState: ${video.readyState}), calling playVideo function...`);
        playVideo();
    } else {
        console.error(`Video element not found for hotspot: ${hotspotId}`);
        updateMindarDebugUI(hotspotId, null, 'Video element not found');
    }
}

// Handle video ended
function handleVideoEnded(hotspotId) {
    console.log(`Video ended for hotspot: ${hotspotId}`);
    
    // Hide tap-to-play text when video ends
    hideTapToPlayText();
    
    // Hide video playing state (show crosshair)
    hideVideoPlaying();
    
    // Mark the hotspot as completed immediately
    activatedHotspots.add(hotspotId);
    console.log(`Hotspot ${hotspotId} marked as completed! Total activated: ${activatedHotspots.size}/${currentHotspotOrder.length}`);
    
    // Prevent future video loading for this hotspot
    preventVideoLoadingForCompletedHotspot(hotspotId);
    
    // Refresh all hotspot visual states to show completed status
    refreshAllHotspotVisualStates();
    
    // Restore original video plane dimensions
    const videoPlane = document.getElementById(`videooverlay-${hotspotId}`);
    if (videoPlane) {
        const originalWidth = videoPlane.getAttribute('data-original-width');
        const originalHeight = videoPlane.getAttribute('data-original-height');
        
        if (originalWidth && originalHeight) {
            videoPlane.setAttribute('width', originalWidth);
            videoPlane.setAttribute('height', originalHeight);
            console.log(`📱 Restored original video plane dimensions for: ${hotspotId}`);
        }
    }
    
    // Hide MindAR scene
    hideMindARScene();
    
    // Hide transcript button when badge popup appears
    showTranscriptButton(false);
    
    // Show congratulations overlay
    const badgeId = hotspotToBadgeMapping[hotspotId];
    if (badgeId) {
        unlockBadge(badgeId);
    }
}

// Show target found indicator
function showTargetFoundIndicator() {
    hideTargetFoundIndicator(); // Remove any existing indicator
    
    const indicator = document.createElement('div');
    indicator.id = 'mindar-target-found-indicator';
    indicator.className = 'mindar-target-found';
    indicator.textContent = 'Target Found!';
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 2 seconds
    setTimeout(() => {
        hideTargetFoundIndicator();
    }, 2000);
}

// Hide target found indicator
function hideTargetFoundIndicator() {
    const indicator = document.getElementById('mindar-target-found-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Modified activateHotspot function to trigger MindAR
function activateHotspotWithMindAR(hotspotId, entity) {
    if (activatedHotspots.has(hotspotId)) {
        console.log(`Hotspot ${hotspotId} already activated - skipping MindAR activation`);
        return; // Already activated - don't allow repeat detection
    }
    
    console.log(`Activating MindAR for hotspot: ${hotspotId}`);
    
    // Set the current active hotspot ID
    currentActiveHotspotId = hotspotId;
    
    // Show the appropriate MindAR target
    const targetEntity = document.getElementById(`target-${hotspotId}`);
    if (targetEntity) {
        targetEntity.style.display = 'block';
        console.log(`Showing MindAR target for: ${hotspotId}`);
    } else {
        console.error(`No MindAR target found for hotspot: ${hotspotId}`);
        // Fallback to original activation
        activateHotspot(hotspotId, entity);
        return;
    }
    
    // Show MindAR scene
    showMindARScene(hotspotId);
    
    // Set up target detection handler
    if (targetEntity) {
        targetEntity.addEventListener('targetFound', () => {
            console.log(`Target found event fired for hotspot: ${hotspotId}`);
            handleMindarTargetFound(hotspotId);
        });
        
        targetEntity.addEventListener('targetLost', () => {
            console.log(`Target lost event fired for hotspot: ${hotspotId}`);
            handleMindarTargetLost(hotspotId);
        });
    }
}

// Add tap-to-play fallback for iOS
function addTapToPlayFallback(video, hotspotId) {
    console.log(`🍎 Setting up tap-to-play fallback for ${hotspotId}`);
    
    // Show tap-to-play text
    showTapToPlayText();
    
    const tapHandler = (event) => {
        console.log(`Tap detected - attempting to play video for ${hotspotId}`);
        
        // Hide tap-to-play text
        hideTapToPlayText();
        
        // Mark user interaction for this video
        hasUserInteracted = true;
        
        // Try to play with sound
        video.muted = false;
        video.volume = 1.0;
        
        video.play().then(() => {
            console.log(`Video playing after tap for ${hotspotId}`);
            document.removeEventListener('touchstart', tapHandler);
            document.removeEventListener('click', tapHandler);
            
                    // Hide loading ring when video starts playing
                    hideLoadingRing();
                    
                    // Show video playing state (hide crosshair)
                    showVideoPlaying();
                    
                    // Ensure UI buttons stay on top during video playback
                    ensureUIButtonsOnTop();
            
            // Trigger fade-in animation
            const videoOverlay = document.getElementById(`videooverlay-${hotspotId}`);
            if (videoOverlay) {
                videoOverlay.emit('fadein-' + hotspotId);
            }
            
            // Set up video end handler
            video.addEventListener('ended', () => {
                hideTapToPlayText();
                handleVideoEnded(hotspotId);
            }, { once: true });
            
        }).catch(error => {
            console.error(`Tap play failed for ${hotspotId}:`, error);
            // Try muted as fallback
            video.muted = true;
            video.play().then(() => {
                console.log(`Video playing muted after tap for ${hotspotId}`);
                
                // Hide loading ring when fallback succeeds
                hideLoadingRing();
                
                // Show video playing state (hide crosshair)
                showVideoPlaying();
                
                // Trigger fade-in animation
                const videoOverlay = document.getElementById(`videooverlay-${hotspotId}`);
                if (videoOverlay) {
                    videoOverlay.emit('fadein-' + hotspotId);
                }
                
                // Set up video end handler
                video.addEventListener('ended', () => {
                    hideTapToPlayText();
                    handleVideoEnded(hotspotId);
                }, { once: true });
                
                // Try to unmute after a short delay
                setTimeout(() => {
                    video.muted = false;
                    video.volume = 1.0;
                }, 100);
            }).catch(fallbackError => {
                console.error(`Even muted play failed for ${hotspotId}:`, fallbackError);
            });
        });
    };
    
    // Add both touch and click event listeners for better compatibility
    document.addEventListener('touchstart', tapHandler, { once: true });
    document.addEventListener('click', tapHandler, { once: true });
    
    // Remove listeners after 10 seconds
    setTimeout(() => {
        document.removeEventListener('touchstart', tapHandler);
        document.removeEventListener('click', tapHandler);
        hideTapToPlayText();
    }, 10000);
}

// Test function to manually test video playback
function testVideoPlayback(hotspotId = 'romulus') {
    console.log(`Testing video playback for: ${hotspotId}`);
    const videoId = `video-${hotspotId}`;
    const video = document.getElementById(videoId);
    
    if (video) {
        console.log(`Video element found: ${videoId}`);
        console.log(`Video readyState: ${video.readyState}`);
        console.log(`Video paused: ${video.paused}`);
        console.log(`Video muted: ${video.muted}`);
        
        // Try to play the video
        video.currentTime = 0;
        video.muted = false;
        video.play().then(() => {
            console.log(`Video play test successful!`);
        }).catch(error => {
            console.error(`Video play test failed:`, error);
        });
    } else {
        console.error(`Video element not found: ${videoId}`);
    }
}

// Make test function globally accessible
window.testVideoPlayback = testVideoPlayback;

// Initialize MindAR when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    // Initialize MindAR system
    setTimeout(() => {
        initializeMindAR();
    }, 1000);
}); 

function recreateMindARScene() {
    // Get the original MindAR scene HTML from the page
    const originalScene = document.querySelector('#mindar-scene');
    if (originalScene) {
        // Clone the original scene
        mindarScene = originalScene.cloneNode(true);
        
        // Add it back to the DOM
        document.body.appendChild(mindarScene);
        
        // Reinitialize MindAR event listeners
        initializeMindAR();
        
        console.log('MindAR scene recreated successfully');
        return true;
    }
    
    console.error('Could not recreate MindAR scene - original not found');
    return false;
}