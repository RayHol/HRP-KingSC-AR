// Simple camera cleanup function
function releaseAllCamera() {
    // Release global camera stream
    releaseGlobalCamera();
    console.log('Camera cleanup - global camera released');
}

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
const GLOBAL_HOTSPOT_SCALE = 0.5// 1.0 = normal size; reduce to 0.05 to shrink ~20x

// ===== ENCANTAR TRACKING MODE MANAGEMENT =====
let currentTrackingMode = 'walls'; // 'walls' or 'image'
let currentImageTarget = null;
let currentVideoOverlay = null;

// Switch to wall tracking mode (show hotspots, hide videos)
function switchToWallTracking() {
    console.log('SWITCHING TO WALL TRACKING MODE');
    
    currentTrackingMode = 'walls';
    currentImageTarget = null;
    
    // Show wall tracking elements (hotspots)
    setEncantarAnchorsVisible(true);
    showAllHotspots();
    
    // Hide all video planes
    hideAllVideoPlanes();
    
    console.log('WALL TRACKING ENABLED');
}

// Switch to image tracking mode (hide hotspots, show video for specific image)
function switchToImageTracking(imageName, hotspotId) {
    console.log('SWITCHING TO IMAGE TRACKING MODE for:', imageName);
    
    // Hide any currently active video overlay
    if (currentActiveHotspotId) {
        hideVideoOverlay(currentActiveHotspotId);
    }
    
    currentTrackingMode = 'image';
    currentImageTarget = imageName;
    currentActiveHotspotId = hotspotId;
    
    // Hide wall tracking elements (hotspots)
    setEncantarAnchorsVisible(false);
    hideAllHotspots();
    
    // Hide all video planes first
    hideAllVideoPlanes();
    
    // Show the video plane for this image target
    const videoPlaneId = `video-plane-${hotspotId}`;
    const videoPlane = document.getElementById(videoPlaneId);
    if (videoPlane) {
        videoPlane.setAttribute('visible', 'true');
        console.log('VIDEO PLANE SHOWN:', videoPlaneId);
    } else {
        console.error('VIDEO PLANE NOT FOUND:', videoPlaneId);
    }
    
    // Note: Video playback will be handled when the image target is actually detected
    
    console.log('IMAGE TRACKING ENABLED:', imageName);
}

// Hide all Encantar video planes
function hideAllVideoPlanes() {
    const videoPlaneIds = [
        'video-plane-clouds', 'video-plane-banquet', 'video-plane-peacock', 
        'video-plane-graces', 'video-plane-trumpeter', 'video-plane-romulus',
        'video-plane-caesar', 'video-plane-nero', 'video-plane-silenus',
        'video-plane-furies', 'video-plane-alexander', 'video-plane-herakles',
        'video-plane-diana', 'video-plane-harvest', 'video-plane-cherubs',
        'video-plane-musicians', 'video-plane-signature'
    ];
    
    videoPlaneIds.forEach(id => {
        const plane = document.getElementById(id);
        if (plane) {
            plane.setAttribute('visible', 'false');
            const videoOverlay = plane.querySelector('a-plane');
            if (videoOverlay) {
                // Reset opacity and pause any playing video
                videoOverlay.setAttribute('material', 'opacity', '0');
                
                // Find and pause the corresponding video
                const hotspotId = id.replace('video-plane-', '');
                const video = document.getElementById(`video-${hotspotId}`);
                if (video) {
                    video.pause();
                    video.currentTime = 0;
                }
            }
        }
    });
}

// Show/hide all hotspot entities
function hideAllHotspots() {
    const hotspots = document.querySelectorAll('[data-hotspot-id]');
    hotspots.forEach(hotspot => {
        if (!hotspot.hasAttribute('ar-root')) { // Only hide hotspot entities, not video planes
            hotspot.setAttribute('visible', 'false');
        }
    });
}

function showAllHotspots() {
    const hotspots = document.querySelectorAll('[data-hotspot-id]');
    hotspots.forEach(hotspot => {
        if (!hotspot.hasAttribute('ar-root')) { // Only show hotspot entities, not video planes
            hotspot.setAttribute('visible', 'true');
        }
    });
}

// Simple camera cleanup
function releaseAllCamera() {
    console.log('Camera cleanup - Encantar manages its own camera');
}

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
let hotspotsInitialized = false;

// Map your hotspot ids to MindAR target indices
const targetIndexById = {
    clouds: 0,
    banquet: 1,
    peacock: 2,
    graces: 3,
    trumpeter: 4,
    romulus: 5,
    caesar: 6,
    nero: 7,
    silenus: 8,
    furies: 9,
    alexander: 10,
    herakles: 11,
    diana: 12,
    harvest: 13,
    cherubs: 14,
    musicians: 15,
    signature: 16
  };
  
  // Track which indices are finished (optional, useful if you never want them again)
  const completedTargets = new Set();

// ===== Encantar integration flags and helpers =====
const ENCANTAR_QUERY_FLAG = 'encantar';
function isEncantarEnabled() {
    // Always use Encantar mode by default
    return true;
}

// Surface metrics can be overridden at runtime by defining window.ENCANTAR_SURFACES
// Example:
// window.ENCANTAR_SURFACES = {
//   central: { widthMeters: 6.2, aspect: 16/9 },
//   north: { widthMeters: 7.0, aspect: 4/3 },
//   south: { widthMeters: 6.2, aspect: 4/3 },
//   ceiling: { widthMeters: 7.0, aspect: 1.0 }
// };
function getSurfaceMetrics(surfaceId) {
    const defaults = {
        central: { widthMeters: 6.0, aspect: 16/9 },
        north: { widthMeters: 6.0, aspect: 16/9 },
        south: { widthMeters: 6.0, aspect: 16/9 },
        ceiling: { widthMeters: 6.0, aspect: 1.0 }
    };
    const registry = (window.ENCANTAR_SURFACES || {});
    const base = registry[surfaceId] || defaults[surfaceId] || { widthMeters: 6.0, aspect: 16/9 };
    const width = Number(base.widthMeters) || 6.0;
    const aspect = Number(base.aspect) || (16/9);
    const height = width / aspect;
    return { width, height };
}

