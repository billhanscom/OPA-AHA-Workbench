(() => {
  "use strict";

  const ingredients = Array.isArray(window.OBOJIMA_INGREDIENTS)
    ? window.OBOJIMA_INGREDIENTS.slice().sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const potionNames = window.OBOJIMA_POTION_NAMES || {};

  const state = {
    ruleset: "2024",
    selected: new Set(),
    generated: false,
    currentName: "No Inventory Loaded"
  };

  const els = {
    lists: {
      common: document.getElementById("commonList"),
      uncommon: document.getElementById("uncommonList"),
      rare: document.getElementById("rareList")
    },
    currentInventory: document.getElementById("currentInventory"),
    inventoryState: document.getElementById("inventoryState"),
    filter: document.getElementById("ingredientFilter"),
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
    bezelControl: document.getElementById("bezelControl"),
    redrawControl: document.getElementById("redrawControl"),
    bloomValue: document.getElementById("bloomValue"),
    vignetteValue: document.getElementById("vignetteValue"),
    scanlineValue: document.getElementById("scanlineValue"),
    brightnessValue: document.getElementById("brightnessValue"),
    contrastValue: document.getElementById("contrastValue"),
    bezelValue: document.getElementById("bezelValue"),
    redrawValue: document.getElementById("redrawValue"),
    screenFrame: document.getElementById("screenFrame"),
    screenSurface: document.getElementById("screenSurface"),
    terminal: document.getElementById("terminal"),
    viewportEffects: document.getElementById("viewportEffects"),
    redrawSweep: document.getElementById("redrawSweep")
  };

  const nameKeys = { combat: "combat_names", utility: "utility_names", whimsy: "whimsy_names" };

  const phosphors = {
    amber: {
      rgb: "255 176 0", phosphor: "#ffb000", bright: "#ffb000", dim: "#a87300", faint: "#674800",
      screen: "#15110a", deep: "#0c0a06", body: "radial-gradient(ellipse at center, #20180b 0%, #080704 72%, #020201 100%)"
    },
    green: {
      rgb: "51 255 102", phosphor: "#33ff66", bright: "#33ff66", dim: "#20a843", faint: "#146629",
      screen: "#07150b", deep: "#030c05", body: "radial-gradient(ellipse at center, #0b2111 0%, #040a05 72%, #010301 100%)"
    },
    white: {
      rgb: "232 239 232", phosphor: "#e8efe8", bright: "#f7fff7", dim: "#99a399", faint: "#5d665d",
      screen: "#111411", deep: "#080a08", body: "radial-gradient(ellipse at center, #1b201b 0%, #080a08 72%, #020302 100%)"
    }
  };

  const displayDefaults = {
    phosphor: "amber",
    brightness: 100,
    contrast: 100,
    bloom: 14,
    scanlines: 45,
    vignette: 52,
    bezel: 30,
    redraw: 150
  };

  function setStatus() {}

  function applyPhosphor(name, save = true) {
    const key = phosphors[name] ? name : "amber";
    const palette = phosphors[key];
    const root = document.documentElement;
    root.style.setProperty("--phosphor-rgb", palette.rgb);
    root.style.setProperty("--phosphor", palette.phosphor);
    root.style.setProperty("--phosphor-bright", palette.bright);
    root.style.setProperty("--phosphor-dim", palette.dim);
    root.style.setProperty("--phosphor-faint", palette.faint);
    root.style.setProperty("--screen", palette.screen);
    root.style.setProperty("--screen-deep", palette.deep);
    root.style.setProperty("--page-background", palette.deep);
    document.body.style.background = palette.deep;
    els.screenFrame.style.background = "transparent";
    els.phosphorControl.value = key;
    if (save) {
      try { localStorage.setItem("opa-first-age-display-phosphor", key); } catch (error) {}
    }
  }

  function applyDisplaySetting(name, value, save = true) {
    const root = document.documentElement;
    const limits = {
      brightness: [20, 250], contrast: [50, 180], bloom: [0, 200], scanlines: [0, 100],
      vignette: [0, 100], bezel: [0, 100], redraw: [0, 1500]
    };
    const [minimum, maximum] = limits[name] || [0, 100];
    const numeric = Math.max(minimum, Math.min(maximum, Number(value)));
    const decimal = numeric / 100;

    if (name === "brightness") {
      // Brightness changes both phosphor emission and the visible screen black.
      const below = Math.min(numeric, 100) / 100;
      const above = Math.max(0, numeric - 100) / 150;
      const contentOpacity = numeric <= 100 ? 0.10 + Math.pow(below, 1.35) * 0.90 : 1;
      root.style.setProperty("--content-opacity", String(contentOpacity));
      root.style.setProperty("--display-brightness", String(numeric <= 100 ? 1 : 1 + Math.pow(above, 1.15) * 2.1));
      root.style.setProperty("--brightness-boost-alpha", String(Math.pow(above, 1.15) * 0.72));
      root.style.setProperty("--brightness-white-alpha", String(Math.pow(above, 1.8) * 0.48));
      root.style.setProperty("--brightness-halo-radius", `${0.4 + Math.pow(above, 1.15) * 17}px`);
      root.style.setProperty("--brightness-halo-alpha", String(0.06 + Math.pow(above, 1.1) * 0.86));
      root.style.setProperty("--page-brighten-alpha", String(Math.pow(above, 1.3) * 0.30));
      root.style.setProperty("--page-dim-alpha", String((1 - below) * 0.72));
      els.brightnessControl.value = String(numeric);
      els.brightnessValue.value = `${numeric}%`;
    } else if (name === "contrast") {
      // Low contrast restores the earlier warm phosphor wash; high contrast
      // deepens the black level. Both the frame and surrounding page respond.
      const low = Math.max(0, 100 - numeric) / 50;
      const high = Math.max(0, numeric - 100) / 80;
      root.style.setProperty("--display-contrast", String(0.88 + (numeric / 100) * 0.12));
      root.style.setProperty("--contrast-warm-alpha", String(low * 0.22));
      root.style.setProperty("--contrast-dark-alpha", String(high * 0.34));
      els.contrastControl.value = String(numeric);
      els.contrastValue.value = `${numeric}%`;
    } else if (name === "bloom") {
      const bloomScale = numeric / 100;
      root.style.setProperty("--composite-bloom-radius", `${0.25 + bloomScale * 4.8}px`);
      root.style.setProperty("--composite-bloom-alpha", String(Math.min(.62, bloomScale * .28)));
      // Thin rules need a little independent energy to read like the same phosphor
      // intensity as the much denser block-character logo.
      root.style.setProperty("--border-bloom-radius", `${0.4 + bloomScale * 6.4}px`);
      root.style.setProperty("--border-bloom-alpha", String(Math.min(.92, bloomScale * .46)));
      root.style.setProperty("--inner-glow-alpha", String(Math.min(.96, bloomScale * .48)));
      // Thin text strokes need a local phosphor halo in addition to the broad
      // composite bloom. Keep it tighter than the logo halo so glyphs remain legible.
      root.style.setProperty("--small-text-bloom-radius", `${0.35 + bloomScale * 8.8}px`);
      root.style.setProperty("--small-text-bloom-alpha", String(Math.min(.98, bloomScale * .52)));
      root.style.setProperty("--small-text-bloom-wide-radius", `${0.8 + bloomScale * 15}px`);
      root.style.setProperty("--small-text-bloom-wide-alpha", String(Math.min(.78, bloomScale * .34)));
      root.style.setProperty("--reverse-bloom-radius", `${0.5 + bloomScale * 13}px`);
      root.style.setProperty("--reverse-bloom-alpha", String(Math.min(.96, bloomScale * .48)));
      root.style.setProperty("--logo-bloom-radius", `${0.2 + bloomScale * 2.3}px`);
      root.style.setProperty("--logo-bloom-alpha", String(Math.min(.38, bloomScale * .16)));
      els.bloomControl.value = String(numeric);
      els.bloomValue.value = `${numeric}%`;
    } else if (name === "scanlines") {
      root.style.setProperty("--scanline-light-alpha", String(decimal * .14));
      root.style.setProperty("--scanline-dark-alpha", String(decimal * .90));
      els.scanlineControl.value = String(numeric);
      els.scanlineValue.value = `${numeric}%`;
    } else if (name === "vignette") {
      root.style.setProperty("--vignette-strength", String(decimal));
      els.vignetteControl.value = String(numeric);
      els.vignetteValue.value = `${numeric}%`;
    } else if (name === "bezel") {
      root.style.setProperty("--edge-strength", String(decimal));
      root.style.setProperty("--edge-blur", `${decimal * 4.5}px`);
      root.style.setProperty("--edge-darkness", String(decimal * .24));
      els.bezelControl.value = String(numeric);
      els.bezelValue.value = `${numeric}%`;
    } else if (name === "redraw") {
      root.style.setProperty("--redraw-ms", `${numeric}ms`);
      els.redrawControl.value = String(numeric);
      els.redrawValue.value = `${numeric} ms`;
    }

    if (save) {
      try { localStorage.setItem(`opa-first-age-display-${name}`, String(numeric)); } catch (error) {}
    }
  }

  function loadDisplaySettings() {
    let phosphor = displayDefaults.phosphor;
    try { phosphor = localStorage.getItem("opa-first-age-display-phosphor") || phosphor; } catch (error) {}
    applyPhosphor(phosphor, false);
    Object.keys(displayDefaults).filter(name => name !== "phosphor").forEach((name) => {
      let value = displayDefaults[name];
      try {
        const stored = localStorage.getItem(`opa-first-age-display-${name}`);
        if (stored !== null && stored !== "") value = Number(stored);
      } catch (error) {}
      applyDisplaySetting(name, value, false);
    });
  }

  function updateViewportEffectsBounds() {
    const rect = els.screenFrame.getBoundingClientRect();
    document.documentElement.style.setProperty("--screen-left", `${Math.max(0, rect.left)}px`);
    document.documentElement.style.setProperty("--screen-right", `${Math.max(0, window.innerWidth - rect.right)}px`);
  }

  function redraw() {
    const duration = Number(els.redrawControl.value || 0);
    if (duration <= 0 || !els.redrawSweep) return;
    updateViewportEffectsBounds();
    els.redrawSweep.style.setProperty("--active-redraw-ms", `${duration}ms`);
    els.redrawSweep.classList.remove("is-active");
    void els.redrawSweep.offsetWidth;
    els.redrawSweep.classList.add("is-active");
    window.setTimeout(() => els.redrawSweep.classList.remove("is-active"), duration + 80);
  }

  function toggleDisplaySettings(forceOpen) {
    const open = typeof forceOpen === "boolean" ? forceOpen : els.displaySettings.hidden;
    els.displaySettings.hidden = !open;
    els.displaySettingsToggle.setAttribute("aria-expanded", String(open));
  }

  function valueString(ingredient) {
    const values = ingredient.values?.[state.ruleset] || {};
    const pad = value => String(Number(value || 0)).padStart(2, "0");
    return `[${pad(values.combat)}-${pad(values.utility)}-${pad(values.whimsy)}]`;
  }

  function renderIngredients() {
    Object.values(els.lists).forEach(list => list.replaceChildren());
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
      const ingredient = ingredients.find(item => item.name === button.dataset.name);
      const values = button.querySelector(".ingredient-values");
      if (ingredient && values) values.textContent = valueString(ingredient);
    });
  }

  function markUnsaved() {
    els.inventoryState.textContent = "";
  }

  function toggleIngredient(name, button) {
    if (state.selected.has(name)) {
      state.selected.delete(name);
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    } else {
      state.selected.add(name);
      button.classList.add("is-selected");
      button.setAttribute("aria-pressed", "true");
    }
    state.generated = false;
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
    renderInventorySummary();
    if (state.generated) generateRecipes();
  }

  function renderInventorySummary() {
    els.inventorySummary.replaceChildren();
    [...state.selected].sort((a, b) => a.localeCompare(b)).forEach((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      els.inventorySummary.appendChild(li);
    });
    if (!state.selected.size) {
      const li = document.createElement("li");
      li.textContent = "No ingredients selected";
      els.inventorySummary.appendChild(li);
    }
  }

  function clearSelection() {
    state.selected.clear();
    state.generated = false;
    state.currentName = "No Inventory Loaded";
    syncButtons();
    markUnsaved();
    updateInventoryDisplay();
    els.resultsPanel.hidden = true;
  }

  function saveInventory() {
    try {
      localStorage.setItem("opa-first-age-inventory", JSON.stringify([...state.selected]));
      localStorage.setItem("opa-first-age-ruleset", state.ruleset);
      localStorage.setItem("opa-first-age-inventory-name", "Saved Inventory");
      state.currentName = "Saved Inventory";
      els.inventoryState.textContent = "Saved";
      updateInventoryDisplay();
    } catch (error) {
      els.inventoryState.textContent = "Error";
    }
  }

  function loadInventory() {
    try {
      const saved = JSON.parse(localStorage.getItem("opa-first-age-inventory") || "[]");
      const validNames = new Set(ingredients.map(item => item.name));
      state.selected = new Set(saved.filter(name => validNames.has(name)));
      state.currentName = localStorage.getItem("opa-first-age-inventory-name") || "Saved Inventory";
      const savedRuleset = localStorage.getItem("opa-first-age-ruleset");
      if (savedRuleset === "2014" || savedRuleset === "2024") setRuleset(savedRuleset);
      syncButtons();
      els.inventoryState.textContent = "";
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
    if (state.generated) generateRecipes();
    redraw();
  }

  function getSelectedIngredients() { return ingredients.filter(item => state.selected.has(item.name)); }
  function potionLabel(type, number) { return potionNames[nameKeys[type]]?.[String(number)] || "Unknown Potion"; }

  function generateRecipes() {
    const selected = getSelectedIngredients();
    els.recipeResults.replaceChildren();
    els.resultsPanel.hidden = false;
    state.generated = true;

    if (selected.length < 3) {
      const p = document.createElement("p");
      p.className = "empty-output";
      p.textContent = "At least three ingredients are required to calculate a recipe.";
      els.recipeResults.appendChild(p);
      els.resultSummary.textContent = `${selected.length} ingredient${selected.length === 1 ? "" : "s"} available`;
      els.resultsPanel.scrollIntoView({ behavior: "auto", block: "start" });
      redraw();
      return;
    }

    const groups = new Map();
    let combinationCount = 0;
    for (let i = 0; i < selected.length - 2; i++) {
      for (let j = i + 1; j < selected.length - 1; j++) {
        for (let k = j + 1; k < selected.length; k++) {
          combinationCount++;
          const trio = [selected[i], selected[j], selected[k]];
          ["combat", "utility", "whimsy"].forEach((type) => {
            const number = trio.reduce((sum, ingredient) => sum + Number(ingredient.values?.[state.ruleset]?.[type] || 0), 0);
            if (number < 1 || number > 60) return;
            const key = `${type}:${number}`;
            if (!groups.has(key)) groups.set(key, { type, number, recipes: [] });
            groups.get(key).recipes.push(trio.map(item => item.name));
          });
        }
      }
    }

    const typeOrder = { combat: 0, utility: 1, whimsy: 2 };
    const sortedGroups = [...groups.values()].sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || a.number - b.number);
    if (!sortedGroups.length) {
      const p = document.createElement("p");
      p.className = "empty-output";
      p.textContent = "No valid potion results were produced from the selected inventory.";
      els.recipeResults.appendChild(p);
    } else {
      sortedGroups.forEach(renderPotionGroup);
    }
    const totalRecipes = sortedGroups.reduce((sum, group) => sum + group.recipes.length, 0);
    els.resultSummary.textContent = `${sortedGroups.length} potion${sortedGroups.length === 1 ? "" : "s"} / ${totalRecipes} recipes / ${combinationCount} combinations`;
    els.resultsPanel.scrollIntoView({ behavior: "auto", block: "start" });
    redraw();
  }

  function renderPotionGroup(group) {
    const article = document.createElement("article");
    article.className = "potion-group";
    const title = document.createElement("div");
    title.className = "potion-title";
    title.innerHTML = `<span class="potion-type">${group.type.toUpperCase()}</span><span class="potion-number">${group.number}</span><span class="potion-name"></span>`;
    title.querySelector(".potion-name").textContent = potionLabel(group.type, group.number);
    article.appendChild(title);
    const list = document.createElement("ol");
    list.className = "recipe-list";
    group.recipes.forEach((recipe) => {
      const li = document.createElement("li");
      li.textContent = recipe.join(" + ");
      list.appendChild(li);
    });
    article.appendChild(list);
    els.recipeResults.appendChild(article);
  }

  function filterIngredients(query) {
    const normalized = query.trim().toLocaleLowerCase();
    document.querySelectorAll(".ingredient-item").forEach((button) => {
      button.hidden = Boolean(normalized && !button.dataset.name.toLocaleLowerCase().includes(normalized));
    });
  }

  document.getElementById("clearInventory").addEventListener("click", clearSelection);
  document.getElementById("clearSelection").addEventListener("click", clearSelection);
  document.getElementById("saveInventory").addEventListener("click", saveInventory);
  document.getElementById("loadInventory").addEventListener("click", loadInventory);
  document.getElementById("viewInventory").addEventListener("click", () => { els.drawer.hidden = !els.drawer.hidden; });
  document.getElementById("closeInventory").addEventListener("click", () => { els.drawer.hidden = true; });
  document.getElementById("generateRecipes").addEventListener("click", generateRecipes);
  els.displaySettingsToggle.addEventListener("click", () => toggleDisplaySettings());
  document.getElementById("closeDisplaySettings").addEventListener("click", () => toggleDisplaySettings(false));
  document.getElementById("resetDisplaySettings").addEventListener("click", () => {
    applyPhosphor(displayDefaults.phosphor);
    Object.keys(displayDefaults).filter(name => name !== "phosphor").forEach(name => applyDisplaySetting(name, displayDefaults[name]));
  });
  els.phosphorControl.addEventListener("change", event => applyPhosphor(event.target.value));
  els.bloomControl.addEventListener("input", event => applyDisplaySetting("bloom", event.target.value));
  els.vignetteControl.addEventListener("input", event => applyDisplaySetting("vignette", event.target.value));
  els.scanlineControl.addEventListener("input", event => applyDisplaySetting("scanlines", event.target.value));
  els.brightnessControl.addEventListener("input", event => applyDisplaySetting("brightness", event.target.value));
  els.contrastControl.addEventListener("input", event => applyDisplaySetting("contrast", event.target.value));
  els.bezelControl.addEventListener("input", event => applyDisplaySetting("bezel", event.target.value));
  els.redrawControl.addEventListener("input", event => applyDisplaySetting("redraw", event.target.value));
  document.querySelectorAll(".value-option").forEach(button => button.addEventListener("click", () => setRuleset(button.dataset.ruleset)));
  els.filter.addEventListener("input", event => filterIngredients(event.target.value));
  document.querySelectorAll("[data-preview-tool]").forEach(button => {
    button.addEventListener("click", event => event.preventDefault());
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.displaySettings.hidden) toggleDisplaySettings(false);
    else if (event.key === "Escape" && !els.drawer.hidden) els.drawer.hidden = true;
  });

  window.addEventListener("resize", updateViewportEffectsBounds);
  window.addEventListener("scroll", updateViewportEffectsBounds, { passive: true });
  loadDisplaySettings();
  renderIngredients();
  updateInventoryDisplay();
  updateViewportEffectsBounds();
  window.requestAnimationFrame(() => redraw());
})();
