export function resolveTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, path: string) => {
    const val = path.split('.').reduce((obj: unknown, key: string) => {
      if (obj !== null && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[key]
      }
      return undefined
    }, variables as unknown)
    return val !== undefined ? String(val) : `{{${path}}}`
  })
}

export function extractTemplateVars(
  variables: Record<string, unknown>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(variables)) {
    if (v !== null && v !== undefined && typeof v !== 'object') {
      result[k] = String(v)
    }
  }
  return result
}

export function resolveRecipients(
  recipients: string[],
  variables: Record<string, unknown>
): string[] {
  return recipients.map(r => resolveTemplate(r, variables)).filter(Boolean)
}