function setEncantarAnchorsVisible(visible) {
    const ids = ['surface-central-anchor','surface-north-anchor','surface-south-anchor','surface-ceiling-anchor'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.setAttribute('visible', visible ? 'true' : 'false');
        // Also toggle all children hotspots under the anchor
        const children = el.children || [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.setAttribute) child.setAttribute('visible', visible ? 'true' : 'false');
        }
    });
}

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
    
    switch(location) {
        case 'stairs':
            return './Scripts/hotspotsConfig-stairs.json';
        case 'balcony':
            return './Scripts/hotspotsConfig-balcony.json';
        default:
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
            
            // Ensure crosshair starts in default yellow state
            const centerTarget = document.getElementById('center-target');
            if (centerTarget) {
                centerTarget.classList.remove('hotspot-hover');
            }

            // PASS the already loaded data instead of fetching again
            return preloadAllHotspotImages(data);
        })
        .then(() => {
            // Wait for A-Frame scene to be ready and fully initialized
            const waitForSceneReady = () => {
                return new Promise((resolve) => {
                    const scene = document.querySelector("a-scene");
                    if (!scene) {
                        console.error("A-Frame scene not found when trying to create hotspots!");
                        resolve(null);
                        return;
                    }
                    
                    // Check if A-Frame is fully loaded
                    if (scene.hasLoaded) {
                        console.log('A-Frame scene already loaded');
                        resolve(scene);
                        return;
                    }
                    
                    // Wait for A-Frame to be ready
                    scene.addEventListener('loaded', () => {
                        console.log('A-Frame scene loaded event fired');
                        resolve(scene);
                    });
                    
                    // Fallback timeout
                    setTimeout(() => {
                        console.log('A-Frame scene timeout, proceeding anyway');
                        resolve(scene);
                    }, 2000);
                });
            };
            
            return waitForSceneReady();
        })
        .then((scene) => {
            if (!scene) {
                console.error("Failed to get A-Frame scene");
                return;
            }
            
            
            // NOW create the hotspots after images are loaded
            hotspots.forEach((hotspotId, index) => {
                const hotspotData = hotspotsConfig[hotspotId];
                const commonValues = hotspotData.common;
                
                const mediaArray = hotspotData.media;

                // For each hotspot, use the provided fixedAngleDegrees, initialY, and initialZ
                let fixedAngleDegrees = commonValues.fixedAngleDegrees || 0;
                let currentY = commonValues.initialY || 0;
                let currentZoom = Math.abs(commonValues.initialZ) || 25;

                // Calculate the position based on the fixedAngleDegrees and currentZoom (initialZ)
                const radians = (fixedAngleDegrees * Math.PI) / 180;
                const position = {
                    x: -currentZoom * Math.sin(radians),
                    y: currentY,
                    z: -currentZoom * Math.cos(radians)
                };

                // FIXED: Use consistent rotation for all hotspots - NO fixedAngleDegrees in rotation
                const rotation = { x: 0, y: 0, z: 0 }; // All icons face the same direction

                // Loop through each media item and only display 'image' media
                mediaArray
                    .filter(mediaItem => mediaItem.type === "image") // Filter only image type media
                    .forEach((mediaItem, mediaIndex) => {
                        displayHotspotMedia(mediaItem, mediaIndex, commonValues, position, rotation, hotspotId, index);
                    });
            });
            
            // After all hotspots are created, refresh their visual states to ensure proper initialization
            setTimeout(() => {
                refreshAllHotspotVisualStates();
                
                // Hotspots are now ready for user interaction
            }, 100);

            hotspotsInitialized = true;
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

    // MindAR coordination: pause Encantar anchors while a MindAR target is active
    const mindarScene = document.getElementById('mindar-scene');
    if (mindarScene && isEncantarEnabled()) {
        mindarScene.addEventListener('targetFound', () => setEncantarAnchorsVisible(false));
        mindarScene.addEventListener('targetLost', () => setEncantarAnchorsVisible(true));
    }
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
    let scene = document.querySelector("#ar-scene");
    
    if (!scene) {
        console.error("A-Frame scene not found!");
        return;
    }
    
    

    // Create the entity for the image
    let entity = document.createElement("a-image");
    entity.setAttribute('id', `hotspot-${hotspotId}-${index}`);

    // Set the media URL for the image
    entity.setAttribute("src", mediaItem.url);

    // Add the 'clickable' class to make the image detectable by the raycaster
    entity.classList.add('clickable');
    
    // Debug: Log when hotspot is created
    // Hotspot created with clickable class

    // Set the scale exactly as defined in the hotspotsConfig.json, then apply global scale
    let scaleComponents = commonValues.scale.split(' ').map(Number);
    const scaledX = scaleComponents[0] * GLOBAL_HOTSPOT_SCALE;
    const scaledY = scaleComponents[1] * GLOBAL_HOTSPOT_SCALE;
    const scaledZ = scaleComponents[2] * GLOBAL_HOTSPOT_SCALE;
    entity.setAttribute("scale", `${scaledX} ${scaledY} ${scaledZ}`); 

    // If Encantar is enabled and hotspot carries surface mapping, parent under surface anchor
    const hotspotCfg = (hotspotsConfig && hotspotsConfig[hotspotId]) ? hotspotsConfig[hotspotId] : null;
    const surfaceId = hotspotCfg && hotspotCfg.surfaceId;
    const hasUV = typeof(hotspotCfg && hotspotCfg.u) === 'number' && typeof(hotspotCfg && hotspotCfg.v) === 'number';
    const depthMeters = (hotspotCfg && typeof hotspotCfg.depthMeters === 'number') ? hotspotCfg.depthMeters : 0;

    if (isEncantarEnabled() && surfaceId && hasUV) {
        const anchorId = `surface-${surfaceId}-anchor`;
        const anchor = document.getElementById(anchorId);
        if (anchor) {
            // Parent to anchor
            anchor.appendChild(entity);
            // Compute local position from normalized u,v over surface
            const { width, height } = getSurfaceMetrics(surfaceId);
            const u = Math.min(1, Math.max(0, hotspotCfg.u));
            const v = Math.min(1, Math.max(0, hotspotCfg.v));
            const localX = (u - 0.5) * width;
            const localY = (0.5 - v) * height;
            entity.setAttribute('position', { x: localX, y: localY, z: depthMeters });
            // Ensure anchor (and child) visible when tracked
            anchor.addEventListener('componentinitialized', (e) => {
                if (e.detail && e.detail.name === 'ar-root') {
                    // no-op: ar-root manages visibility via play/pause
                }
            });
        } else {
            // Fallback to legacy absolute placement
            entity.setAttribute("position", currentPosition);
        }
    } else {
        // Legacy absolute placement
        entity.setAttribute("position", currentPosition);
    }
    entity.setAttribute("visible", "true");
    
    // FIXED: Use the rotation passed from initializeHotspots (includes fixedAngleDegrees)
    // This ensures position and rotation are consistent and eliminates jittering
    entity.setAttribute("rotation", currentRotation);
    
    // REMOVED: No look-at effect - this was causing conflicts with fixed rotation
    // The undefined yPosition variable was causing JavaScript errors

    // Set initial material and visual state based on sequential activation
    entity.setAttribute('material', {
        color: '#ff3355',
        opacity: 1.0,
        transparent: true,
        side: 'double',
        shader: 'flat',
        depthTest: false
    });
    
    // Store hotspot ID as data attribute for reference
    entity.setAttribute("data-hotspot-id", hotspotId);
    
    // Add clickable class for raycaster detection
    entity.classList.add('clickable');
    
    
    updateHotspotVisualState(entity, hotspotId, hotspotIndex);

    // Add the entity to the scene if not already parented to an anchor
    if (!entity.parentNode || entity.parentNode === scene) {
        scene.appendChild(entity);
    }
    

    // Debug log for placement
    // Hotspot created successfully
    // Hover feedback and MindAR activation with proper timing
    let hoverTimeout = null;
    
    entity.addEventListener('raycaster-intersected', function () {
        // Check if this hotspot can be activated (sequential order)
        if (!canActivateHotspot(hotspotId)) {
            return;
        }

        // Change crosshair to green when hovering over hotspot
        const centerTarget = document.getElementById('center-target');
        if (centerTarget) {
            centerTarget.classList.add('hotspot-hover');
        }

        // Update badges/replay button
        const isAlreadyTriggered = activatedHotspots.has(hotspotId);
        updateBadgesReplayButton(isAlreadyTriggered);

        // IMMEDIATE: Switch to image tracking mode for this hotspot
        const imageMapping = {
            'clouds': '1. Clouds', 'banquet': '2.Banquet', 'peacock': '3.Peacock',
            'graces': '4. Graces', 'trumpeter': '5.Trumpeter', 'romulus': '6. Romulus',
            'caesar': '7. Caeser', 'nero': '8. Nero', 'silenus': '9. Silenus',
            'furies': '10. Furies', 'alexander': '11. Alexander', 'herakles': '12. Herakles',
            'diana': '13.Diana', 'harvest': '14.Harvest', 'cherubs': '15.Cherubs',
            'musicians': '16.Musicians', 'signature': '17.Signature'
        };
        
        const imageName = imageMapping[hotspotId];
        if (imageName) {
            console.log('HOTSPOT ACTIVATED:', hotspotId, '->', imageName);
            switchToImageTracking(imageName, hotspotId);
        }
    });

    entity.addEventListener('raycaster-intersected-cleared', function () {
        
        // Clear any pending hover timeout
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
        
        // DON'T change opacity - maintain original visual state
        // Only reset crosshair and button states

        // Change crosshair back to yellow when no longer hovering over hotspot
        const centerTarget = document.getElementById('center-target');
        if (centerTarget) {
            centerTarget.classList.remove('hotspot-hover');
        }
        
        // Reset badges/replay button back to badges mode
        updateBadgesReplayButton(false);
        
        // DON'T switch back to Encantar immediately - let MindAR complete its video/badges
        // The switch back will happen when the video ends and badges are shown
    });

    // Require explicit click/fuse to activate MindAR
    entity.addEventListener('click', async function () {
        // Hotspot clicked
        if (!canActivateHotspot(hotspotId)) {
            // Cannot activate hotspot (sequence check failed)
            return;
        }
        
        // IMMEDIATELY pause Encantar to prevent camera contention
        if (isEncantarEnabled()) {
            console.log('PAUSING ENCANTAR...');
            try { 
                await pauseEncantar(); 
                setEncantarAnchorsVisible(false);
                console.log('ENCANTAR PAUSED');
            } catch(e) { 
                console.error('Failed to pause Encantar:', e);
            }
        }
        
        console.log('STARTING MINDAR...');
        activateHotspotWithImageTracking(hotspotId, entity);
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
    
    // Use MindAR integration if available, otherwise fallback to original behavior
    if (typeof activateHotspotWithImageTracking === 'function') {
        activateHotspotWithImageTracking(hotspotId, entity);
    } else {
        // Fallback: unlock corresponding badge directly
        const badgeId = hotspotToBadgeMapping[hotspotId];
        if (badgeId) {
            unlockBadge(badgeId);
        } else {
        }
    }
    
    // Refresh ALL hotspot visual states after activation
    refreshAllHotspotVisualStates();
    
    // Check if all hotspots are activated
    if (activatedHotspots.size === currentHotspotOrder.length) {
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
    } else if (canActivateHotspot(hotspotId)) {
        // Next available hotspot: normal white with rotating ring and 100% opacity
        entity.setAttribute('material', 'color', 'white');
        entity.setAttribute('material', 'opacity', '1.0');
        createHotspotRotatingRing(entity);
    } else {
        // Future hotspot: 70% transparent white
        entity.setAttribute('material', 'color', 'white');
        entity.setAttribute('material', 'opacity', '0.2');
    }
}

// Function to reset hotspot sequence (useful for testing or restarting)
function resetHotspotSequence() {
    activatedHotspots.clear();
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
    
    hotspotEntities.forEach(entity => {
        const hotspotId = entity.getAttribute('data-hotspot-id');
        if (hotspotId) {
            const hotspotIndex = currentHotspotOrder.indexOf(hotspotId);
            updateHotspotVisualState(entity, hotspotId, hotspotIndex);
        } else {
        }
    });
    
}

// Make refresh function globally accessible for testing
window.refreshAllHotspotVisualStates = refreshAllHotspotVisualStates;

// Function to manually test hotspot states (for debugging)
function testHotspotStates() {
    currentHotspotOrder.forEach((hotspotId, index) => {
        const canActivate = canActivateHotspot(hotspotId);
        const isActivated = activatedHotspots.has(hotspotId);
    });
    
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
        if (!okBtn.disabled) {
            // Mark that user has interacted (for iOS audio)
            hasUserInteracted = true;
            // Create and establish audio context for video playback
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        // Test audio context with a silent audio buffer
                        const buffer = audioContext.createBuffer(1, 1, 22050);
                        const source = audioContext.createBufferSource();
                        source.buffer = buffer;
                        source.connect(audioContext.destination);
                        source.start();
                    }).catch((e) => {
                    });
                } else {
                    // Test audio context with a silent audio buffer
                    const buffer = audioContext.createBuffer(1, 1, 22050);
                    const source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContext.destination);
                    source.start();
                }
            } catch (e) {
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
            });
        }
    } catch (e) {
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
    });
}

