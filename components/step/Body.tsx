import { parseBody, railText, type InlineNode } from '@/lib/content/parse-body';

/**
 * Renders token-markup prose.
 *
 * Hole names become chips in the accent colour, which spec 9 reserves for
 * "do this now". Rail references are coloured from theme tokens rather than
 * inline hex, so they stay legible in dark mode.
 */

function Inline({ node }: { node: InlineNode }) {
  switch (node.t) {
    case 'text':
      return <>{node.v}</>;
    case 'bold':
      return <b className="font-bold">{node.v}</b>;
    case 'code':
      return (
        <code className="rounded bg-line/55 px-1.5 py-px font-mono text-[0.88em]">{node.v}</code>
      );
    case 'hole':
      return (
        <span className="whitespace-nowrap rounded-[5px] bg-accent px-1.5 py-px font-mono text-[0.9em] font-semibold text-on-accent">
          {node.name}
        </span>
      );
    case 'rail':
      return (
        <b className={node.sign === '+' ? 'font-bold text-rail-plus' : 'font-bold text-rail-minus'}>
          {railText(node.sign)}
        </b>
      );
  }
}

export function Body({ text, className }: { text: string; className?: string }) {
  const paragraphs = parseBody(text);
  return (
    <div className={className}>
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-3 max-w-[62ch] whitespace-pre-line last:mb-0">
          {p.map((node, j) => (
            <Inline key={j} node={node} />
          ))}
        </p>
      ))}
    </div>
  );
}

/** Single-paragraph variant for tips, why text and checkpoint questions. */
export function InlineText({ text }: { text: string }) {
  const [first = []] = parseBody(text);
  return (
    <>
      {first.map((node, i) => (
        <Inline key={i} node={node} />
      ))}
    </>
  );
}
