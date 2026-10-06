import { Decimal } from 'decimal.js';

// Configure Decimal.js precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/**
 * Converts any number, string, or Prisma.Decimal to Decimal
 */
export function toDecimal(value: string | number | Decimal | { toString(): string } | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }
  return new Decimal(value.toString());
}

/**
 * Formats a gold weight strictly to 3 decimal places (e.g. "125.345", "50.000")
 */
export function formatWeight(
  value: string | number | Decimal | { toString(): string } | null | undefined,
  includeUnit = true
): string {
  const d = toDecimal(value);
  const formatted = d.toFixed(3);
  return includeUnit ? `${formatted} g` : formatted;
}

/**
 * Formats currency (e.g. "₹11,750.00" or "₹11,750")
 */
export function formatCurrency(
  value: string | number | Decimal | { toString(): string } | null | undefined,
  showDecimals = false
): string {
  const d = toDecimal(value);
  const num = d.toNumber();
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);

  return formatted;
}

/**
 * Adds two or more decimal values safely
 */
export function addWeights(...values: (string | number | Decimal | { toString(): string } | null | undefined)[]): Decimal {
  return values.reduce((acc: Decimal, val) => acc.plus(toDecimal(val)), new Decimal(0));
}

/**
 * Subtracts weights safely
 */
export function subtractWeights(
  base: string | number | Decimal | { toString(): string } | null | undefined,
  ...toSubtract: (string | number | Decimal | { toString(): string } | null | undefined)[]
): Decimal {
  let result = toDecimal(base);
  for (const val of toSubtract) {
    result = result.minus(toDecimal(val));
  }
  return result;
}

/**
 * Multiplies weight by rate
 */
export function multiplyWeightByRate(
  weight: string | number | Decimal | { toString(): string } | null | undefined,
  rate: string | number | Decimal | { toString(): string } | null | undefined
): Decimal {
  return toDecimal(weight).times(toDecimal(rate));
}
