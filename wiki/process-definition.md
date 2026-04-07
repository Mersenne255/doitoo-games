# Process Definition: Creating a New Doitoo Brain-Training Game

## Purpose

This document is the definitive reference for designing, specifying, and building a new game for the doitoo-games platform. It synthesizes scientific research, behavioral psychology, game design theory, and hard-won lessons from the existing game catalog (Dual N-Back, Splittention, MindFlow, Recallc) into a single actionable guide.

Use this document when:
- Brainstorming a new game concept
- Writing a requirements spec for a new game
- Evaluating whether a game idea is worth building
- Making visual design decisions
- Tuning difficulty, feedback, and retention mechanics

---

## Part 1: The Science of Addictive Educational Games

### 1.1 Why Some Games Are Impossible to Put Down

The games that people play compulsively share a common neurological signature: they exploit the brain's dopamine prediction system. Dopamine is not released when you receive a reward — it fires when you *anticipate* one. The gap between expectation and outcome (called "reward prediction error") is the engine of engagement.

This means the most addictive games are not the ones that give you the most rewards. They're the ones that make you *expect* rewards in unpredictable patterns.

**Key insight for doitoo games**: Every trial, puzzle, or round should create a micro-moment of anticipation ("will I get this right?") followed by immediate resolution. The uncertainty of your own performance IS the variable reward.

### 1.2 The Seven Psychological Pillars

Every successful brain-training game in the doitoo catalog rests on some combination of these seven pillars. A new game should consciously engage at least four of them.

#### Pillar 1: Flow State (Csíkszentmihályi)

**The science**: Flow occurs when challenge precisely matches skill level. Too easy → boredom. Too hard → anxiety. The sweet spot produces a state of complete absorption where time perception distorts and self-consciousness disappears.

**How it works in practice**:
- Difficulty must scale continuously, not in sudden jumps
- The player should always feel "I almost had it" or "I can do slightly better"
- Interruptions destroy flow — the game must minimize friction between trials

**Real-world examples**:
- Tetris: Speed increases gradually; you're always one piece away from disaster
- Dual N-Back (doitoo): N-level creates a precise skill-challenge match
- MindFlow (doitoo): Track count and speed scale together, keeping the player at the edge of their routing capacity

**Implementation pattern**: Use a numeric difficulty parameter (1–20) that controls multiple axes simultaneously (speed, complexity, number of elements, time pressure). Map difficulty to parameters via a pure function so the curve is deterministic and testable.

#### Pillar 2: Dopamine Prediction Loops

**The science**: The brain's ventral tegmental area releases dopamine not on reward delivery, but on reward *anticipation*. When actual outcomes exceed predictions, dopamine surges. When outcomes match predictions exactly, dopamine flatlines. When outcomes disappoint, dopamine drops below baseline.

**How it works in practice**:
- Correct answers should feel *earned*, not guaranteed
- The player should be uncertain of their answer ~40-60% of the time at optimal difficulty
- Occasional surprising success (a hard puzzle solved quickly) creates dopamine spikes
- Streaks amplify anticipation: "can I keep this going?"

**Real-world examples**:
- Wordle: Each guess narrows possibilities, building anticipation toward the reveal
- Lumosity: Adaptive difficulty keeps you at ~70% accuracy — high enough to feel competent, low enough to feel uncertain
- MindFlow (doitoo): Shapes arrive unpredictably; each delivery is a micro-bet on whether you routed correctly

**Implementation pattern**: Track accuracy in real-time. If accuracy exceeds 85%, the game is too easy. If it drops below 50%, it's too hard. The ideal zone is 60-75% accuracy where uncertainty is maximized.

#### Pillar 3: Variable Ratio Reinforcement

**The science**: B.F. Skinner demonstrated that variable ratio reinforcement schedules (reward after an unpredictable number of responses) produce the highest and most persistent response rates. This is why slot machines are addictive — you never know which pull will pay off.

**How it works in practice**:
- Don't make every trial equally difficult — mix easy "gimme" trials with hard ones
- Streaks should be possible but not guaranteed
- The scoring system should have occasional "bonus" moments (speed bonuses, perfect round bonuses)
- Progress should feel uneven — sometimes you plateau, sometimes you leap

**Real-world examples**:
- Slot machines: Variable ratio is the core mechanic
- Candy Crush: Level difficulty varies wildly — some levels are trivially easy, others take 50 attempts
- Splittention (doitoo): Minigame difficulty varies — some rounds are manageable, others overwhelm immediately

**Implementation pattern**: In trial/puzzle generation, explicitly control the ratio of easy-to-hard items. Use a `congruentRatio` or `easyTrialRatio` parameter that varies with difficulty. Never make all trials equally hard.

#### Pillar 4: The Zeigarnik Effect

**The science**: Psychologist Bluma Zeigarnik discovered that people remember incomplete tasks better than completed ones. Unfinished business creates cognitive tension that demands resolution.

**How it works in practice**:
- Show progress toward a goal (e.g., "12 / 30 trials")
- End sessions at a point where the player feels "just one more"
- Display metrics that are *almost* at a milestone ("accuracy: 78%" when 80% feels achievable)
- Never let the player feel "done" — there's always a higher difficulty, a better streak, a faster time

**Real-world examples**:
- Progress bars in any game (the bar is never quite full)
- Netflix auto-play (the next episode starts before you decide to stop)
- Splittention (doitoo): Difficulty escalates until you fail — you always end wanting to beat your last level

