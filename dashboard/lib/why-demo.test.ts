import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WHY_DEMO_STEPS, seedWhyDemo } from './why-demo'

vi.mock('./api', () => ({
  postEvent: vi.fn(),
}))

import { postEvent } from './api'

describe('WHY_DEMO_STEPS', () => {
  it('defines a 3-step causal chain', () => {
    expect(WHY_DEMO_STEPS).toHaveLength(3)
    expect(WHY_DEMO_STEPS[0].event).toBe('user_message')
    expect(WHY_DEMO_STEPS[2].parentKey).toBe('reply')
  })
})

describe('seedWhyDemo', () => {
  beforeEach(() => {
    vi.mocked(postEvent).mockReset()
  })

  it('posts events in order with parent links', async () => {
    vi.mocked(postEvent)
      .mockResolvedValueOnce({ event_id: 'u1', timestamp: '', sequence_no: 1 })
      .mockResolvedValueOnce({ event_id: 'r1', timestamp: '', sequence_no: 2 })
      .mockResolvedValueOnce({ event_id: 't1', timestamp: '', sequence_no: 3 })

    const leaf = await seedWhyDemo('tok', 'support-bot')

    expect(leaf).toBe('t1')
    expect(postEvent).toHaveBeenCalledTimes(3)
    expect(postEvent).toHaveBeenNthCalledWith(1, 'tok', {
      agent: 'support-bot',
      event: 'user_message',
      data: { text: 'Why was my order delayed?' },
      parent_id: undefined,
    })
    expect(postEvent).toHaveBeenNthCalledWith(2, 'tok', {
      agent: 'support-bot',
      event: 'llm_response',
      data: { model: 'gpt-4o', tokens: 412 },
      parent_id: 'u1',
    })
    expect(postEvent).toHaveBeenNthCalledWith(3, 'tok', {
      agent: 'support-bot',
      event: 'tool_call',
      data: { tool: 'lookup_order', order_id: 'ORD-8842' },
      parent_id: 'r1',
    })
  })
})
