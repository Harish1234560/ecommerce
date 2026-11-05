import { Fragment, type ReactNode } from 'react';

// Minimal, safe markdown: ## headings, - lists, **bold**, paragraphs. Renders React nodes (no raw HTML).
export function Markdown({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="font-semibold text-stone-900">{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`l${blocks.length}`} className="list-disc space-y-1.5 pl-5 marker:text-stone-400">
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('- ')) {
      list.push(line.slice(2));
      continue;
    }
    flush();
    if (!line) continue;
    if (line.startsWith('## ')) blocks.push(<h2 key={blocks.length} className="pt-4 text-lg font-bold text-stone-900 first:pt-0">{line.slice(3)}</h2>);
    else if (line.startsWith('# ')) blocks.push(<h2 key={blocks.length} className="pt-4 text-xl font-bold text-stone-900 first:pt-0">{line.slice(2)}</h2>);
    else blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="space-y-3 text-[15px] leading-7 text-stone-600">{blocks}</div>;
}
