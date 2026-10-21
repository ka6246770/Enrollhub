import { Link } from 'react-router-dom'

// A packing-box mark. The work on this site is packaging and labeling, and the
// isometric box stays legible at 28px without a wordmark.
export function BrandMark({ className = 'size-9' }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-[3px] bg-accent text-ink ${className}`}>
      <svg
        aria-hidden="true"
        className="size-[62%] stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
        <path d="M4 8.5 12 13l8-4.5M12 13v7" />
      </svg>
    </span>
  )
}

export function Brand({ className = '' }) {
  return (
    <Link className={`inline-flex items-center gap-2.5 no-underline ${className}`} to="/">
      <BrandMark className="size-8" />
      <span className="text-[15px] font-extrabold tracking-[-0.015em] text-white">AL-TAYEB</span>
    </Link>
  )
}

export default Brand
