(() => {
  "use strict";

  const ingredients = Array.isArray(window.OBOJIMA_INGREDIENTS)
    ? window.OBOJIMA_INGREDIENTS.slice().sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const potionNames = window.OBOJIMA_POTION_NAMES || {};

  const state = {
    ruleset: "2024",
    selected: new Set(),
    generated: false
  };

  const els = {
    lists: {
      common: document.getElementById("commonList"),
      uncommon: document.getElementById("uncommonList"),
      rare: document.getElementById("rareList")
    },
    selectedCount: document.getElementById("selectedCount"),
    ingredientCount: document.getElementById("ingredientCount"),
    currentInventory: document.getElementById("currentInventory"),
    status: document.getElementById("systemStatus"),
    filter: document.getElementById("ingredientFilter"),
    drawer: document.getElementById("inventoryDrawer"),
    inventorySummary: document.getElementById("inventorySummary"),
    resultsPanel: document.getElementById("resultsPanel"),
    recipeResults: document.getElementById("recipeResults"),
    resultSummary: document.getElementById("resultSummary")
  };

  const nameKeys = {
    combat: "combat_names",
    utility: "utility_names",
    whimsy: "whimsy_names"
  };

  function setStatus(message) {
    els.status.textContent = message.toUpperCase();
  }

  function renderIngredients() {
    Object.values(els.lists).forEach(list => list.replaceChildren());
    ingredients.forEach((ingredient) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ingredient-item";
      button.textContent = ingredient.name;
      button.dataset.name = ingredient.name;
      button.setAttribute("aria-pressed", "false");
      button.title = `${ingredient.name} — ${ingredient.rarity}`;
      button.addEventListener("click", () => toggleIngredient(ingredient.name, button));
      els.lists[ingredient.rarity]?.appendChild(button);
    });
    els.ingredientCount.textContent = String(ingredients.length);
  }

  function toggleIngredient(name, button) {
    if (state.selected.has(name)) {
      state.selected.delete(name);
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
      setStatus(`${name} removed`);
    } else {
      state.selected.add(name);
      button.classList.add("is-selected");
      button.setAttribute("aria-pressed", "true");
      setStatus(`${name} added`);
    }
    state.generated = false;
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
    const count = state.selected.size;
    els.selectedCount.textContent = String(count);
    els.currentInventory.textContent = count ? `${count} Ingredient${count === 1 ? "" : "s"} Selected` : "No Inventory Loaded";
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
    syncButtons();
    updateInventoryDisplay();
    els.resultsPanel.hidden = true;
    setStatus("Inventory cleared");
  }

  function saveInventory() {
    try {
      localStorage.setItem("opa-first-age-inventory", JSON.stringify([...state.selected]));
      localStorage.setItem("opa-first-age-ruleset", state.ruleset);
      setStatus(`Inventory saved / ${state.selected.size} ingredients`);
    } catch (error) {
      setStatus("Unable to save inventory");
    }
  }

  function loadInventory() {
    try {
      const saved = JSON.parse(localStorage.getItem("opa-first-age-inventory") || "[]");
      const validNames = new Set(ingredients.map(item => item.name));
      state.selected = new Set(saved.filter(name => validNames.has(name)));
      const savedRuleset = localStorage.getItem("opa-first-age-ruleset");
      if (savedRuleset === "2014" || savedRuleset === "2024") setRuleset(savedRuleset);
      syncButtons();
      updateInventoryDisplay();
      setStatus(`Inventory loaded / ${state.selected.size} ingredients`);
    } catch (error) {
      setStatus("Unable to load inventory");
    }
  }

  function setRuleset(ruleset) {
    state.ruleset = ruleset;
    document.querySelectorAll(".value-option").forEach((button) => {
      const active = button.dataset.ruleset === ruleset;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    setStatus(`${ruleset} values active`);
    if (state.generated) generateRecipes();
  }

  function getSelectedIngredients() {
    const names = state.selected;
    return ingredients.filter(item => names.has(item.name));
  }

  function potionLabel(type, number) {
    const key = nameKeys[type];
    return potionNames[key]?.[String(number)] || "Unknown Potion";
  }

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
      setStatus("Insufficient ingredients");
      els.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
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
            const number = trio.reduce((sum, ingredient) => {
              return sum + Number(ingredient.values?.[state.ruleset]?.[type] || 0);
            }, 0);
            if (number < 1 || number > 60) return;
            const key = `${type}:${number}`;
            if (!groups.has(key)) groups.set(key, { type, number, recipes: [] });
            groups.get(key).recipes.push(trio.map(item => item.name));
          });
        }
      }
    }

    const sortedGroups = [...groups.values()].sort((a, b) => {
      const typeOrder = { combat: 0, utility: 1, whimsy: 2 };
      return typeOrder[a.type] - typeOrder[b.type] || a.number - b.number;
    });

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
    setStatus(`Search complete / ${sortedGroups.length} potions found`);
    els.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
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
    const visibleRecipes = group.recipes.slice(0, 12);
    visibleRecipes.forEach((recipe) => {
      const li = document.createElement("li");
      li.textContent = recipe.join(" + ");
      list.appendChild(li);
    });
    article.appendChild(list);

    if (group.recipes.length > visibleRecipes.length) {
      const details = document.createElement("details");
      details.className = "recipe-overflow";
      const summary = document.createElement("summary");
      summary.textContent = `Show ${group.recipes.length - visibleRecipes.length} additional recipes`;
      details.appendChild(summary);
      const extra = document.createElement("ol");
      extra.className = "recipe-list";
      group.recipes.slice(12).forEach((recipe) => {
        const li = document.createElement("li");
        li.textContent = recipe.join(" + ");
        extra.appendChild(li);
      });
      details.appendChild(extra);
      article.appendChild(details);
    }

    els.recipeResults.appendChild(article);
  }

  function filterIngredients(query) {
    const normalized = query.trim().toLocaleLowerCase();
    document.querySelectorAll(".ingredient-item").forEach((button) => {
      button.hidden = normalized && !button.dataset.name.toLocaleLowerCase().includes(normalized);
    });
    setStatus(normalized ? `Filter active / ${query}` : "Filter cleared");
  }

  document.getElementById("clearInventory").addEventListener("click", clearSelection);
  document.getElementById("clearSelection").addEventListener("click", clearSelection);
  document.getElementById("saveInventory").addEventListener("click", saveInventory);
  document.getElementById("loadInventory").addEventListener("click", loadInventory);
  document.getElementById("viewInventory").addEventListener("click", () => {
    els.drawer.hidden = !els.drawer.hidden;
    setStatus(els.drawer.hidden ? "Inventory view closed" : "Inventory view opened");
  });
  document.getElementById("closeInventory").addEventListener("click", () => {
    els.drawer.hidden = true;
    setStatus("Inventory view closed");
  });
  document.getElementById("generateRecipes").addEventListener("click", generateRecipes);
  document.querySelectorAll(".value-option").forEach(button => {
    button.addEventListener("click", () => setRuleset(button.dataset.ruleset));
  });
  els.filter.addEventListener("input", event => filterIngredients(event.target.value));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.drawer.hidden) {
      els.drawer.hidden = true;
      setStatus("Inventory view closed");
    }
  });

  renderIngredients();
  updateInventoryDisplay();
})();
