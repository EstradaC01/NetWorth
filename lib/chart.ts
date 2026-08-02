/**
 * Pure SVG path helpers.
 *
 * The prototype's versions produced NaN on small datasets, which React
 * renders happily into the `d` attribute and the browser then fails to draw,
 * with no error:
 *
 *   - `x = (i / (n - 1)) * W` divides by zero for a single point, emitting
 *     "MNaN 150.0".
 *   - `Math.min(...[])` is `Infinity` and `Math.max(...[])` is `-Infinity`,
 *     so the prototype's `(hi - lo) * 0.15 || 1` fallback evaluates to
 *     `-Infinity` — `||` does not catch it, because `-Infinity` is truthy.
 *
 * With a portfolio that starts empty, both are reachable on day one.
 */

export type Extent = { lo: number; hi: number }

/** Min/max over values, with a usable band when the data is empty or flat. */
export function extent(values: number[], padFactor = 0.15): Extent {
  const finite = values.filter(Number.isFinite)
  if (finite.length === 0) return { lo: 0, hi: 1 }

  let lo = Math.min(...finite)
  let hi = Math.max(...finite)

  if (lo === hi) {
    // A flat line would divide by a zero span. Give it room proportional to
    // the value, falling back to ±1 at exactly zero.
    const pad = Math.abs(lo) * padFactor || 1
    return { lo: lo - pad, hi: hi + pad }
  }

  const pad = (hi - lo) * padFactor
  lo -= pad
  hi += pad
  return { lo, hi }
}

/**
 * Builds an SVG path. Returns '' for empty input and a flat two-point line
 * for a single point, so the `d` attribute is always valid.
 */
export function path(
  values: number[],
  W: number,
  H: number,
  lo: number,
  hi: number,
  pad: number
): string {
  const n = values.length
  if (n === 0) return ''

  const span = hi - lo || 1
  const y = (v: number) => {
    const raw = H - pad - ((v - lo) / span) * (H - pad * 2)
    return Number.isFinite(raw) ? raw : H / 2
  }

  // One point has no horizontal extent to interpolate across; draw it as a
  // flat line spanning the width so the user sees their single reading.
  if (n === 1) {
    const only = y(values[0]).toFixed(1)
    return `M0 ${only} L${W.toFixed(1)} ${only}`
  }

  return values
    .map((v, i) => {
      const x = (i / (n - 1)) * W
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y(v).toFixed(1)
    })
    .join(' ')
}

/** X position of index `i` in a series of `n` points, in viewBox units. */
export function xAt(i: number, n: number, W: number): number {
  if (n <= 1) return W / 2
  return (i / (n - 1)) * W
}

/** Evenly spaced horizontal gridlines. */
export function gridLines(H: number, fractions: number[]) {
  return fractions.map((f) => ({ y: (H * f).toFixed(0) }))
}
