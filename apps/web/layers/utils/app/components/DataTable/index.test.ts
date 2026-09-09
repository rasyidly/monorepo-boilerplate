import { describe, expect, it } from 'vitest'
import { autoLabel, orderToPairs, removePath, setSortPath } from './index'

describe('autoLabel', () => {
  it('splits camelCase into spaced capitalized words', () => {
    expect(autoLabel('birthDate')).toBe('Birth Date')
    expect(autoLabel('profileName')).toBe('Profile Name')
    expect(autoLabel('phone')).toBe('Phone')
  })
})

describe('sort helpers (Prisma orderBy array)', () => {
  it('flattens nested entries into dotted pairs', () => {
    expect(orderToPairs([{ author: { name: 'asc' } }, { content: 'desc' }]))
      .toEqual([
        { field: 'author.name', direction: 'asc' },
        { field: 'content', direction: 'desc' }
      ])
  })

  it('appends a new path as a single-key entry', () => {
    expect(setSortPath([], ['author', 'name'], 'desc')).toEqual([{ author: { name: 'desc' } }])
  })

  it('replaces an existing path in place', () => {
    const entries = [{ author: { name: 'asc' } }, { content: 'asc' }]
    expect(setSortPath(entries, ['author', 'name'], 'desc'))
      .toEqual([{ author: { name: 'desc' } }, { content: 'asc' }])
  })

  it('removes a matching path keeping the rest', () => {
    const entries = [{ author: { name: 'asc' } }, { content: 'asc' }]
    expect(removePath(entries, ['author', 'name'])).toEqual([{ content: 'asc' }])
  })
})
