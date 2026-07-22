OBOJIMA POTION ALMANAC — FIRST AGE DISPLAY PROTOTYPE
====================================================

Open index.html in a modern browser.

This prototype works directly from the file system. The supplied JSON data has
also been embedded in data.js so that browser security restrictions do not
prevent local use. The original JSON files remain in the data folder.

CURRENT FUNCTIONALITY
---------------------
- 100-column desktop-first VT220-inspired layout
- IBM Plex Mono loaded from Google Fonts, with a local monospace fallback
- Select ingredients by clicking their names
- Filter ingredient names
- Switch between 2024 and 2014 values
- Save and load the selected inventory with localStorage
- View the current selected inventory
- Generate all valid three-ingredient potion results
- Group recipes by Combat, Utility, and Whimsy potion
- Subtle CRT scanlines, amber phosphor glow, and inverse-video controls

RECIPE ASSUMPTION
-----------------
A recipe contains three different selected ingredients. For each potion type,
the three corresponding ingredient values are added together. A valid total
from 1 through 60 maps to that numbered potion in potion_names.json.

This is a standalone visual and interaction prototype. Ingredient quantities,
brewing, Ingredient Finder, Foraging Aid, mobile layout, and full keyboard-only
navigation are intentionally outside this first build.
