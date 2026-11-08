import { FileText } from 'lucide-react'
import { Container } from '../ui/Container'

/** Plantilla para documentos legales con índice lateral. */
export default function LegalDocument({ eyebrow, title, intro, updated, sections }) {
  return (
    <section className="bg-surface pt-28 pb-20 sm:pt-32">
      <Container>
        <div className="mx-auto max-w-5xl">
          <p className="flex items-center gap-2 text-sm font-semibold text-electric">
            <FileText className="size-4" aria-hidden /> {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">Última actualización: {updated}</p>

          <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
            <nav aria-label="Contenido" className="lg:sticky lg:top-28 lg:self-start">
              <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">Contenido</p>
              <ol className="flex flex-col gap-1.5 text-sm">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="block rounded-lg px-2 py-1 text-muted transition hover:bg-white hover:text-electric">
                      {i + 1}. {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <article className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-10">
              {intro && <div className="mb-8 leading-relaxed text-muted">{intro}</div>}
              <div className="flex flex-col gap-9">
                {sections.map((s, i) => (
                  <section key={s.id} id={s.id} className="scroll-mt-28">
                    <h2 className="text-lg font-bold text-ink">
                      {i + 1}. {s.title}
                    </h2>
                    <div className="legal-body mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-muted [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
                      {s.content}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          </div>
        </div>
      </Container>
    </section>
  )
}
