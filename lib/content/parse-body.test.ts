import { describe, it, expect } from 'vitest';
import { parseBody, bodyToText, BodyParseError, railText } from './parse-body';

describe('parseBody', () => {
  it('splits paragraphs on blank lines', () => {
    expect(parseBody('one\n\ntwo')).toHaveLength(2);
  });

  it('keeps a single newline inside one paragraph', () => {
    const paras = parseBody('line one\nline two');
    expect(paras).toHaveLength(1);
    expect(bodyToText('line one\nline two')).toBe('line one\nline two');
  });

  it('parses a hole token into its coordinates', () => {
    const [p] = parseBody('into [[e15]] now');
    expect(p).toEqual([
      { t: 'text', v: 'into ' },
      { t: 'hole', name: 'e15', col: 15, row: 'e' },
      { t: 'text', v: ' now' },
    ]);
  });

  it('parses rail tokens', () => {
    const [p] = parseBody('the top [[-rail]] and the bottom [[+rail]]');
    expect(p.filter((n) => n.t === 'rail')).toEqual([
      { t: 'rail', sign: '-' },
      { t: 'rail', sign: '+' },
    ]);
    expect(railText('-')).toBe('blue (−) rail');
  });

  it('parses rail holes such as tn18', () => {
    const [p] = parseBody('[[tn18]]');
    expect(p[0]).toEqual({ t: 'hole', name: 'tn18', col: 18, row: 'tn' });
  });

  it('parses bold and code', () => {
    const [p] = parseBody('press **Upload** then `delay(1000)`');
    expect(p[1]).toEqual({ t: 'bold', v: 'Upload' });
    expect(p[3]).toEqual({ t: 'code', v: 'delay(1000)' });
  });

  // The whole reason for tokens over HTML: a bad hole name is caught, not shipped.
  it('rejects a column past the end of the board', () => {
    expect(() => parseBody('put it in [[e35]]')).toThrow(BodyParseError);
  });

  it('rejects a row letter that does not exist', () => {
    expect(() => parseBody('put it in [[z5]]')).toThrow(BodyParseError);
  });

  it('rejects an unknown bracket token', () => {
    expect(() => parseBody('see [[wat]]')).toThrow(BodyParseError);
  });

  it('accepts both ends of the board', () => {
    expect(() => parseBody('[[a1]] and [[j30]]')).not.toThrow();
  });
});
