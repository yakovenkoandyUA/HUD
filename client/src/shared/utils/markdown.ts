import React from 'react'

export interface MarkdownClassNames {
  section: string
  list:    string
  listItem: string
  spacer:  string
  line:    string
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

/**
 * Легкий markdown-рендерер для AI-відповідей Anthropic — підтримує ## заголовки,
 * списки (- / *), жирний/курсив, пропускає таблиці. Класи стилів передаються
 * ззовні, щоб компонент керував власним CSS Modules.
 */
export function renderMarkdown(md: string, cls: MarkdownClassNames): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let listItems: string[] = []
  let listKey = 0

  const flushList = () => {
    if (listItems.length === 0) return
    nodes.push(
      React.createElement(
        'ul',
        { key: `list-${listKey++}`, className: cls.list },
        listItems.map((item, j) =>
          React.createElement('li', { key: j, className: cls.listItem, dangerouslySetInnerHTML: { __html: applyInline(item) } })
        ),
      )
    )
    listItems = []
  }

  for (const line of md.split('\n')) {
    if (line.trim().startsWith('|')) continue

    if (line.startsWith('## ')) {
      flushList()
      nodes.push(React.createElement('p', { key: nodes.length, className: cls.section }, line.slice(3)))
      continue
    }

    if (line.match(/^[-*] /)) {
      listItems.push(line.slice(2))
      continue
    }

    flushList()

    if (line.trim() === '' || line.trim() === '—' || line.trim() === '--') {
      nodes.push(React.createElement('div', { key: nodes.length, className: cls.spacer }))
      continue
    }

    nodes.push(React.createElement('p', { key: nodes.length, className: cls.line, dangerouslySetInnerHTML: { __html: applyInline(line) } }))
  }

  flushList()
  return nodes
}
