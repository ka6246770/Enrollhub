import { useTheme } from '../hooks/useTheme.js'

const SUN = 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.42-1.42M4.92 19.08l1.42-1.42m11.32 0 1.42 1.42M4.92 4.92l1.42 1.42M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'
const MOON = 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z'

// One button, two states. It is a switch rather than a menu because there are
// only two themes; screen readers hear the action it will perform.
export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      aria-label={label}
      aria-pressed={isDark}
      className={`grid size-10 shrink-0 place-items-center rounded-full border border-white/25 text-night-ink transition-colors hover:border-white/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none min-[760px]:size-9 ${className}`}
      onClick={toggleTheme}
      title={label}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="size-[17px] stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path d={isDark ? SUN : MOON} />
      </svg>
    </button>
  )
}

export default ThemeToggle
