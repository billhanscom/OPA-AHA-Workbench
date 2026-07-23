(() => {
  "use strict";

  const STORAGE_PREFIX = "opa-first-age";
  const DISPLAY_STORAGE_PREFIX = `${STORAGE_PREFIX}-display`;
  const ACTIVE_SELECTION_STORAGE_KEY = `${STORAGE_PREFIX}-active-selection`;
  const DISPLAY_PANEL_STORAGE_KEY = `${DISPLAY_STORAGE_PREFIX}-panel-open`;
  const TERMINAL_ID_STORAGE_KEY = `${STORAGE_PREFIX}-terminal-id`;
  const RESULTS_STATE_STORAGE_KEY = `${STORAGE_PREFIX}-results-state`;
  const EXPANDED_POTIONS_STORAGE_KEY = `${STORAGE_PREFIX}-expanded-potions`;
  const DISPLAY_SCALE_VERSION = "2";
  const POTION_TYPES = ["combat", "utility", "whimsy"];
  const TYPE_ORDER = { combat: 0, utility: 1, whimsy: 2 };
  const NAME_KEYS = {
    combat: "combat_names",
    utility: "utility_names",
    whimsy: "whimsy_names"
  };

  const ingredients = Array.isArray(window.OBOJIMA_INGREDIENTS)
    ? [...window.OBOJIMA_INGREDIENTS].sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const potionNames = window.OBOJIMA_POTION_NAMES || {};
  const ingredientByName = new Map(ingredients.map((ingredient) => [ingredient.name, ingredient]));

  const state = {
    ruleset: "2024",
    selected: new Set(),
    generated: false,
    expandedPotions: new Set(),
    dirty: true,
    currentName: "No Inventory Loaded"
  };

  const els = {
    lists: {
      common: document.getElementById("commonList"),
      uncommon: document.getElementById("uncommonList"),
      rare: document.getElementById("rareList")
    },
    currentInventory: document.getElementById("currentInventory"),
    terminalId: document.getElementById("terminalId"),
    inventoryState: document.getElementById("inventoryState"),
    saveInventory: document.getElementById("saveInventory"),
    saveStateChar: document.getElementById("saveStateChar"),
    drawer: document.getElementById("inventoryDrawer"),
    inventorySummary: document.getElementById("inventorySummary"),
    resultsPanel: document.getElementById("resultsPanel"),
    recipeResults: document.getElementById("recipeResults"),
    resultSummary: document.getElementById("resultSummary"),
    displaySettings: document.getElementById("displaySettings"),
    displaySettingsToggle: document.getElementById("displaySettingsToggle"),
    phosphorControl: document.getElementById("phosphorControl"),
    bloomControl: document.getElementById("bloomControl"),
    vignetteControl: document.getElementById("vignetteControl"),
    scanlineControl: document.getElementById("scanlineControl"),
    brightnessControl: document.getElementById("brightnessControl"),
    contrastControl: document.getElementById("contrastControl"),
    overallFocusControl: document.getElementById("overallFocusControl"),
    reverseTintControl: document.getElementById("reverseTintControl"),
    verticalFocusControl: document.getElementById("verticalFocusControl"),
    horizontalFocusControl: document.getElementById("horizontalFocusControl"),
    redrawControl: document.getElementById("redrawControl"),
    bloomValue: document.getElementById("bloomValue"),
    vignetteValue: document.getElementById("vignetteValue"),
    scanlineValue: document.getElementById("scanlineValue"),
    brightnessValue: document.getElementById("brightnessValue"),
    contrastValue: document.getElementById("contrastValue"),
    overallFocusValue: document.getElementById("overallFocusValue"),
    reverseTintValue: document.getElementById("reverseTintValue"),
    verticalFocusValue: document.getElementById("verticalFocusValue"),
    horizontalFocusValue: document.getElementById("horizontalFocusValue"),
    redrawValue: document.getElementById("redrawValue"),
    screenFrame: document.getElementById("screenFrame"),
    screenSurface: document.getElementById("screenSurface"),
    terminal: document.getElementById("terminal"),
    viewportEffects: document.getElementById("viewportEffects"),
    redrawSweep: document.getElementById("redrawSweep")
  };

  let bloomStack = null;
  let bloomObserver = null;
  let bloomSyncFrame = 0;

  function sanitizeBloomClone(root, passClass) {
    root.classList.add("phosphor-bloom-pass", passClass);
    root.setAttribute("aria-hidden", "true");

    // The Save*/Saved control is the only text node whose wording changes in
    // place. Native button text was being rendered independently in each
    // blurred DOM copy, producing overlapping letter-shaped ghosts. Keep its
    // fixed-width slot in every copy, but let the live control supply a single
    // local phosphor halo instead.
    const clonedSaveControl = root.querySelector("#saveInventory");
    if (clonedSaveControl) {
      clonedSaveControl.textContent = "";
      clonedSaveControl.classList.add("bloom-slot-only");
    }

    root.removeAttribute("id");

    root.querySelectorAll("[id], [name], [for], [aria-labelledby], [aria-describedby]").forEach((node) => {
      node.removeAttribute("id");
      node.removeAttribute("name");
      node.removeAttribute("for");
      node.removeAttribute("aria-labelledby");
      node.removeAttribute("aria-describedby");
    });

    root.querySelectorAll("button, input, select, textarea, a, [tabindex]").forEach((node) => {
      node.setAttribute("tabindex", "-1");
      node.setAttribute("aria-hidden", "true");
    });

    return root;
  }

  function rebuildBloomComposite() {
    bloomSyncFrame = 0;
    if (!bloomStack || !els.terminal) return;

    const fragment = document.createDocumentFragment();
    [
      "phosphor-bloom-pass--tight",
      "phosphor-bloom-pass--mid",
      "phosphor-bloom-pass--wide"
    ].forEach((passClass) => {
      fragment.appendChild(sanitizeBloomClone(els.terminal.cloneNode(true), passClass));
    });

    bloomStack.replaceChildren(fragment);
  }

  function scheduleBloomCompositeSync() {
    if (bloomSyncFrame) return;
    bloomSyncFrame = window.requestAnimationFrame(rebuildBloomComposite);
  }

  function initializeBloomComposite() {
    if (!els.screenSurface || !els.terminal) return;

    bloomStack = document.createElement("div");
    bloomStack.className = "phosphor-bloom-stack";
    bloomStack.setAttribute("aria-hidden", "true");
    els.screenSurface.insertBefore(bloomStack, els.terminal);
    rebuildBloomComposite();

    bloomObserver = new MutationObserver(scheduleBloomCompositeSync);
    bloomObserver.observe(els.terminal, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "style", "value", "aria-current", "aria-disabled"]
    });
  }

  const phosphors = {
    amber: {
      rgb: "255 176 0",
      bloomRgb: "255 176 0",
      phosphor: "#ffb000",
      bright: "#ffb000",
      dim: "#a87300",
      faint: "#674800",
      screen: "#15110a",
      deep: "#0c0a06",
      body: "radial-gradient(ellipse at center, #20180b 0%, #080704 72%, #020201 100%)"
    },
    green: {
      rgb: "51 255 102",
      bloomRgb: "51 255 102",
      phosphor: "#33ff66",
      bright: "#33ff66",
      dim: "#20a843",
      faint: "#146629",
      screen: "#07150b",
      deep: "#030c05",
      body: "radial-gradient(ellipse at center, #0b2111 0%, #040a05 72%, #010301 100%)"
    },
    white: {
      rgb: "238 247 255",
      bloomRgb: "216 236 255",
      phosphor: "#eef7ff",
      bright: "#eef7ff",
      dim: "#99a399",
      faint: "#5d665d",
      screen: "#111411",
      deep: "#080a08",
      body: "radial-gradient(ellipse at center, #1b201b 0%, #080a08 72%, #020302 100%)"
    }
  };

  const displayDefaults = {
    phosphor: "amber",
    brightness: 44,
    contrast: 38,
    bloom: 14,
    scanlines: 45,
    vignette: 52,
    overallFocus: 0,
    reverseTint: 10,
    verticalFocus: 30,
    horizontalFocus: 30,
    redraw: 150
  };

  const displayLimits = {
    brightness: [0, 100],
    contrast: [0, 100],
    bloom: [0, 200],
    scanlines: [0, 100],
    vignette: [0, 100],
    overallFocus: [0, 100],
    reverseTint: [0, 20],
    verticalFocus: [0, 100],
    horizontalFocus: [0, 100],
    redraw: [0, 1500]
  };

  const displayControls = {
    brightness: [els.brightnessControl, els.brightnessValue, "%"],
    contrast: [els.contrastControl, els.contrastValue, "%"],
    bloom: [els.bloomControl, els.bloomValue, "%"],
    scanlines: [els.scanlineControl, els.scanlineValue, "%"],
    vignette: [els.vignetteControl, els.vignetteValue, "%"],
    overallFocus: [els.overallFocusControl, els.overallFocusValue, "%"],
    reverseTint: [els.reverseTintControl, els.reverseTintValue, "%"],
    verticalFocus: [els.verticalFocusControl, els.verticalFocusValue, "%"],
    horizontalFocus: [els.horizontalFocusControl, els.horizontalFocusValue, "%"],
    redraw: [els.redrawControl, els.redrawValue, " ms"]
  };

  function setRootProperty(name, value) {
    document.documentElement.style.setProperty(name, value);
  }

  function readStorage(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {}
  }

  function currentResultsSignature() {
    return JSON.stringify({
      ruleset: state.ruleset,
      selected: [...state.selected].sort((a, b) => a.localeCompare(b))
    });
  }

  function persistResultsState() {
    writeStorage(RESULTS_STATE_STORAGE_KEY, currentResultsSignature());
  }

  function clearPersistedResultsState() {
    try {
      localStorage.removeItem(RESULTS_STATE_STORAGE_KEY);
    } catch (error) {}
  }

  function restoreExpandedPotions() {
    try {
      const saved = JSON.parse(readStorage(EXPANDED_POTIONS_STORAGE_KEY, "[]"));
      state.expandedPotions = new Set(Array.isArray(saved) ? saved : []);
    } catch (error) {
      state.expandedPotions = new Set();
    }
  }

  function persistExpandedPotions() {
    writeStorage(EXPANDED_POTIONS_STORAGE_KEY, JSON.stringify([...state.expandedPotions]));
  }

  function restoreResultsIfCurrent() {
    const savedSignature = readStorage(RESULTS_STATE_STORAGE_KEY);
    if (savedSignature && savedSignature === currentResultsSignature()) {
      generateRecipes({ scroll: false, animate: false, persist: false });
    }
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, Number(value)));
  }

  function updateDisplayControl(name, numeric) {
    const [control, output, suffix] = displayControls[name];
    control.value = String(numeric);
    output.value = `${numeric}${suffix}`;
  }

  function applyPhosphor(name, save = true) {
    const key = phosphors[name] ? name : "amber";
    const palette = phosphors[key];

    setRootProperty("--phosphor-rgb", palette.rgb);
    setRootProperty("--bloom-rgb", palette.bloomRgb || palette.rgb);
    setRootProperty("--phosphor", palette.phosphor);
    setRootProperty("--phosphor-bright", palette.bright);
    setRootProperty("--phosphor-dim", palette.dim);
    setRootProperty("--phosphor-faint", palette.faint);
    setRootProperty("--screen", palette.screen);
    setRootProperty("--screen-deep", palette.deep);
    setRootProperty("--page-background", palette.deep);

    document.body.style.background = palette.deep;
    els.screenFrame.style.background = "transparent";
    els.phosphorControl.value = key;

    if (save) {
      writeStorage(`${DISPLAY_STORAGE_PREFIX}-phosphor`, key);
    }
  }

  function mapBrightnessToLegacy(numeric) {
    return 20 + (numeric / 100) * 180;
  }

  function mapContrastToLegacy(numeric) {
    return 50 + (numeric / 100) * 130;
  }

  function applyBrightness(numeric) {
    const legacyValue = mapBrightnessToLegacy(numeric);
    const below = Math.min(legacyValue, 100) / 100;
    const above = Math.max(0, legacyValue - 100) / 100;
    const contentOpacity = legacyValue <= 100
      ? 0.10 + Math.pow(below, 1.35) * 0.90
      : 1;

    setRootProperty("--content-opacity", String(contentOpacity));
    setRootProperty("--display-brightness", "1");
    setRootProperty("--brightness-boost-alpha", String(Math.pow(above, 1.15) * 0.82));
    setRootProperty("--brightness-white-alpha", "0");
    setRootProperty("--brightness-overdrive-alpha", String(Math.pow(above, 1.25) * 0.72));
    setRootProperty("--brightness-halo-radius", `${0.4 + Math.pow(above, 1.15) * 17}px`);
    setRootProperty("--brightness-halo-alpha", String(0.06 + Math.pow(above, 1.1) * 0.86));
    setRootProperty("--page-brighten-alpha", String(Math.pow(above, 1.3) * 0.30));
    setRootProperty("--page-dim-alpha", String((1 - below) * 0.72));
  }

  function applyContrast(numeric) {
    // Preserve the restored v5 contrast response while exposing it on a
    // normalized 0-100 developer scale.
    const legacyValue = mapContrastToLegacy(numeric);
    const distance = 100 - legacyValue;

    setRootProperty(
      "--contrast-overlay-alpha",
      String(distance > 0 ? Math.min(0.55, distance / 145) : 0)
    );
    setRootProperty(
      "--contrast-wash-alpha",
      String(distance < 0 ? Math.min(0.18, Math.abs(distance) / 280) : 0)
    );

    // Disable later contrast experiments so only the v5 layer is active.
    setRootProperty("--display-contrast", "1");
    setRootProperty("--contrast-warm-alpha", "0");
    setRootProperty("--contrast-dark-alpha", "0");
  }

  function applyBloom(numeric) {
    const scale = numeric / 100;
    const energy = Math.pow(scale, 1.08);

    // Three blurred copies of the completed terminal create one cohesive
    // phosphor bloom. Every glyph, border, and reverse-video fill is sampled
    // from the same source image and therefore responds to the slider equally.
    setRootProperty("--bloom-tight-radius", `${0.2 + energy * 1.35}px`);
    setRootProperty("--bloom-tight-opacity", String(Math.min(0.72, energy * 0.34)));
    setRootProperty("--bloom-mid-radius", `${0.55 + energy * 5.8}px`);
    setRootProperty("--bloom-mid-opacity", String(Math.min(0.54, energy * 0.24)));
    setRootProperty("--bloom-wide-radius", `${1.2 + energy * 15}px`);
    setRootProperty("--bloom-wide-opacity", String(Math.min(0.34, energy * 0.14)));

  }

  function applyDisplaySetting(name, value, save = true) {
    const [minimum, maximum] = displayLimits[name] || [0, 100];
    const numeric = clamp(value, minimum, maximum);
    const decimal = numeric / 100;

    switch (name) {
      case "brightness":
        applyBrightness(numeric);
        break;
      case "contrast":
        applyContrast(numeric);
        break;
      case "bloom":
        applyBloom(numeric);
        break;
      case "scanlines":
        setRootProperty("--scanline-light-alpha", String(decimal * 0.14));
        setRootProperty("--scanline-dark-alpha", String(decimal * 0.90));
        break;
      case "vignette":
        setRootProperty("--vignette-strength", String(decimal));
        break;
      case "overallFocus":
        // Uniformly defocus the complete terminal image without changing
        // phosphor hue, luminance, or bloom opacity. The deliberately
        // shallow range keeps the control useful for calibration rather than
        // turning the interface into an unreadable Gaussian blur.
        setRootProperty("--overall-focus-blur", `${decimal * 2.25}px`);
        break;
      case "reverseTint": {
        // Keep the visible lettering nearly black, while giving the bloom-only
        // copies a stronger emissive contribution. This lets phosphor light
        // bleed gently into reverse-video glyphs without washing out the live
        // text. The 0-20 control range maps to 0-20% visible tint and 0-65%
        // bloom-source tint.
        const emissiveTint = (numeric / 20) * 65;
        const emissiveAlpha = (numeric / 20) * 0.34;
        setRootProperty("--reverse-text-tint", `${numeric}%`);
        setRootProperty("--reverse-bloom-source-tint", `${emissiveTint}%`);
        setRootProperty("--reverse-emission-alpha", String(emissiveAlpha));
        break;
      }
      case "verticalFocus":
        setRootProperty("--vertical-focus-soft-blur", `${decimal * 1.8}px`);
        setRootProperty("--vertical-focus-medium-blur", `${decimal * 4.2}px`);
        setRootProperty("--vertical-focus-strong-blur", `${decimal * 8}px`);
        setRootProperty("--vertical-focus-soft-opacity", String(decimal * 0.72));
        setRootProperty("--vertical-focus-medium-opacity", String(decimal * 0.58));
        setRootProperty("--vertical-focus-strong-opacity", String(decimal * 0.44));
        break;
      case "horizontalFocus":
        setRootProperty("--horizontal-focus-soft-blur", `${decimal * 1.8}px`);
        setRootProperty("--horizontal-focus-medium-blur", `${decimal * 4.2}px`);
        setRootProperty("--horizontal-focus-strong-blur", `${decimal * 8}px`);
        setRootProperty("--horizontal-focus-soft-opacity", String(decimal * 0.72));
        setRootProperty("--horizontal-focus-medium-opacity", String(decimal * 0.58));
        setRootProperty("--horizontal-focus-strong-opacity", String(decimal * 0.44));
        break;
      case "redraw":
        setRootProperty("--redraw-ms", `${numeric}ms`);
        break;
      default:
        return;
    }

    updateDisplayControl(name, numeric);

    if (save) {
      writeStorage(`${DISPLAY_STORAGE_PREFIX}-${name}`, String(numeric));
    }
  }

  function legacyBrightnessToScale(value) {
    return ((clamp(value, 20, 200) - 20) / 180) * 100;
  }

  function legacyContrastToScale(value) {
    return ((clamp(value, 50, 180) - 50) / 130) * 100;
  }

  function loadDisplaySettings() {
    const phosphor = readStorage(
      `${DISPLAY_STORAGE_PREFIX}-phosphor`,
      displayDefaults.phosphor
    );
    applyPhosphor(phosphor, false);

    const scaleVersion = readStorage(`${DISPLAY_STORAGE_PREFIX}-scale-version`);

    Object.keys(displayDefaults)
      .filter((name) => name !== "phosphor")
      .forEach((name) => {
        let stored = readStorage(`${DISPLAY_STORAGE_PREFIX}-${name}`);
        if ((name === "verticalFocus" || name === "horizontalFocus") && stored === null) {
          stored = readStorage(`${DISPLAY_STORAGE_PREFIX}-bezel`);
        }
        let value = stored !== null && stored !== ""
          ? Number(stored)
          : displayDefaults[name];

        if (scaleVersion !== DISPLAY_SCALE_VERSION) {
          if (name === "brightness" && stored !== null && stored !== "") {
            value = legacyBrightnessToScale(value);
          } else if (name === "contrast" && stored !== null && stored !== "") {
            value = legacyContrastToScale(value);
          }
        }

        applyDisplaySetting(name, value, false);
      });

    writeStorage(`${DISPLAY_STORAGE_PREFIX}-scale-version`, DISPLAY_SCALE_VERSION);
    writeStorage(`${DISPLAY_STORAGE_PREFIX}-brightness`, String(els.brightnessControl.value));
    writeStorage(`${DISPLAY_STORAGE_PREFIX}-contrast`, String(els.contrastControl.value));
  }

  function updateViewportEffectsBounds() {
    const rect = els.screenFrame.getBoundingClientRect();
    setRootProperty("--screen-left", `${Math.max(0, rect.left)}px`);
    setRootProperty("--screen-right", `${Math.max(0, window.innerWidth - rect.right)}px`);
  }

  function redraw() {
    const duration = Number(els.redrawControl.value || 0);
    if (duration <= 0 || !els.redrawSweep) return;

    updateViewportEffectsBounds();
    els.redrawSweep.style.setProperty("--active-redraw-ms", `${duration}ms`);
    els.redrawSweep.classList.remove("is-active");
    void els.redrawSweep.offsetWidth;
    els.redrawSweep.classList.add("is-active");
    window.setTimeout(
      () => els.redrawSweep.classList.remove("is-active"),
      duration + 80
    );
  }

  function persistActiveSelection() {
    writeStorage(ACTIVE_SELECTION_STORAGE_KEY, JSON.stringify([...state.selected]));
  }

  function restoreActiveSelection() {
    const stored = readStorage(ACTIVE_SELECTION_STORAGE_KEY);
    if (!stored) return;

    try {
      const validNames = new Set(ingredients.map((item) => item.name));
      const savedNames = JSON.parse(stored);
      if (Array.isArray(savedNames)) {
        state.selected = new Set(savedNames.filter((name) => validNames.has(name)));
      }
    } catch (error) {}
  }

  function updateDisplaySettingsToggle(open) {
    els.displaySettingsToggle.setAttribute("aria-expanded", String(open));
    els.displaySettingsToggle.classList.toggle("is-open", open);
  }

  function restoreDisplaySettingsVisibility() {
    const open = readStorage(DISPLAY_PANEL_STORAGE_KEY, "false") === "true";
    els.displaySettings.hidden = !open;
    updateDisplaySettingsToggle(open);
  }

  function toggleDisplaySettings(forceOpen) {
    const open = typeof forceOpen === "boolean"
      ? forceOpen
      : els.displaySettings.hidden;
    els.displaySettings.hidden = !open;
    updateDisplaySettingsToggle(open);
    writeStorage(DISPLAY_PANEL_STORAGE_KEY, String(open));
  }

  function valueString(ingredient) {
    const values = ingredient.values?.[state.ruleset] || {};
    const pad = (value) => String(Number(value || 0)).padStart(2, "0");
    return `[${pad(values.combat)}-${pad(values.utility)}-${pad(values.whimsy)}]`;
  }

  function renderIngredients() {
    Object.values(els.lists).forEach((list) => list.replaceChildren());

    ingredients.forEach((ingredient) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ingredient-item";
      button.dataset.name = ingredient.name;
      button.setAttribute("aria-pressed", "false");
      button.title = ingredient.name;

      const name = document.createElement("span");
      name.className = "ingredient-name";
      name.textContent = ingredient.name;

      const values = document.createElement("span");
      values.className = "ingredient-values";
      values.textContent = valueString(ingredient);

      button.append(name, values);
      button.addEventListener("click", () => toggleIngredient(ingredient.name, button));
      els.lists[ingredient.rarity]?.appendChild(button);
    });
  }

  function refreshIngredientValues() {
    document.querySelectorAll(".ingredient-item").forEach((button) => {
      const ingredient = ingredients.find((item) => item.name === button.dataset.name);
      const values = button.querySelector(".ingredient-values");
      if (ingredient && values) {
        values.textContent = valueString(ingredient);
      }
    });
  }

  function renderSaveState() {
    els.saveStateChar.textContent = state.dirty ? "*" : "d";
    els.saveInventory.setAttribute("aria-label", state.dirty ? "Save*" : "Saved");
    els.inventoryState.textContent = state.dirty ? "Inventory modified" : "Inventory saved";

  }

  function markUnsaved() {
    state.dirty = true;
    renderSaveState();
  }

  function markSaved() {
    state.dirty = false;
    renderSaveState();
  }

  function toggleIngredient(name, button) {
    const selected = state.selected.has(name);

    if (selected) {
      state.selected.delete(name);
    } else {
      state.selected.add(name);
    }

    button.classList.toggle("is-selected", !selected);
    button.setAttribute("aria-pressed", String(!selected));
    state.generated = false;
    persistActiveSelection();
    markUnsaved();
    updateInventoryDisplay();
  }

  function syncButtons() {
    document.querySelectorAll(".ingredient-item").forEach((button) => {
      const selected = state.selected.has(button.dataset.name);
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function updateInventoryDisplay() {
    els.currentInventory.textContent = state.currentName;
    els.currentInventory.title = state.currentName;
    els.currentInventory.scrollLeft = 0;
    els.currentInventory.classList.remove("is-scrolling");
    renderInventorySummary();

    if (state.generated) {
      generateRecipes();
    }
  }

  function renderInventorySummary() {
    els.inventorySummary.replaceChildren();

    [...state.selected]
      .sort((a, b) => a.localeCompare(b))
      .forEach((name) => {
        const item = document.createElement("li");
        item.textContent = name;
        els.inventorySummary.appendChild(item);
      });

    if (!state.selected.size) {
      const item = document.createElement("li");
      item.textContent = "No ingredients selected";
      els.inventorySummary.appendChild(item);
    }
  }

  function clearSelection() {
    state.selected.clear();
    state.generated = false;
    state.currentName = "No Inventory Loaded";
    persistActiveSelection();
    syncButtons();
    markUnsaved();
    updateInventoryDisplay();
    els.resultsPanel.hidden = true;
    clearPersistedResultsState();
  }

  function saveInventory() {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}-inventory`, JSON.stringify([...state.selected]));
      localStorage.setItem(`${STORAGE_PREFIX}-ruleset`, state.ruleset);
      localStorage.setItem(`${STORAGE_PREFIX}-inventory-name`, "Saved Inventory");
      state.currentName = "Saved Inventory";
      markSaved();
      updateInventoryDisplay();
    } catch (error) {
      els.inventoryState.textContent = "Error";
    }
  }

  function loadInventory() {
    try {
      const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}-inventory`) || "[]");
      const validNames = new Set(ingredients.map((item) => item.name));
      state.selected = new Set(saved.filter((name) => validNames.has(name)));
      state.currentName = localStorage.getItem(`${STORAGE_PREFIX}-inventory-name`) || "Saved Inventory";

      const savedRuleset = localStorage.getItem(`${STORAGE_PREFIX}-ruleset`);
      if (savedRuleset === "2014" || savedRuleset === "2024") {
        setRuleset(savedRuleset);
      }

      persistActiveSelection();
      syncButtons();
      markSaved();
      updateInventoryDisplay();
      redraw();
    } catch (error) {
      state.currentName = "Unable to Load Inventory";
      updateInventoryDisplay();
    }
  }

  function setRuleset(ruleset) {
    state.ruleset = ruleset;

    document.querySelectorAll(".value-option").forEach((button) => {
      const active = button.dataset.ruleset === ruleset;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    refreshIngredientValues();
    markUnsaved();

    if (state.generated) {
      generateRecipes();
    }

    redraw();
  }

  function getSelectedIngredients() {
    return ingredients.filter((item) => state.selected.has(item.name));
  }

  function potionLabel(type, number) {
    return potionNames[NAME_KEYS[type]]?.[String(number)] || "Unknown Potion";
  }

  function generateRecipes(options = {}) {
    const { scroll = true, animate = true, persist = true } = options;
    const selected = getSelectedIngredients();
    els.recipeResults.replaceChildren();
    els.resultsPanel.hidden = false;
    state.generated = true;

    if (selected.length < 3) {
      const message = document.createElement("p");
      message.className = "empty-output";
      message.textContent = "At least three ingredients are required to calculate a recipe.";
      els.recipeResults.appendChild(message);
      els.resultSummary.textContent = "0 RECIPES FOUND FOR 0 POTIONS";
      if (persist) persistResultsState();
      if (scroll) els.resultsPanel.scrollIntoView({ behavior: "auto", block: "start" });
      if (animate) redraw();
      return;
    }

    const groups = new Map();

    for (let i = 0; i < selected.length - 2; i++) {
      for (let j = i + 1; j < selected.length - 1; j++) {
        for (let k = j + 1; k < selected.length; k++) {
          const trio = [selected[i], selected[j], selected[k]];

          POTION_TYPES.forEach((type) => {
            const number = trio.reduce(
              (sum, ingredient) => sum + Number(ingredient.values?.[state.ruleset]?.[type] || 0),
              0
            );

            if (number < 1 || number > 60) return;

            const key = `${type}:${number}`;
            if (!groups.has(key)) {
              groups.set(key, { type, number, recipes: [] });
            }
            groups.get(key).recipes.push(trio.map((item) => item.name));
          });
        }
      }
    }

    const sortedGroups = [...groups.values()].sort(
      (a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.number - b.number
    );

    if (!sortedGroups.length) {
      const message = document.createElement("p");
      message.className = "empty-output";
      message.textContent = "No valid potion results were produced from the selected inventory.";
      els.recipeResults.appendChild(message);
    } else {
      renderRecipeColumns(sortedGroups);
    }

    const totalRecipes = sortedGroups.reduce(
      (sum, group) => sum + group.recipes.length,
      0
    );
    els.resultSummary.textContent = `${totalRecipes} RECIPE${totalRecipes === 1 ? "" : "S"} FOUND FOR ${sortedGroups.length} POTION${sortedGroups.length === 1 ? "" : "S"}`;
    if (persist) persistResultsState();
    if (scroll) els.resultsPanel.scrollIntoView({ behavior: "auto", block: "start" });
    if (animate) redraw();
  }

  function renderRecipeColumns(groups) {
    POTION_TYPES.forEach((type) => {
      const column = document.createElement("section");
      column.className = `recipe-column recipe-column--${type}`;
      column.setAttribute("aria-label", `${type} potions`);

      const heading = document.createElement("h3");
      heading.className = "recipe-column-heading";
      heading.textContent = `${type.toUpperCase()} POTIONS`;
      column.appendChild(heading);

      const stack = document.createElement("div");
      stack.className = "potion-stack";
      groups.filter((group) => group.type === type).forEach((group) => {
        stack.appendChild(createPotionGroup(group));
      });

      if (!stack.childElementCount) {
        const empty = document.createElement("p");
        empty.className = "column-empty";
        empty.textContent = "No potions found.";
        stack.appendChild(empty);
      }

      column.appendChild(stack);
      els.recipeResults.appendChild(column);
    });
  }

  function createPotionGroup(group) {
    const groupKey = `${group.type}:${group.number}`;
    const initiallyExpanded = state.expandedPotions.has(groupKey);
    const article = document.createElement("article");
    article.className = "potion-group";
    article.classList.toggle("is-expanded", initiallyExpanded);

    const summary = document.createElement("button");
    summary.type = "button";
    summary.className = "potion-summary";
    summary.setAttribute("aria-expanded", String(initiallyExpanded));

    const titleLine = document.createElement("span");
    titleLine.className = "potion-title-line";
    titleLine.textContent = `${group.number}. ${potionLabel(group.type, group.number).toUpperCase()}`;

    const countLine = document.createElement("span");
    countLine.className = "potion-count-line";
    const count = document.createElement("span");
    count.textContent = `${group.recipes.length} Recipe${group.recipes.length === 1 ? "" : "s"}`;
    const toggle = document.createElement("span");
    toggle.className = "potion-toggle";
    toggle.textContent = initiallyExpanded ? "[-]" : "[+]";
    countLine.append(count, toggle);
    summary.append(titleLine, countLine);

    const recipes = document.createElement("div");
    recipes.className = "potion-recipes";
    recipes.hidden = !initiallyExpanded;
    group.recipes.forEach((recipe, index) => {
      recipes.appendChild(createRecipeEntry(recipe, index));
    });

    summary.addEventListener("click", () => {
      const expanded = summary.getAttribute("aria-expanded") === "true";
      const nextExpanded = !expanded;
      summary.setAttribute("aria-expanded", String(nextExpanded));
      article.classList.toggle("is-expanded", nextExpanded);
      toggle.textContent = nextExpanded ? "[-]" : "[+]";
      recipes.hidden = !nextExpanded;

      if (nextExpanded) {
        state.expandedPotions.add(groupKey);
      } else {
        state.expandedPotions.delete(groupKey);
      }
      persistExpandedPotions();
    });

    article.append(summary, recipes);
    return article;
  }

  function createRecipeEntry(recipe, index) {
    const entry = document.createElement("section");
    entry.className = "recipe-entry";
    if (index > 0) entry.classList.add("recipe-entry--continued");

    const ingredientsForRecipe = recipe.map((name) => ingredientByName.get(name)).filter(Boolean);
    const totals = POTION_TYPES.map((type) => ingredientsForRecipe.reduce(
      (sum, ingredient) => sum + Number(ingredient.values?.[state.ruleset]?.[type] || 0),
      0
    ));

    const heading = document.createElement("div");
    heading.className = "recipe-entry-heading";
    const formula = document.createElement("span");
    formula.textContent = `[${totals.join("-")}] Recipe`;
    const brew = document.createElement("button");
    brew.type = "button";
    brew.className = "brew-control";
    brew.textContent = "BREW";
    brew.setAttribute("aria-label", `Brew recipe ${index + 1}`);
    heading.append(formula, brew);
    entry.appendChild(heading);

    ingredientsForRecipe.forEach((ingredient, ingredientIndex) => {
      const line = document.createElement("div");
      line.className = "recipe-ingredient";
      const values = POTION_TYPES.map((type) => ingredient.values?.[state.ruleset]?.[type] || 0);
      line.textContent = `${ingredient.name} [${values.join("-")}]${ingredientIndex < ingredientsForRecipe.length - 1 ? " +" : ""}`;
      entry.appendChild(line);
    });

    return entry;
  }

  function bindDisplayControl(control, name) {
    control.addEventListener("input", (event) => {
      applyDisplaySetting(name, event.target.value);
    });
  }


  function createTerminalId() {
    const bytes = new Uint8Array(4);
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }

    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0").toUpperCase()).join("");
    return `${hex.slice(0, 4)}-${hex.slice(4)}`;
  }

  function initializeTerminalId() {
    if (!els.terminalId) return;

    let terminalId = readStorage(TERMINAL_ID_STORAGE_KEY);
    if (!/^[0-9A-F]{4}-[0-9A-F]{4}$/.test(terminalId || "")) {
      terminalId = createTerminalId();
      writeStorage(TERMINAL_ID_STORAGE_KEY, terminalId);
    }

    els.terminalId.textContent = terminalId;
  }

  function initializeCurrentNameScroll() {
    const target = els.currentInventory;
    let startTimer = 0;
    let stepTimer = 0;
    let endTimer = 0;

    const stop = () => {
      window.clearTimeout(startTimer);
      window.clearInterval(stepTimer);
      window.clearTimeout(endTimer);
      target.classList.remove("is-scrolling");
      target.scrollLeft = 0;
    };

    const start = () => {
      stop();
      if (target.scrollWidth <= target.clientWidth + 1) return;
      startTimer = window.setTimeout(() => {
        target.classList.add("is-scrolling");
        const probe = document.createElement("span");
        probe.textContent = "0";
        probe.style.cssText = "position:absolute;visibility:hidden;font:inherit";
        document.body.appendChild(probe);
        const cellWidth = probe.getBoundingClientRect().width || 8;
        probe.remove();
        stepTimer = window.setInterval(() => {
          const next = Math.min(target.scrollLeft + cellWidth, target.scrollWidth - target.clientWidth);
          target.scrollLeft = next;
          if (next >= target.scrollWidth - target.clientWidth - 1) {
            window.clearInterval(stepTimer);
            endTimer = window.setTimeout(() => {
              target.scrollLeft = 0;
              target.classList.remove("is-scrolling");
            }, 900);
          }
        }, 150);
      }, 650);
    };

    target.addEventListener("mouseenter", start);
    target.addEventListener("mouseleave", stop);
    target.addEventListener("focus", start);
    target.addEventListener("blur", stop);
  }

  function initializeReverseVideoButtons() {
    document.querySelectorAll(".terminal-tab, .terminal-command").forEach((button) => {
      const sync = () => button.classList.toggle(
        "is-reversed",
        button.matches(":hover") || button.matches(":focus-visible")
      );
      button.addEventListener("mouseenter", sync);
      button.addEventListener("mouseleave", sync);
      button.addEventListener("focus", sync);
      button.addEventListener("blur", sync);
    });
  }

  function bindEvents() {
    document.getElementById("clearInventory").addEventListener("click", clearSelection);
    document.getElementById("saveInventory").addEventListener("click", saveInventory);
    document.getElementById("loadInventory").addEventListener("click", loadInventory);
    document.getElementById("viewInventory").addEventListener("click", () => {
      els.drawer.hidden = !els.drawer.hidden;
    });
    document.getElementById("closeInventory").addEventListener("click", () => {
      els.drawer.hidden = true;
    });
    document.getElementById("generateRecipes").addEventListener("click", () => generateRecipes());

    els.displaySettingsToggle.addEventListener("click", () => toggleDisplaySettings());
    document.getElementById("closeDisplaySettings").addEventListener("click", () => {
      toggleDisplaySettings(false);
    });
    document.getElementById("resetDisplaySettings").addEventListener("click", () => {
      applyPhosphor(displayDefaults.phosphor);
      Object.keys(displayDefaults)
        .filter((name) => name !== "phosphor")
        .forEach((name) => applyDisplaySetting(name, displayDefaults[name]));
    });

    els.phosphorControl.addEventListener("change", (event) => {
      applyPhosphor(event.target.value);
    });
    bindDisplayControl(els.bloomControl, "bloom");
    bindDisplayControl(els.vignetteControl, "vignette");
    bindDisplayControl(els.scanlineControl, "scanlines");
    bindDisplayControl(els.brightnessControl, "brightness");
    bindDisplayControl(els.contrastControl, "contrast");
    bindDisplayControl(els.overallFocusControl, "overallFocus");
    bindDisplayControl(els.reverseTintControl, "reverseTint");
    bindDisplayControl(els.verticalFocusControl, "verticalFocus");
    bindDisplayControl(els.horizontalFocusControl, "horizontalFocus");
    bindDisplayControl(els.redrawControl, "redraw");

    document.querySelectorAll(".value-option").forEach((button) => {
      button.addEventListener("click", () => setRuleset(button.dataset.ruleset));
    });

    document.querySelectorAll("[data-preview-tool]").forEach((button) => {
      button.addEventListener("click", (event) => event.preventDefault());
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.displaySettings.hidden) {
        toggleDisplaySettings(false);
      } else if (event.key === "Escape" && !els.drawer.hidden) {
        els.drawer.hidden = true;
      }
    });

    window.addEventListener("resize", updateViewportEffectsBounds);
    window.addEventListener("scroll", updateViewportEffectsBounds, { passive: true });
  }

  function initialize() {
    bindEvents();
    loadDisplaySettings();
    restoreDisplaySettingsVisibility();
    restoreActiveSelection();
    restoreExpandedPotions();
    renderIngredients();
    syncButtons();
    updateInventoryDisplay();
    renderSaveState();
    initializeTerminalId();
    initializeCurrentNameScroll();
    initializeReverseVideoButtons();
    initializeBloomComposite();
    updateViewportEffectsBounds();
    restoreResultsIfCurrent();
    window.requestAnimationFrame(() => redraw());
  }

  initialize();
})();
