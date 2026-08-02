/**
 * The NetWorth mark.
 *
 * A peso sign inside a ring. The ring is drawn twice: once faint and closed
 * (the whole — everything you are working toward), and once solid from the
 * top clockwise to a terminal dot (how far along you are). That is precisely
 * what the app measures, so the mark says what the product does rather than
 * being a generic finance glyph.
 *
 * The ₱ is built from geometry rather than set as text. A font glyph would
 * depend on the user's stack containing U+20B1 — many do not, and the
 * fallback box would then be the logo. Drawing it also keeps the strokes on
 * the same weight ramp as the ring at every size.
 *
 * Earlier attempts put a full line chart behind the glyph; at 16px the chart
 * collapsed into stray specks and the two elements fought. Containment
 * survives small sizes where an overlay does not.
 *
 * `currentColor` throughout, so one component serves the light header, the
 * dark header and the monochrome favicon with no variants.
 */

export function Logo({
  size = 28,
  title,
}: {
  size?: number
  /** Omit inside an already-labelled link; the adjacent text names it. */
  title?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
      style={{ display: 'block', flex: '0 0 auto', overflow: 'visible' }}
    >
      {/* The whole: a closed ring, held back so it sits behind the mark. */}
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="currentColor"
        strokeWidth="2.2"
        opacity="0.3"
      />

      {/* Progress: an arc from twelve o'clock, ending in the current reading.
          Heavier than the ring so it reads as the foreground of the two. */}
      <path
        d="M16 3 A13 13 0 0 1 27.2 9.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="27.2" cy="9.5" r="2.5" fill="currentColor" />

      {/* ₱ — stem and bowl, then the two bars that separate it from a P.
          Coordinates are tuned for legibility at 16px, where the bars are
          barely over a pixel apart and any less spacing merges them. */}
      <path
        d="M11 22.5 L11 9 L16.2 9 A4.1 4.1 0 0 1 16.2 17.2 L11 17.2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.8 12.1 L19.4 12.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7.8 14.9 L19.4 14.9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