**Implementation pattern**: Display round progress prominently during gameplay. Show "personal best" metrics on the config screen. Track and display streaks, which create their own Zeigarnik tension ("I'm on a 7-streak, I can't stop now").

#### Pillar 5: Self-Determination Theory (Deci & Ryan)

**The science**: Intrinsic motivation requires three psychological needs to be met:
1. **Autonomy** — feeling in control of your choices
2. **Competence** — feeling effective and capable
3. **Relatedness** — feeling connected to others (less relevant for solo brain training, but not zero)

**How it works in practice**:
- **Autonomy**: Let players configure difficulty, session length, and game mode. Never force a difficulty level.
- **Competence**: Provide clear feedback that shows improvement. Accuracy percentages, streak records, and response time trends all signal growing competence.
- **Relatedness**: Even in solo games, taglines like "Your neurons called. They want a challenge." create a sense of shared identity with other players.

**Real-world examples**:
- Duolingo: Autonomy (choose your language), Competence (XP and streaks), Relatedness (leaderboards)
- All doitoo games: Config panels give full autonomy over difficulty and session parameters
- Doitoo home screen taglines: Create a gym-culture identity ("No brain, no gain") that builds relatedness

**Implementation pattern**: Every game MUST have a config panel with at least difficulty level and session length. Never auto-adjust difficulty without player consent. Always show performance metrics that demonstrate improvement.

#### Pillar 6: Cognitive Load Management (Sweller)

**The science**: Working memory can hold approximately 4±1 chunks of information simultaneously. Cognitive Load Theory distinguishes three types:
- **Intrinsic load**: The inherent difficulty of the material (this is what we WANT)
- **Extraneous load**: Difficulty caused by poor design (this is what we must ELIMINATE)
- **Germane load**: Mental effort devoted to learning and schema formation (this is what we want to MAXIMIZE)

**How it works in practice**:
- The game mechanic itself should be the source of difficulty, not the UI
- Rules should be explainable in one sentence
- Visual elements should be instantly readable — no decoding required
- New complexity should be introduced one dimension at a time

**Real-world examples**:
- Chess: Rules are simple, strategy is infinitely deep — intrinsic load is high, extraneous load is near zero
- MindFlow (doitoo): "Route shapes to matching stations" — one sentence rule, deep spatial complexity
- Recallc (doitoo): "Remember the numbers" — the mechanic is instantly understood, the challenge is purely cognitive

**Implementation pattern**: If you can't explain the core mechanic in under 15 words, simplify it. The config panel should be the most complex UI in the game — the gameplay UI should be stripped to essentials.

#### Pillar 7: The "I Can Do Better" Effect (Self-Referential Motivation)

**The science**: When players can *feel* their own errors — when they know they pressed wrong because their brain tricked them — it creates a uniquely powerful retry motivation. This is distinct from external motivation (leaderboards, rewards). It's the player competing against their own cognitive limitations.

**How it works in practice**:
- Errors should feel like YOUR fault, not the game's fault
- The correct answer should be obvious in hindsight ("of course it was blue, not red")
- Show the correct answer after an error so the player can see what they missed
- Response time metrics let players see their own improvement quantitatively

**Real-world examples**:
- The Stroop test: You KNOW the answer is "blue" but your mouth says "red" — the error is viscerally self-aware
- MindFlow (doitoo): You see the shape go to the wrong station and instantly know you tapped the wrong junction
- Recallc (doitoo): You forget a number you just saw 3 seconds ago — the failure is undeniably yours

**Implementation pattern**: Always show correct/incorrect feedback with the right answer visible. Track and display response time — faster times on the same difficulty prove improvement. Show "personal best" comparisons.

### 1.3 The Compulsion Loop

