// AR.js with compass + geo-based POI positioning and manual camera-facing rotation
// AR.js script loaded successfully

// ===== GLOBAL SETTINGS =====
// Global POI scale multiplier - adjust this to scale all POIs uniformly
const GLOBAL_POI_SCALE =0.55; // 1.0 = normal size, 2.0 = double size, 0.5 = half size

let initialHeading = null;
let headingReady = false;
let loadedLocationDataList = [];
let poiPlaced = false;
let poiEntities = [];
let poiConfigs = [];
let compassPermissionRequested = false;
let imagesLoaded = 0;
let totalImages = 0;
const imageCache = new Map();
let locationsProcessed = false; // Add flag to prevent multiple processing
let initialHeadingCaptured = false; // Add flag to prevent multiple initial heading captures
let tryPlacingPOIsCalled = false; // Add flag to prevent multiple calls to tryPlacingPOIs
let isPlacingPOIs = false; // Add flag to prevent multiple simultaneous POI placement
let globalPlacedCoordinates = new Set(); // Global tracking of placed coordinates across all placement calls
let placementInProgress = false; // Global flag to prevent multiple simultaneous placements
let continuousUpdatesActive = false; // Global flag to prevent multiple continuous update loops
let smoothedHeading = null; // Smoothed heading to prevent wild fluctuations
let headingHistory = []; // Array to store recent heading values for smoothing

// Android-specific variables (shared with compass-integration.js)
// These are declared in compass-integration.js to avoid conflicts

// CTA functionality variables
let currentCTA = null;
let currentAudio = null;
let isAudioPlaying = false;
let ctaModal = null;
let ctaImage = null;
let ctaTitle = null;
let ctaDescription = null;
let ctaAudioButton = null;
let ctaAudioText = null;
let ctaCloseButton = null;

// POI Label functionality variables
let currentLabel = null;
let labelContainer = null;
let isHovering = false;
let hoverStartTime = 0;
let currentTargetedPOI = null; // Track which POI is currently being targeted
let centerTriggerBox = null; // Center trigger box for POI interaction

// ===== FIXED ANGLE POSITIONING SYSTEM =====

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

// Calculate position based on fixed angle and distance
function calculateFixedPosition(fixedAngleDegrees, initialY, initialZ) {
  const radians = toRadians(fixedAngleDegrees);
  const distance = Math.abs(initialZ); // Use initialZ as distance
  
  const x = -distance * Math.sin(radians);
  const y = initialY; // Use initialY directly
  const z = -distance * Math.cos(radians);
  
  return { x, y, z };
}

// Calculate rotation based on fixed angle
function calculateFixedRotation(fixedAngleDegrees) {
  return { x: 0, y: fixedAngleDegrees, z: 0 };
}

