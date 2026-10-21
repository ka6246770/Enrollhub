import { useEffect, useId, useRef } from 'react'

// A small controlled wrapper around the native <dialog> element. Native dialogs
// give us focus trapping, Escape handling, and a real modal layer without a
// dependency. The parent owns the open state; `close` always reports back.
export default function AdminDialog({ open, onClose, title, description, children, footer, wide = false }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={`m-auto max-h-[92vh] overflow-y-auto rounded-xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-night/60 ${wide ? 'w-[min(94vw,880px)]' : 'w-[min(94vw,660px)]'}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-lg font-bold" id={titleId}>{title}</h2>
          {description ? <p className="mt-1 text-xs leading-relaxed text-muted" id={descriptionId}>{description}</p> : null}
        </div>
        <button
          aria-label="Close dialog"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:bg-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
          onClick={onClose}
          type="button"
        >
          <svg aria-hidden="true" className="size-4 stroke-current stroke-[1.8] [stroke-linecap:round]" viewBox="0 0 24 24" fill="none">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="px-5 py-5">{children}</div>
      {footer ? <div className="border-t border-line bg-soft/40 px-5 py-4">{footer}</div> : null}
    </dialog>
  )
}
