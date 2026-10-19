import { Link } from 'react-router-dom'

// The microphone mark used by the public header, the dashboard sidebar, and
// the sign-in screen, so the logo stays identical everywhere.
export function MicMark({ className = 'size-9' }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-[10px] bg-brand text-white ${className}`}>
      <svg
        aria-hidden="true"
        className="size-[55%] stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
        viewBox="0 0 24 24"
        fill="none"
      >
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4m-3 0h6" />
      </svg>
    </span>
  )
}

export function Brand() {
  return (
    <Link className="inline-flex items-center gap-2.5 text-sm font-bold no-underline text-ink" to="/">
      <MicMark className="size-8" />
      <span>[YOUR BRAND]</span>
    </Link>
  )
}

export default Brand