function playVideo() {
    const video = document.getElementById('intro-video');
    if (video) {
        // Mark that user has interacted (for iOS audio)
        hasUserInteracted = true;
        // Create a silent audio context to establish user interaction
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                });
            }
        } catch (e) {
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
    // Navigate back to index page with current location
    window.location.href = `index.html?location=${currentLocation}`;
}

// Help button handler
function handleHelpButton() {
    showHelpOverlay();
}

// Badges/Replay button handler
function handleBadgesReplayButton() {
    const isReplayMode = document.getElementById('badges-replay-text').textContent === 'REPLAY';
    
    if (isReplayMode) {
        // TODO: Replay current hotspot video (to be implemented later)
        alert('Replay functionality will be implemented later');
    } else {
        showBadgesOverlay();
    }
}

// Transcript button handler
function handleTranscriptButton() {
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
    const transcriptTitle = transcriptOverlay.querySelector('.transcript-title');
    const transcriptText = transcriptOverlay.querySelector('.transcript-text');
    
    transcriptTitle.textContent = hotspotsConfig[hotspotId].media[0].info;
    transcriptText.textContent = description;
    
    // Show overlay with slide-up animation
    transcriptOverlay.style.display = 'flex';
    transcriptOverlay.classList.add('show');
    
    }

// Create transcript overlay element
function createTranscriptOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'transcript-overlay';
    overlay.className = 'transcript-overlay';
    
    const content = document.createElement('div');
    content.className = 'transcript-content';
    
    const title = document.createElement('div');
    title.className = 'transcript-title';
    
    const text = document.createElement('div');
    text.className = 'transcript-text';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'transcript-close-btn';
    closeBtn.innerHTML = '✕';
    
    content.appendChild(closeBtn);
    content.appendChild(title);
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
    } else {
        // Switch to badges mode
        icon.src = './Assets/UI/crown-square-icon.png';
        text.textContent = 'BADGES';
    }
}

// Show/hide transcript button
function showTranscriptButton(show = true) {
    if (show) {
        // Small delay to ensure the overlay is ready
        setTimeout(() => {
            ensureUIButtonsOnTop();
        }, 100);
    } else {
        // Hide transcript button in overlay when not needed
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) {
            const transcriptButton = uiOverlay.querySelector('.transcript-button');
            if (transcriptButton) {
                transcriptButton.remove();
                }
        }
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
        
        // Create MindAR-specific buttons instead of cloning originals
        // Create Close Button (replaces back button)
        const closeBtn = document.createElement('button');
        closeBtn.className = 'mindar-button close-button';
        closeBtn.style.cssText = 'position: absolute; top: 15px; left: 15px; width: 40px; height: 40px; z-index: 999999; pointer-events: auto; display: flex; padding: 8px; justify-content: center; align-items: center; gap: 8px; border-radius: 8px; background: rgba(250, 250, 250, 0.20); backdrop-filter: blur(16px); border: none; cursor: pointer; transition: all 0.3s ease;';
        
        // Set display properties separately to ensure they override any CSS
        closeBtn.style.setProperty('display', 'flex', 'important');
        closeBtn.style.setProperty('visibility', 'visible', 'important');
        closeBtn.style.setProperty('opacity', '1', 'important');
        
        closeBtn.innerHTML = `✕`;
        closeBtn.addEventListener('click', function() {
            exitMindARMode();
        });
        uiOverlay.appendChild(closeBtn);

        // Create Replay Button (replaces badges button)
        const replayBtn = document.createElement('button');
        replayBtn.className = 'mindar-button replay-button';
        replayBtn.style.cssText = 'position: absolute; top: 15px; right: 115px; z-index: 999999; pointer-events: auto; display: flex; padding: 8px; justify-content: center; align-items: center; gap: 8px; border-radius: 8px; background: rgba(250, 250, 250, 0.20); backdrop-filter: blur(16px); border: none; cursor: pointer; transition: all 0.3s ease;';
        
        // Set display properties separately to ensure they override any CSS
        replayBtn.style.setProperty('display', 'flex', 'important');
        replayBtn.style.setProperty('visibility', 'visible', 'important');
        replayBtn.style.setProperty('opacity', '1', 'important');
        
        replayBtn.innerHTML = `REPLAY`;
        replayBtn.addEventListener('click', function() {
            restartCurrentVideo();
        });
        uiOverlay.appendChild(replayBtn);

        // Create Mute/Unmute Button
        const muteBtn = document.createElement('button');
        muteBtn.className = 'mindar-button mute-button';
        muteBtn.style.cssText = 'position: absolute; top: 15px; right: 65px; width: 40px; height: 40px; z-index: 999999; pointer-events: auto; display: flex; padding: 8px; justify-content: center; align-items: center; gap: 8px; border-radius: 8px; background: rgba(250, 250, 250, 0.20); backdrop-filter: blur(16px); border: none; cursor: pointer; transition: all 0.3s ease;';
        
        // Set display properties separately to ensure they override any CSS
        muteBtn.style.setProperty('display', 'flex', 'important');
        muteBtn.style.setProperty('visibility', 'visible', 'important');
        muteBtn.style.setProperty('opacity', '1', 'important');
        
        muteBtn.innerHTML = `<img src="./Assets/UI/Volume Full.png" alt="Mute" style="width: 24px; height: 24px;">`;
        muteBtn.addEventListener('click', function() {
            toggleVideoMute();
        });
        uiOverlay.appendChild(muteBtn);

        // Create Help Button
        const mindarHelpBtn = document.createElement('button');
        mindarHelpBtn.className = 'mindar-button help-button';
        mindarHelpBtn.style.cssText = 'position: absolute; top: 15px; right: 15px; width: 40px; height: 40px; z-index: 999999; pointer-events: auto; display: flex; padding: 8px; justify-content: center; align-items: center; gap: 8px; border-radius: 8px; background: rgba(250, 250, 250, 0.20); backdrop-filter: blur(16px); border: none; cursor: pointer; transition: all 0.3s ease;';
        
        // Set display properties separately to ensure they override any CSS
        mindarHelpBtn.style.setProperty('display', 'flex', 'important');
        mindarHelpBtn.style.setProperty('visibility', 'visible', 'important');
        mindarHelpBtn.style.setProperty('opacity', '1', 'important');
        
        mindarHelpBtn.innerHTML = `<img src="./Assets/UI/help-icon.png" alt="Help" style="width: 24px; height: 24px;">`;
        mindarHelpBtn.addEventListener('click', function() {
            showHelpOverlay();
        });
        uiOverlay.appendChild(mindarHelpBtn);
        
               // Create transcript button directly in overlay (no original needed)
               const transcriptButton = document.createElement('button');
               transcriptButton.className = 'mindar-button transcript-button';
               transcriptButton.style.cssText = 'position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 999999; pointer-events: auto; display: flex; padding: 8px; justify-content: center; align-items: center; gap: 8px; border-radius: 8px; background: rgba(250, 250, 250, 0.20); backdrop-filter: blur(16px); border: none; cursor: pointer; transition: all 0.3s ease;';
               
               // Set display properties separately to ensure they override any CSS
               transcriptButton.style.setProperty('display', 'flex', 'important');
               transcriptButton.style.setProperty('visibility', 'visible', 'important');
               transcriptButton.style.setProperty('opacity', '1', 'important');
               
               // Add transcript button content with icon
               transcriptButton.innerHTML = `<img src="./Assets/UI/Transcript Button .png" alt="Transcript" style="width: 24px; height: 24px;"> TRANSCRIPT`;
               
               // Add click event listener
               transcriptButton.addEventListener('click', function() {
                   handleTranscriptButton();
               });
               
               uiOverlay.appendChild(transcriptButton);
               
               // Hide original buttons when MindAR is active
        const originalButtons = document.querySelectorAll('.ui-button:not(.transcript-button)');
        originalButtons.forEach(button => {
            button.style.setProperty('display', 'none', 'important');
            button.style.setProperty('visibility', 'hidden', 'important');
        });
        
        
    }
}

// Function to restore UI buttons to original positions
function restoreUIButtons() {
    const uiOverlay = document.getElementById('ui-overlay');
    
    if (uiOverlay) {
        // Reset overlay pointer events
        uiOverlay.style.setProperty('pointer-events', 'none', 'important');
        
        // Show original buttons again (except transcript button which is created dynamically)
        const originalButtons = document.querySelectorAll('.ui-button:not(.transcript-button)');
        originalButtons.forEach(button => {
            button.style.setProperty('display', '', 'important');
            button.style.setProperty('visibility', '', 'important');
            button.classList.remove('cloned'); // Remove cloned class
        });
        
        // Clear the overlay
        uiOverlay.innerHTML = '';
        
        }
}

