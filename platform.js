/**
 * platform.js — Doitoo Games Platform Logic
 *
 * Vanilla JS module that powers the game selector platform.
 * Reads games/registry.json, renders game cards, manages iframe-based
 * game launching, and handles navigation + error states.
 *
 * Key functions are exposed on a global `Platform` object for testability.
 */
const Platform = (function () {
  'use strict';

  // ── Constants ──
  const REGISTRY_URL = 'games/registry.json';
  const LOAD_TIMEOUT_MS = 10000;
  const REQUIRED_FIELDS = ['id', 'name', 'description', 'icon', 'path'];
  const ACTIVE_GAME_KEY = 'platform:activeGame';

  // ── Cached DOM references (populated on DOMContentLoaded) ──
  let backButton = null;
  let navBar = null;
  let navSubtitle = null;
  let gameSelector = null;
  let emptyState = null;
  let errorOverlay = null;
  let errorMessage = null;
  let errorBackButton = null;
  let gameFrame = null;

  // ── Internal state ──
  let loadTimeoutId = null;

  // ────────────────────────────────────────────────────────────
  // 4.1  loadRegistry() — fetch and parse games/registry.json
  // ────────────────────────────────────────────────────────────

  /**
   * Fetches the game registry and returns the `games` array.
   * Returns an empty array on any failure (network, 404, bad JSON).
   * @returns {Promise<Object[]>}
   */
  async function loadRegistry() {
    try {
      const response = await fetch(REGISTRY_URL);
      if (!response.ok) {
        console.warn(`[Platform] Failed to fetch registry: HTTP ${response.status}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data.games) ? data.games : [];
    } catch (err) {
      console.warn('[Platform] Error loading registry:', err.message || err);
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────
  // 4.2  validateRegistry() — validate and deduplicate entries
  // ────────────────────────────────────────────────────────────

  /**
   * Validates registry entries and removes duplicates.
   * - Each entry must have all REQUIRED_FIELDS as non-empty strings.
   * - First occurrence of each `id` wins; duplicates are skipped.
   * @param {Object[]} entries - Raw registry entries
   * @returns {Object[]} Validated, deduplicated entries
   */
  function validateRegistry(entries) {
    if (!Array.isArray(entries)) return [];

    const seen = new Set();
    const valid = [];

    for (const entry of entries) {
      // Check required fields
      const missing = REQUIRED_FIELDS.filter(
        (f) => typeof entry[f] !== 'string' || entry[f].trim() === ''
      );

      if (missing.length > 0) {
        console.warn(
          `[Platform] Skipping registry entry — missing or empty fields: ${missing.join(', ')}`,
          entry
        );
        continue;
      }

      // Deduplicate by id
      if (seen.has(entry.id)) {
        console.warn(`[Platform] Skipping duplicate registry entry with id "${entry.id}"`);
        continue;
      }

      seen.add(entry.id);
      valid.push(entry);
    }

    return valid;
  }

  // ────────────────────────────────────────────────────────────
  // 4.3  renderGameCards(games) — build selector card grid
  // ────────────────────────────────────────────────────────────

  /**
   * Renders a card for each game entry into the selector container.
   * Shows the empty state message when there are no games.
   * @param {Object[]} games - Validated game entries
   */
  function renderGameCards(games) {
    // Clear any existing cards
    gameSelector.innerHTML = '';

    if (!games || games.length === 0) {
      gameSelector.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    gameSelector.classList.remove('hidden');

    for (const game of games) {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Launch ${game.name}`);

      // Icon
      const icon = document.createElement('img');
      icon.className = 'card-icon';
      icon.src = game.icon;
      icon.alt = `${game.name} icon`;
      card.appendChild(icon);

      // Name
      const name = document.createElement('span');
      name.className = 'card-name';
      name.textContent = game.name;
      card.appendChild(name);

      // Description
      const desc = document.createElement('span');
      desc.className = 'card-description';
      desc.textContent = game.description;
      card.appendChild(desc);

      // Click handler
      card.addEventListener('click', () => launchGame(game));

      gameSelector.appendChild(card);
    }
  }

  // ────────────────────────────────────────────────────────────
  // 4.4  launchGame(game) — load a game in the iframe
  // ────────────────────────────────────────────────────────────

  /**
   * Hides the selector, shows the iframe, and loads the game.
   * Sets up error detection via an error event and a 10 s timeout.
   * @param {Object} game - A validated game entry
   */
  function launchGame(game) {
    // Switch views
    gameSelector.classList.add('hidden');
    document.getElementById('tagline').classList.add('hidden');
    emptyState.classList.add('hidden');
    errorOverlay.classList.add('hidden');
    gameFrame.classList.remove('hidden');
    backButton.classList.remove('hidden');

    // Show game name as subtitle next to the logo
    navSubtitle.textContent = game.name;
    navSubtitle.classList.remove('hidden');

    // Sync nav height for iframe positioning
    syncNavHeight();

    // Clear any previous timeout
    clearLoadTimeout();

    // Set up error handling before setting src
    const onError = () => {
      clearLoadTimeout();
      gameFrame.removeEventListener('error', onError);
      handleGameLoadError(game);
    };

    const onLoad = () => {
      clearLoadTimeout();
      gameFrame.removeEventListener('error', onError);
    };

    gameFrame.addEventListener('error', onError);
    gameFrame.addEventListener('load', onLoad, { once: true });

    // Start load timeout (10 s)
    loadTimeoutId = setTimeout(() => {
      gameFrame.removeEventListener('error', onError);
      gameFrame.removeEventListener('load', onLoad);
      handleGameLoadError(game);
    }, LOAD_TIMEOUT_MS);

    // Trigger load
    gameFrame.src = game.path;

    // Persist active game for session restore
    try { localStorage.setItem(ACTIVE_GAME_KEY, game.id); } catch {}
  }

  // ────────────────────────────────────────────────────────────
  // 4.5  returnToSelector() — back navigation
  // ────────────────────────────────────────────────────────────

  /**
   * Clears the iframe, hides the game frame and error overlay,
   * and restores the selector view.
   */
  function returnToSelector() {
    clearLoadTimeout();

    // Clear iframe
    gameFrame.src = '';
    gameFrame.classList.add('hidden');

    // Hide error overlay
    errorOverlay.classList.add('hidden');

    // Hide back button
    backButton.classList.add('hidden');

    // Restore default nav (hide subtitle)
    navSubtitle.textContent = '';
    navSubtitle.classList.add('hidden');

    // Sync nav height
    syncNavHeight();

    // Show selector
    gameSelector.classList.remove('hidden');
    document.getElementById('tagline').classList.remove('hidden');

    // Clear persisted active game
    try { localStorage.removeItem(ACTIVE_GAME_KEY); } catch {}
  }

  // ────────────────────────────────────────────────────────────
  // 4.6  handleGameLoadError(game) — error state
  // ────────────────────────────────────────────────────────────

  /**
   * Displays the error overlay with the game name and a back button.
   * @param {Object} game - The game entry that failed to load
   */
  function handleGameLoadError(game) {
    gameFrame.classList.add('hidden');
    errorOverlay.classList.remove('hidden');
    errorMessage.textContent = `Failed to load "${game.name}".`;
  }

  // ────────────────────────────────────────────────────────────
  // 4.7  Initialization — DOMContentLoaded entry point
  // ────────────────────────────────────────────────────────────

  function init() {
    // Cache DOM references
    backButton = document.getElementById('back-button');
    navBar = document.querySelector('.nav-bar');
    navSubtitle = document.getElementById('nav-subtitle');
    gameSelector = document.getElementById('game-selector');
    emptyState = document.getElementById('empty-state');
    errorOverlay = document.getElementById('error-overlay');
    errorMessage = document.getElementById('error-message');
    errorBackButton = document.getElementById('error-back-button');
    gameFrame = document.getElementById('game-frame');

    // Wire up back buttons
    backButton.addEventListener('click', returnToSelector);
    errorBackButton.addEventListener('click', returnToSelector);

    // Load registry → validate → render (and restore active game if any)
    syncNavHeight();
    loadRegistry()
      .then(validateRegistry)
      .then(function (games) {
        renderGameCards(games);

        // Restore previously active game after refresh
        try {
          const activeId = localStorage.getItem(ACTIVE_GAME_KEY);
          if (activeId) {
            const game = games.find(function (g) { return g.id === activeId; });
            if (game) {
              launchGame(game);
            }
          }
        } catch {}
      });
  }

  // ── Helpers ──

  function clearLoadTimeout() {
    if (loadTimeoutId !== null) {
      clearTimeout(loadTimeoutId);
      loadTimeoutId = null;
    }
  }

  function syncNavHeight() {
    if (navBar) {
      document.documentElement.style.setProperty(
        '--nav-height',
        navBar.offsetHeight + 'px'
      );
    }
  }

  // ── Bootstrap ──
  document.addEventListener('DOMContentLoaded', init);

  // ── Public API (for testing) ──
  return {
    loadRegistry,
    validateRegistry,
    renderGameCards,
    launchGame,
    returnToSelector,
    handleGameLoadError,
    init,
    // Expose constants for tests
    REGISTRY_URL,
    LOAD_TIMEOUT_MS,
    REQUIRED_FIELDS
  };
})();
