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

let currentFixedAngleDisplay;
let currentYPositionDisplay;
let currentZDepthDisplay;

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
            
            // Fallback to default config if specific one fails
            if (configFile !== './Scripts/hotspotsConfig.json') {
                console.log('Attempting fallback to default config...');
                fetch('./Scripts/hotspotsConfig.json')
                    .then((response) => response.json())
                    .then((data) => {
                        hotspotsConfig = data;
                        hotspots = Object.keys(data);
                        currentHotspotOrder = [...hotspots];
                        
                        console.log('Fallback config loaded successfully');
                        
                        // Continue with initialization using fallback config
                        return preloadAllHotspotImages(data);
                    })
                    .then(() => {
                        hotspots.forEach((hotspotId, index) => {
                            const hotspotData = hotspotsConfig[hotspotId];
                            const commonValues = hotspotData.common;
                            const mediaArray = hotspotData.media;

                            const fixedAngleDegrees = commonValues.fixedAngleDegrees || 0;
                            const currentY = commonValues.initialY || 0;
                            const currentZoom = Math.abs(commonValues.initialZ) || 25;

                            const radians = (fixedAngleDegrees * Math.PI) / 180;
                            const position = {
                                x: -currentZoom * Math.sin(radians),
                                y: currentY,
                                z: -currentZoom * Math.cos(radians)
                            };

                            const rotation = { x: 0, y: 0, z: 0 };

                            mediaArray
                                .filter(mediaItem => mediaItem.type === "image")
                                .forEach((mediaItem, mediaIndex) => {
                                    displayHotspotMedia(mediaItem, mediaIndex, commonValues, position, rotation, hotspotId, index);
                                });
                        });
                        
                        setTimeout(() => {
                            refreshAllHotspotVisualStates();
                        }, 100);
                    })
                    .catch((fallbackError) => {
                        console.error("Error loading fallback config:", fallbackError);
                    });
            }
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
    initializeHotspots();

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

    // Add a raycaster event to show the hotspot modal when the image is hovered (intersected)
    entity.addEventListener('raycaster-intersected', function () {
        // Check if this hotspot can be activated (sequential order)
        if (!canActivateHotspot(hotspotId)) {
            return; // Don't allow activation if not in sequence
        }

        console.log('Hotspot intersected:', mediaItem.url);
        entity.setAttribute('material', 'color', '#FBD86F');  // Change color on hover/tap to HRP yellow

        // Change crosshair to green when hovering over hotspot
        const centerTarget = document.getElementById('center-target');
        if (centerTarget) {
            centerTarget.classList.add('hotspot-hover');
        }

        // Update badges/replay button based on whether hotspot has been triggered
        const isAlreadyTriggered = activatedHotspots.has(hotspotId);
        updateBadgesReplayButton(isAlreadyTriggered);

        // Show simple notification
        showHotspotNotification(mediaItem.info || 'Hotspot');

        // Activate the hotspot
        activateHotspot(hotspotId, entity);
    });

    entity.addEventListener('raycaster-intersected-cleared', function () {
        console.log('Hotspot no longer intersected:', mediaItem.url);
        
        // Reset to appropriate state based on activation status
        if (activatedHotspots.has(hotspotId)) {
            entity.setAttribute('material', 'color', '#FBD86F'); // Keep yellow for activated
        } else {
            entity.setAttribute('material', 'color', 'white'); // Reset to white for inactive
        }

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

// REMOVED: This function was creating duplicate hotspots at origin (0,0,0)
// which caused conflicts with the correctly positioned hotspots from initializeHotspots
// This was the root cause of the X-axis scaling jitter
// 
// For static AR hotspots, media changing is not needed - all hotspots are displayed at once

// function createLookImages() {
//     let scene = document.querySelector("a-scene");

//     lookImages.forEach((lookImage) => {
//         if (lookImage.parentNode) {
//             lookImage.parentNode.removeChild(lookImage);
//         }
//     });
//     lookImages = [];

//     const angles = [90, 180, 270];
//     angles.forEach((angle) => {
//         const radians = ((fixedAngleDegrees + angle) * Math.PI) / 180;
//         const lookX = -currentZoom * Math.sin(radians);
//         const lookZ = -currentZoom * Math.cos(radians);

//         const lookImage = document.createElement("a-image");
//         lookImage.setAttribute("src", "./Assets/look-for1.png");
//         lookImage.setAttribute("position", { x: lookX, y: 0, z: lookZ });
//         lookImage.setAttribute("rotation", {
//             x: 0,
//             y: angle + fixedAngleDegrees,
//             z: 0,
//         });
//         lookImage.setAttribute("scale", "14 4 1");
//         lookImage.setAttribute("visible", "true");
//         scene.appendChild(lookImage);
//         lookImages.push(lookImage);
//     });
// }

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
    return /Android/.test(navigator.userAgent);
}

// DISABLED: Touch handlers were causing conflicts with static hotspots
// These handlers were designed for movable media, not static AR hotspots
/*
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
        if (mediaEntity) {
            currentY = mediaEntity.getAttribute("position").y;
        }
        dragAxis = null; // Reset drag axis
    }
});
*/

// DISABLED: Touch handlers were causing conflicts with static hotspots
/*
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

        if (mediaEntity) {
            let position = mediaEntity.getAttribute("position");

            if (dragAxis === "x") {
                fixedAngleDegrees = initialFixedAngle - deltaX * dragSpeedX;

                const radians = (fixedAngleDegrees * Math.PI) / 180;
                const x = -currentZoom * Math.sin(radians);
                const z = -currentZoom * Math.cos(radians);

                mediaEntity.setAttribute("position", { x, y: position.y, z });
                mediaEntity.setAttribute("rotation", `0 ${fixedAngleDegrees} 0`);

                if (frameEntity) {
                    frameEntity.setAttribute("position", { x, y: position.y, z });
                    frameEntity.setAttribute("rotation", `0 ${fixedAngleDegrees} 0`);
                }

                lookImages.forEach((lookImage, index) => {
                    const angle = (index + 1) * 90;
                    const lookRadians = ((fixedAngleDegrees + angle) * Math.PI) / 180;
                    const lookX = -currentZoom * Math.sin(lookRadians);
                    const lookZ = -currentZoom * Math.cos(lookRadians);
                    lookImage.setAttribute("position", { x: lookX, y: 0, z: lookZ });
                    lookImage.setAttribute("rotation", { x: 0, y: angle + fixedAngleDegrees, z: 0 });
                });
            } else if (dragAxis === "y") {
                const adjustedDragSpeedY = dragSpeedY * (currentZoom / 45);
                const newY = position.y - deltaY * adjustedDragSpeedY;
                const clampedY = Math.max(minY, Math.min(maxY, newY));

                mediaEntity.setAttribute("position", { x: position.x, y: clampedY, z: position.z });

                if (frameEntity) {
                    frameEntity.setAttribute("position", { x: position.x, y: clampedY, z: position.z });
                }
            }

            initialMediaState.position = { ...mediaEntity.getAttribute("position") };
            initialMediaState.rotation = { ...mediaEntity.getAttribute("rotation") };

            updateCurrentValues();
        }
    }
}, { passive: false });
*/

// DISABLED: Touch handlers were causing conflicts with static hotspots
/*
document.addEventListener("touchend", function () {
    initialPinchDistance = null;
    isDragging = false;
    isPinching = false;
    dragAxis = null;
});
*/

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
    const hotspotIndex = currentHotspotOrder.indexOf(hotspotId);
    
    // First hotspot (index 0) can always be activated
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
        // Activated hotspot: tinted yellow with full opacity
        entity.setAttribute('material', 'color', '#FBD86F');
        entity.setAttribute('material', 'opacity', '1.0');
        console.log(`Hotspot ${hotspotId}: Activated (yellow, 100% opacity)`);
    } else if (canActivateHotspot(hotspotId)) {
        // Next available hotspot: normal white with glow effect and full opacity
        entity.setAttribute('material', 'color', 'white');
        entity.setAttribute('material', 'opacity', '1.0');
        createHotspotHalo(entity);
        console.log(`Hotspot ${hotspotId}: Active (white, 100% opacity, GLOWING)`);
    } else {
        // Future hotspot: 50% transparent white
        entity.setAttribute('material', 'color', 'white');
        entity.setAttribute('material', 'opacity', '0.5');
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
        entity.setAttribute('material', 'opacity', '1.0');
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

// Function to create animated halo effect around a hotspot
function createHotspotHalo(entity) {
    // Remove any existing halo first
    removeHotspotHalo(entity);
    
    const scene = document.querySelector("a-scene");
    const entityPosition = entity.getAttribute('position');
    const entityScale = entity.getAttribute('scale');
    
    // Calculate proper halo size based on hotspot scale
    // Use the actual hotspot dimensions for better matching
    const hotspotSize = Math.max(entityScale.x, entityScale.y);
    const outerRadius = hotspotSize * 0.55;  // Much smaller outer radius
    
    // Position halos slightly behind the hotspot to avoid Z-depth clashing
    const haloPosition = {
        x: entityPosition.x,
        y: entityPosition.y,
        z: entityPosition.z + 0.1  // Move 0.1 units behind the hotspot
    };
    
    // Create outer halo ring only
    const outerHalo = document.createElement('a-ring');
    outerHalo.setAttribute('radius-inner', outerRadius);
    outerHalo.setAttribute('radius-outer', hotspotSize * 0.7); // Closer to hotspot size
    outerHalo.setAttribute('position', haloPosition);
    outerHalo.setAttribute('material', 'color', 'white'); // Changed to white
    outerHalo.setAttribute('material', 'opacity', '0.5'); // Lower opacity for outer ring
    outerHalo.setAttribute('material', 'transparent', 'true');
    outerHalo.setAttribute('rotation', '0 0 90'); // Fixed: No rotation to match icons
    outerHalo.setAttribute('animation', {
        property: 'scale',
        to: '1.08 1.08 1.08', // Even smaller scale animation
        dur: 1000,
        easing: 'easeInOutQuad',
        loop: true,
        dir: 'alternate'
    });
    outerHalo.setAttribute('data-halo-type', 'outer');
    outerHalo.setAttribute('data-parent-hotspot', entity.getAttribute('data-hotspot-id'));
    
    // Add halo to scene
    scene.appendChild(outerHalo);
    
    // Store reference to halo on the entity
    entity.haloRings = [outerHalo];
    
    console.log(`Created white halo effect for hotspot ${entity.getAttribute('data-hotspot-id')} with size ${hotspotSize}`);
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
    
    // OK button click handler
    okBtn.addEventListener('click', function() {
        if (!okBtn.disabled) {
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
        video.playsInline = false; // Allow fullscreen
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
        // For iOS, we need to ensure the video can play with sound
        video.muted = false;
        video.play().catch(error => {
            console.warn('Video play failed:', error);
            // If play fails, try with muted first (iOS workaround)
            video.muted = true;
            video.play().then(() => {
                // Once playing, unmute
                video.muted = false;
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
    // TODO: Open transcript panel (to be implemented later)
    alert('Transcript panel will be implemented later');
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
    if (transcriptBtn) {
        transcriptBtn.style.display = show ? 'flex' : 'none';
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

// Initialize safety warning when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    // Small delay to ensure all elements are ready
    setTimeout(initializeSafetyWarning, 100);
    setTimeout(initializeMainUI, 200);
}); 