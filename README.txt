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
