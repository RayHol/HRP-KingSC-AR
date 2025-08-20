# King's Staircase Hotspots Integration

## Overview
This project now includes a hotspots system adapted from the H22 POI (Points of Interest) system. The hotspots allow users to explore 12 different areas around the King's Staircase at Hampton Court Palace through an interactive AR experience.

## Files Created

### Core Files
- `hotspots_page.html` - Main hotspots page with AR scene and UI
- `Scripts/hotspotsConfig.json` - Configuration for all 12 hotspots
- `Scripts/hotspots.js` - JavaScript functionality for hotspots
- `Scripts/hotspots.css` - Styling for the hotspots page

### Updated Files
- `index.html` - Added "EXPLORE HOTSPOTS" button
- `Scripts/index.css` - Added styling for the hotspots button

## Hotspots Configuration

The `hotspotsConfig.json` file contains 12 hotspots positioned around the King's Staircase:

1. **East Wall - Full View** (0°) - Grand East Wall with elaborate murals
2. **Guitar Player Detail** (30°) - Focus on guitar player in bottom right
3. **Ceiling Detail** (60°) - Ornate ceiling details and architecture
4. **North Wall Section** (90°) - Northern section with decorative elements
5. **West Wall Detail** (120°) - Western wall with distinctive features
6. **South Wall Overview** (150°) - Southern wall with comprehensive murals
7. **Staircase Detail** (180°) - Close-up of staircase structure
8. **Architectural Detail** (210°) - Detailed architectural features
9. **Decorative Element** (240°) - Ornate decorative elements
10. **Upper Level View** (270°) - View from upper levels
11. **Lower Level Detail** (300°) - Ground-level architectural features
12. **Central Perspective** (330°) - Central perspective of entire staircase

## How It Works

### User Experience
1. Users click "EXPLORE HOTSPOTS" on the main page
2. The hotspots page loads with 12 interactive points around the staircase
3. Users can navigate between hotspots using touch gestures
4. Each hotspot shows information in a modal when interacted with
5. Users can access additional information via links

### Technical Features
- **Touch Navigation**: Swipe to rotate around the staircase, pinch to zoom
- **Hotspot Interaction**: Tap hotspots to see information modals
- **Responsive Design**: Works on mobile devices and tablets
- **HRP Branding**: Uses HRP yellow (#FBD86F) for interactive elements

## Setup Instructions

### 1. Add Hotspot Icons
Place the following files in `Assets/hotspot-icons/`:
- `hotspot1-icon.png` through `hotspot12-icon.png` (200x200px)
- `hotspot1-frame.png` through `hotspot12-frame.png` (300x200px)

### 2. Add Map Image
Place `kings-staircase-map.jpg` in the `Assets/` folder for the map overlay.

### 3. Add UI Icons
Place the following icons in the `Assets/` folder:
- `map-icon.svg`
- `refresh-icon.svg`
- `help-icon.svg`
- `Button.svg`

### 4. Customize Content
Update the `hotspotsConfig.json` file to:
- Add real descriptions for each hotspot
- Update links to point to actual HRP content
- Adjust positioning and scaling as needed

## Configuration Options

### Hotspot Properties
Each hotspot in `hotspotsConfig.json` has:
- `scale`: Size of the hotspot (e.g., "15 8 1")
- `fixedAngleDegrees`: Position around the staircase (0-360°)
- `initialY`: Vertical position
- `initialZ`: Distance from user
- `info`: Display name
- `description`: Detailed description
- `link`: URL for additional information

### Customization
- **Positioning**: Adjust `fixedAngleDegrees`, `initialY`, and `initialZ`
- **Scaling**: Modify the `scale` values for different hotspot sizes
- **Content**: Update `info`, `description`, and `link` for each hotspot
- **Styling**: Modify `Scripts/hotspots.css` for visual changes

## Testing

### Setup Mode
Add `?setup=true` to the URL to enable debug controls:
- Angle adjustment
- Position tracking
- Zoom controls

### Mobile Testing
- Use HTTPS server for camera access
- Test on various screen sizes
- Verify touch interactions work properly

## Future Enhancements

### Planned Features
- Audio narration for each hotspot
- Video content integration
- Interactive 3D models
- Gamification elements (tokens, achievements)
- Social sharing functionality

### Technical Improvements
- Performance optimization for larger hotspot counts
- Advanced gesture recognition
- Offline content caching
- Analytics integration

## Troubleshooting

### Common Issues
1. **Hotspots not appearing**: Check file paths in `hotspotsConfig.json`
2. **Touch not working**: Ensure HTTPS is enabled for mobile testing
3. **Modal not showing**: Check JavaScript console for errors
4. **Positioning issues**: Use setup mode to adjust angles and positions

### Debug Tools
- Browser console for JavaScript errors
- Setup mode for position adjustment
- Network tab for file loading issues

## File Structure
```
HRP-KingSC-AR/
├── hotspots_page.html
├── Scripts/
│   ├── hotspotsConfig.json
│   ├── hotspots.js
│   └── hotspots.css
├── Assets/
│   ├── hotspot-icons/
│   │   ├── hotspot1-icon.png
│   │   ├── hotspot1-frame.png
│   │   └── ... (12 pairs)
│   ├── map-icon.svg
│   ├── refresh-icon.svg
│   ├── help-icon.svg
│   └── Button.svg
└── HOTSPOTS_README.md
```

This hotspots system provides a foundation for an interactive exploration of the King's Staircase, allowing visitors to discover different aspects of this historic location through augmented reality. 