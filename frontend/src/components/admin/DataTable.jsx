// Reusable dashboard table. Columns describe their own header and cell, so the
// registrations and message-log tables share one implementation.
//
// A column can set `rowHeader: true` to render its cell as a row header
// (`<th scope="row">`) for screen readers.
export function DataTable({
  caption,
  columns,
  rows,
  getRowKey,
  minWidth = 'min-w-[640px]',
  textSize = 'text-xs',
  cellClass = 'px-4 py-3',
  emptyMessage = 'No data.',
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className={`w-full ${minWidth} border-collapse text-left ${textSize}`}>
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-page text-[9px] uppercase tracking-wide text-muted">
          <tr>
            {columns.map((column) => (
              <th className={`${cellClass} font-bold`} key={column.key} scope="col">{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t border-line" key={getRowKey(row)}>
              {columns.map((column) => {
                const Cell = column.rowHeader ? 'th' : 'td'
                return (
                  <Cell
                    className={`${cellClass} ${column.className ?? ''}`}
                    key={column.key}
                    scope={column.rowHeader ? 'row' : undefined}
                  >
                    {column.cell(row)}
                  </Cell>
                )
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-8 text-center text-muted" colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
