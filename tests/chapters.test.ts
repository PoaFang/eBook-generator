import { describe, expect, it } from 'vitest'
import { groupPagesIntoChapters } from '../src/shared/chapters'

describe('groupPagesIntoChapters', () => {
  it('puts every page in its own chapter when every page has a chapterTitle', () => {
    const chapters = groupPagesIntoChapters([
      { id: 'a', text: 'A', chapterTitle: 'Chapter 1' },
      { id: 'b', text: 'B', chapterTitle: 'Chapter 2' }
    ])
    expect(chapters).toEqual([
      { title: 'Chapter 1', text: 'A' },
      { title: 'Chapter 2', text: 'B' }
    ])
  })

  it('merges pages with no chapterTitle into the preceding chapter', () => {
    const chapters = groupPagesIntoChapters([
      { id: 'a', text: 'Intro', chapterTitle: 'Chapter 1' },
      { id: 'b', text: 'continued' },
      { id: 'c', text: 'still continued' },
      { id: 'd', text: 'New part', chapterTitle: 'Chapter 2' }
    ])
    expect(chapters).toEqual([
      { title: 'Chapter 1', text: 'Intro\n\ncontinued\n\nstill continued' },
      { title: 'Chapter 2', text: 'New part' }
    ])
  })

  it('treats the first page as starting chapter 1 even without an explicit title', () => {
    const chapters = groupPagesIntoChapters([
      { id: 'a', text: 'no title yet' },
      { id: 'b', text: 'more' }
    ])
    expect(chapters).toEqual([{ title: undefined, text: 'no title yet\n\nmore' }])
  })

  it('returns an empty array for no pages', () => {
    expect(groupPagesIntoChapters([])).toEqual([])
  })

  it('does not insert a leading separator when the chapter starts with empty text', () => {
    const chapters = groupPagesIntoChapters([
      { id: 'a', text: '', chapterTitle: 'Chapter 1' },
      { id: 'b', text: 'first real content' }
    ])
    expect(chapters).toEqual([{ title: 'Chapter 1', text: 'first real content' }])
  })
})