// Preload images for iOS compatibility
function preloadImage(url) {
  return new Promise((resolve, reject) => {
    if (imageCache.has(url)) {
      resolve(imageCache.get(url));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Handle CORS issues
    
    img.onload = () => {
      // Image loaded successfully
      imageCache.set(url, img);
      imagesLoaded++;
      resolve(img);
    };
    
    img.onerror = (error) => {
      imagesLoaded++;
      reject(error);
    };
    
    // Set a timeout for iOS
    setTimeout(() => {
      if (!img.complete) {
        imagesLoaded++;
        resolve(null);
      }
    }, 10000); // 10 second timeout
    
    img.src = url;
  });
}

// Preload all images before placing POIs
async function preloadAllImages() {
  const imageUrls = [];
  
  loadedLocationDataList.forEach(location => {
    location.media.forEach(media => {
      if (media.type === 'image') {
        imageUrls.push(media.url);
      }
    });
  });
  
  totalImages = imageUrls.length;
      // Preloading images
  
  try {
    await Promise.allSettled(imageUrls.map(url => preloadImage(url)));
    // All images processed
    return true;
  } catch (error) {
    return false;
  }
}

// ===== CTA FUNCTIONALITY =====

// Initialize CTA modal elements
function initializeCTAModal() {
  // Initializing CTA modal
  
  ctaModal = document.getElementById('cta-modal');
  ctaImage = document.getElementById('cta-image');
  ctaTitle = document.getElementById('cta-title');
  ctaDescription = document.getElementById('cta-description');
  ctaAudioButton = document.getElementById('cta-audio-button');
  ctaAudioText = document.getElementById('cta-audio-text');
  ctaCloseButton = document.getElementById('close-cta-modal');
  
  // Add new elements for compact state
  const ctaLearnMoreButton = document.getElementById('cta-learn-more-button');
  const ctaCompactContent = document.querySelector('.cta-compact-content');
  const ctaExpandedContent = document.querySelector('.cta-expanded-content');
  const ctaContentCard = document.querySelector('.cta-content-card');
  
  // CTA elements found
  
  if (!ctaModal || !ctaImage || !ctaTitle || !ctaDescription || !ctaAudioButton || !ctaAudioText || !ctaCloseButton || !ctaLearnMoreButton) {
    return false;
  }
  
  // Set up event listeners
  ctaCloseButton.addEventListener('click', closeCTAModal);
  ctaAudioButton.addEventListener('click', toggleCTAAudio);
  
  // Add learn more button event listener
  ctaLearnMoreButton.addEventListener('click', expandCTAModal);
  
  // Close modal when clicking outside
  ctaModal.addEventListener('click', (event) => {
    if (event.target === ctaModal) {
      closeCTAModal();
    }
  });
  
  // CTA modal initialized
  return true;
}

// Show CTA modal with POI data
function showCTAModal(poiData) {
  // showCTAModal called with POI data

  // Track POI interaction in Google Analytics
  if (window.gtag && poiData.info) {
    gtag('event', 'poi_triggered', {
      'event_category': 'AR_Experience',
      'event_label': poiData.info,
      'poi_name': poiData.info,
      'poi_title': poiData.ctaTitle || poiData.info,
      'interaction_type': 'hover_auto'
    });
    // Analytics: POI triggered
  }

  // Check if help overlay is open - if so, don't show CTA
  const helpOverlay = document.getElementById('help-overlay');
  if (helpOverlay && helpOverlay.style.display === 'flex') {
          // Help overlay is open - preventing CTA modal from showing
    return;
  }

  // Check if orientation overlay is open - if so, don't show CTA
  const orientationOverlay = document.getElementById('orientation-overlay');
  // Checking orientation overlay state
  if (orientationOverlay) {
    const computedStyle = window.getComputedStyle(orientationOverlay);
          // Orientation overlay computed display
    if (computedStyle.display === 'flex') {
              // Orientation overlay is open (computed style) - preventing CTA modal from showing
      return;
    }
  }

  // Check if CTA modal is already open - if so, don't show another
  if (ctaModal && ctaModal.style.display === 'flex') {
    // CTA modal is already open - preventing another CTA from showing
    return;
  }

  if (!ctaModal || !poiData) {
    return;
  }

  // Stop any currently playing audio
  if (currentAudio) {
    stopCTAAudio();
  }

  // Showing CTA modal for POI

  // Set modal content
  if (ctaImage && poiData.ctaImage) {
    ctaImage.src = poiData.ctaImage;
    ctaImage.alt = poiData.info || 'POI Image';
  }

  if (ctaTitle && poiData.ctaTitle) {
    ctaTitle.textContent = poiData.ctaTitle;
  }

  if (ctaDescription && poiData.ctaDescription) {
    ctaDescription.textContent = poiData.ctaDescription;
  }

  // Reset to compact state
  const ctaContentCard = document.querySelector('.cta-content-card');
  const ctaCompactContent = document.querySelector('.cta-compact-content');
  const ctaExpandedContent = document.querySelector('.cta-expanded-content');
  const ctaTitleCompact = document.getElementById('cta-title-compact');
  
  if (ctaContentCard) {
    ctaContentCard.classList.remove('cta-expanded');
    ctaContentCard.classList.add('cta-compact');
  }
  
  if (ctaCompactContent) {
    ctaCompactContent.style.display = 'flex';
  }
  
  if (ctaExpandedContent) {
    ctaExpandedContent.style.display = 'none';
  }
  
  // Set compact title
  if (ctaTitleCompact && poiData.ctaTitle) {
    ctaTitleCompact.textContent = poiData.ctaTitle;
  }

  // Store current POI data for audio functionality
  currentCTA = poiData;

  // Show the modal
  ctaModal.style.display = 'flex';
  
  // Preload audio if available
  if (poiData.ctaAudioUrl) {
    preloadCTAAudio(poiData.ctaAudioUrl);
  }
}

// Expand CTA modal to full version
function expandCTAModal() {
  // Expanding CTA modal
  
  // Track "Learn More" click in Google Analytics
  if (window.gtag && currentCTA && currentCTA.info) {
    gtag('event', 'cta_expanded', {
      'event_category': 'AR_Experience',
      'event_label': currentCTA.info,
      'poi_name': currentCTA.info,
      'poi_title': currentCTA.ctaTitle || currentCTA.info,
      'interaction_type': 'learn_more_click'
    });
    // Analytics: CTA expanded
  }
  
  const ctaContentCard = document.querySelector('.cta-content-card');
  const ctaCompactContent = document.querySelector('.cta-compact-content');
  const ctaExpandedContent = document.querySelector('.cta-expanded-content');
  
  if (ctaContentCard && ctaCompactContent && ctaExpandedContent) {
    // Switch to expanded state
    ctaContentCard.classList.remove('cta-compact');
    ctaContentCard.classList.add('cta-expanded');
    
    // Hide compact content, show expanded content
    ctaCompactContent.style.display = 'none';
    ctaExpandedContent.style.display = 'block';
    
    // Update button text for expanded state
    if (ctaAudioButton && ctaAudioText && currentCTA) {
      const poiName = currentCTA.info || currentCTA.ctaTitle || 'POI';
      ctaAudioText.textContent = `Listen to ${poiName} story`;
    }
  }
}

// Close CTA modal
function closeCTAModal() {
  if (!ctaModal) {
    // Close CTA modal called but ctaModal is null
    return;
  }
  
  // Closing CTA modal
  
  // Stop audio
  stopCTAAudio();
  
  // Reset to compact state for next time
  const ctaContentCard = document.querySelector('.cta-content-card');
  const ctaCompactContent = document.querySelector('.cta-compact-content');
  const ctaExpandedContent = document.querySelector('.cta-expanded-content');
  
  if (ctaContentCard) {
    ctaContentCard.classList.remove('cta-expanded');
    ctaContentCard.classList.add('cta-compact');
  }
  
  if (ctaCompactContent) {
    ctaCompactContent.style.display = 'flex';
  }
  
  if (ctaExpandedContent) {
    ctaExpandedContent.style.display = 'none';
  }
  
  // Hide modal
  ctaModal.style.display = 'none';
  currentCTA = null;
  
  // Show center trigger box again if POI is still targeted
  if (currentTargetedPOI && isHovering) {
    showCenterTriggerBox();
  }
  
  // CTA modal closed successfully
}

// Preload CTA audio
function preloadCTAAudio(audioUrl) {
  if (!audioUrl) return;
  
  // Preloading CTA audio
  
  currentAudio = new Audio();
  currentAudio.src = audioUrl;
  currentAudio.preload = 'metadata';
  
  currentAudio.addEventListener('loadeddata', () => {
    // CTA audio loaded
  });
  
  currentAudio.addEventListener('error', (error) => {
    currentAudio = null;
  });
}

// Toggle CTA audio playback
function toggleCTAAudio() {
  if (!currentAudio || !currentCTA) {
    return;
  }
  
  // Track audio interaction in Google Analytics
  if (window.gtag && currentCTA.info) {
    if (isAudioPlaying) {
      gtag('event', 'audio_paused', {
        'event_category': 'AR_Experience',
        'event_label': currentCTA.info,
        'poi_name': currentCTA.info,
        'poi_title': currentCTA.ctaTitle || currentCTA.info,
        'interaction_type': 'audio_pause'
      });
      // Analytics: Audio paused
    } else {
      gtag('event', 'audio_played', {
        'event_category': 'AR_Experience',
        'event_label': currentCTA.info,
        'poi_name': currentCTA.info,
        'poi_title': currentCTA.ctaTitle || currentCTA.info,
        'interaction_type': 'audio_play'
      });
      // Analytics: Audio played
    }
  }
  
  if (isAudioPlaying) {
    pauseCTAAudio();
  } else {
    playCTAAudio();
  }
}

// Play CTA audio
function playCTAAudio() {
  if (!currentAudio || !currentCTA) return;
  
  // Playing CTA audio
  
  currentAudio.play().then(() => {
    isAudioPlaying = true;
    ctaAudioButton.classList.add('playing');
    // Added playing class to button
    ctaAudioText.textContent = 'Pause';
    
    // Change icon to pause
    const audioIcon = ctaAudioButton.querySelector('.cta-audio-icon');
    if (audioIcon) {
      audioIcon.src = './assets/images/UI/pause_icon@4x.png';
    }
    
    // Update button text when audio ends
    currentAudio.addEventListener('ended', () => {
      isAudioPlaying = false;
      ctaAudioButton.classList.remove('playing');
      const poiName = currentCTA?.info || currentCTA?.ctaTitle || 'POI';
      ctaAudioText.textContent = `Listen to ${poiName} story`;
      
      // Change icon back to play
      const audioIcon = ctaAudioButton.querySelector('.cta-audio-icon');
      if (audioIcon) {
        audioIcon.src = './assets/images/UI/play_icon@4x.png';
      }
    }, { once: true });
    
  }).catch(error => {
    ctaAudioText.textContent = 'Audio unavailable';
  });
}

// Pause CTA audio
function pauseCTAAudio() {
  if (!currentAudio || !isAudioPlaying) return;
  
  // Pausing CTA audio
  
  currentAudio.pause();
  isAudioPlaying = false;
  
  // Force remove playing class and ensure original styling
  if (ctaAudioButton) {
    ctaAudioButton.classList.remove('playing');
    // Removed playing class from button
  }
  
  // Change text back to dynamic POI text
  const poiName = currentCTA?.info || currentCTA?.ctaTitle || 'POI';
  ctaAudioText.textContent = `Listen to ${poiName} story`;
  
  // Change icon back to play
  const audioIcon = ctaAudioButton.querySelector('.cta-audio-icon');
  if (audioIcon) {
    audioIcon.src = './assets/images/UI/play_icon@4x.png';
  }
}

// Stop CTA audio
function stopCTAAudio() {
  if (!currentAudio) return;
  
  // Stopping CTA audio
  
  currentAudio.pause();
  currentAudio.currentTime = 0;
  isAudioPlaying = false;
  currentAudio = null;
  
  if (ctaAudioButton) {
    ctaAudioButton.classList.remove('playing');
    const poiName = currentCTA?.info || currentCTA?.ctaTitle || 'POI';
    ctaAudioText.textContent = `Listen to ${poiName} story`;
    
    // Change icon back to play
    const audioIcon = ctaAudioButton.querySelector('.cta-audio-icon');
    if (audioIcon) {
      audioIcon.src = './assets/images/UI/play_icon@4x.png';
    }
  }
}

// ===== POI LABEL FUNCTIONALITY =====

// Show POI label
function showPOILabel(entity, labelText, position, poiData) {
  // Remove any existing label
  hidePOILabel();
  
  // Create label container
  labelContainer = document.createElement('div');
  labelContainer.className = 'poi-label-container';
  labelContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-120%, -50%);
    z-index: 9999;
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  // Create label text
  const labelElement = document.createElement('div');
  labelElement.className = 'poi-label-text';
  labelElement.textContent = labelText;
  labelElement.style.cssText = `
    color: white;
    font-size: 18px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    white-space: nowrap;
  `;
  
  // Create connecting line
  const lineElement = document.createElement('div');
  lineElement.className = 'poi-label-line';
  lineElement.style.cssText = `
    width: 40px;
    height: 2px;
    background: white;
    box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  `;
  
  // Label is now informational only - screen tap handles CTA activation
  // No click events needed on label
  
  // Add elements to container (label first, then line pointing to POI)
  labelContainer.appendChild(labelElement);
  labelContainer.appendChild(lineElement);
  
  // Add to document
  document.body.appendChild(labelContainer);
  currentLabel = labelContainer;
  
  // POI label shown
}