Every doitoo game follows the same core compulsion loop:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   ANTICIPATION          ACTION         REWARD   │
│   "Can I get this?"  →  Respond  →  Feedback    │
│                                                 │
│        ↑                                  │     │
│        │                                  │     │
│        └──── VARIABLE OUTCOME ────────────┘     │
│              (sometimes right,                  │
│               sometimes wrong,                  │
│               never predictable)                │
│                                                 │
└─────────────────────────────────────────────────┘
```

The loop must complete in under 5 seconds for brain-training games. Longer loops lose the dopamine connection between action and outcome.


---

## Part 2: Behavioral Patterns and How to Exploit Them

### 2.1 Cognitive Biases That Drive Engagement

#### The Endowed Progress Effect

**What it is**: People are more motivated to complete a goal when they feel they've already made progress toward it. A loyalty card with 10 stamps needed but 2 already filled gets completed 34% of the time, versus 19% for an 8-stamp card starting from zero — even though both require 8 stamps.

**Application in doitoo games**:
- Show "Round 1 of 1" even for single rounds — it implies a series
- Display cumulative session stats ("You've completed 47 puzzles today")
- The countdown (3, 2, 1, Go!) is itself endowed progress — the round has "started" before the first trial
- Config panel → countdown → playing creates a 3-step funnel where the player has already invested effort before gameplay begins

#### Loss Aversion (Kahneman & Tversky)

**What it is**: Losses feel approximately twice as painful as equivalent gains feel pleasurable. A streak of 7 correct answers feels good, but breaking that streak feels terrible.

**Application in doitoo games**:
- Track and prominently display streaks — they create loss aversion ("I can't break my streak")
- Show "longest streak" in the summary — it becomes a target to beat
- MindFlow's scoring system awards points for correct deliveries but the misdelivery counter creates loss pressure
- Never take away points or progress — instead, show what COULD have been ("you were 2 away from a perfect round")

#### The Peak-End Rule (Kahneman)

**What it is**: People judge experiences primarily by their peak intensity and how they end, not by the average. A round that ends with a dramatic correct answer on a hard puzzle will be remembered more positively than a round with higher average accuracy but a flat ending.

**Application in doitoo games**:
- The last few trials in a round should be slightly easier to end on a high note
- The summary screen should emphasize the best metric ("Longest streak: 12!" rather than "Accuracy: 67%")
- If the player had a great streak, highlight it. If they improved their response time, highlight that.
- The summary should always find something positive to emphasize

#### Anchoring Effect

**What it is**: The first number people see becomes a reference point for all subsequent judgments.

**Application in doitoo games**:
- Show difficulty level prominently — "Level 14" anchors the player's sense of achievement
- Display "personal best" on the config screen — it becomes the anchor for the next session
- Default difficulty to 1 — starting low makes progress feel dramatic

### 2.2 Habit Formation Mechanics

#### The Hook Model (Nir Eyal)

The Hook Model describes four phases of habit-forming products:

1. **Trigger** → Opening the app (external: notification, internal: boredom/desire to improve)
2. **Action** → Starting a round (must be frictionless — one tap from home screen to gameplay)
3. **Variable Reward** → The round itself (unpredictable performance creates variable reward)
4. **Investment** → Reviewing results, adjusting config (the player invests effort that makes the next cycle more valuable)

**Doitoo implementation**:
- Home screen → game card → config panel → start button = 3 taps to gameplay
- Config persistence means returning players skip configuration entirely
- Summary screen's "Play Again" button creates a zero-friction re-entry to the loop
- Taglines on the home screen serve as internal triggers ("Your neurons called. They want a challenge.")

#### Session Length Sweet Spot

Research on brain-training apps (Lumosity, Elevate, Peak) consistently shows:
- **Optimal session**: 5-15 minutes
- **Optimal round**: 1-3 minutes
- **Optimal trial**: 1-5 seconds

Shorter sessions have higher completion rates and better retention. Players who do 5 minutes daily retain better than players who do 30 minutes weekly.

**Doitoo implementation**:
- Default round lengths should target 2-3 minutes
- Allow configuration up to longer sessions for motivated players
- Never force a minimum session length

### 2.3 The Difficulty Curve: Getting It Right

The difficulty curve is the single most important design element. Get it wrong and nothing else matters.

#### The Ideal Curve Shape

```
Difficulty
    ↑
    │                                    ╱
    │                                 ╱╱
    │                              ╱╱
    │                           ╱╱
    │                        ╱╱
    │                     ╱╱
    │                  ╱╱
    │              ╱╱╱
    │          ╱╱╱
    │      ╱╱╱
    │  ╱╱╱
    │╱╱
    └──────────────────────────────────→ Level
     1    5    10    15    20
```

The curve should be **logarithmic, not linear**. Early levels should feel noticeably different from each other. High levels should feel incrementally harder. This matches the Weber-Fechner law: perceived change is proportional to the logarithm of the stimulus.

#### Multi-Axis Difficulty Scaling

Never scale difficulty on a single axis. The doitoo pattern uses multiple simultaneous axes:

| Axis | Low Difficulty | High Difficulty |
|------|---------------|-----------------|
| Time pressure | Generous (3-5s) | Tight (0.8-2s) |
| Element count | Few (3-4) | Many (5-8) |
| Rule complexity | Single rule | Multiple interacting rules |
| Distractor quality | Obviously wrong | Plausibly wrong |
| Visual noise | Clean | Cluttered/conflicting |

**Example**: A game training inhibitory control might scale like this: Difficulty 1 = single conflict type, 3000ms response window. Difficulty 20 = multiple conflict types combined, 800ms window, with rule switches mid-round.

**Example**: A pattern recognition game might scale like this: Difficulty 1 = 1 rule, 3-element sequence, 3 distractors. Difficulty 20 = 3 rules, 6-element sequence, 5 distractors.

#### The 20-Level Standard

All doitoo games use a 1-20 difficulty scale. This is deliberate:
- 20 levels is enough granularity to feel meaningful progression
- It's small enough that each level feels distinct
- It maps cleanly to difficulty tiers (1-5 = beginner, 6-10 = intermediate, 11-15 = advanced, 16-20 = expert)
- It's easy to communicate ("I'm on level 14")

### 2.4 Feedback Timing: The 100ms Rule

Neuroscience research on sensorimotor integration shows:
- **< 100ms**: Feels instantaneous. The brain perceives action and feedback as a single event.
- **100-300ms**: Feels responsive. The brain registers a slight delay but maintains the causal connection.
- **300-1000ms**: Feels sluggish. The dopamine connection between action and outcome weakens.
- **> 1000ms**: Feels disconnected. The brain no longer associates the action with the outcome.

**Doitoo standard**:
- Visual feedback (correct/incorrect highlight): < 100ms
- Feedback display duration: 500ms-1000ms (long enough to register, short enough to maintain pace)
- Inter-trial interval: 300-500ms (prevents accidental double-taps, maintains rhythm)
- Transition to next trial: automatic (no tap required)

---

## Part 3: Visual Design — What Works, What Doesn't

### 3.1 The Doitoo Visual Identity

The existing doitoo games establish a clear visual language:

**Theme**: Dark, space-inspired, with neon accents. Think "cyberpunk brain gym."

**Color system**:
- Background: Deep navy/charcoal (`rgba(15, 15, 26)` — the app's base)
- Primary accent: Indigo/blue gradient (`#6366f1` → `#3b82f6`)
- Success: Green (`#22c55e`, light: `#86efac`)
- Error: Red (`#ef4444`, light: `#fca5a5`)
- Warning/streak: Yellow/amber (`#eab308`)
- Text primary: Near-white (`#f1f5f9`, `#e2e8f0`)
- Text muted: Slate (`#94a3b8`, `#64748b`)
- Glass surfaces: `rgba(255, 255, 255, 0.03-0.06)` with `backdrop-filter: blur(10px)`

