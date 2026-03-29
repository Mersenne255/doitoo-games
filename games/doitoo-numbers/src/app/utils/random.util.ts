/**
 * Generates an array of random single-digit strings.
 *
 * @param length - The number of random digits to generate
 * @returns An array of random digit strings ('0'-'9')
 */
export function generateRandomDigits(length: number): string[] {
  if (length <= 0) {
    return [];
  }

  return Array.from({ length }, () =>
    Math.floor(Math.random() * 10).toString()
  );
}
