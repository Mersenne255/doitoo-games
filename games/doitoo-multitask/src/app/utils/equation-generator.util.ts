import {
  Equation,
  MathOperator,
  difficultyParams,
} from '../models/game.models';

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Generate a single equation where every operand AND every intermediate
 * result stays within [-operandMax, operandMax].
 *
 * Strategy: pick operator first, then constrain the second operand
 * so the result stays in range.
 */
export function generateEquation(
  difficulty: number,
  allowedOperators: MathOperator[],
  rng: () => number = Math.random,
): Equation {
  const { operandMax } = difficultyParams(difficulty);
  const ops = allowedOperators.length > 0 ? allowedOperators : ['+' as MathOperator];
  const MAX_ATTEMPTS = 50;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const op = pickRandom(ops, rng);
    const eq = tryGenerate(op, operandMax, rng);
    if (eq) return eq;
  }

  // Fallback: simple addition within range
  const a = randomInt(1, operandMax, rng);
  const b = randomInt(1, Math.min(operandMax - a, operandMax), rng);
  return makeEquation(a, b, '+');
}

function tryGenerate(
  op: MathOperator,
  max: number,
  rng: () => number,
): Equation | null {
  switch (op) {
    case '+': {
      // Both operands meaningful: pick from [1, max/2] to [1, max] range
      const a = randomInt(1, max, rng);
      const bMax = max - a;
      if (bMax < 1) return null;
      const b = randomInt(1, bMax, rng);
      return makeEquation(a, b, '+');
    }
    case '−': {
      const a = randomInt(1, max, rng);
      const b = randomInt(1, a, rng); // b <= a so result >= 0
      return makeEquation(a, b, '−');
    }
    case '×': {
      // Pick both from a balanced range so neither is trivially 1
      const sqrtMax = Math.floor(Math.sqrt(max));
      const minOp = Math.min(2, sqrtMax);
      const a = randomInt(minOp, sqrtMax, rng);
      const bMax = Math.floor(max / a);
      const b = randomInt(minOp, Math.max(minOp, bMax), rng);
      if (a * b > max) return null;
      return makeEquation(a, b, '×');
    }
    case '/': {
      // Pick divisor (>= 2) and quotient (>= 2), derive a = quotient * divisor
      const sqrtMax = Math.floor(Math.sqrt(max));
      const minOp = Math.min(2, sqrtMax);
      const divisor = randomInt(minOp, sqrtMax, rng);
      const quotientMax = Math.floor(max / divisor);
      if (quotientMax < minOp) return null;
      const quotient = randomInt(minOp, quotientMax, rng);
      const a = quotient * divisor;
      if (a > max) return null;
      return makeEquation(a, divisor, '/');
    }
  }
}

function compute(a: number, b: number, op: MathOperator): number {
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '/': return a / b;
  }
}

function makeEquation(a: number, b: number, op: MathOperator): Equation {
  return {
    operands: [a, b],
    operators: [op],
    correctAnswer: compute(a, b, op),
    displayString: `${a} ${op} ${b}`,
  };
}

export function evaluateEquation(eq: Equation): number {
  let result = eq.operands[0];
  for (let i = 0; i < eq.operators.length; i++) {
    result = compute(result, eq.operands[i + 1], eq.operators[i]);
  }
  return result;
}
