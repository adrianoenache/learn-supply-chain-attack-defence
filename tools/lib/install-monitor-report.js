#!/usr/bin/env node
'use strict'

// Report formatter for the lifecycle process monitor.
//
// Converts raw process events into a readable Markdown report or a structured
// JSON document. The formatter is intentionally free of external dependencies
// so it can be copied into target projects by install-defences.js.

function formatDuration(ms) {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatTimestamp(iso) {
  if (!iso) return '—'
  return iso.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
}

function countByLabel(events, label) {
  return events.filter((e) => e.labels.includes(label)).length
}

function buildSummary(monitoredCommand, events, monitoredExitCode, durationMs) {
  return {
    monitoredCommand,
    generatedAt: new Date().toISOString(),
    totalEvents: events.length,
    lifecycleEvents: countByLabel(events, 'lifecycle'),
    shellEvents: countByLabel(events, 'shell'),
    networkEvents: countByLabel(events, 'network'),
    permissionEvents: countByLabel(events, 'permission'),
    filesystemWriteEvents: countByLabel(events, 'filesystem-write'),
    nativeBuildEvents: countByLabel(events, 'native-build'),
    monitoredExitCode: monitoredExitCode ?? null,
    durationMs: durationMs ?? null,
  }
}

function buildMarkdownReport(
  monitoredCommand,
  events,
  monitoredExitCode,
  durationMs,
) {
  const summary = buildSummary(
    monitoredCommand,
    events,
    monitoredExitCode,
    durationMs,
  )

  const lines = []
  lines.push('# Lifecycle Process Monitor Report')
  lines.push('')
  lines.push(`- **Monitored command**: \`${summary.monitoredCommand}\``)
  lines.push(`- **Generated at**: ${formatTimestamp(summary.generatedAt)}`)
  lines.push(`- **Total events**: ${summary.totalEvents}`)
  lines.push(`- **Monitored exit code**: ${summary.monitoredExitCode ?? '—'}`)
  lines.push(`- **Monitored duration**: ${formatDuration(summary.durationMs)}`)
  lines.push('')
  lines.push('## Risk summary')
  lines.push('')
  lines.push(`| Risk label | Count |`)
  lines.push(`| --- | --- |`)
  lines.push(`| Lifecycle scripts | ${summary.lifecycleEvents} |`)
  lines.push(`| Shell invocations | ${summary.shellEvents} |`)
  lines.push(`| Network access | ${summary.networkEvents} |`)
  lines.push(`| Permission changes | ${summary.permissionEvents} |`)
  lines.push(`| Filesystem writes | ${summary.filesystemWriteEvents} |`)
  lines.push(`| Native builds | ${summary.nativeBuildEvents} |`)
  lines.push('')

  if (events.length === 0) {
    lines.push('## Events')
    lines.push('')
    lines.push('No child processes were recorded while monitoring was active.')
    lines.push('')
  } else {
    lines.push('## Events')
    lines.push('')
    lines.push(
      '| Time | Command | Args | Lifecycle | Labels | PID | Exit | Duration |',
    )
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |')
    for (const event of events) {
      const time = formatTimestamp(event.timestamp)
      const cmd = event.command || '—'
      const args = event.argsSummary || '—'
      const lifecycle = event.lifecycleEvent || '—'
      const labels = event.labels.join(', ') || '—'
      const pid = event.pid ?? '—'
      const exit = event.signal
        ? `signal ${event.signal}`
        : (event.exitCode ?? '—')
      const dur = formatDuration(event.durationMs)
      lines.push(
        `| ${time} | \`${cmd}\` | ${args} | ${lifecycle} | ${labels} | ${pid} | ${exit} | ${dur} |`,
      )
    }
    lines.push('')
  }

  lines.push('## Recommendations')
  lines.push('')
  if (summary.lifecycleEvents > 0) {
    lines.push(
      '- Lifecycle scripts were spawned. Ensure `.npmrc` has `ignore-scripts=true` or that each script was manually reviewed.',
    )
  }
  if (summary.networkEvents > 0) {
    lines.push(
      '- Network activity was detected. Verify that no unexpected outbound connections were made during install.',
    )
  }
  if (summary.permissionEvents > 0) {
    lines.push(
      '- Permission/ownership changes were detected. Review whether these are required for the package to function.',
    )
  }
  if (summary.nativeBuildEvents > 0) {
    lines.push(
      '- Native compilation was detected. Expect platform-specific artifacts and consider reproducibility implications.',
    )
  }
  if (
    summary.lifecycleEvents === 0 &&
    summary.networkEvents === 0 &&
    summary.permissionEvents === 0 &&
    summary.nativeBuildEvents === 0
  ) {
    lines.push('- No high-risk patterns detected in the recorded events.')
  }
  lines.push('')

  return lines.join('\n')
}

function buildJsonReport(
  monitoredCommand,
  events,
  monitoredExitCode,
  durationMs,
) {
  const summary = buildSummary(
    monitoredCommand,
    events,
    monitoredExitCode,
    durationMs,
  )
  return JSON.stringify(
    {
      summary,
      events,
    },
    null,
    2,
  )
}

module.exports = {
  buildMarkdownReport,
  buildJsonReport,
  buildSummary,
  formatDuration,
  formatTimestamp,
}
