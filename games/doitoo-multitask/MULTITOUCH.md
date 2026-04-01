# Multitouch in Doitoo Multitask

## The Problem

The multitask game runs multiple minigames side-by-side (comet, alike, math-equations). On touch devices, players need to interact with several games simultaneously — e.g. holding one finger on the comet canvas while tapping shapes in alike with another finger.

By default, browsers interpret two simultaneous touch points as a **gesture** (pinch-to-zoom, two-finger pan). When this happens, individual touch events stop reaching the target elements, and taps on sibling components are silently swallowed.

## The Solution

### 1. Container-level gesture suppression (`MultitaskShellComponent`)

The `.slot-grid` element registers **non-passive** `touchstart` and `touchmove` listeners that call `preventDefault()`:

```ts
el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
el.addEventListener('touchmove',  (e) => e.preventDefault(), { passive: false });
```

This is the critical piece. It tells the browser: "don't interpret any touches inside this container as gestures." Without `{ passive: false }`, the browser ignores the `preventDefault()` call (Chrome defaults touch listeners to passive for performance).

This must be done via `addEventListener` — Angular template bindings like `(touchstart)` register passive listeners by default, so `$event.preventDefault()` has no effect.

### 2. Minigame input via `touchstart` + `click` fallback

Because the container's `preventDefault()` cancels click synthesis (the browser normally generates a `click` after `touchend`), every interactive element inside the slot grid uses a dual binding:

```html
<!-- Alike buttons -->
<button (touchstart)="onTouch($event, $index)" (click)="pick($index)">

<!-- Math numpad buttons -->
<button (touchstart)="onNumTouch($event, 'digit', n)" (click)="pressDigit(n)">
```

- `touchstart` handles touch devices — fires immediately per-finger, unaffected by the container's gesture suppression
- `click` handles mouse/desktop — still works because mouse events aren't affected by touch `preventDefault()`

Each `onTouch` / `onNumTouch` handler calls `e.preventDefault()` on its own event to prevent double-firing (touch → click).

### 3. Comet uses `pointerdown` / `pointerup`

The comet canvas uses Pointer Events instead of touch events:

```html
<canvas (pointerdown)="onPress($event)" (pointerup)="onRelease($event)" ...>
```

Pointer events fire **before** touch events in the browser event sequence (`pointerdown` → `touchstart` → ...), so they're unaffected by the container's `touchstart` `preventDefault()`. The comet tracks which `pointerId` started the press to avoid interference from other fingers.

### 4. CSS `touch-action: none`

The slot grid, slot host, alike host, and comet canvas all have `touch-action: none`. This is a CSS hint that reinforces the JavaScript `preventDefault()` — it tells the browser's compositor thread not to start gesture recognition before JavaScript even runs.

## Event Flow (two-finger scenario)

```
Finger 1 presses comet canvas:
  1. pointerdown → comet.onPress() sets pressing=true
  2. touchstart bubbles to slot-grid → preventDefault() kills gesture recognition

Finger 2 taps alike button (while finger 1 is held):
  3. pointerdown fires on button (independent touch point)
  4. touchstart → alike.onTouch() calls preventDefault() + pick()
  5. touchstart bubbles to slot-grid → preventDefault() (redundant but harmless)
```

Without step 2, the browser would see two active touch points and start a pinch/pan gesture, consuming both.

## Impact on Other Platform Games

**None.** This solution is entirely scoped to the multitask game:

- The touch listeners are on the `.slot-grid` element inside `MultitaskShellComponent`, which only exists while the multitask game is in `playing` state
- Other games (nback, numbers) run in separate Angular applications loaded in iframes — they have their own independent touch handling
- The platform shell itself uses standard `click` events for navigation, which are unaffected
- When the multitask game returns to the config/summary screen, the slot grid is destroyed and all touch listeners are cleaned up

## Adding New Minigames

When adding a new minigame to the multitask shell, interactive elements must follow this pattern:

1. Use `(touchstart)="handler($event, ...)" (click)="fallback(...)"` on all tappable elements
2. The touchstart handler must call `e.preventDefault()` to prevent double-firing
3. Add `touch-action: none` to the minigame's `:host` styles
4. For canvas-based games, `pointerdown`/`pointerup` is preferred (fires before touch events)
