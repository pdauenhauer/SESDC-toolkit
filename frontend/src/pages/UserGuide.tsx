import { useEffect, useMemo } from 'preact/hooks'
import { marked, Renderer, type Tokens } from 'marked'
import guideMarkdown from '../../../USER-GUIDE.md?raw'
import '../css/userGuide.css'

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const buildRenderer = (): Renderer => {
  const renderer = new Renderer()
  const counts = new Map<string, number>()

  renderer.heading = function heading(this: Renderer, { tokens, depth, text }: Tokens.Heading) {
    const rawText = (text ?? '').trim()
    const base = slugify(rawText)
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    const id = count === 0 ? base : `${base}-${count}`
    const inner = this.parser.parseInline(tokens)
    return `<h${depth} id="${id}" class="guide-heading guide-heading--h${depth}"><a class="guide-anchor" href="#${id}" aria-label="Link to section">#</a>${inner}</h${depth}>\n`
  }

  return renderer
}

function UserGuide() {
  const html = useMemo(() => {
    const renderer = buildRenderer()
    return marked.parse(guideMarkdown, { renderer, async: false }) as string
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash) {
      const id = decodeURIComponent(window.location.hash.slice(1))
      const el = document.getElementById(id)
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'auto', block: 'start' }))
      }
    }
  }, [html])

  return (
    <div class="user-guide-page">
      <article class="user-guide-content" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

export default UserGuide