// Exit MindAR mode and return to main scene
function exitMindARMode() {
    // Hide MindAR scene
    hideMindARScene();
    
    // Restore original UI buttons
    restoreUIButtons();
    
    // Reset MindAR active state
    isMindarActive = false;
    
    }

// Restart current video from beginning
function restartCurrentVideo() {
    if (!currentActiveHotspotId) {
        return;
    }
    
    const video = document.getElementById(`video-${currentActiveHotspotId}`);
    if (video) {
        video.currentTime = 0;
        video.play().then(() => {
            }).catch(error => {
            console.error('Failed to restart video:', error);
        });
    }
}

// Toggle video mute state
function toggleVideoMute() {
    if (!currentActiveHotspotId) {
        return;
    }
    
    const video = document.getElementById(`video-${currentActiveHotspotId}`);
    if (video) {
        video.muted = !video.muted;
        
        // Update mute button icon
        const muteBtn = document.querySelector('.mute-button');
        if (muteBtn) {
            const icon = muteBtn.querySelector('img');
            if (icon) {
                if (video.muted) {
                    // Muted state - show Volume Off icon
                    icon.src = './Assets/UI/Volume Off.png';
                    icon.alt = 'Unmute';
                } else {
                    // Unmuted state - show Volume Full icon
                    icon.src = './Assets/UI/Volume Full.png';
                    icon.alt = 'Mute';
                }
            }
        }
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
    { id: 'banquet', name: 'Banquet of the Gods', filename: 'Banquet of the Gods.png', grayFilename: 'Banquet of the Gods_g.png' },
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
    // Stairs hotspots (1-5)
    'clouds': 'clouds',
    'banquet': 'banquet',
    'peacock': 'peacock',
    'graces': 'three-graces',
    'trumpeter': 'trumpeter',
    
    // Balcony hotspots (6-17)
    'romulus': 'romulus',
    'caesar': 'caeser',
    'nero': 'nero',
    'silenus': 'silenus',
    'furies': 'furies',
    'alexander': 'alexander',
    'herakles': 'herakles',
    'diana': 'diana',
    'harvest': 'harvest',
    'cherubs': 'cherubs',
    'musicians': 'musicians',
    'signature': 'outro'
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
        const isUnlocked = unlockedBadges.has(badge.id) || (badge.id === 'final' && unlockedBadges.size >= 17);
        
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
        // Hide transcript overlay when badge popup shows
        hideTranscriptOverlay();
        
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
            }
            
            // Clear the current active hotspot ID (hotspot already marked as completed in handleVideoEnded)
            if (currentActiveHotspotId) {
                currentActiveHotspotId = null;
            }
            
            // Return to hotspot finding mode (main AR scene should already be visible)
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
}

// Test function to simulate hotspot activation (for testing badge unlocking)
function testHotspotActivation() {
    // Simulate activating some hotspots to test badge unlocking
    // Simulate activating romulus hotspot
    setTimeout(() => {
        if (typeof activateHotspot === 'function') {
            // Note: This won't work without a real entity, but shows the concept
            // In real usage, this would be called from the raycaster-intersected event
        }
    }, 3000);
}

// Initialize safety warning when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    // Small delay to ensure all elements are ready
    setTimeout(initializeSafetyWarning, 100);
    
    // Initialize hotspots after A-Frame scene is ready - increased delay for iOS
    setTimeout(initializeHotspots, 1000);
    
    // Start intelligent video preloading
    setTimeout(startIntelligentVideoPreloading, 1500);
    
    // Set up Encantar tracking detection
    setTimeout(setupEncantarTrackingDetection, 2000);
    
    // Uncomment the line below to test badge unlocking
    // setTimeout(testUnlockBadges, 2000);
    setTimeout(initializeMainUI, 200);
});

// Backup initialization on window load for iOS compatibility
window.addEventListener("load", function() {
    // If hotspots haven't been initialized yet, try again
    setTimeout(() => {
        const scene = document.querySelector("a-scene");
        const existingHotspots = scene ? scene.querySelectorAll('[data-hotspot-id]') : [];
        
        if (existingHotspots.length === 0) {
            // No hotspots found on window load, reinitializing
            initializeHotspots();
        }
    }, 500);
});

// ========================================
// INTELLIGENT VIDEO PRELOADING
// ========================================

// Track video preloading status
const videoPreloadStatus = new Map();
const preloadQueue = [];
let isPreloading = false;

// Determine if a video should be preloaded based on current location
function shouldPreloadVideoForLocation(hotspotId, location) {
    // Define which hotspots belong to which location
    const stairsHotspots = ['clouds', 'banquet', 'peacock', 'graces', 'trumpeter'];
    const balconyHotspots = ['romulus', 'caesar', 'nero', 'silenus', 'furies', 'alexander', 'herakles', 'diana', 'harvest', 'cherubs', 'musicians', 'signature'];
    
    if (location === 'stairs') {
        return stairsHotspots.includes(hotspotId);
    } else if (location === 'balcony') {
        return balconyHotspots.includes(hotspotId);
    }
    
    // Default to not preloading if location is unknown
    return false;
}

