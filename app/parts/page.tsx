import { ALL_PARTS } from '@/content/parts';

export const metadata = { title: 'Meet your parts | Jumper' };

/**
 * Milestone 1 stub. The full parts glossary, with a drawing of each part and
 * its own detail route, lands in milestone 2 alongside projects 2-5; the
 * content is already in the part records, so this page grows rather than
 * gets rewritten.
 */
export default function PartsPage() {
  return (
    <section className="pt-3">
      <div className="flex items-baseline justify-between gap-5 border-b-2 border-ink pb-3">
        <h2 className="text-[28px] font-extrabold">Meet your parts</h2>
        <p className="text-[15px] text-muted">
          What each part does, how to recognise it, and what to watch out for.
        </p>
      </div>
      <div className="my-6 grid gap-7 sm:grid-cols-2">
        {ALL_PARTS.map((part) => (
          <article key={part.id}>
            <h3 className="mb-1.5 text-xl font-extrabold">{part.name}</h3>
            <dl className="m-0 text-[15px]">
              <dt className="mt-1.5 font-bold">What it does</dt>
              <dd className="m-0 text-muted">{part.glossary.what}</dd>
              <dt className="mt-1.5 font-bold">How to spot it</dt>
              <dd className="m-0 text-muted">{part.glossary.spot}</dd>
              <dt className="mt-1.5 font-bold">Watch out</dt>
              <dd className="m-0 text-muted">{part.glossary.watch}</dd>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