// Hide POI label
function hidePOILabel() {
  if (currentLabel && currentLabel.parentNode) {
    currentLabel.parentNode.removeChild(currentLabel);
    currentLabel = null;
  }
}

// Show center trigger box for POI interaction
function showCenterTriggerBox() {
  if (centerTriggerBox) {
    // If already exists, just make it visible
    centerTriggerBox.style.opacity = '1';
    centerTriggerBox.style.pointerEvents = 'auto';
    // Center trigger box shown (opacity restored)
    return;
  }

  // Create center trigger box
  centerTriggerBox = document.createElement('div');
  centerTriggerBox.id = 'center-trigger-box';
  
  // Set up the clickable area (200px circle)
  centerTriggerBox.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200px; /* Clickable area */
    height: 200px; /* Clickable area */
    z-index: 9998;
    pointer-events: auto;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 1;
    transition: opacity 0.3s ease;
  `;
  
  // Create the visual element (40px circle)
  const visualElement = document.createElement('div');
  visualElement.style.cssText = `
    width: 40px; /* Visual size */
    height: 40px; /* Visual size */
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    backdrop-filter: blur(2px);
  `;
  centerTriggerBox.appendChild(visualElement);
  
  // Create the instruction text below the target
  const instructionText = document.createElement('div');
  instructionText.id = 'center-instruction-text';
  instructionText.className = 'center-instruction-text';
  instructionText.innerHTML = 'Aim at landmarks<br>to learn more';
  instructionText.style.cssText = `
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translate(-50%, 60px);
    color: white;
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    white-space: nowrap;
    pointer-events: none;
    opacity: 1;
    transition: opacity 0.3s ease-in-out;
    font-family: Arial, sans-serif;
  `;
  centerTriggerBox.appendChild(instructionText);
  
  // Remove the text
  // centerTriggerBox.innerHTML = 'Tap to open<br>POI info';
  
  // Add click event to trigger CTA
  centerTriggerBox.addEventListener('click', () => {
    // Check if orientation overlay is active - if so, don't trigger CTA
    const orientationOverlay = document.getElementById('orientation-overlay');
    if (orientationOverlay) {
      const computedStyle = window.getComputedStyle(orientationOverlay);
      if (computedStyle.display === 'flex') {
        // Orientation overlay is open - preventing CTA trigger from click
        return;
      }
    }
    
    if (currentTargetedPOI) {
      // Center trigger box tapped while targeting POI
      showCTAModal(currentTargetedPOI);
    } else {
      // Center trigger box tapped but no POI targeted
    }
  });
  
  // Add touch event for mobile
  centerTriggerBox.addEventListener('touchstart', (e) => {
    e.preventDefault();
    
    // Check if orientation overlay is active - if so, don't trigger CTA
    const orientationOverlay = document.getElementById('orientation-overlay');
    if (orientationOverlay) {
      const computedStyle = window.getComputedStyle(orientationOverlay);
      if (computedStyle.display === 'flex') {
        // Orientation overlay is open - preventing CTA trigger from touch
        return;
      }
    }
    
    if (currentTargetedPOI) {
      // Center trigger box touched while targeting POI
      showCTAModal(currentTargetedPOI);
    } else {
      // Center trigger box touched but no POI targeted
    }
  });
  
  // Add to document
  document.body.appendChild(centerTriggerBox);
  
  // Center trigger box shown and added to DOM
}

// Hide center trigger box
function hideCenterTriggerBox() {
  if (centerTriggerBox) {
    // Hide visually but keep clickable
    centerTriggerBox.style.opacity = '0';
    centerTriggerBox.style.pointerEvents = 'auto'; // Keep clickable even when hidden
    // Center trigger box hidden (opacity set to 0) but still clickable
  }
}

// Show hover loading ring (same size as center trigger box visual element)
function showHoverLoadingRing() {
  // Remove existing ring to reset animation
  if (window.hoverLoadingRing) {
    window.hoverLoadingRing.remove();
    window.hoverLoadingRing = null;
  }

  // Create hover loading ring using the new CSS system
  window.hoverLoadingRing = document.createElement('div');
  window.hoverLoadingRing.className = 'loading-ring loading-ring--small loading-ring--fast';
  window.hoverLoadingRing.id = 'hover-loading-ring';
  
  // Apply custom styles to match current size, color, and position
  window.hoverLoadingRing.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 9999;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    --ring-size: 40px;
    --ring-thickness: 3px;
    --ring-color: #FFFFFF;
    --ring-bg-color: rgba(255, 255, 255, 0.3);
    --animation-duration: 1s;
  `;
  
  document.body.appendChild(window.hoverLoadingRing);
  
  // Show the ring
  setTimeout(() => {
    if (window.hoverLoadingRing) {
      window.hoverLoadingRing.style.opacity = '1';
    }
  }, 10);
  
  // Hover loading ring created and shown (animation reset)
}

