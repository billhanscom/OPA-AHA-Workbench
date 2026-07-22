OBOJIMA POTION ALMANAC — FIRST AGE DISPLAY PROTOTYPE
====================================================

Open index.html in a modern browser.

CURRENT FUNCTIONALITY
---------------------
- 132-column, desktop-first VT220-inspired layout
- Source Code Pro at one uniform type size and weight
- Three long ingredient columns without internal scroll bars
- Combat / Utility / Whimsy values shown beside every ingredient
- 2024 and 2014 value switching
- Local inventory clear, save, load, and view controls
- Current inventory name area expands while outer controls use only needed space
- Amber, green, and white phosphor choices
- Adjustable bloom, vignette, and scanline intensity
- Functional three-ingredient recipe generation

RECIPE ASSUMPTION
-----------------
A recipe contains three different selected ingredients. For each potion type,
the three corresponding ingredient values are added together. A valid total
from 1 through 60 maps to that numbered potion in potion_names.json.

V4 DISPLAY CALIBRATION
----------------------
This prototype adds developer-only calibration controls for phosphor color,
brightness, contrast, bloom, scanlines, vignette, screen-edge bezel shading,
curvature, phosphor persistence, and top-down redraw speed.

The logo is centered within the 132-column display. Scanlines now range from
invisible to intentionally severe, and the vignette affects all four edges of
the screen. Bloom applies to text and interface borders.

V5 display corrections:
- Brightness and contrast no longer use CSS filters that shift phosphor hue.
- Bloom now reaches dynamically generated ingredient text and luminous control fills.
- Vignette, scanlines, contrast, and bezel are fixed to the visible browser viewport.
- Bezel is a viewport-edge glass/shadow effect only.
- ASCII logo centering and ligature behavior were corrected.

V6 CRT changes
--------------
- Bloom is applied to the completed screen composite, so static and generated content glow consistently.
- Brightness and contrast now use neutral luminance filters rather than colored overlays.
- Vignette is fixed to the viewport vertically and follows the terminal container horizontally.
- "Bezel" is now labeled "Edge Distortion" and controls edge defocus/darkening rather than duplicating the vignette.
- Curvature now changes the screen transform and clipping, not just corner radius.
- Borders include an inner phosphor glow.
- Reload triggers a full-screen raster redraw using the REDRAW duration.
- Persistence remains visible after content-changing actions as a fading phosphor ghost.