**Typography**:
- Weights: 600-900 for emphasis, 500 for body
- Sizes: 0.6rem (metadata) → 3rem (countdown numbers)
- Letter-spacing: 0.02-0.08em for uppercase labels
- No serif fonts anywhere

**Surfaces**:
- Glass-morphism cards with subtle borders (`rgba(255, 255, 255, 0.06-0.15)`)
- Rounded corners: 0.5rem (buttons) → 1rem (cards) → 14px (game cards)
- Shadows: Colored glow effects, not traditional drop shadows (`box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3)`)

### 3.2 Visual Complexity: The Goldilocks Zone

#### What Works

**Minimalism with purpose**: Every visual element must serve gameplay. If it doesn't help the player make a decision or provide feedback, remove it.

Research from Nielsen Norman Group shows interfaces with fewer visual distractions improve task completion rates by up to 62%. For brain-training games, this is critical — the cognitive challenge should come from the game mechanic, not from parsing the UI.

**The doitoo approach**:
- During gameplay, only show: the stimulus, response options, progress indicator, and timer
- Hide navigation, branding, and configuration during active play (`NavService.hide()`)
- Use the full screen for gameplay — no wasted space
- Config panels are the "complex" UI; gameplay UI is stripped bare

**High contrast, limited palette**: Use 4-6 colors maximum during gameplay. Each color must have a distinct meaning:
- Game elements use the defined `COLOR_PALETTE` (red, blue, green, yellow, purple, orange, cyan, pink)
- UI chrome uses only the theme colors (indigo, slate, white)
- Success/error feedback uses green/red exclusively
- Never use color as the ONLY differentiator — always pair with shape, size, or position

#### What Doesn't Work

**Decorative complexity**: Gradients, textures, patterns, and ornamental elements that don't serve gameplay. They increase extraneous cognitive load and slow visual processing.

**Realistic graphics**: Brain-training games are abstract by nature. Realistic art creates expectations of narrative and world-building that these games don't deliver. Abstract geometric shapes are faster to process and more universally readable.

**Animation for animation's sake**: Every animation must serve a purpose:
- Correct/incorrect feedback → communicates outcome
- Countdown → builds anticipation
- Timer bar shrinking → communicates urgency
- Transition between trials → prevents visual jarring
- Decorative particle effects, bouncing elements, or ambient animations → waste attention

**Information overload during gameplay**: Showing score, accuracy, streak, timer, progress, difficulty level, and round number simultaneously overwhelms working memory. Show only what the player needs for the current decision.

### 3.3 The Anatomy of a Doitoo Game Screen

#### Config Screen (Idle Stage)

```
┌─────────────────────────────────┐
│         [Nav Bar]               │
│                                 │
│    ┌─────────────────────┐      │
│    │   Config Card        │      │
│    │                     │      │
│    │  [Slider: Difficulty]│      │
│    │  [Slider: Count]    │      │
│    │  [Toggle/Buttons]   │      │
│    │                     │      │
│    └─────────────────────┘      │
│                                 │
│    ┌─────────────────────┐      │
│    │    [ Start ]         │      │
│    └─────────────────────┘      │
│                                 │
└─────────────────────────────────┘
```

**Rules**:
- Max width: 400-500px, centered
- One card for all settings
- Start button is always green, always prominent
- Use shared `_config-card.scss` mixins
- Sliders with numeric readout on the right
- Button groups for categorical options (speed: slow/medium/fast)

#### Gameplay Screen (Playing Stage)

```
┌─────────────────────────────────┐
│  [Progress: 3/10]    [Timer]    │
│                                 │
│                                 │
│                                 │
│         [STIMULUS]              │
│                                 │
│                                 │
│                                 │
│  [Option A] [Option B] [Opt C] │
│                                 │
└─────────────────────────────────┘
```

