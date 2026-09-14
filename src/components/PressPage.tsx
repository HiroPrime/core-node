export default function PressPage() {
  return (
    <div className="grain-spot">
      <header className="fixed top-0 z-40 flex w-full items-center justify-between bg-[rgba(241,230,210,0.82)] px-5 py-5 backdrop-blur-md sm:px-10">
        <a href="#top" className="press-kicker text-[11px] tracking-[0.32em] uppercase text-[var(--stamp)]">
          Core Node
        </a>
        <nav className="press-kicker flex gap-6 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]">
          <a href="#spark" className="hover:text-[var(--stamp)]">
            Spark
          </a>
          <a href="#imprint" className="hover:text-[var(--stamp)]">
            Imprint
          </a>
        </nav>
      </header>

      <section
        id="top"
        className="relative min-h-[100dvh] overflow-hidden bg-[var(--ink)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/spark-jacket.png"
          alt="Goddess in Disguise"
          className="absolute inset-0 h-full w-full object-cover object-[center_20%] opacity-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--paper)] via-[rgba(243,234,216,0.18)] to-transparent" />

        <div className="relative z-10 flex min-h-[100dvh] flex-col justify-end px-5 pb-14 pt-28 sm:px-10 sm:pb-20">
          <p className="press-kicker text-[11px] uppercase tracking-[0.4em] text-[var(--stamp)]">
            Spark
          </p>
          <h1 className="press-display mt-4 max-w-[12ch] text-[clamp(3.6rem,11vw,8.8rem)] font-semibold leading-[0.86] tracking-[-0.03em] text-[var(--ink)]">
            Goddess in Disguise
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--ink-soft)] sm:text-xl">
            A webtoon. Charlie and Mora. An island that already knows them.
          </p>
        </div>
      </section>

      <section
        id="spark"
        className="relative grid gap-12 px-5 py-24 sm:px-10 sm:py-32 lg:grid-cols-[1.15fr_0.85fr] lg:items-end"
      >
        <div>
          <p className="press-kicker text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]">
            On the shelf
          </p>
          <h2 className="press-display mt-5 text-[clamp(2.6rem,6vw,5.4rem)] font-semibold leading-[0.95]">
            Books we mean to keep.
          </h2>
        </div>
        <p className="max-w-md text-lg leading-relaxed text-[var(--ink-soft)]">
          Quiet rooms. Long stories. One book at a time.
        </p>
      </section>

      <section
        id="imprint"
        className="relative overflow-hidden border-t border-[var(--rule)] px-5 py-24 sm:px-10 sm:py-32"
      >
        <div
          className="pointer-events-none absolute right-[8%] top-16 hidden w-40 rotate-[8deg] bg-[var(--stamp)] px-4 py-5 text-center text-[var(--paper)] sm:block"
          aria-hidden
        >
          <p className="press-kicker text-[10px] uppercase tracking-[0.24em]">
            Imprint
          </p>
          <p className="press-display mt-2 text-base leading-tight">
            BasicHiro
            <br />
            &amp; Mora Fae
          </p>
        </div>

        <p className="press-kicker text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]">
          Created by
        </p>
        <h2 className="press-display mt-6 text-[clamp(3rem,10vw,7.2rem)] font-semibold leading-[0.88] tracking-[-0.03em]">
          BasicHiro
          <br />
          &amp; Mora Fae
        </h2>
      </section>

      <footer className="border-t border-[var(--rule)] px-5 py-16 sm:px-10">
        <p className="press-kicker text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">
          A Nexus Prime company
        </p>
        <p className="mt-5">
          <a
            href="https://nexusprime.nexus"
            className="press-display text-2xl text-[var(--gold)] underline decoration-[var(--rule)] underline-offset-8"
          >
            Nexus Prime
          </a>
        </p>
      </footer>
    </div>
  );
}
