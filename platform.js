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

  const TAGLINES = [   
    'IQ is not optional',   
    'No brain, no gain',
    'Your neurons called. They want a challenge.',
    'Skull day is every day',
    'Think harder. Then harder again.',
    'Mental reps don\'t count unless they hurt',
    'Your brain skipped leg day. And every other day.',
    'Comfort zone? Never heard of her.',
    'If your brain isn\'t crying, you\'re not trying',
    'Swole mind, zero excuses',
    'Grind the grey matter',
    'Neurons don\'t grow in the shade',
    'Rest day is for your body, not your brain',
    'Cognitive gains or cognitive shame',
    'Train your brain or it trains you',
    'Your IQ won\'t spot itself',
    'Synapses don\'t fire themselves',
    'Think until it burns. Then think more.',
    'Weak focus is a choice',
    'Your prefrontal cortex deserves better',
    'No shortcuts. Only neural pathways.',
    'Flex that frontal lobe',
    'Brains over everything',
    'You vs. your last brain cell. Fight.',
    'Mental gains loading...',
    'Discipline is remembering what your brain forgot',
    'Cry now, think later',
    'Every neuron earned, not given',
    'Your working memory is not working hard enough',
    'Mediocre minds don\'t play here',
    'Your brain skipped brain day... again.',
    'No pain, no prefrontal gain',
    'Lift heavy thoughts or stay average',
    'Your neurons are soft. Harden them.',
    'Mental DOMS or mental loss',
    'Weak focus gets deleted',
    'Synapses don’t grow from comfort',
    'Your cortex called — it’s embarrassed',
    'Brain gains don’t come from excuses',
    'Grind until your IQ begs for mercy',
    'Think heavy. Lift heavier thoughts.',
    'Lazy neurons get pruned forever',
    'Your working memory is slacking again',
    'No reps, no respect from your future self',
    'Feel the burn in your frontal lobe',
    'Cognitive PRs or permanent regression',
    'Your brain’s been benching feathers',
    'Stop scrolling. Start skull-crushing problems.',
    'Mental atrophy is not a personality trait',
    'If your head isn’t pounding, you’re coasting',
    'Neurons hate weak owners',
    'Build the brain or become the background',
    'Your amygdala is scared of hard mode',
    'Comfort is for corpses, not cortexes',
    'Every missed problem is a missed gain',
    'Train insane or remain the same (dumb)',
    'Your brain is calling collect from the comfort zone',
    'Flex the frontal or flex the excuses',
    'Mushy mind = deleted from the leaderboard',
    'Sweat your synapses or stay soft',
    'Cognitive failure is not an option',
    'Your IQ is crying for another set',
    'Push past the plateau or perish',
    'Brain dead? Nah, just brain lazy.',
    'No mercy for mediocre minds',
    'Forge your mind in the fire of failure',
    'Weak thoughts die in this app'
  ];

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
    document.getElementById('build-info').classList.add('hidden');
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

    // Restore nav bar visibility
    navBar.classList.remove('nav-hidden');

    // Restore default nav (hide subtitle)
    navSubtitle.textContent = '';
    navSubtitle.classList.add('hidden');

    // Sync nav height
    syncNavHeight();

    // Show selector
    gameSelector.classList.remove('hidden');
    document.getElementById('tagline').classList.remove('hidden');
    document.getElementById('build-info').classList.remove('hidden');

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

    // Set random tagline
    const taglineEl = document.getElementById('tagline');
    if (taglineEl) {
      taglineEl.textContent = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
    }

    // Wire up back buttons
    backButton.addEventListener('click', returnToSelector);
    errorBackButton.addEventListener('click', returnToSelector);

    // Listen for HIDE_NAV / SHOW_NAV from game iframes
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'HIDE_NAV') {
        navBar.classList.add('nav-hidden');
        syncNavHeight();
      } else if (event.data?.type === 'SHOW_NAV') {
        navBar.classList.remove('nav-hidden');
        syncNavHeight();
      }
    });

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
      const h = navBar.classList.contains('nav-hidden') ? 0 : navBar.offsetHeight;
      document.documentElement.style.setProperty('--nav-height', h + 'px');
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