**Rules**:
- Nav bar is HIDDEN (full immersion)
- Stimulus occupies the center 60% of the screen
- Response options at the bottom (thumb-reachable on mobile)
- Progress indicator: small, top-left, non-distracting
- Timer: visual (shrinking bar or ring), not numeric
- Abort button: small, top-right, subtle (don't encourage quitting)
- Touch targets: minimum 44x44px (WCAG), preferably 48x48px
- No scrolling — everything visible without interaction

#### Summary Screen (Summary Stage)

```
┌─────────────────────────────────┐
│                                 │
│    ┌─────────────────────┐      │
│    │   Summary Card       │      │
│    │                     │      │
│    │  Accuracy: 78%      │      │
│    │  ✓ 23  ✗ 5  — 2    │      │
│    │  Avg time: 1.2s     │      │
│    │  Streak: 8          │      │
│    │  Difficulty: 7      │      │
│    │                     │      │
│    │  [Back]  [Again]    │      │
│    └─────────────────────┘      │
│                                 │
└─────────────────────────────────┘
```

**Rules**:
- Use shared `_summary-card.scss` mixins
- Correct count in green, incorrect in red, streak in yellow/amber
- "Again" button is green (encourage replay), "Back" button is neutral
- Show the most impressive metric prominently
- Difficulty level always visible (anchoring effect)

### 3.4 Animation and "Juice"

"Juice" is the industry term for micro-feedback that makes interactions feel satisfying. For brain-training games, juice must be restrained — too much is distracting, too little feels dead.

#### Required Juice (Every Game)

1. **Correct answer flash**: Green highlight/glow, 100ms onset, 500ms display. The MindFlow feedback ring pattern (expanding ring with alpha fade) is the gold standard.

2. **Incorrect answer flash**: Red highlight, same timing. Show the correct answer simultaneously in green.

3. **Countdown animation**: Scale-in effect (0.7 → 1.0 scale, 200ms ease-out). Numbers glow with indigo text-shadow. "Go!" glows green. This is already implemented in the shared `CountdownComponent`.

4. **Timer urgency**: When < 25% time remains, the timer visual should change color (neutral → amber → red) or pulse subtly.

5. **Streak indicator**: When streak ≥ 3, show a subtle visual cue (small flame icon, color shift, or counter). Don't make it distracting — it should be peripheral.

#### Optional Juice (Game-Specific)

- **Screen shake**: Very subtle (2-3px, 100ms) on incorrect answers. Use sparingly.
- **Particle burst**: Small particle effect on correct answers at high streaks. Keep it minimal.
- **Score pop**: "+1" or "+100" floating text that fades up and out. Only if the game has visible scoring during play.
- **Haptic feedback**: `navigator.vibrate(50)` on correct, `navigator.vibrate([50, 50, 50])` on incorrect. Mobile only, respect user preferences.

#### Forbidden Juice

- Background animations or ambient effects during gameplay
- Transition animations longer than 300ms between trials
- Sound effects (the app is designed for silent use in public)
- Confetti, fireworks, or celebration animations (they break the "brain gym" tone)
- Any animation that delays the next trial

### 3.5 Rendering Approaches

The doitoo games use two rendering approaches:

#### Canvas (HTML5 Canvas 2D)
**Used by**: MindFlow (complex spatial game with paths, nodes, moving shapes)

**When to use**:
- Game requires smooth animation of many moving elements
- Spatial relationships between elements are core to gameplay
- Custom hit-testing is needed (click/tap on specific shapes)
- Performance matters (60fps with 50+ animated elements)

**Tradeoffs**:
- No DOM accessibility (must implement custom ARIA)
- Manual rendering code (draw loops, coordinate math)
- Harder to style consistently with the rest of the app
- Excellent performance for complex visuals

#### DOM/SVG (Angular Templates)
**Used by**: Splittention (DOM minigames), Recallc (DOM grid)

**When to use**:
- Game elements are discrete, non-overlapping items
- Standard click/tap interaction on distinct elements
- Accessibility is important (screen readers, keyboard nav)
- Visual elements map cleanly to Angular components

**Tradeoffs**:
- Built-in accessibility via semantic HTML
- Easy to style with CSS (consistent with app theme)
- Angular change detection handles updates
- Performance ceiling lower than Canvas for many animated elements

**Default recommendation**: Use DOM/SVG unless the game specifically requires Canvas. Most brain-training games are about discrete decisions, not spatial animation.

### 3.6 Responsive Design Requirements

All doitoo games must work on:
- Mobile portrait (360px - 428px width) — PRIMARY target
- Mobile landscape
- Tablet
- Desktop (max-width constrained to ~600px for gameplay)

**Key patterns**:
- Config panels: `max-width: 400-500px`, centered
- Gameplay: Full viewport, no scrolling
- Touch targets: ≥ 44px (48px preferred)
- Font sizes: Use rem units, minimum 0.7rem for any visible text
- The `@media (min-aspect-ratio: 1/1)` breakpoint switches layouts from vertical to horizontal (see Splittention)

### 3.7 Color Accessibility

- Never use color alone to convey information — always pair with shape, icon, or text
- Maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- The dark theme naturally provides high contrast for bright game elements
- Test with color blindness simulators (protanopia, deuteranopia, tritanopia)
- The existing `COLOR_PALETTE` values are chosen for distinguishability on dark backgrounds

---

## Part 4: The Doitoo Technical Architecture

### 4.1 Mandatory Architecture Pattern

Every doitoo game follows this exact structure:

```
src/app/games/{game-name}/
├── {game-name}-game.component.ts      # Host component (stage router)
├── models/
│   └── game.models.ts                 # All types, interfaces, constants
├── components/
│   ├── config-panel/
│   │   └── config-panel.component.ts  # Settings UI
│   ├── game-board/
│   │   └── game-board.component.ts    # Gameplay UI
│   └── summary/
│       └── summary.component.ts       # Results UI
├── services/
│   ├── game.service.ts                # Signal-based state management
│   └── storage.service.ts             # localStorage persistence
└── utils/
    ├── {core-generator}.util.ts       # Pure puzzle/trial generation
    ├── scoring.util.ts                # Pure scoring calculations
    └── difficulty.util.ts             # Pure difficulty → params mapping
```

### 4.2 Mandatory Shared Infrastructure

Every game MUST use:

| Component | Path | Purpose |
|-----------|------|---------|
| `GameStage` | `shared/models/game-stage.type.ts` | `'idle' \| 'countdown' \| 'playing' \| 'summary'` |
| `CountdownComponent` | `shared/components/countdown/` | 3-2-1-Go! animation |
| `NavService` | `shared/services/nav.service.ts` | Hide/show nav during gameplay |
| `_config-card.scss` | `shared/styles/` | Config panel styling mixins |
| `_summary-card.scss` | `shared/styles/` | Summary screen styling mixins |

### 4.3 Mandatory Behaviors

1. **Lazy loading**: Game component loaded via Angular router with `loadComponent`
2. **Standalone components**: All components are standalone (no NgModules)
3. **Signal-based state**: `GameService` uses Angular signals, not RxJS subjects
4. **Pure generators**: Puzzle/trial generation is a pure function (deterministic given seed)
5. **Config persistence**: `StorageService` saves to localStorage, loads on init, falls back to defaults
6. **Keyboard shortcuts**: `Enter` to start from idle, `Escape` to abort
7. **Stage-based rendering**: Host component uses `@if` blocks to render the active stage component
8. **Nav hiding**: Nav bar hidden during countdown/playing/summary, shown during idle
9. **Clean destruction**: `ngOnDestroy` calls `abortSession()` and `nav.show()`

### 4.4 Game Registration

Add to `src/app/home/game-list.ts`:
```typescript
{ route: '/{game-name}', name: '{Display Name}', label: '{Cognitive domain}', 
  description: '{Witty one-liner}', icon: 'assets/icons/{game-name}-icon.png' }
```

Add to `src/app/app.routes.ts`:
```typescript
{ path: '{game-name}', loadComponent: () => 
  import('./games/{game-name}/{game-name}-game.component')
    .then(m => m.{GameName}GameComponent) }
```

---

## Part 5: The Game Design Checklist

Use this checklist when evaluating a new game concept. A game should score YES on at least 12 of these 16 items.

### Core Mechanic
- [ ] Can the core mechanic be explained in one sentence?
- [ ] Does the mechanic target a specific, named cognitive domain?
- [ ] Is the cognitive domain different from existing games in the catalog?
- [ ] Does the mechanic create genuine cognitive conflict or challenge (not just speed)?

### Engagement
- [ ] Does each trial create a moment of uncertainty/anticipation?
- [ ] Is feedback immediate (< 100ms visual response)?
- [ ] Does the player feel "I can do better" after errors?
- [ ] Does difficulty scale across multiple axes simultaneously?

### Retention
- [ ] Can a round be completed in 1-3 minutes?
- [ ] Does the game track at least 3 performance metrics (accuracy, speed, streak)?
- [ ] Is there a clear "personal best" to beat?
- [ ] Does the config panel allow meaningful customization?

### Visual Design
- [ ] Does the gameplay screen have ≤ 5 distinct visual elements?
- [ ] Are all touch targets ≥ 44px?
- [ ] Does the game work in mobile portrait without scrolling?
- [ ] Does the visual design follow the doitoo dark theme?

---

## Part 6: Cognitive Domains Not Yet Covered

The current doitoo catalog covers:
- Working memory (Dual N-Back)
- Multitasking / divided attention (Splittention)
- Executive function / task switching (MindFlow)
- Short-term memory (Recallc)

**Untapped domains for new games**:

| Domain | Description | Example Mechanic |
|--------|-------------|-----------------|
| Fluid intelligence | Pattern recognition and abstract reasoning | Deduce transformation rules from visual sequences |
| Inhibitory control | Suppressing automatic responses under conflict | Stroop-style interference with response inhibition |
| Processing speed | How fast you can identify and respond to simple stimuli | Rapid symbol matching under time pressure |
| Cognitive flexibility | Switching between different mental sets | Rule-switching card sorting (like Wisconsin Card Sort) |
| Spatial reasoning | Mental rotation and spatial manipulation | Rotating 3D shapes to match a target |
| Verbal fluency | Word retrieval and language processing | Anagram solving, word chain building |
| Selective attention | Focusing on relevant info while ignoring distractors | Visual search in cluttered fields (like Where's Waldo) |
| Episodic memory | Remembering sequences of events in order | Recall sequences of actions/events after a delay |
| Mental arithmetic | Rapid calculation under pressure | Chain calculations with carry-over |

---

## Part 7: From Concept to Spec — The Process

### Step 1: Concept Validation (30 minutes)

1. Name the cognitive domain being trained
2. Describe the core mechanic in one sentence
3. Identify which psychological pillars (Section 1.2) the game engages
4. Run through the 16-item checklist (Section 5)
5. Verify the domain isn't already covered (Section 6)

### Step 2: Requirements Specification

Write a requirements document following the established template:
1. **Introduction**: What the game is, why it's addictive, cognitive science foundation
2. **Glossary**: Every domain term defined precisely
3. **Requirements**: User stories with acceptance criteria using SHALL/WHEN/IF format

Required requirement categories:
- Game registration and navigation
- Game lifecycle stages (idle → countdown → playing → summary)
- Configuration (difficulty 1-20, session length, game-specific options)
- Core generation (puzzle/trial/stimulus generation as pure function)
- Presentation (what the player sees)
- Interaction and feedback (how the player responds, what happens)
- Scoring (what metrics are tracked)
- Summary screen (what's displayed after a round)
- Difficulty scaling (how each axis changes with difficulty)
- Serialization (round-trip integrity for generated content)

### Step 3: Design Specification

Write a design document following the established template:
1. **Overview**: Architecture summary and key design decisions
2. **Architecture**: Mermaid diagram showing component relationships
3. **File structure**: Exact file paths
4. **Components**: Each component's responsibility and template structure
5. **Data models**: Complete TypeScript interfaces
6. **Correctness properties**: Formal properties for property-based testing
7. **Error handling**: Every error case and its resolution
8. **Testing strategy**: Unit tests + property-based tests with fast-check

### Step 4: Implementation

Follow the task list generated from the design. The standard task order is:
1. Models and types
2. Utility functions (generators, scoring, difficulty)
3. Property-based tests for utilities
4. Services (GameService, StorageService)
5. Components (config panel, game board, summary)
6. Host component and routing
7. Game registration (game-list.ts, app.routes.ts)
8. Integration testing

---

## Appendix A: Real-World Game Analysis

### Games That Got It Right

**Wordle**: One puzzle per day. Extreme constraint creates anticipation (Zeigarnik — you can't play more). Color-coded feedback (green/yellow/gray) is instantly readable. Shareable results create relatedness. The mechanic (5-letter word, 6 guesses) is explainable in one sentence.

**Tetris**: The original flow state game. Difficulty scales continuously (speed increases). The mechanic is spatial (rotate and place shapes). Every piece creates anticipation ("will the long piece come?"). Variable ratio reinforcement through random piece selection. The "I can do better" effect is visceral — you can see exactly where you went wrong.

**2048**: Minimalist visual design (4x4 grid, numbered tiles, color-coded). One mechanic (swipe to merge). Difficulty emerges naturally from the game state. The Zeigarnik effect is powerful — you're always "almost" at the next power of 2. Loss aversion kicks in when the board fills up.

**Duolingo**: Self-determination theory masterclass. Autonomy (choose language, pace). Competence (XP, streaks, levels). Relatedness (leaderboards, friend challenges). The streak mechanic exploits loss aversion brilliantly. Session length is ~5 minutes — perfect for habit formation.

### Games That Got It Wrong

**Complex brain-training apps with tutorials**: If your game needs a tutorial, the mechanic is too complex. Brain-training games should be learnable by doing.

**Games with too many metrics on screen**: Showing score, combo, multiplier, timer, health, and progress simultaneously creates extraneous cognitive load that competes with the actual challenge.

**Games with slow transitions**: Any delay > 500ms between trials breaks the compulsion loop. Elaborate transition animations are the enemy of engagement.

**Games without configurable difficulty**: Forced adaptive difficulty removes autonomy. Players should choose their challenge level, even if they choose wrong.

---

## Appendix B: The Doitoo Tone of Voice

The home screen taglines establish the brand voice. New games should match this tone:

- Gym-culture metaphors applied to the brain ("No brain, no gain", "Brain day is every day")
- Self-deprecating humor ("Your neurons called. They want a challenge.")
- Motivational but not cheesy ("Intelligence needs resistance")
- Slightly aggressive ("Weak focus is a choice", "This is no place for weak minds")
- Short, punchy sentences
- No exclamation marks in taglines (they feel desperate)

Game descriptions should be:
- One sentence
- Witty or provocative
- Hint at the challenge without explaining the mechanic
- Examples: "Designed by science. Tested by millions. Conquered by you." (Dual N-Back), "Three tasks, one brain. Let's see how long the juggling act lasts." (Splittention)

---

## Appendix C: Lessons Learned — The New Game Checklist

This checklist distills every principle, pattern, and pitfall from this document into a single pass/fail list. Walk through it before writing a single line of spec. If you can't check at least 80% of these, the game concept needs more work.

### Cognitive Foundation
- [ ] The game targets a specific, named cognitive domain (Section 6)
- [ ] The targeted domain is not already covered by an existing game in the catalog
- [ ] The core mechanic creates genuine cognitive conflict or challenge — not just speed or memorization
- [ ] The mechanic can be explained in one sentence (under 15 words)
- [ ] The game engages at least 4 of the 7 psychological pillars (Section 1.2)
- [ ] The cognitive science foundation is documented — cite the research that supports the mechanic

### The Compulsion Loop
- [ ] Each trial/puzzle creates a micro-moment of anticipation before the player responds
- [ ] The player is uncertain of their answer 40-60% of the time at optimal difficulty
- [ ] The loop (anticipation → action → feedback) completes in under 5 seconds for reaction games, or under 30 seconds for deliberation games
- [ ] Errors feel like the player's fault, not the game's fault — the correct answer is obvious in hindsight
- [ ] Correct/incorrect feedback is shown with the right answer visible, so the player learns from every trial

### Difficulty Design
- [ ] Difficulty uses the 1-20 scale standard
- [ ] Difficulty scales across at least 3 axes simultaneously (time pressure, element count, rule complexity, distractor quality, visual noise)
- [ ] The difficulty curve is logarithmic — early levels feel noticeably different, high levels feel incrementally harder
- [ ] Difficulty tiers are defined: 1-5 beginner, 6-10 intermediate, 11-15 advanced, 16-20 expert
- [ ] Each tier introduces a new dimension of challenge (not just "faster" or "more")
- [ ] The difficulty-to-parameters mapping is a pure function — deterministic and testable

### Variable Reinforcement
- [ ] Not all trials are equally hard — easy "gimme" trials are mixed with hard ones
- [ ] The easy/hard ratio is controlled by a parameter that varies with difficulty (e.g., congruent ratio 30-40%)
- [ ] Streaks are possible but not guaranteed
- [ ] The scoring system has occasional bonus moments (speed bonuses, perfect round bonuses)

### Feedback and Timing
- [ ] Visual feedback (correct/incorrect) appears in under 100ms
- [ ] Feedback display lasts 500-1000ms — long enough to register, short enough to maintain pace
- [ ] Inter-trial interval is 300-500ms — prevents accidental double-taps, maintains rhythm
- [ ] Transition to the next trial is automatic — no tap required
- [ ] When < 25% time remains, the timer visual changes (color shift or pulse)

### Session and Retention
- [ ] A round can be completed in 1-3 minutes
- [ ] Default session length targets 2-3 minutes
- [ ] Longer sessions are configurable for motivated players, but never forced
- [ ] The game tracks at least 3 performance metrics (accuracy, speed, streak)
- [ ] There is a clear "personal best" to beat
- [ ] The summary screen always finds something positive to emphasize (Peak-End Rule)
- [ ] The "Play Again" button creates zero-friction re-entry to the loop

### Player Autonomy
- [ ] The config panel allows the player to set difficulty level (1-20)
- [ ] The config panel allows the player to set session length (number of trials/puzzles)
- [ ] The config panel allows at least one game-specific option
- [ ] Difficulty is never auto-adjusted without player consent
- [ ] Configuration persists between sessions — returning players skip setup

### Visual Design
- [ ] The gameplay screen has ≤ 5 distinct visual elements
- [ ] The game follows the doitoo dark theme (deep navy background, neon accents, glass-morphism)
- [ ] During gameplay, only the stimulus, response options, progress indicator, and timer are visible
- [ ] Navigation and branding are hidden during active play
- [ ] Color is never the only differentiator — always paired with shape, size, or position
- [ ] The gameplay palette uses ≤ 6 colors, each with a distinct meaning
- [ ] Abstract geometric shapes are used — no realistic graphics
- [ ] Every animation serves a purpose — no decorative effects during gameplay

### Touch and Responsiveness
- [ ] All touch targets are ≥ 44px (48px preferred)
- [ ] The game works in mobile portrait without scrolling
- [ ] The game works across mobile, tablet, and desktop (max-width ~600px for gameplay)
- [ ] Response options are at the bottom of the screen (thumb-reachable on mobile)

### Onboarding
- [ ] The game is learnable by doing — no tutorial needed
- [ ] Difficulty 1 serves as the implicit tutorial: simple enough that the mechanic is self-evident
- [ ] The rule/instruction is displayed during gameplay in a single short phrase
- [ ] If the mechanic requires a tutorial to understand, it's too complex — simplify it

### Tone and Copy
- [ ] The game description is one sentence — witty, provocative, hints at the challenge
- [ ] In-game text (rules, feedback, labels) is terse and purely functional
- [ ] The tone matches the doitoo brand: gym-culture metaphors, slightly aggressive, no exclamation marks
- [ ] No cheesy motivational language — show, don't tell

### Architecture Compliance
- [ ] The game follows the mandatory file structure (Section 4.1)
- [ ] The game uses all mandatory shared infrastructure (GameStage, CountdownComponent, NavService, shared SCSS)
- [ ] The game lifecycle follows idle → countdown → playing → summary
- [ ] Puzzle/trial generation is a pure function (deterministic given seed)
- [ ] The game is registered in game-list.ts and app.routes.ts

---

## Appendix D: Sources and Further Reading

Content in this document was synthesized from the following research areas and sources (rephrased for compliance with licensing restrictions):

- Csíkszentmihályi, M. — Flow theory and the challenge-skill balance model ([gamedeveloper.com](https://www.gamedeveloper.com/design/cognitive-flow-the-psychology-of-great-game-design))
- Sweller, J. — Cognitive Load Theory applied to instructional game design ([researchgate.net](https://www.researchgate.net/publication/314437055_Evaluating_and_Managing_Cognitive_Load_in_Games))
- Deci, E. & Ryan, R. — Self-Determination Theory in digital games ([researchgate.net](https://www.researchgate.net/publication/303948263_Self-Determination_Theory_in_Digital_Games))
- Skinner, B.F. — Variable ratio reinforcement schedules and behavioral persistence ([utas.edu.au](https://figshare.utas.edu.au/articles/thesis/The_influence_of_ratio-reinforcement_on_video-gaming_behaviour/23239106))
- Zeigarnik, B. — The Zeigarnik effect on incomplete task recall ([psychologytoday.com](https://www.psychologytoday.com/au/blog/mind-games/201303/the-zeigarnik-effect-and-quest-logs-8))
- Kahneman, D. & Tversky, A. — Loss aversion and the peak-end rule
- Nunes, J. & Drèze, X. — The endowed progress effect ([gamedeveloper.com](https://www.gamedeveloper.com/pc/the-psychology-of-games-the-endowed-progress-effect-and-game-quests))
- Eyal, N. — The Hook Model for habit-forming products
- Vlambeer / Jan Willem Nijman — "The Art of Screen Shake" and game juice principles
- Nielsen Norman Group — Research on minimalist UI and cognitive load in interfaces
- Color psychology research in game design ([vibeberry.io](https://vibeberry.io/blog/color-psychology-in-interactive-gaming-design))
- Lumosity, Elevate, Peak — Brain training app design patterns and scientific evidence review ([springer.com](https://link.springer.com/article/10.1007/s41465-017-0040-5))
