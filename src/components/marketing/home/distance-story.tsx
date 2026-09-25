import { Eyebrow } from "@/components/ui/section";
import { distancesToChennai } from "@/data/demo";
import { cn } from "@/lib/utils/cn";

const questions = [
  { area: "Property", question: "Who checks it?" },
  { area: "Maintenance", question: "Who handles it?" },
  { area: "Documents", question: "Who follows up?" },
  { area: "Family", question: "Who can help locally?" },
  { area: "Property transactions", question: "Who represents your interests?" },
];

const path = [
  { title: "A property needs attention", body: "A small leak. A vacant plot. A tenant with a request." },
  { title: "Someone needs to inspect it", body: "In person, soon — not on your next trip home." },
  { title: "A repair needs approval", body: "What will it cost, and who will do the work?" },
  { title: "You need visibility", body: "Proof that it was done, from wherever you are." },
];

/** Problem section: one editorial composition instead of five equal cards. */
export function DistanceStory() {
  return (
    <section aria-labelledby="problem-title" className="py-20 sm:py-28 lg:py-36">
      <div className="container-page grid gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24">
        <div>
          <Eyebrow>The challenge</Eyebrow>
          <h2 id="problem-title" className="text-display mt-5 text-[2rem] leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
            <span className="block">Thousands of miles away.</span> <span className="block text-ink-subtle">Local problems don&apos;t wait.</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg text-ink-muted">
            A property can need attention even when you&apos;re thousands of miles away. A small leak becomes a repair. A vacant plot
            needs inspection. A tenant needs assistance. A document needs attention. And finding someone you trust locally can be
            difficult.
          </p>
          <dl className="mt-10 divide-y divide-line-subtle border-y border-line-subtle">
            {questions.map((q) => (
              <div key={q.area} className="grid grid-cols-[minmax(0,9.5rem)_1fr] items-baseline gap-4 py-3.5 sm:grid-cols-[12rem_1fr]">
                <dt className="text-label text-ink-subtle">{q.area}</dt>
                <dd className="text-lg font-medium tracking-tight text-ink">{q.question}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ol aria-label="How a small problem unfolds when you live abroad" className="relative self-center">
          <span aria-hidden className="absolute top-3 bottom-3 left-[0.6875rem] w-px bg-gradient-to-b from-line-strong via-line-strong to-brand" />
          <li className="relative pb-12 pl-12">
            <span aria-hidden className="absolute top-1 left-0 size-6 rounded-full border border-line-strong bg-canvas" />
            <p className="text-label text-ink-subtle">Wherever you are</p>
            <p className="text-display mt-2 text-2xl text-ink sm:text-3xl">Thousands of kilometres from home</p>
            <ul aria-label="Approximate distance to Chennai" className="mt-4 flex flex-wrap gap-2">
              {distancesToChennai.map((d) => (
                <li key={d.city} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-muted">
                  <span className="font-medium text-ink">{d.city}</span> · {d.km} km
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-subtle">Approximate straight-line distance to Chennai.</p>
          </li>
          {path.map((step, i) => {
            const last = i === path.length - 1;
            return (
              <li key={step.title} className={cn("relative pl-12", !last && "pb-10")}>
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1 left-0 flex size-6 items-center justify-center rounded-full border text-[0.625rem] font-semibold tabular-nums",
                    last ? "border-brand bg-brand text-white shadow-[0_0_0_6px_rgb(15_90_79/0.12)]" : "border-line-strong bg-canvas text-ink-subtle",
                  )}
                >
                  {i + 1}
                </span>
                <p className={cn("text-xl font-semibold tracking-tight sm:text-2xl", last ? "text-brand" : "text-ink")}>{step.title}</p>
                <p className="mt-1.5 text-ink-muted">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
