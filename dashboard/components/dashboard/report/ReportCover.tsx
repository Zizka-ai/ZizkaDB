'use client'

import { format } from 'date-fns'
import type { ReportPayload } from '@/lib/api'

/**
 * Print-only cover page. Hidden on screen (`.report-cover` → display:none in
 * globals.css) and revealed with a page break only when printing.
 */
export function ReportCover({ report, periodLabel }: { report: ReportPayload; periodLabel: string }) {
  const p = report.period
  return (
    <div className="report-cover" aria-hidden="true">
      <div className="report-cover__brand">ZizkaDB</div>
      <div className="report-cover__title">AI Agent Report</div>
      <div className="report-cover__agent">{report.agent}</div>
      <dl className="report-cover__meta">
        <div>
          <dt>Period</dt>
          <dd>{periodLabel}</dd>
        </div>
        <div>
          <dt>Range (UTC)</dt>
          <dd>
            {format(new Date(p.from), 'MMM d, yyyy')} — {format(new Date(p.to), 'MMM d, yyyy')}
          </dd>
        </div>
        <div>
          <dt>Generated</dt>
          <dd>{format(new Date(report.generated_at), 'MMM d, yyyy HH:mm')} UTC</dd>
        </div>
        <div>
          <dt>Report version</dt>
          <dd>v{report.report_version}</dd>
        </div>
      </dl>
    </div>
  )
}