// Start intelligent video preloading system
function startIntelligentVideoPreloading() {
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Get current location to determine which videos to preload
    const urlParams = new URLSearchParams(window.location.search);
    const location = urlParams.get('location') || 'stairs'; // Default to stairs if no location specified
    
    // Get all video elements
    const videoElements = document.querySelectorAll('video[id^="video-"]');
    
    // Add videos to preload queue - only for current location
    videoElements.forEach(video => {
        const videoId = video.id;
        const hotspotId = videoId.replace('video-', '');
        
        // Skip if hotspot is already completed
        if (activatedHotspots.has(hotspotId)) {
            return;
        }
        
        // Only preload videos for the current location
        if (shouldPreloadVideoForLocation(hotspotId, location)) {
            preloadQueue.push({
                video: video,
                videoId: videoId,
                hotspotId: hotspotId,
                priority: getVideoPriority(hotspotId)
            });
        }
    });
    
    // Sort by priority (first hotspot has highest priority)
    preloadQueue.sort((a, b) => a.priority - b.priority);
    
    // Preloading videos for location
    
    if (isIOS) {
        // On iOS, we'll preload only metadata, not the full video
        startIOSPreloadProcess();
    } else {
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
    preloadQueue.forEach(({ video, videoId, hotspotId }) => {
        // Set preload to metadata only (iOS compatible)
        video.setAttribute('preload', 'metadata');
        
        // Mark as ready for metadata preloading
        videoPreloadStatus.set(videoId, 'metadata-ready');
        
        // Set up event listeners for when video is actually needed
        video.addEventListener('loadstart', () => {
            });
        
        video.addEventListener('loadedmetadata', () => {
            videoPreloadStatus.set(videoId, 'metadata-loaded');
        });
        
        video.addEventListener('error', (error) => {
            console.warn(`iOS video error: ${videoId}`, error);
            videoPreloadStatus.set(videoId, 'error');
        });
    });
    
    }

// Start the preload process
function startPreloadProcess() {
    if (isPreloading || preloadQueue.length === 0) {
        return;
    }
    
    isPreloading = true;
    // Preload videos one by one to avoid overwhelming the network
    preloadNextVideo();
}

// Preload the next video in the queue
function preloadNextVideo() {
    if (preloadQueue.length === 0) {
        isPreloading = false;
        return;
    }
    
    const { video, videoId, hotspotId } = preloadQueue.shift();
    
    // Set up preload event listeners
    const onCanPlayThrough = () => {
        videoPreloadStatus.set(videoId, 'ready');
        video.removeEventListener('canplaythrough', onCanPlayThrough);
        video.removeEventListener('error', onError);
        
        // Continue with next video
        setTimeout(() => preloadNextVideo(), 100);
    };
    
    const onError = (error) => {
        console.warn(`Video preload failed: ${videoId}`, error);
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
            console.warn(`Preload timeout for ${videoId}, continuing...`);
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
    }

// Hide tap-to-play text
function hideTapToPlayText() {
    const tapText = document.getElementById('tap-to-play-text');
    if (tapText) {
        tapText.style.opacity = '0';
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
let deviceOrientationPermissionGranted = false; // Track if permission has been granted

// Initialize MindAR system
async function initializeMindAR() {
    mindarScene = document.getElementById('mindar-scene');
    if (!mindarScene) {
        console.error('MindAR scene not found');
        return false;
    }
    
    console.log('Initializing MindAR');
    
    // MindAR will handle its own camera acquisition
    // We don't need to pre-configure anything here
    
    // Add MindAR event listeners for debugging
    mindarScene.addEventListener('targetFound', function(event) {
        const expectedId = currentActiveHotspotId;
        if (!expectedId) {
            return;
        }
    
        const targetEntity = document.querySelector(
          `[mindar-image-target][data-hotspot-id="${expectedId}"]`
        );
        if (!targetEntity) {
            return;
        }
    
        // === existing logic runs only for the active hotspot ===
        hasUserInteracted = true;
        const syntheticEvent = new Event('click', { bubbles: true });
        document.body.dispatchEvent(syntheticEvent);
        const targetStatus = document.getElementById('mindar-target-status');
        if (targetStatus) {
            targetStatus.textContent = 'Yes';
            targetStatus.style.color = 'green';
        }
    });
    
    
    mindarScene.addEventListener('targetLost', function(event) {
        const targetStatus = document.getElementById('mindar-target-status');
        if (targetStatus) {
            targetStatus.textContent = 'No';
            targetStatus.style.color = 'red';
        }
    });
    
    // Add scene ready event listener
    mindarScene.addEventListener('loaded', function() {
    });
    
    return true;
}

// Note: MindAR targets are now pre-defined in HTML, no need for dynamic creation

// Show MindAR scene and activate target detection
async function showMindARScene(hotspotId) {
    if (!mindarScene) {
        currentActiveHotspotId = hotspotId;
        console.error('MindAR scene not initialized');
        return;
    }
    
    // Switching to MindAR for hotspot
    
    // Set user interaction flag for iOS video autoplay
    hasUserInteracted = true;
    // Hide debug status (keep it hidden)
    const debugStatus = document.getElementById('mindar-debug-status');
    if (debugStatus) {
        debugStatus.style.display = 'none';
        debugStatus.style.visibility = 'hidden';
    }
    
    // Pause Encantar tracking
    try {
        await pauseEncantar();
        // Encantar paused
    } catch (e) {
        console.error('Failed to pause Encantar:', e);
    }
    
    // Hide Encantar anchors/hotspots
    setEncantarAnchorsVisible(false);
    // Encantar anchors hidden
    
    // Fade out main AR scene (Encantar)
    const mainScene = document.getElementById('ar-scene');
    if (mainScene) {
        mainScene.style.transition = 'opacity 0.5s ease-out';
        mainScene.style.opacity = '0';
        setTimeout(() => {
            mainScene.style.display = 'none';
            // Encantar scene hidden
        }, 500);
    }
    
    // Enable MindAR target detection and start session
    mindarScene.setAttribute('mindar-image', 'enabled', true);
    const comp = mindarScene.components['mindar-image'];
    
    if (comp) {
        try {
            if (typeof comp.startSession === 'function') {
                await comp.startSession();
                // MINDAR STARTED (startSession)
            } else if (typeof comp.start === 'function') {
                comp.start();
                // MINDAR STARTED (start)
            } else if (typeof comp.play === 'function') {
                comp.play();
                // MINDAR STARTED (play)
            } else {
                console.error('No valid MindAR start method found');
            }
        } catch(e) { 
            console.error('MindAR start failed:', e); 
        }
    } else {
        console.error('MindAR component not found');
    }
    
    // Hide ALL target entities first
    const allTargets = document.querySelectorAll('[mindar-image-target]');
    allTargets.forEach(target => {
        target.style.display = 'none';
    });
    
    // Show ONLY the specific target for this hotspot
    const targetEntity = document.getElementById(`target-${hotspotId}`);
    if (targetEntity) {
        targetEntity.style.display = 'block';
    }
    
    // Fade in MindAR scene
    mindarScene.style.display = 'block';
    mindarScene.style.opacity = '0';
    mindarScene.style.pointerEvents = 'auto';
    mindarScene.style.transition = 'opacity 0.5s ease-in';
    mindarScene.classList.add('show');
    
    // Trigger fade in after a brief delay
    setTimeout(() => {
        mindarScene.style.opacity = '1';
    }, 50);
    
    // Ensure UI buttons stay on top when MindAR scene is active
    ensureUIButtonsOnTop();
    
    isMindarActive = true;
    
}

// Hide MindAR scene and return to main scene
async function hideMindARScene() {
    currentActiveHotspotId = null;
    if (!mindarScene) {
        return;
    }
    
    // Switching back to Encantar
    
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
    
    // Stop MindAR session and fade out scene
    const comp = mindarScene.components['mindar-image'];
    if (comp && typeof comp.stop === 'function') {
        try { comp.stop(); } catch(e) { console.warn('MindAR stop failed', e); }
    }
    mindarScene.style.transition = 'opacity 0.5s ease-out';
    mindarScene.style.opacity = '0';
    mindarScene.classList.remove('show');
    
    setTimeout(() => {
        mindarScene.style.display = 'none';
        mindarScene.style.pointerEvents = 'none'; // Make it non-interactive
    }, 500);
    
    // Add delay to ensure MindAR fully stops
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Restore UI buttons to original positions
    restoreUIButtons();
    
    // Resume Encantar tracking
    try {
        console.log('RESTARTING ENCANTAR AFTER MINDAR...');
        await resumeEncantar();
        console.log('ENCANTAR RESTARTED SUCCESSFULLY');
    } catch (e) {
        console.error('Failed to resume Encantar:', e);
        // Try to restart Encantar manually if resume fails
        try {
            const scene = document.getElementById('ar-scene');
            if (scene) {
                scene.setAttribute('encantar', 'autoplay: false; stats: false; gizmos: false');
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (scene.components && scene.components.encantar) {
                    await scene.components.encantar.startSession();
                    console.log('ENCANTAR MANUALLY RESTARTED');
                }
            }
        } catch (e2) {
            console.error('Manual Encantar restart also failed:', e2);
        }
    }
    
    // Show Encantar anchors/hotspots
    setEncantarAnchorsVisible(true);
    // Encantar anchors shown
    
    // Fade in main AR scene (Encantar)
    const mainScene = document.getElementById('ar-scene');
    if (mainScene) {
        mainScene.style.display = 'block';
        mainScene.style.opacity = '0';
        mainScene.style.transition = 'opacity 0.5s ease-in';
        
        // Trigger fade in after a brief delay
        setTimeout(() => {
            mainScene.style.opacity = '1';
            // Encantar scene shown
        }, 50);
    }
    
    isMindarActive = false;
    
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
        }
}

// Hide loading ring around center target
function hideLoadingRing() {
    const centerTarget = document.getElementById('center-target');
    if (centerTarget) {
        centerTarget.classList.remove('loading');
        }
}

// Show video playing state (hide crosshair)
function showVideoPlaying() {
    const centerTarget = document.getElementById('center-target');
    if (centerTarget) {
        centerTarget.classList.add('video-playing');
        } else {
        console.error('Center target element not found!');
    }
}

// Hide video playing state (show crosshair)
function hideVideoPlaying() {
    const centerTarget = document.getElementById('center-target');
    if (centerTarget) {
        centerTarget.classList.remove('video-playing');
        } else {
        console.error('Center target element not found!');
    }
}

// Switch from Encantar to MindAR tracking mode
async function switchToMindARTracking() {
    console.log('Switching from Encantar to MindAR tracking mode - DISABLED');
    return; // DISABLED - Using Encantar only
    
    isMindarActive = true;
    
    // 1. Pause Encantar session completely
    if (isEncantarEnabled()) {
        try {
            await pauseEncantar();
            setEncantarAnchorsVisible(false);
        } catch(e) {
            console.error('Failed to pause Encantar:', e);
        }
    }
    
    // 2. Hide Encantar scene with fade
    const encantarScene = document.getElementById('ar-scene');
    if (encantarScene) {
        encantarScene.style.transition = 'opacity 0.5s ease-out';
        encantarScene.style.opacity = '0';
        
        setTimeout(() => {
            encantarScene.style.display = 'none';
            encantarScene.style.pointerEvents = 'none';
        }, 500);
    }
    
    // 3. Wait for fade to complete, then show MindAR
    setTimeout(async () => {
        const mindarScene = document.getElementById('mindar-scene');
        if (mindarScene) {
            // Show MindAR scene
            mindarScene.style.display = 'block';
            mindarScene.style.opacity = '0';
            mindarScene.style.pointerEvents = 'auto';
            mindarScene.style.zIndex = '10';
            
            // Wait a bit more for camera to be fully available
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Enable MindAR tracking - let it get its own camera
            try {
                mindarScene.setAttribute('mindar-image', 'enabled', true);
                const comp = mindarScene.components['mindar-image'];
                
                if (comp) {
                    if (typeof comp.startSession === 'function') {
                        await comp.startSession();
                    } else if (typeof comp.start === 'function') {
                        comp.start();
                    } else if (typeof comp.play === 'function') {
                        comp.play();
                    }
                    
                    console.log('MINDAR STARTED');
                }
            } catch(e) {
                console.error('MindAR start failed:', e);
            }
            
            // Fade in MindAR scene
            mindarScene.style.transition = 'opacity 0.5s ease-in';
            setTimeout(() => {
                mindarScene.style.opacity = '1';
            }, 50);
        }
    }, 500);
    
    updateTrackingModeUI('MindAR');
}

// Switch from MindAR back to Encantar tracking mode
async function switchToEncantarTracking() {
    console.log('Switching from MindAR to Encantar tracking mode - DISABLED');
    return; // DISABLED - Using Encantar only
    
    isMindarActive = false;
    
    // 1. Stop MindAR with fade
    const mindarScene = document.getElementById('mindar-scene');
    if (mindarScene) {
        mindarScene.style.transition = 'opacity 0.5s ease-out';
        mindarScene.style.opacity = '0';
        
        setTimeout(async () => {
            mindarScene.style.display = 'none';
            mindarScene.style.pointerEvents = 'none';
            
            // Disable MindAR tracking
            try {
                mindarScene.setAttribute('mindar-image', 'enabled', false);
                const comp = mindarScene.components['mindar-image'];
                if (comp && typeof comp.stop === 'function') {
                    comp.stop();
                }
                
                console.log('MINDAR STOPPED');
            } catch(e) {
                console.warn('MindAR stop failed:', e);
            }
        }, 500);
    }
    
    // 2. Wait for fade, then show Encantar
    setTimeout(async () => {
        const encantarScene = document.getElementById('ar-scene');
        if (encantarScene) {
            encantarScene.style.display = 'block';
            encantarScene.style.opacity = '0';
            encantarScene.style.pointerEvents = 'auto';
            encantarScene.style.zIndex = '10';
            
            // Resume Encantar
            try {
                await resumeEncantar();
                setEncantarAnchorsVisible(true);
                console.log('ENCANTAR RESTARTED');
            } catch(e) {
                console.error('Failed to resume Encantar:', e);
            }
            
            // Fade in Encantar scene
            encantarScene.style.transition = 'opacity 0.5s ease-in';
            setTimeout(() => {
                encantarScene.style.opacity = '1';
            }, 50);
        }
    }, 500);
    
    updateTrackingModeUI('Encantar');
}

// Update UI to reflect current tracking mode
function updateTrackingModeUI(mode) {
    const centerTarget = document.getElementById('center-target');
    if (centerTarget) {
        // Add switching animation
        centerTarget.classList.add('mode-switching');
        
        // Remove existing mode classes
        centerTarget.classList.remove('encantar-mode', 'mindar-mode');
        
        // Add new mode class
        if (mode === 'MindAR') {
            centerTarget.classList.add('mindar-mode');
            // Crosshair now in MindAR mode (blue)
        } else if (mode === 'Encantar') {
            centerTarget.classList.add('encantar-mode');
            // Crosshair now in Encantar mode (green)
        }
        
        // Remove switching animation after it completes
        setTimeout(() => {
            centerTarget.classList.remove('mode-switching');
        }, 600);
    }
}


// Prevent video loading for completed hotspots
function preventVideoLoadingForCompletedHotspot(hotspotId) {
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
        // Also remove the video source to prevent any loading
        const sources = video.querySelectorAll('source');
        sources.forEach(source => {
            source.remove();
        });
        // Update preload status to indicate this video should not be loaded
        videoPreloadStatus.set(videoId, 'disabled');
    }
}

// Handle MindAR target lost
function handleMindarTargetLost(hotspotId) {
    // Hide tap-to-play text when target is lost
    hideTapToPlayText();
    
    // Don't hide transcript button on target lost - keep it visible during video playback
    // showTranscriptButton(false);
    
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
    // Check if this hotspot has already been completed
    if (activatedHotspots.has(hotspotId)) {
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
    // Get the video element
    const video = document.getElementById(videoId);
    if (video) {
        currentMindarVideo = video;
        
        // Check if video is already playing - if so, just resume
        if (!video.paused) {
            return;
        }
        
        // Check if video has been started before (has currentTime > 0)
        if (video.currentTime > 0) {
            video.play().then(() => {
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
                console.error(`Video resume failed for ${hotspotId}:`, error);
                // Hide loading ring on error
                hideLoadingRing();
            });
            return;
        }
        
        // Check if video is preloaded
        const isPreloaded = isVideoPreloaded(videoId);
        // Additional debugging for video element
        // Update debug UI with audio information
        updateMindarDebugUI(hotspotId, video);
        
        // If video is not preloaded, show loading ring and wait
        if (!isPreloaded) {
            showLoadingRing();
            
            // For iOS, we need to trigger video loading with user interaction
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
                // Force video to start loading
                video.load();
            }
            
            // Wait for video to be ready
            const waitForVideoReady = () => {
                if (video.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
                    hideLoadingRing();
                    playVideo();
                } else {
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
                }
            
            if (isWebm && isAndroid) {
                // Get original dimensions
                const originalWidth = videoPlane.getAttribute('data-original-width');
                const originalHeight = videoPlane.getAttribute('data-original-height');
                
                // Apply webm-specific adjustments (increase width to compensate for squashing)
                const webmWidth = parseFloat(originalWidth) * 1.3; // 30% wider
                const webmHeight = originalHeight; // Keep height the same
                
                videoPlane.setAttribute('width', webmWidth);
                videoPlane.setAttribute('height', webmHeight);
                
                } else if (isIOS) {
                // Ensure iOS videos have proper dimensions
                const originalWidth = videoPlane.getAttribute('data-original-width');
                const originalHeight = videoPlane.getAttribute('data-original-height');
                
                if (originalWidth && originalHeight) {
                    videoPlane.setAttribute('width', originalWidth);
                    videoPlane.setAttribute('height', originalHeight);
                    }
            } else if (!isWebm && isAndroid) {
                // Restore original dimensions for mp4 on Android
                const originalWidth = videoPlane.getAttribute('data-original-width');
                const originalHeight = videoPlane.getAttribute('data-original-height');
                
                if (originalWidth && originalHeight) {
                    videoPlane.setAttribute('width', originalWidth);
                    videoPlane.setAttribute('height', originalHeight);
                }
            }
        };

        // Simple video playback function
        const playVideo = () => {
            console.log('PLAYING VIDEO for hotspot:', hotspotId);
            
            // Check if we're on iOS
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            console.log('Is iOS:', isIOS);
            
            // Adjust video plane dimensions for webm format
            adjustVideoPlaneForFormat(hotspotId, video);
            
            // Reset video to beginning
            video.currentTime = 0;
            
            // Check video plane visibility
            const videoOverlay = document.getElementById(`videooverlay-${hotspotId}`);
            if (videoOverlay) {
                console.log('Video overlay found:', videoOverlay);
                console.log('Video overlay opacity:', videoOverlay.getAttribute('material').opacity);
            } else {
                console.error('Video overlay not found for:', hotspotId);
            }
            
            if (isIOS) {
                // For iOS, try to play with sound if user has interacted, otherwise muted
                if (hasUserInteracted) {
                    video.muted = false;
                    video.volume = 1.0;
                    } else {
            video.muted = true;
            video.volume = 0;
                    }
                
                // Ensure video has the right attributes for iOS
                video.setAttribute('playsinline', 'true');
                video.setAttribute('webkit-playsinline', 'true');
            } else {
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
            console.log('Attempting to play video...');
            const playPromise = video.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('Video play promise resolved - video should be playing');
                    // Trigger fade-in animation for the video plane
                    if (videoOverlay) {
                        console.log('Triggering fade-in animation');
                        videoOverlay.emit('fadein-' + hotspotId);
                    }
                }).catch(error => {
                    console.error('Video play promise rejected:', error);
                    updateMindarDebugUI(hotspotId, video, 'Play rejected: ' + error.message);
                });
            } else {
                console.log('Video play returned undefined - trying fallback');
                // Fallback: trigger fade-in anyway
                if (videoOverlay) {
                    videoOverlay.emit('fadein-' + hotspotId);
                }
            }
            
            // Set up tap-to-play fallback for iOS if video doesn't start automatically
            if (isIOS) {
                setTimeout(() => {
                    if (video.paused) {
                        console.log('Video still paused on iOS, adding tap-to-play fallback');
                        addTapToPlayFallback(video, hotspotId);
                    }
                }, 1500); // Wait 1.5 seconds to see if video starts automatically
            }
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
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
                    console.error(`Video play failed for ${hotspotId}:`, error);
                    console.error(`Error details:`, error.message);
                    updateMindarDebugUI(hotspotId, video, 'Play failed: ' + error.message);
                    
                    // Hide loading ring on error
                    hideLoadingRing();
                    
                    // On iOS, show tap-to-play when automatic play fails
                    if (isIOS) {
                        addTapToPlayFallback(video, hotspotId);
                        return; // Don't try muted fallback on iOS, let user tap
                    }
                    
                    // Try fallback: play muted first, then unmute if user has interacted
                    video.muted = true;
                    video.play().then(() => {
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
            video.load();
            
            // Wait for video to be loaded
            video.addEventListener('loadeddata', () => {
                playVideo();
            }, { once: true });
            return;
        }
        
        // If video is ready, play immediately
        playVideo();
    } else {
        console.error(`Video element not found for hotspot: ${hotspotId}`);
        updateMindarDebugUI(hotspotId, null, 'Video element not found');
    }
}

// Handle video ended
function handleVideoEnded(hotspotId) {
    // Hide tap-to-play text
    hideTapToPlayText();
    
    // Hide transcript button
    showTranscriptButton(false);
    
    // Hide video playing state
    hideVideoPlaying();
    
    // Mark hotspot as completed
    activatedHotspots.add(hotspotId);
    
    // Fade out video overlay
    const videoOverlay = document.getElementById(`videooverlay-${hotspotId}`);
    if (videoOverlay) {
        videoOverlay.emit(`fadeout-${hotspotId}`);
    }
    
    // Stop and reset the video
    const video = document.getElementById(`video-${hotspotId}`);
    if (video) {
        video.pause();
        video.currentTime = 0;
    }
    
    // Wait for fade out, then switch back to wall tracking
    setTimeout(() => {
        switchToWallTracking();
        
        // Refresh hotspot visual states (reduce opacity for completed)
        refreshAllHotspotVisualStates();
        
        // Show badge popup
        const badgeId = hotspotToBadgeMapping[hotspotId];
        if (badgeId) {
            unlockBadge(badgeId);
        }
        
        // Mark that we should show stairs navigation popup after badge is dismissed
        if (hotspotId === 'trumpeter') {
            window.shouldShowStairsPopup = true;
        }
    }, 500);
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

// Modified activateHotspot function to trigger Encantar image tracking
async function activateHotspotWithImageTracking(hotspotId, entity) {
    console.log('ACTIVATING HOTSPOT WITH IMAGE TRACKING:', hotspotId);
    
    if (activatedHotspots.has(hotspotId)) {
        console.log('Hotspot already activated, returning');
        return; // Already activated - don't allow repeat detection
    }
    
    // Set the current active hotspot ID
    currentActiveHotspotId = hotspotId;
    
    // Map hotspot IDs to tracking image names
    const imageMapping = {
        'clouds': '1. Clouds',
        'banquet': '2.Banquet', 
        'peacock': '3.Peacock',
        'graces': '4. Graces',
        'trumpeter': '5.Trumpeter',
        'romulus': '6. Romulus',
        'caesar': '7. Caeser',
        'nero': '8. Nero',
        'silenus': '9. Silenus',
        'furies': '10. Furies',
        'alexander': '11. Alexander',
        'herakles': '12. Herakles',
        'diana': '13.Diana',
        'harvest': '14.Harvest',
        'cherubs': '15.Cherubs',
        'musicians': '16.Musicians',
        'signature': '17.Signature'
    };
    
    const imageName = imageMapping[hotspotId];
    if (!imageName) {
        console.error(`No tracking image found for hotspot: ${hotspotId}`);
        return;
    }
    
    // Switch to image tracking mode
    switchToImageTracking(imageName);
    
    // Create video overlay for this hotspot
    createVideoOverlay(hotspotId, imageName);
}

// Create video overlay for Encantar image tracking
function createVideoOverlay(hotspotId, imageName) {
    console.log('CREATING VIDEO OVERLAY for:', hotspotId);

    // Map hotspot IDs to video plane IDs (these are already in the HTML)
    const videoPlaneIdMapping = {
        'clouds': 'videooverlay-clouds',
        'banquet': 'videooverlay-banquet',
        'peacock': 'videooverlay-peacock',
        'graces': 'videooverlay-graces',
        'trumpeter': 'videooverlay-trumpeter',
        'romulus': 'videooverlay-romulus',
        'caesar': 'videooverlay-caesar',
        'nero': 'videooverlay-nero',
        'silenus': 'videooverlay-silenus',
        'furies': 'videooverlay-furies',
        'alexander': 'videooverlay-alexander',
        'herakles': 'videooverlay-herakles',
        'diana': 'videooverlay-diana',
        'harvest': 'videooverlay-harvest',
        'cherubs': 'videooverlay-cherubs',
        'musicians': 'videooverlay-musicians',
        'signature': 'videooverlay-signature'
    };

    const videoPlaneId = videoPlaneIdMapping[hotspotId] || `videooverlay-${hotspotId}`;
    const videoPlane = document.getElementById(videoPlaneId);

    if (!videoPlane) {
        console.error(`Video plane not found: ${videoPlaneId}`);
        return;
    }

    // Map hotspot IDs to video element IDs
    const videoIdMapping = {
        'clouds': 'video-clouds',
        'banquet': 'video-banquet',
        'peacock': 'video-peacock',
        'graces': 'video-graces',
        'trumpeter': 'video-trumpeter',
        'romulus': 'video-romulus',
        'caesar': 'video-caesar',
        'nero': 'video-nero',
        'silenus': 'video-silenus',
        'furies': 'video-furies',
        'alexander': 'video-alexander',
        'herakles': 'video-herakles',
        'diana': 'video-diana',
        'harvest': 'video-harvest',
        'cherubs': 'video-cherubs',
        'musicians': 'video-musicians',
        'signature': 'video-signature'
    };

    const videoId = videoIdMapping[hotspotId] || `video-${hotspotId}`;
    const video = document.getElementById(videoId);

    if (!video) {
        console.error(`Video element not found: ${videoId}`);
        return;
    }

    // The video plane should already be visible due to Encantar's ar-root system
    // The video plane starts with opacity: 0, so we need to trigger the fade-in animation

    // Start playing the video
    video.currentTime = 0;
    video.muted = true; // Start muted for autoplay
    video.play().then(() => {
        console.log('Video started playing for:', hotspotId);

        // Trigger fade-in animation to make video visible
        videoPlane.emit('fadein-' + hotspotId);
    }).catch(error => {
        console.warn('Video play failed:', error);
        // Try muted fallback
        video.muted = true;
        video.play().then(() => {
            console.log('Video started playing (muted) for:', hotspotId);
            // Trigger fade-in animation
            videoPlane.emit('fadein-' + hotspotId);
        }).catch(err => {
            console.error('Video play failed even with muted:', err);
        });
    });

    console.log('Video overlay activated for:', hotspotId);
}

// Hide video overlay when switching away from image tracking
function hideVideoOverlay(hotspotId) {
    console.log('HIDING VIDEO OVERLAY for:', hotspotId);
    
    // Map hotspot IDs to video plane IDs
    const videoPlaneIdMapping = {
        'clouds': 'videooverlay-clouds',
        'banquet': 'videooverlay-banquet',
        'peacock': 'videooverlay-peacock',
        'graces': 'videooverlay-graces',
        'trumpeter': 'videooverlay-trumpeter',
        'romulus': 'videooverlay-romulus',
        'caesar': 'videooverlay-caesar',
        'nero': 'videooverlay-nero',
        'silenus': 'videooverlay-silenus',
        'furies': 'videooverlay-furies',
        'alexander': 'videooverlay-alexander',
        'herakles': 'videooverlay-herakles',
        'diana': 'videooverlay-diana',
        'harvest': 'videooverlay-harvest',
        'cherubs': 'videooverlay-cherubs',
        'musicians': 'videooverlay-musicians',
        'signature': 'videooverlay-signature'
    };
    
    const videoPlaneId = videoPlaneIdMapping[hotspotId] || `videooverlay-${hotspotId}`;
    const videoPlane = document.getElementById(videoPlaneId);
    
    if (videoPlane) {
        // Trigger fade-out animation
        videoPlane.emit('fadeout-' + hotspotId);
        
        // Note: The video plane will automatically become invisible when Encantar loses the target
        // due to the ar-root system, so we don't need to manually hide it
    }
    
    // Map hotspot IDs to video element IDs
    const videoIdMapping = {
        'clouds': 'video-clouds',
        'banquet': 'video-banquet',
        'peacock': 'video-peacock',
        'graces': 'video-graces',
        'trumpeter': 'video-trumpeter',
        'romulus': 'video-romulus',
        'caesar': 'video-caesar',
        'nero': 'video-nero',
        'silenus': 'video-silenus',
        'furies': 'video-furies',
        'alexander': 'video-alexander',
        'herakles': 'video-herakles',
        'diana': 'video-diana',
        'harvest': 'video-harvest',
        'cherubs': 'video-cherubs',
        'musicians': 'video-musicians',
        'signature': 'video-signature'
    };
    
    const videoId = videoIdMapping[hotspotId] || `video-${hotspotId}`;
    const video = document.getElementById(videoId);
    
    if (video) {
        // Pause the video
        video.pause();
        video.currentTime = 0;
    }
    
    console.log('Video overlay hidden for:', hotspotId);
}


// Set up Encantar tracking detection (call this once on page load)
function setupEncantarTrackingDetection() {
    console.log('SETTING UP ENCANTAR TRACKING DETECTION');
    
    const scene = document.getElementById('ar-scene');
    if (!scene) return;
    
    // Listen for Encantar tracking events
    scene.addEventListener('encantar-target-found', (event) => {
        console.log('ENCANTAR TARGET FOUND:', event.detail);
        handleEncantarTargetFound(event.detail);
    });
    
    scene.addEventListener('encantar-target-lost', (event) => {
        console.log('ENCANTAR TARGET LOST:', event.detail);
        handleEncantarTargetLost(event.detail);
    });
}

// Handle when Encantar finds any target
function handleEncantarTargetFound(targetInfo) {
    const targetName = targetInfo.name || targetInfo;
    console.log('ENCANTAR TARGET FOUND:', targetName);
    
    // Check if this is a wall target (for hotspots)
    const wallTargets = ['central', 'north', 'south', 'ceiling'];
    if (wallTargets.includes(targetName)) {
        console.log('Wall target found:', targetName);
        return;
    }
    
    // Check if this is the current active image target (for videos)
    if (currentTrackingMode === 'image' && currentImageTarget === targetName && currentActiveHotspotId) {
        console.log('Image target found for video:', targetName);
        
        // Use the MindAR video playback system adapted for Encantar
        handleEncantarVideoPlayback(currentActiveHotspotId);
    }
}

// Handle Encantar video playback using the proven MindAR system
function handleEncantarVideoPlayback(hotspotId) {
    // Check if this hotspot has already been completed
    if (activatedHotspots.has(hotspotId)) {
        console.log('Hotspot already completed:', hotspotId);
        return;
    }

    // Get video element
    const videoId = `video-${hotspotId}`;
    const video = document.getElementById(videoId);
    
    console.log('VIDEO PLAYBACK STARTING:', hotspotId);
    
    if (video) {
        // Mark user interaction for video playback
        hasUserInteracted = true;
        
        // Check if we're on iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        // Reset video to beginning
        video.currentTime = 0;
        
        // Check video plane visibility
        const videoOverlay = document.getElementById(`videooverlay-${hotspotId}`);
        if (!videoOverlay) {
            console.error('VIDEO OVERLAY NOT FOUND:', hotspotId);
        }
        
        // Set video properties for playback
        video.muted = false;
        video.volume = 1.0;
        
        // Ensure video has the right attributes
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        
        // Try to play the video
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('VIDEO PLAYING:', hotspotId);
                
                // Hide loading ring when video starts playing
                hideLoadingRing();
                
                // Hide tap-to-play text when video starts playing
                hideTapToPlayText();
                
                // Show video playing state (hide crosshair)
                showVideoPlaying();
                
                // Trigger fade-in animation
                if (videoOverlay) {
                    videoOverlay.emit(`fadein-${hotspotId}`);
                }
                
                // Set up video end handler
                video.addEventListener('ended', () => {
                    console.log('VIDEO ENDED:', hotspotId);
                    handleVideoEnded(hotspotId);
                }, { once: true });
                
            }).catch(error => {
                console.error('VIDEO PLAY FAILED:', hotspotId, error.message);
                
                // Fallback: try muted play
                video.muted = true;
                video.play().then(() => {
                    console.log('VIDEO PLAYING (MUTED):', hotspotId);
                    
                    // Hide loading ring when fallback succeeds
                    hideLoadingRing();
                    
                    // Hide tap-to-play text when video starts playing
                    hideTapToPlayText();
                    
                    // Show video playing state (hide crosshair)
                    showVideoPlaying();
                    
                    // Trigger fade-in animation
                    if (videoOverlay) {
                        videoOverlay.emit(`fadein-${hotspotId}`);
                    }
                    
                    // Try to unmute after a short delay
                    setTimeout(() => {
                        video.muted = false;
                        video.volume = 1.0;
                    }, 100);
                    
                    // Set up video end handler
                    video.addEventListener('ended', () => {
                        handleVideoEnded(hotspotId);
                    }, { once: true });
                    
                }).catch(fallbackError => {
                    console.error('VIDEO PLAY COMPLETELY FAILED:', hotspotId);
                    // Final fallback: show congratulations after a delay
                    setTimeout(() => {
                        handleVideoEnded(hotspotId);
                    }, 3000);
                });
            });
        } else {
            console.error('Video.play() returned undefined - this should not happen');
        }
        
        // Show loading ring while video is loading
        showLoadingRing();
        
        // Show transcript button when hotspot is found (with a small delay to ensure it's visible)
        setTimeout(() => {
            showTranscriptButton(true);
        }, 100);
        
        // Ensure video is loaded before playing
        if (video.readyState < 2) {
            console.log('VIDEO LOADING:', hotspotId);
            video.load();
            
            // Wait for video to be loaded
            video.addEventListener('loadeddata', () => {
                console.log('VIDEO LOADED, RETRYING:', hotspotId);
                // Re-trigger the play logic
                handleEncantarVideoPlayback(hotspotId);
            }, { once: true });
            return;
        }
    } else {
        console.error('VIDEO ELEMENT NOT FOUND:', hotspotId);
    }
}

// Handle when Encantar loses any target
function handleEncantarTargetLost(targetInfo) {
    const targetName = targetInfo.name || targetInfo;
    console.log('ENCANTAR TARGET LOST:', targetName);
    
    // Check if this is an image target (for videos)
    if (currentTrackingMode === 'image' && currentImageTarget === targetName) {
        console.log('Image target lost for video:', targetName);
        handleImageTargetLost(currentActiveHotspotId);
    }
}

// Handle image target found
function handleImageTargetFound(hotspotId) {
    console.log('IMAGE TARGET FOUND for:', hotspotId);
    
    // Check if this hotspot has already been completed
    if (activatedHotspots.has(hotspotId)) {
        return;
    }
    
    // Get video element
    const videoIdMapping = {
        'clouds': 'video-clouds',
        'banquet': 'video-banquet',
        'peacock': 'video-peacock',
        'graces': 'video-graces',
        'trumpeter': 'video-trumpeter',
        'romulus': 'video-romulus',
        'caesar': 'video-caesar',
        'nero': 'video-nero',
        'silenus': 'video-silenus',
        'furies': 'video-furies',
        'alexander': 'video-alexander',
        'herakles': 'video-herakles',
        'diana': 'video-diana',
        'harvest': 'video-harvest',
        'cherubs': 'video-cherubs',
        'musicians': 'video-musicians',
        'signature': 'video-signature'
    };
    
    const videoId = videoIdMapping[hotspotId] || `video-${hotspotId}`;
    const video = document.getElementById(videoId);
    
    if (!video) {
        console.error(`Video element not found: ${videoId}`);
        return;
    }
    
    // Play video
    playVideoForHotspot(hotspotId, video);
}

// Handle image target lost
function handleImageTargetLost(hotspotId) {
    console.log('IMAGE TARGET LOST for:', hotspotId);
    
    // Pause video if playing
    const videoIdMapping = {
        'clouds': 'video-clouds',
        'banquet': 'video-banquet',
        'peacock': 'video-peacock',
        'graces': 'video-graces',
        'trumpeter': 'video-trumpeter',
        'romulus': 'video-romulus',
        'caesar': 'video-caesar',
        'nero': 'video-nero',
        'silenus': 'video-silenus',
        'furies': 'video-furies',
        'alexander': 'video-alexander',
        'herakles': 'video-herakles',
        'diana': 'video-diana',
        'harvest': 'video-harvest',
        'cherubs': 'video-cherubs',
        'musicians': 'video-musicians',
        'signature': 'video-signature'
    };
    
    const videoId = videoIdMapping[hotspotId] || `video-${hotspotId}`;
    const video = document.getElementById(videoId);
    
    if (video && !video.paused) {
        video.pause();
        
        // Hide video playing state
        hideVideoPlaying();
        
        // Trigger fade-out animation
        const videoOverlay = document.getElementById(`videooverlay-${hotspotId}`);
        if (videoOverlay) {
            videoOverlay.emit('fadeout-' + hotspotId);
        }
    }
}

// Play video for hotspot
function playVideoForHotspot(hotspotId, video) {
    console.log('PLAYING VIDEO for hotspot:', hotspotId);
    
    // Reset video to beginning
    video.currentTime = 0;
    
    // Set video properties
    video.muted = true; // Start muted for autoplay
    video.volume = 0;
    
    // Try to play the video
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('Video play promise resolved - video should be playing');
            
            // Trigger fade-in animation for the video plane
            const videoOverlay = document.getElementById(`videooverlay-${hotspotId}`);
            if (videoOverlay) {
                console.log('Triggering fade-in animation');
                videoOverlay.emit('fadein-' + hotspotId);
            }
            
            // Show video playing state
            showVideoPlaying();
            
            // Set up video end handler
            video.addEventListener('ended', () => {
                handleVideoEnded(hotspotId);
            }, { once: true });
            
        }).catch(error => {
            console.error('Video play promise rejected:', error);
        });
    }
}

