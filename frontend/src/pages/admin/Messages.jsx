import { useCallback, useState } from 'react'
import { AdminLayout, PageHeading } from '../../components/admin/AdminLayout.jsx'
import DataTable from '../../components/admin/DataTable.jsx'
import { StatusBadge } from '../../components/admin/StatusBadge.jsx'
import { TemplateEditor } from '../../components/admin/TemplateEditor.jsx'
import { useAsyncResource } from '../../hooks/useAsyncResource.js'
import { formatDateTime } from '../../lib/format.js'
import { outlineButton } from '../../lib/ui.js'
import { fetchMessageStatus, fetchMessages, isBackendEnabled, retryMessage, saveMessageTemplate } from '../../services/api.js'

const MESSAGE_FILTERS = ['All', 'Delivered', 'Failed', 'Skipped']

// Human labels for the log's machine values.
const TYPE_LABELS = {
  owner_registration: 'Owner alert (with voice file)',
  owner_email: 'Owner alert (email copy)',
  owner_voice: 'Voice recording',
  customer_confirmation: 'Customer confirmation',
  contacted: 'Application review email',
  offered: 'Place offered email',
  accepted: 'Place confirmed email',
  rejected: 'Not selected email',
  waitlist: 'Waitlist alert',
  waitlist_offer: 'Waitlist place offered',
  waitlist_accepted: 'Waitlist place confirmed',
  contact: 'Contact message',
  second_person: 'Forwarded to second person',
  second_person_voice: 'Voice note to second person',
  retry: 'Retry attempt',
}

const CHANNEL_LABELS = { telegram: 'Telegram', email: 'Email', whatsapp: 'WhatsApp', system: 'System' }

const STATUS_TONES = { failed: 'danger', skipped: 'warning', delivered: 'neutral' }

function buildColumns(onRetry, pendingId) {
  return [
    { key: 'recipient', header: 'Recipient', className: 'font-bold', cell: (message) => message.recipient ?? '—' },
    {
      key: 'message',
      header: 'Message',
      className: 'max-w-[320px] break-words',
      cell: (message) => `${TYPE_LABELS[message.type] ?? message.type} · ${CHANNEL_LABELS[message.channel] ?? message.channel}`,
    },
    { key: 'time', header: 'Time', className: 'whitespace-nowrap', cell: (message) => message.time ?? formatDateTime(message.createdAt) },
    {
      key: 'status',
      header: 'Status',
      cell: (message) => (
        <StatusBadge className="capitalize" tone={STATUS_TONES[message.status] ?? 'neutral'}>{message.status}</StatusBadge>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      cell: (message) => (message.status === 'delivered'
        ? '—'
        : (
          <button
            className={`${outlineButton} px-2.5 py-1 text-[10px]`}
            disabled={pendingId === message.id}
            onClick={() => onRetry(message)}
            title={message.error ?? undefined}
            type="button"
          >
            {pendingId === message.id ? 'Retrying…' : 'Retry'}
          </button>
          )),
    },
  ]
}

export default function Messages() {
  const { data: messages, reload, loading, error } = useAsyncResource(useCallback(() => fetchMessages(), []))
  const { data: status, error: statusError } = useAsyncResource(useCallback(() => fetchMessageStatus(), []))
  const [filter, setFilter] = useState('All')
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [pendingId, setPendingId] = useState(0)

  const rows = messages ?? []
  const visible = rows.filter((message) => filter === 'All' || message.status.toLowerCase() === filter.toLowerCase())

  async function handleRetry(message) {
    setNotice('')
    setActionError('')
    setPendingId(message.id)
    try {
      await retryMessage(message.id)
      setNotice(`Retried the message to ${message.recipient ?? 'the recipient'}.`)
      await reload()
    } catch (retryError) {
      setActionError(retryError.message || 'Could not retry that message.')
    } finally {
      setPendingId(0)
    }
  }

  const channels = status?.channels ?? {}
  const templates = status?.templates ?? []
  const sample = status?.sample ?? {}

  // The 8 texts fall into two groups the owner thinks about differently: what
  // customers receive, and what lands on the owner's phone. Grouping them keeps
  // the grid from reading as eight identical cards.
  const templateGroups = [
    { channel: 'email', title: 'Email to customers', items: templates.filter((template) => template.channel === 'email') },
    { channel: 'telegram', title: 'Telegram alerts to you', items: templates.filter((template) => template.channel === 'telegram') },
  ].filter((group) => group.items.length > 0)

  return (
    <AdminLayout active="Messages">
      <PageHeading
        eyebrow="Dashboard"
        title="Messages and templates"
        subtitle={isBackendEnabled ? 'Edit the texts the site sends, and check what was delivered.' : 'Preview data — no backend is configured.'}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {['telegram', 'email'].map((channel) => (
          <StatusBadge key={channel} tone={channels[channel] ? 'brand' : 'warning'}>
            {CHANNEL_LABELS[channel]}: {channels[channel] ? 'configured' : 'not configured'}
          </StatusBadge>
        ))}
      </div>

      {notice ? <p className="mt-4 rounded-lg bg-soft p-3 text-xs font-semibold text-brand-text" role="status">{notice}</p> : null}
      {actionError ? <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{actionError}</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{error}</p> : null}

      <section className="mt-5">
        <h2 className="text-base font-bold">Message texts</h2>
        <p className="mt-1 text-[11px] text-muted">
          Saved here and used for the next message the site sends — no restart and no code change needed.
        </p>
        {statusError ? (
          <p className="mt-4 rounded-lg bg-coral p-3 text-xs font-semibold text-coral-ink" role="alert">{statusError}</p>
        ) : templateGroups.length > 0 ? (
          <div className="mt-4 space-y-6">
            {templateGroups.map((group) => (
              <section key={group.channel}>
                <h3 className="text-xs font-bold text-ink">
                  {group.title}
                  <span className="ml-2 font-normal text-muted">{group.items.length}</span>
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-4 max-[1000px]:grid-cols-1">
                  {group.items.map((template) => (
                    <TemplateEditor key={template.key} onSave={saveMessageTemplate} sample={sample} template={template} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-muted">Loading message texts…</p>
        )}
      </section>

      <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Message log</h2>
          <div className="flex gap-1.5">
            {MESSAGE_FILTERS.map((choice) => (
              <button
                aria-pressed={filter === choice}
                className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none ${filter === choice ? 'bg-brand text-white' : 'bg-surface text-muted hover:bg-soft'}`}
                key={choice}
                onClick={() => setFilter(choice)}
                type="button"
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
        <DataTable
          caption="Message log"
          columns={buildColumns(handleRetry, pendingId)}
          emptyMessage={loading ? 'Loading…' : 'No messages in this view.'}
          getRowKey={(message) => message.id}
          minWidth="min-w-[760px]"
          rows={visible}
        />
        <p className="mt-3 text-[10px] text-muted">
          “Skipped” means the channel was not configured when the message was sent — set the Telegram token or Resend key in <code className="rounded bg-page px-1">backend/.env</code>, then use Retry.
        </p>
      </section>
    </AdminLayout>
  )
}
