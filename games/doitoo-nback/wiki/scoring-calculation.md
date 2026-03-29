# N-Back Scoring Calculation

## Overview

Each step in a session is classified per modality, and the final score reflects how well the player identified matches without making false presses.

## Step Classification

Every step, for each active modality, produces one of four outcomes:

| Was a match? | Player pressed? | Classification       |
|--------------|-----------------|----------------------|
| Yes          | Yes             | **Hit**              |
| Yes          | No              | **Miss**             |
| No           | Yes             | **False Alarm**      |
| No           | No              | **Correct Rejection**|

## Per-Modality Score

```
percentage = (hits − falseAlarms) / totalMatches × 100
```

Where `totalMatches = hits + misses` (the number of steps that were actual matches).

### Key properties

- **Do nothing** (never press): 0 hits, 0 false alarms → `0 / totalMatches = 0%`
- **Perfect play** (press only on matches, never on non-matches): all hits, 0 false alarms → `hits / totalMatches = 100%`
- **Spam everything** (press every step): all hits but also many false alarms → score is penalized, potentially well below 100%
- **Score can go negative** if false alarms exceed hits

### Edge case: no matches in sequence

If a modality has zero matches (hits + misses = 0):
- No false alarms → 100% (you correctly did nothing)
- Any false alarms → negative penalty based on `falseAlarms / totalSteps`

## Overall Session Score

```
overallPercentage = average of all active modality percentages
```

## Level Progression

| Overall Score | Suggestion          |
|---------------|---------------------|
| ≥ 80%         | Increase N-Level +1 |
| < 50%         | Decrease N-Level −1 (min 1) |
| 50–79%        | Stay at current level |
