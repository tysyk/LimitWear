export default function Home() {
  return (
    <section className="hero">
      <p className="eyebrow">Limited edition streetwear platform</p>
      <h1>Речі, які не стають масовими.</h1>
      <p className="hero-copy">
        LimitWear об&apos;єднує незалежних дизайнерів і людей, які обирають
        лімітовані колекції. Платформа готується до запуску.
      </p>
      <div className="status-card" aria-label="Статус розробки">
        <span className="status-dot" aria-hidden="true" />
        <div>
          <strong>Frontend foundation ready</strong>
          <span>Next.js · TypeScript · App Router</span>
        </div>
      </div>
    </section>
  );
}
