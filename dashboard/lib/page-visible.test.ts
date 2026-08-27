import { describe, expect, it } from 'vitest'
import { isDocumentVisible } from './page-visible'

describe('isDocumentVisible', () => {
  it('is true when visibilityState is visible', () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    expect(isDocumentVisible()).toBe(true)
  })

  it('is false when the tab is hidden', () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    expect(isDocumentVisible()).toBe(false)
  })
})
