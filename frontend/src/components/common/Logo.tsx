interface LogoProps {
  className?: string;
}

/**
 * The ResumeAI mark: a geometric R on a modular grid, its top-right corner cut
 * as a page fold, with the counter knocked straight out of the stem.
 *
 * Drawn in `currentColor` and with no ground of its own, so it takes the
 * colour of whatever it sits in. The version that needs its own background —
 * the favicon and the app icons — lives in public/logo.svg and public/icons.
 */
export const Logo = ({ className = "" }: LogoProps) => (
  <svg
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="ResumeAI"
  >
    <g transform="translate(5.35 2.67) scale(0.889)">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M9 6h17l7 7v8.5a6.5 6.5 0 0 1-6.5 6.5h-2.2L33 42h-8.4l-8.4-14H16v14H9z M16 13v8h8.5a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z"
      />
    </g>
  </svg>
);
