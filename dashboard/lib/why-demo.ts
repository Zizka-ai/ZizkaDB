import { postEvent, type LogEventResult } from './api'

/** Agent id used by `zizkadb demo` and README quickstart. */
export const WHY_DEMO_AGENT = 'support-bot'

export type WhyDemoStep = {
  event: string
  data: Record<string, unknown>
  parentKey?: 'user' | 'reply'
}

/** Ordered steps for the support-order-delay causal chain (matches sdk demo_run.py). */
export const WHY_DEMO_STEPS: WhyDemoStep[] = [
  { event: 'user_message', data: { text: 'Why was my order delayed?' } },
  { event: 'llm_response', data: { model: 'gpt-4o', tokens: 412 }, parentKey: 'user' },
  {
    event: 'tool_call',
    data: { tool: 'lookup_order', order_id: 'ORD-8842' },
    parentKey: 'reply',
  },
]

/**
 * Log the 3-step causal demo chain via POST /v1/events.
 * Returns the leaf event_id (tool_call) for opening the Why panel.
 */
export async function seedWhyDemo(token: string, agent: string): Promise<string> {
  const ids: { user?: string; reply?: string } = {}

  for (const step of WHY_DEMO_STEPS) {
    let parent_id: string | undefined
    if (step.parentKey === 'user') parent_id = ids.user
    if (step.parentKey === 'reply') parent_id = ids.reply

    const res: LogEventResult = await postEvent(token, {
      agent,
      event: step.event,
      data: step.data,
      parent_id,
    })

    if (step.event === 'user_message') ids.user = res.event_id
    if (step.event === 'llm_response') ids.reply = res.event_id
    if (step.event === 'tool_call') return res.event_id
  }

  throw new Error('Why demo did not produce a leaf event')
}
