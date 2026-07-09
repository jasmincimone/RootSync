import { Container } from "@/components/Container";

export const metadata = {
  title: "AI tool disclaimer",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-fix-heading">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-fix-text-muted">{children}</div>
    </section>
  );
}

export default function AiDisclaimerPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
          AI Tool Disclaimer (RootSync Assistant)
        </h1>
        <p className="mt-3 text-sm text-fix-text-muted">Effective date: 4/22/2026</p>

        <Section title="1. AI Nature of the Tool">
          <p>
            The RootSense AI Assistant (&ldquo;AI Tool&rdquo;) is powered by artificial intelligence
            and is designed to:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Provide recommendations</li>
            <li>Assist with gardening, farming, and planning</li>
            <li>Offer general guidance</li>
          </ul>
          <p>
            Responses are generated automatically and may not always be accurate, complete, or up to
            date.
          </p>
        </Section>

        <Section title="2. No Professional Advice">
          <p>The AI Tool does not provide:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Medical advice</li>
            <li>Agricultural certification guidance</li>
            <li>Financial or legal advice</li>
          </ul>
          <p>Any decisions you make based on AI output are your sole responsibility.</p>
        </Section>

        <Section title="3. Use at Your Own Risk">
          <p>You agree that:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>You will use discretion when relying on AI responses</li>
            <li>You will verify critical information independently</li>
          </ul>
          <p>We are not liable for:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Errors or omissions</li>
            <li>Outcomes resulting from AI-generated suggestions</li>
          </ul>
        </Section>

        <Section title="4. No Guarantees">
          <p>We do not guarantee:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Accuracy of recommendations</li>
            <li>Crop success</li>
            <li>Business results</li>
            <li>Health outcomes</li>
          </ul>
        </Section>

        <Section title="5. User Responsibility">
          <p>You are responsible for:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>How you interpret AI responses</li>
            <li>Actions taken based on recommendations</li>
            <li>Compliance with laws and regulations</li>
          </ul>
        </Section>

        <Section title="6. Continuous Improvement">
          <p>The AI Tool is continuously evolving.</p>
          <p>We may:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Update or modify its functionality</li>
            <li>Improve accuracy over time</li>
          </ul>
        </Section>

        <Section title="7. Data Usage">
          <p>Interactions with the AI Tool may be used to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Improve performance</li>
            <li>Enhance user experience</li>
          </ul>
          <p>(Handled in accordance with our Privacy Policy)</p>
        </Section>

        <Section title="8. Contact">
          <p>For questions regarding the AI Tool: rootsync@rootsync.io</p>
        </Section>
      </div>
    </Container>
  );
}
