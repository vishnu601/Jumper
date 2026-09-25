import { parseHoleName, type Row } from '@/lib/geometry/breadboard';

/**
 * Step bodies are authored in a small token markup rather than HTML, so that
 * every hole name a student is told to use is checked against the real board
 * geometry at build time. A typo like [[e35]] fails the content check instead
 * of rendering as literal text and sending someone to a hole that isn't there.
 *
 *   [[e15]]      a breadboard hole, rendered as a chip
 *   [[+rail]]    "red (+) rail",  coloured from theme tokens
 *   [[-rail]]    "blue (−) rail", coloured from theme tokens
 *   **bold**     emphasis
 *   `code`       inline code
 *   blank line   paragraph break
 *
 * Rail colours come from tokens rather than inline hex, so dark mode works.
 */

export type InlineNode =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'code'; v: string }
  | { t: 'hole'; name: string; col: number; row: Row }
  | { t: 'rail'; sign: '+' | '-' };

export type Paragraph = InlineNode[];

export class BodyParseError extends Error {}

const TOKEN = /\[\[([^\]]+)\]\]|\*\*([^*]+)\*\*|`([^`]+)`/g;

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;

  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) nodes.push({ t: 'text', v: text.slice(last, m.index) });
    last = m.index + m[0].length;

    const [, bracket, bold, code] = m;
    if (bold !== undefined) {
      nodes.push({ t: 'bold', v: bold });
    } else if (code !== undefined) {
      nodes.push({ t: 'code', v: code });
    } else {
      const token = bracket.trim();
      if (token === '+rail' || token === '-rail') {
        nodes.push({ t: 'rail', sign: token[0] as '+' | '-' });
      } else {
        const h = parseHoleName(token);
        if (!h) {
          throw new BodyParseError(
            `"${token}" is not a hole on this breadboard (expected e.g. e15, a1, tn18) or a known token`,
          );
        }
        nodes.push({ t: 'hole', name: token, col: h.col, row: h.row });
      }
    }
  }

  if (last < text.length) nodes.push({ t: 'text', v: text.slice(last) });
  return nodes;
}

/** Parses a body string into paragraphs. Throws BodyParseError on bad tokens. */
export function parseBody(body: string): Paragraph[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map(parseInline);
}

/** Non-throwing form for the content checker. */
export function checkBody(body: string): string[] {
  try {
    parseBody(body);
    return [];
  } catch (e) {
    return [e instanceof Error ? e.message : String(e)];
  }
}

/** The text a rail token renders as. Kept here so parser and UI agree. */
export function railText(sign: '+' | '-'): string {
  return sign === '+' ? 'red (+) rail' : 'blue (−) rail';
}

/** Flattens a body to plain text, for aria-labels and tests. */
export function bodyToText(body: string): string {
  return parseBody(body)
    .map((p) =>
      p
        .map((n) => {
          switch (n.t) {
            case 'hole':
              return n.name;
            case 'rail':
              return railText(n.sign);
            default:
              return n.v;
          }
        })
        .join(''),
    )
    .join('\n\n');
}
