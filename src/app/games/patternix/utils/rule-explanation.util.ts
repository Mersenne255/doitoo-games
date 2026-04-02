import { TransformationRule } from '../models/game.models';

const ATTR_LABELS: Record<string, string> = {
  shape: 'Shape',
  color: 'Color',
  size: 'Size',
  rotation: 'Rotation',
  fill: 'Fill pattern',
};

const COLOR_NAMES: Record<string, string> = {
  '#ef4444': 'red',
  '#3b82f6': 'blue',
  '#22c55e': 'green',
  '#eab308': 'yellow',
  '#a855f7': 'purple',
  '#f97316': 'orange',
  '#06b6d4': 'cyan',
  '#ec4899': 'pink',
};

function formatValue(val: string | number, attr: string): string {
  if (attr === 'color') return COLOR_NAMES[val as string] ?? String(val);
  if (attr === 'rotation') return `${val}°`;
  return String(val);
}

function formatValues(vals: (string | number)[], attr: string): string {
  return vals.map(v => formatValue(v, attr)).join(' → ');
}

/** Generates a human-readable explanation of a transformation rule. */
export function explainRule(rule: TransformationRule): string {
  const label = ATTR_LABELS[rule.attribute] ?? rule.attribute;
  const vals = formatValues(rule.values, rule.attribute);

  switch (rule.type) {
    case 'cycle':
      return `${label} cycles: ${vals}`;
    case 'progression':
      return `${label} progresses: ${vals}`;
    case 'alternation':
      return `${label} alternates: ${vals}`;
    case 'constant':
      return `${label} stays ${formatValue(rule.values[0], rule.attribute)}`;
  }
}

/** Generates explanations for all rules in a puzzle. */
export function explainRules(rules: TransformationRule[]): string[] {
  return rules.map(explainRule);
}
