import type { WorkflowEngine } from '../WorkflowEngine'
import { resolveTemplate, resolveRecipients, extractTemplateVars } from '../utils/resolveTemplate'

export interface NotificationNodeConfig {
  channel: 'email' | 'app' | 'sms'
  recipients: string[]
  subject?: string
  template: string
  templateId?: string
}

export class NotificationNode {
  async execute(config: NotificationNodeConfig, engine: WorkflowEngine): Promise<void> {
    const ctx = engine.getContext()
    engine.clearLastError()

    try {
      const body = resolveTemplate(config.template, ctx.variables)
      const recipients = resolveRecipients(config.recipients, ctx.variables)

      const result = await engine.getAdapter().sendNotification(
        {
          channel: config.channel,
          recipients,
          subject: config.subject
            ? resolveTemplate(config.subject, ctx.variables)
            : undefined,
          body,
          templateId: config.templateId,
          templateVars: extractTemplateVars(ctx.variables),
        },
        ctx
      )

      engine.setVariable('notification_result', result)
      engine.setVariable('notification_success', result.success)

      if (!result.success) {
        engine.setLastError(`Notification failed — recipients: ${result.failedRecipients?.join(', ')}`)
      }
    } catch (err) {
      engine.setLastError(err)
      engine.setVariable('notification_success', false)
      throw err
    }
  }

  // Used by recipient picker UI — resolves real users from host app
  async resolveUsers(query: string | undefined, engine: WorkflowEngine) {
    const ctx = engine.getContext()
    return engine.getAdapter().resolveUsers(query, ctx)
  }
}
