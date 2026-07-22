OBOJIMA POTION ALMANAC — FIRST AGE DISPLAY v7

Open index.html in a modern browser.

This revision rebuilds the interface around a fixed 132-character terminal grid:
- the top system bar uses the four proportions in the supplied 132-column mockup
- the ASCII logo is positioned using the literal spaces from that mockup
- the primary navigation and Generate Recipes command follow the mockup spacing
- the three ingredient columns share exactly the 132ch terminal width
- frame padding now sits outside the logical terminal grid
- narrow browser windows scroll rather than squeezing the character grid

CRT calibration controls remain available through DISPLAY CONTROLS.

v8 display corrections
- Brightness no longer uses CSS brightness filtering; hue remains fixed.
- Contrast changes screen black level rather than recoloring phosphor.
- Bloom balance improved between dense logo glyphs and thin borders.
- Vignette now includes explicit left/right falloff at the screen-container edges.
- Ingredient values use the same color as ingredient names.
- Ingredient rows have 2-character left/right padding.