// Hide all video overlays
function hideAllVideoOverlays() {
    // Pause all videos
    const videos = document.querySelectorAll('video[id^="video-"]');
    videos.forEach(video => {
        video.pause();
        video.currentTime = 0;
    });
    
    // Note: Video planes will automatically become invisible when Encantar loses targets
    // due to the ar-root system, so we don't need to manually hide them
}

// Add tap-to-play fallback for iOS
function addTapToPlayFallback(video, hotspotId) {
    // Show tap-to-play text
    showTapToPlayText();
    
    const tapHandler = (event) => {
        // Hide tap-to-play text
        hideTapToPlayText();
        
        // Mark user interaction for this video
        hasUserInteracted = true;
        
        // Try to play with sound
        video.muted = false;
        video.volume = 1.0;
        
        video.play().then(() => {
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
    const videoId = `video-${hotspotId}`;
    const video = document.getElementById(videoId);
    
    if (video) {
        // Try to play the video
        video.currentTime = 0;
        video.muted = false;
        video.play().then(() => {
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
    // Initialize MindAR system, but keep it disabled by default
    setTimeout(() => {
        // initializeMindAR(); // COMMENTED OUT - Using Encantar only
        // Always start in Encantar mode - disable MindAR by default
        const ms = document.getElementById('mindar-scene');
        if (ms) {
            try { ms.setAttribute('mindar-image', 'enabled', false); } catch(e) {}
            ms.style.display = 'none';
            ms.style.pointerEvents = 'none';
        }
        // AR SYSTEMS INITIALIZED - Encantar mode active
        
        // Initialize center-target (like old version)
        const centerTarget = document.getElementById('center-target');
        if (centerTarget) {
            // Recticel initialized
        } else {
            console.warn('Center target element not found');
        }
        
        // Debug: Test raycaster functionality with delay
        setTimeout(() => {
            const camera = document.querySelector('ar-camera');
            if (camera) {
                // Camera found
                // Raycaster component check
                
                // Try to manually initialize raycaster if it's not working
                if (!camera.components.raycaster) {
                    // Raycaster not found, trying to add it manually
                    camera.setAttribute('raycaster', 'objects: .clickable; interval: 100; far: 1000; rayOrigin: mouse');
                }
                
                // Add global raycaster debugging (only for hotspot detection)
                camera.addEventListener('raycaster-intersected', function(event) {
                    const target = event.detail && event.detail.els && event.detail.els[0];
                    if (target && target.getAttribute('data-hotspot-id')) {
                        console.log('HOTSPOT HOVER DETECTED:', target.getAttribute('data-hotspot-id'));
                    }
                });
            } else {
                console.error('Camera not found');
            }
        }, 1000);
    }, 100);
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
        
        return true;
    }
    
    console.error('Could not recreate MindAR scene - original not found');
    return false;
}
