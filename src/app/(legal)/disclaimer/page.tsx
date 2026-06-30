import { Container } from "@/components/Container";

export const metadata = {
  title: "Disclaimer",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-fix-heading">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-fix-text-muted">{children}</div>
    </section>
  );
}

export default function DisclaimerPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
          Disclaimer
        </h1>
        <p className="mt-3 text-sm text-fix-text-muted">Effective date: 4/22/2026</p>
        <p className="mt-1 text-sm text-fix-text-muted">Website: RootSync.io </p>

        <Section title="1. General Information Disclaimer">
          <p>
            The information provided by RootSync, Inc. (&ldquo;we,&rdquo;
            &ldquo;our,&rdquo; &ldquo;us&rdquo;) is for educational and informational purposes only.
          </p>
          <p>Nothing on this website, platform, or associated content should be considered:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Professional agricultural advice</li>
            <li>Medical or health advice</li>
            <li>Financial or business advice</li>
            <li>Legal advice</li>
          </ul>
          <p>
            Always consult a qualified professional before making decisions based on information from
            this platform.
          </p>
        </Section>

        <Section title="2. Agricultural and Gardening Disclaimer">
          <p>Our content, products, and tools may include guidance related to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Growing food</li>
            <li>Soil health</li>
            <li>Pest control</li>
            <li>Crop planning</li>
          </ul>
          <p>However:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Results may vary based on climate, soil, skill level, and environmental conditions
            </li>
            <li>We do not guarantee crop success, yields, or outcomes</li>
          </ul>
          <p>You assume full responsibility for your growing practices and results.</p>
        </Section>

        <Section title="3. Health and Herbal Disclaimer">
          <p>Some content and products may relate to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Herbs</li>
            <li>Natural remedies</li>
            <li>Nutritional suggestions</li>
          </ul>
          <p>These are not evaluated by the FDA and are not intended to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Diagnose</li>
            <li>Treat</li>
            <li>Cure</li>
            <li>Prevent any disease</li>
          </ul>
          <p>
            Always consult a licensed healthcare provider before using herbs, supplements, or making
            health-related decisions.
          </p>
        </Section>

        <Section title="4. Product Use Disclaimer">
          <p>All physical products (including kits, seeds, and materials):</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Must be used as directed</li>
            <li>Should be handled responsibly</li>
          </ul>
          <p>We are not liable for:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Misuse of products</li>
            <li>Allergic reactions</li>
            <li>Improper handling or storage</li>
          </ul>
        </Section>

        <Section title="5. Marketplace Disclaimer (RootSync)">
          <p>RootSync is a platform connecting vendors and customers.</p>
          <p>We:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Do not manufacture most listed products</li>
            <li>Do not control vendor operations</li>
            <li>Do not guarantee product quality, safety, or legality</li>
          </ul>
          <p>All transactions between users and vendors are conducted at your own risk.</p>
        </Section>

        <Section title="6. External Links Disclaimer">
          <p>Our website may contain links to third-party websites.</p>
          <p>We do not:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Control their content</li>
            <li>Guarantee their accuracy</li>
            <li>Accept responsibility for their practices</li>
          </ul>
        </Section>

        <Section title="7. Earnings and Business Disclaimer">
          <p>Any references to income, sales, or business success are examples only.</p>
          <p>We do not guarantee:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Financial success</li>
            <li>Business outcomes</li>
            <li>Profitability</li>
          </ul>
          <p>Your results depend on your effort, strategy, and market conditions.</p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>To the fullest extent permitted by law:</p>
          <p>RootSync, Inc. is not liable for:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Any losses or damages arising from use of the platform</li>
            <li>Reliance on information provided</li>
            <li>Third-party products or services</li>
          </ul>
          <p>Use of the platform is at your own risk.</p>
        </Section>

        <Section title="9. Contact">
          <p>For questions about this Disclaimer: rootsync@rootsync.io</p>
        </Section>
      </div>
    </Container>
  );
}