// Hide hover loading ring
function hideHoverLoadingRing() {
  if (window.hoverLoadingRing) {
    window.hoverLoadingRing.style.opacity = '0';
    // Hover loading ring hidden
  }
}

// Center trigger box handles all POI interactions now
// No need for global screen tap listener

// Process locations sequentially for iOS compatibility
async function processLocationsSequentially(locationKeys, data) {
  // Prevent multiple processing
  if (locationsProcessed) {
    // Locations already processed, skipping duplicate processing
    return;
  }
  
  // Processing locations sequentially for iOS compatibility
  
  for (let i = 0; i < locationKeys.length; i++) {
    const locationKey = locationKeys[i];
    const locationData = data[locationKey];
    
          // Processing location
    
    // Add location to list
    loadedLocationDataList.push(locationData);
    
    // Count images in this location
          const imageCount = locationData.media.filter(media => media.type === 'image').length;
      // Location has images
    
    // Small delay for iOS to process
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // All locations processed
  locationsProcessed = true;
  tryPlacingPOIs();
}

function tryPlacingPOIs() {
  // Prevent multiple simultaneous calls
  if (isPlacingPOIs) {
    // POI placement already in progress, skipping duplicate call
    return;
  }
  
  // Trying to place POIs
  
  if (!poiPlaced && loadedLocationDataList.length > 0) {
    // If heading is ready, place POIs immediately (don't wait for all images)
    if (headingReady) {
      // Placing POIs - heading ready, starting immediately
      isPlacingPOIs = true; // Mark as placing POIs
      tryPlacingPOIsCalled = true; 
      placePOIs();
      // poiPlaced will be set to true inside placePOIs() after successful placement
    } else {
      // Waiting for heading to be ready, will retry
      // If heading not ready, wait a bit and try again
      setTimeout(() => {
        if (!poiPlaced && !tryPlacingPOIsCalled) {
          // Retrying POI placement after delay
          tryPlacingPOIs();
        } else {
                      // Skipping retry - POIs already placed or placement in progress
        }
      }, 500); // Reduced from 1000ms to 500ms for faster retry
    }
  } else {
    // Skipping POI placement
  }
}

async function placePOIs() {
  const placementTimestamp = new Date().toISOString();
  // Placing POIs
  
  // Global protection against multiple simultaneous placements
  if (placementInProgress) {
    // POI placement already in progress globally, skipping
    isPlacingPOIs = false; // Reset flag
    return;
  }
  
  placementInProgress = true;
  
  const scene = document.querySelector("a-scene");
  
  // Check for existing POIs in the scene
  const existingPOIsInScene = scene.querySelectorAll("a-image.clickable");
  const existingPOIEntities = scene.querySelectorAll("[data-poi-info]");
  // Scene check: existing POIs
  
  // Check if POIs are already placed to prevent duplicates
  if (poiPlaced && poiEntities.length > 0) {
    // POIs already placed, skipping duplicate placement
    isPlacingPOIs = false; // Reset flag
    placementInProgress = false; // Reset global flag
    return;
  }
  
  // Simple protection - if POIs are already placed, don't place again
  if (poiPlaced) {
    // POI placement already in progress, skipping
    isPlacingPOIs = false; // Reset flag
    placementInProgress = false; // Reset global flag
    return;
  }
  
  // Additional check: see if there are already POI entities in the scene
  const existingPOIs = scene.querySelectorAll("a-image.clickable");
  if (existingPOIs.length > 0) {
    // Found existing POI entities in scene, clearing them
    existingPOIs.forEach(entity => {
      if (entity.parentNode) {
        entity.parentNode.removeChild(entity);
      }
    });
  }
  
  // Clear ALL existing POI entities from the scene to prevent duplicates
  const allExistingPOIs = scene.querySelectorAll("a-image.clickable");
  // Clearing existing POI entities from scene
  allExistingPOIs.forEach(entity => {
    if (entity.parentNode) {
      entity.parentNode.removeChild(entity);
    }
  });
  
  // Also clear any entities with data-poi-info attribute (backup cleanup)
  const allPOIEntities = scene.querySelectorAll("[data-poi-info]");
  // Clearing additional POI entities with data-poi-info
  allPOIEntities.forEach(entity => {
    if (entity.parentNode) {
      entity.parentNode.removeChild(entity);
    }
  });
  
  // Clear arrays
  poiEntities = [];
  poiConfigs = [];

  // Start AR immediately without waiting for all images to preload
  // Starting AR experience immediately - images will load in background

  let poiCount = 0;
  const placedLocations = new Set(); // Track which locations have been placed for this placement call
  
  // Process each location sequentially for iOS
  for (let locationIndex = 0; locationIndex < loadedLocationDataList.length; locationIndex++) {
    const location = loadedLocationDataList[locationIndex];
    const common = location.common;

    // Placing POIs for location

    // Find the first image media item for this location
    let imageMedia = null;
    for (let mediaIndex = 0; mediaIndex < location.media.length; mediaIndex++) {
      const media = location.media[mediaIndex];
      if (media.type === 'image') {
        imageMedia = media;
        break; // Use only the first image
      }
    }
    
    // Skip if no image found for this location
    if (!imageMedia) {
      // No image media found for location, skipping
      continue;
    }
    
        // Create unique identifier based on location info
    const locationId = `${imageMedia.info}-${locationIndex}`;
    
    // Processing location with fixed angle positioning
    
    // Check if this location has already been placed
    if (placedLocations.has(locationId) || globalPlacedCoordinates.has(locationId)) {
      // Skipping duplicate location
      continue;
    }
    
    placedLocations.add(locationId);
    globalPlacedCoordinates.add(locationId); // Add to global tracking
          // Added location to placed set

    // Use fixed angle positioning from mediaConfig
    const fixedAngleDegrees = common.fixedAngleDegrees || 0;
    const initialY = common.initialY || 0;
    const initialZ = common.initialZ || -25;

    const position = calculateFixedPosition(fixedAngleDegrees, initialY, initialZ);
    const rotation = calculateFixedRotation(fixedAngleDegrees);

          // POI placed at fixed angle and position

    // Create A-Frame entity
    const entity = document.createElement("a-image");

    // Set a transparent material initially to prevent white flash
    entity.setAttribute("material", "color", "transparent");
    entity.setAttribute("material", "transparent", true);
    entity.setAttribute("material", "opacity", 0.1);

    // Set the image source
    entity.setAttribute("src", imageMedia.url);

    // Wait for image to load before making it visible
    entity.addEventListener('load', () => {
      // Image loaded successfully - now we can show it
      entity.setAttribute("material", "color", "white");
      entity.setAttribute("material", "opacity", 0.1); // Start fade-in process
    });
    
    entity.setAttribute("position", `${position.x} ${position.y} ${position.z}`);
    entity.setAttribute("rotation", `${rotation.x} ${rotation.y} ${rotation.z}`);
    
    // Apply global scale multiplier to the POI scale
    const baseScale = common.scale;
    const scaledScale = baseScale.split(' ').map(val => parseFloat(val) * GLOBAL_POI_SCALE).join(' ');
    entity.setAttribute("scale", scaledScale);
    
    // Enable transparency and proper depth testing for all POI icons
    entity.setAttribute("material", "color", "white");
    entity.setAttribute("material", "transparent", true);
    entity.setAttribute("material", "opacity", 1.0);
    entity.setAttribute("material", "depthTest", true);
    entity.setAttribute("material", "depthWrite", false); // Important for transparent objects
    entity.setAttribute("material", "side", "double"); // Render both sides
    
    entity.classList.add("clickable");
    entity.setAttribute("data-raycastable", "");
    
    // Add data attributes for POI info
    entity.setAttribute("data-poi-info", JSON.stringify({
      info: imageMedia.info,
      fixedAngle: fixedAngleDegrees,
      position: position,
      ctaImage: imageMedia.ctaImage,
      ctaTitle: imageMedia.ctaTitle,
      ctaDescription: imageMedia.ctaDescription,
      ctaAudioUrl: imageMedia.ctaAudioUrl
    }));

    // Store original scale for rotation updates (using scaled scale)
    entity.setAttribute("data-original-scale", scaledScale);

    // Add hover effect with scale animation - track targeted POI
    entity.addEventListener('raycaster-intersected', () => {
      // Raycaster intersected with POI
      
      // Check if orientation overlay is active - if so, don't start hover effects
      const orientationOverlay = document.getElementById('orientation-overlay');
      if (orientationOverlay) {
        const computedStyle = window.getComputedStyle(orientationOverlay);
        if (computedStyle.display === 'flex') {
          // Orientation overlay is open - preventing hover effects
          return;
        }
      }
      
      // Only set targeting if not already targeting this POI
      if (currentTargetedPOI !== imageMedia) {
        // POI targeted
        isHovering = true;
        hoverStartTime = Date.now();
        currentTargetedPOI = imageMedia; // Store the currently targeted POI
        
        // Scale up POI by 40% on hover
        const currentScale = entity.getAttribute('scale');
        const scaleX = parseFloat(currentScale.x) * 1.4;
        const scaleY = parseFloat(currentScale.y) * 1.4;
        const scaleZ = parseFloat(currentScale.z);
        entity.setAttribute('scale', `${scaleX} ${scaleY} ${scaleZ}`);
        
        // showPOILabel(entity, imageMedia.info, position, imageMedia); // COMMENTED OUT - labels disabled
        hideCenterTriggerBox(); // Hide center trigger box when hovering over POI
        
        // Show hover loading ring
        showHoverLoadingRing();
        
        // Start 2-second timer for CTA auto-load
        window.ctaTimer = setTimeout(() => {
          // Check if orientation overlay is active - if so, don't trigger CTA
          const orientationOverlay = document.getElementById('orientation-overlay');
          if (orientationOverlay) {
            const computedStyle = window.getComputedStyle(orientationOverlay);
            if (computedStyle.display === 'flex') {
              // Orientation overlay is open - preventing CTA trigger from hover timer
              window.ctaTimer = null; // Clear the timer reference
              return;
            }
          }
          
          // Check if still hovering over the same POI after 2 seconds
          if (currentTargetedPOI === imageMedia && isHovering) {
            // 2-second hover timer completed - auto-loading CTA
            hideHoverLoadingRing(); // Hide the loading ring
            showCTAModal(imageMedia);
          }
          window.ctaTimer = null; // Clear the timer reference
        }, 1000); // 1 second delay
      }
    });

    entity.addEventListener('raycaster-intersected-cleared', () => {
      // POI targeting ended
      // Clear targeting state immediately
      isHovering = false;
      hoverStartTime = 0;
      if (currentTargetedPOI === imageMedia) {
        currentTargetedPOI = null; // Clear targeted POI
      }
      
      // Reset POI scale back to original
      const originalScale = entity.getAttribute('data-original-scale');
      entity.setAttribute('scale', originalScale);
      
      // hidePOILabel(); // COMMENTED OUT - labels disabled
      showCenterTriggerBox(); // Show center trigger box when not hovering over POI
      
      // Hide hover loading ring
      hideHoverLoadingRing();
      
      // Clear any pending CTA timer for this POI
      if (window.ctaTimer) {
        clearTimeout(window.ctaTimer);
        window.ctaTimer = null;
        // CTA timer cleared - user moved away from POI
      }
    });

    // Add error handling for entity creation
    entity.addEventListener('error', (error) => {
      // Entity creation error handled silently
    });

          // Add to scene with staggered fade-in effect
      scene.appendChild(entity);

      // Start with very low opacity (not 0) for fade-in effect
      entity.setAttribute("material", "opacity", 0.1);

      // Stagger the fade-in over 2-3 seconds (200ms delay between each POI)
      const fadeInDelay = poiCount * 200; // 200ms delay per POI
      setTimeout(() => {
        // Fade in the POI over 1.5 seconds (slower fade)
        entity.setAttribute("material", "opacity", 1);
        
        // Add a CSS transition for smooth opacity change - increased duration to 1.5s
        entity.style.transition = "opacity 1500ms ease-in-out";
      }, fadeInDelay);

      poiEntities.push(entity);
      poiConfigs.push({
        entity: entity,
        originalScale: scaledScale,
        fixedAngle: fixedAngleDegrees,
        position: position,
        rotation: rotation
      });

              // POI added to scene
      // Scene now has total children and POI entities
      poiCount++;
  }

  // Successfully placed POIs
  // Final scene state
  poiPlaced = true; // Mark as placed after successful placement
  window.poiPlaced = true; // Set global flag for compass integration
  isPlacingPOIs = false; // Reset flag after successful placement
  placementInProgress = false; // Reset global flag
  
  // FIXED POSITIONING: Disable continuous position updates to prevent compass boundary issues
  // POIs will remain in their calibrated positions and only rotate to face camera
  // POIs placed with fixed positions - no continuous position updates
      // Only enabling camera-facing rotation updates for POIs
  
  if (!continuousUpdatesActive) {
    continuousUpdatesActive = true;
    updatePOIRotationToFaceCamera(); // Only rotation updates, no position updates
  } else {
    // Continuous updates already active, skipping duplicate start
  }
  
  // POI placement complete - continuous updates enabled
  
  // Make AR scene visible since we're not using compass integration
  const arScene = document.getElementById("ar-scene");
  if (arScene) {
    arScene.style.display = "block";
    // AR scene made visible
  }

  // Show center trigger box immediately after POI placement
  showCenterTriggerBox();
  // Center trigger box shown after POI placement
  
  // Debug: Log all entities in scene
  const finalScene = document.querySelector("a-scene");
  const allEntities = finalScene.querySelectorAll("*");
  // Final scene analysis
  
  // Count POI entities specifically
  const poiEntitiesInScene = finalScene.querySelectorAll("a-image.clickable");
  // POI entities in scene
  
  // Log each POI entity
  poiEntitiesInScene.forEach((entity, index) => {
    try {
      const poiData = JSON.parse(entity.getAttribute("data-poi-info"));
      // POI entity details
    } catch (e) {
      // Unknown entity
    }
  });
}

function updatePOIPositions() {
  try {
    // Use current heading if available, otherwise fall back to initial heading
    const rawHeading = lastHeading !== null ? lastHeading : initialHeading;
    
    // Apply heading smoothing to prevent wild fluctuations
    const currentHeading = smoothHeading(rawHeading);
    
    // Debug: Log update frequency (but limit to avoid spam)
    if (Math.random() < 0.01) { // Only log 1% of the time
      const scene = document.querySelector("a-scene");
      const allPOIEntities = scene.querySelectorAll("a-image.clickable");
      // Updating POI positions with heading
      
      // Debug: Check for duplicate entities by info
      const entityInfos = [];
      allPOIEntities.forEach((entity, index) => {
        try {
          const poiData = JSON.parse(entity.getAttribute("data-poi-info"));
          entityInfos.push(poiData.info);
        } catch (e) {
          entityInfos.push(`Unknown-${index}`);
        }
      });
      
      // Check for duplicates
      const uniqueInfos = [...new Set(entityInfos)];
      if (uniqueInfos.length !== entityInfos.length) {
              // Duplicate POIs detected
      }
    }
    
    poiEntities.forEach((entity, index) => {
      try {
        const config = poiConfigs[index];
        if (!config) {
          return;
        }
        
        const { bearing, distance, originalScale, lat, lon } = config;
        
        // Recalculate bearing dynamically to ensure consistency with current heading
        const recalculatedBearing = calculateBearing(USER_LAT, USER_LON, lat, lon);
        const position = toRelativePosition(recalculatedBearing, distance, currentHeading);
        
        // Debug: Log position updates for specific POIs (limit to avoid spam)
        if (index === 0 && Math.random() < 0.1) { // Log first POI 10% of the time
          // POI position update details
        }
        
        if (entity && entity.setAttribute) {
          entity.setAttribute("position", `${position.x} ${position.y} ${position.z}`);
          entity.setAttribute("scale", originalScale);
        } else {
          // POI entity not ready for position update
        }
      } catch (error) {
        // Error updating POI position
      }
    });

    requestAnimationFrame(updatePOIPositions);
  } catch (error) {
    // Don't call requestAnimationFrame on error to prevent infinite error loops
  }
}

function updatePOIRotationToFaceCamera() {
  try {
    const camera = document.getElementById("camera");
    if (!camera || !camera.object3D) {
      return;
    }

    const camPos = camera.object3D.position;

    poiEntities.forEach((entity, index) => {
      try {
        if (!entity || !entity.object3D) {
          return;
        }

        const obj = entity.object3D;
        const dx = camPos.x - obj.position.x;
        const dz = camPos.z - obj.position.z;
        const angle = Math.atan2(dx, dz);
        obj.rotation.y = angle;
      } catch (error) {
        // Error rotating POI
      }
    });

    requestAnimationFrame(updatePOIRotationToFaceCamera);
  } catch (error) {
    // Don't call requestAnimationFrame on error to prevent infinite error loops
  }
}

function initializeAR() {
  const initTimestamp = new Date().toISOString();
  // initializeAR function called
  
  // Prevent multiple initializations
  if (window.arInitialized) {
    // AR already initialized, skipping duplicate initialization
    return;
  }
  
  window.arInitialized = true;
  
  // Don't show AR scene immediately - wait for POIs to be ready
  // Loading POIs in background
  
  // Reset POI state for clean start
  resetPOIState();
  
  // Initialize CTA modal
  if (!initializeCTAModal()) {
    // CTA modal initialization failed
  }
  
  // Don't show center trigger box yet - wait for AR experience to actually start
  // Center trigger box will be shown when AR experience starts
  
  // Hide specific buttons (calibrate, heading, test CTA)
  const refreshButton = document.getElementById("refresh");
  const headingDisplay = document.getElementById("ar-heading-display");
  const testCtaButton = document.getElementById("test-cta");
  
  if (refreshButton) {
    refreshButton.style.display = "none";
    refreshButton.style.visibility = "hidden";
  }
  if (headingDisplay) {
    headingDisplay.style.display = "none";
    headingDisplay.style.visibility = "hidden";
  }
  if (testCtaButton) {
    testCtaButton.style.display = "none";
    testCtaButton.style.visibility = "hidden";
  }
  
  // Center trigger box will be set up when POI is targeted
  
  // Check if compass calibration is complete or bypassed
  if (window.compassCalibrated && window.calibratedHeading !== null) {
    // Using calibrated heading from compass
          // Device detection - isIOS
    
    // Apply calibration offset to get true North reference
    if (window.calibrationOffset !== undefined) {
      // Applying calibration offset
      
      // Check if this includes Apple offset
      if (window.appleCompassOffset !== undefined) {
                  // Apple compass offset detected
        // Total offset includes Apple correction
      } else {
                  // No Apple offset detected - using standard calibration
      }
      
      // The offset adjusts the heading so that 270°W becomes our reference direction
      // We need to add the offset to get the true heading relative to North
      initialHeading = (window.calibratedHeading + window.calibrationOffset) % 360;
      // Adjusted initial heading for POI positioning
    } else {
      initialHeading = window.calibratedHeading;
      // No calibration offset found, using raw calibrated heading
    }
    
    headingReady = true;
    window.headingReady = true; // Set global flag for compass integration
  } else {
    // No compass calibration found, using default heading
    // Use default heading for POI positioning
    initialHeading = 225; // Default to 225° (South West)
    headingReady = true;
    window.headingReady = true;
  }

  // Load POI configurations
  // Get config file from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const configFile = urlParams.get('config') || 'mediaConfig.json';
  
  console.log('🔧 Loading POI configurations...');
  console.log('🔧 Config file:', configFile);
  console.log('🔧 URL params:', window.location.search);
  
  fetch(`./Scripts/${configFile}`)
    .then((response) => {
      console.log('🔧 Fetch response:', response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const locationKeys = Object.keys(data);
      console.log('🔧 Config data loaded:', data);
      console.log('🔧 Location keys:', locationKeys);
      // Loaded location configurations
      
      // Process locations sequentially for iOS compatibility
      processLocationsSequentially(locationKeys, data);
    })
    .catch((error) => {
      console.error('❌ Error loading POI config:', error);
      // Even if config fails, try to place any already loaded POIs
      setTimeout(() => {
        if (loadedLocationDataList.length > 0 && !poiPlaced) {
          // Attempting to place POIs despite config error
          headingReady = true;
          window.headingReady = true; // Set global flag for compass integration
          tryPlacingPOIs();
        }
      }, 2000);
    });
}

// Make initializeAR globally accessible
window.initializeAR = initializeAR;

// Debug: Log script loading
  // ar.js script loaded successfully
  // A-Frame and AR.js version check

// Test function to manually trigger CTA modal
window.testCTAModal = function() {
  // Testing CTA modal
  const testData = {
    info: 'Test POI',
    ctaImage: './assets/images/05.jpg',
    ctaTitle: 'Test Title',
    ctaDescription: 'This is a test description for the CTA modal.',
    ctaAudioUrl: './assets/audio/01.mp3'
  };
  showCTAModal(testData);
};

// Function to reset POI placement state
function resetPOIState() {
  // Resetting POI placement state
  poiPlaced = false;
  locationsProcessed = false; // Reset processing flag
  initialHeadingCaptured = false; // Reset initial heading capture flag
  tryPlacingPOIsCalled = false; // Reset tryPlacingPOIs call flag
  isPlacingPOIs = false; // Reset POI placement flag
  
  // Clear existing POIs
  poiEntities.forEach(entity => {
    if (entity.parentNode) {
      entity.parentNode.removeChild(entity);
    }
  });
  poiEntities = [];
  poiConfigs = [];
  
  // Clear targeting state
  currentTargetedPOI = null;
  isHovering = false;
  hoverStartTime = 0;
  // hidePOILabel(); // COMMENTED OUT - labels disabled
  hideCenterTriggerBox();
  
  // Clear global coordinate tracking
  globalPlacedCoordinates.clear();
  
  // Reset global placement flag
  placementInProgress = false;
  
  // Reset continuous updates flag
  continuousUpdatesActive = false;
  
  // Reset heading smoothing
  smoothedHeading = null;
  headingHistory = [];
  
  // Reset initialization flag to allow re-initialization
  window.arInitialized = false;
  
  // POI state reset complete
}

// 💡 Recalibration button handler
window.addEventListener("DOMContentLoaded", () => {
  const refreshButton = document.getElementById("refresh");
  const headingDisplay = document.getElementById("ar-heading-display");
  const testCtaButton = document.getElementById("test-cta");

  // Hide the buttons we don't want to show
  if (refreshButton) {
    refreshButton.style.display = "none";
    refreshButton.style.visibility = "hidden";
  }
  if (headingDisplay) {
    headingDisplay.style.display = "none";
    headingDisplay.style.visibility = "hidden";
  }
  if (testCtaButton) {
    testCtaButton.style.display = "none";
    testCtaButton.style.visibility = "hidden";
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      if (typeof lastHeading !== 'undefined' && lastHeading !== null) {
        // Recalibration button clicked
        
        // Reset POI state before recalibrating
        resetPOIState();
        
        initialHeading = lastHeading;
        // Recalibrated to heading
        
        // Re-place POIs with new heading using the proper flow
        if (loadedLocationDataList.length > 0) {
          // Reset the tryPlacingPOIsCalled flag to allow proper placement
          tryPlacingPOIsCalled = false;
          poiPlaced = false;
          
          // Use the proper placement flow - POIs will be placed with fixed positions
          tryPlacingPOIs();
        }
      } else {
        // No valid heading to recalibrate with
      }
    });
  }
});

// Add event listeners for help overlay
document.addEventListener('DOMContentLoaded', function() {
    const helpButton = document.getElementById('help');
    const helpOverlay = document.getElementById('help-overlay');
    const closeHelpButton = document.getElementById('close-help-overlay');
    const helpOverlayBackground = document.querySelector('.help-overlay-background');
    const backButton = document.getElementById('back');

    if (helpButton && helpOverlay) {
        helpButton.addEventListener('click', function() {
            helpOverlay.style.display = 'flex';
        });
    }

    if (closeHelpButton) {
        closeHelpButton.addEventListener('click', function() {
            helpOverlay.style.display = 'none';
        });
    }

    if (helpOverlayBackground) {
        helpOverlayBackground.addEventListener('click', function() {
            helpOverlay.style.display = 'none';
        });
    }

    // Back button functionality
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.location.href = 'https://horizon22.smartify.org/en-GB';
        });
    }
});
