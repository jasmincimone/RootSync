import Link from "next/link";

import { Container } from "@/components/Container";

export const metadata = {
  title: "Terms and conditions",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-fix-heading">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-fix-text-muted">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
          RootSync / TFC Terms and Conditions
        </h1>
        <p className="mt-3 text-sm text-fix-text-muted">Effective date: 4/22/2026</p>
        <p className="mt-1 text-sm text-fix-text-muted">
          Website: rootsync.io
        </p>

        <Section title="1. Overview">
          <p>
            Welcome to RootSync (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or
            &ldquo;us&rdquo;). These Terms and Conditions govern your use of our website, products,
            services, and digital platform.
          </p>
          <p>By accessing or using our services, you agree to be bound by these Terms.</p>
          <p>If you do not agree, do not use the platform.</p>
        </Section>

        <Section title="2. What We Offer">
          <p>RootSync provides:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Physical products (seed kits, books, self-care items, etc.)</li>
            <li>Educational content (guides, workshops, digital resources)</li>
            <li>Community-driven marketplace features (via RootSync)</li>
            <li>AI-powered tools and recommendations for growers and consumers</li>
          </ul>
          <p>RootSync is a platform that connects:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Growers</li>
            <li>Vendors</li>
            <li>Consumers</li>
            <li>Educators</li>
          </ul>
        </Section>

        <Section title="3. User Accounts">
          <p>You may be required to create an account to access certain features.</p>
          <p>You agree to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Provide accurate information</li>
            <li>Maintain confidentiality of your login credentials</li>
            <li>Accept responsibility for all activity under your account</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
        </Section>

        <Section title="4. Marketplace and Vendor Disclaimer">
          <p>RootSync may allow third-party vendors to list products or services.</p>
          <p>We:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Do not guarantee the quality, safety, or legality of vendor offerings</li>
            <li>Are not responsible for transactions between users and vendors</li>
            <li>Do not assume liability for disputes</li>
          </ul>
          <p>Users engage with vendors at their own risk.</p>
        </Section>

        <Section title="5. Payments and Purchases">
          <p>All purchases are subject to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Availability</li>
            <li>Pricing accuracy</li>
            <li>Payment processing terms (via third-party providers)</li>
          </ul>
          <p>We reserve the right to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Refuse or cancel orders</li>
            <li>Adjust pricing at any time</li>
          </ul>
          <p>Refund policies will be clearly stated on product pages.</p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>All content on this site&mdash;including:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Branding</li>
            <li>Logos</li>
            <li>Text</li>
            <li>Graphics</li>
            <li>Software</li>
          </ul>
          <p>is owned by RootSync, Inc. or licensed to us.</p>
          <p>You may not:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Copy</li>
            <li>Reproduce</li>
            <li>Resell</li>
            <li>Distribute</li>
          </ul>
          <p>without written permission.</p>
        </Section>

        <Section title="7. AI and Informational Disclaimer">
          <p>RootSync may provide AI-generated recommendations related to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Gardening</li>
            <li>Farming</li>
            <li>Nutrition</li>
            <li>Business operations</li>
          </ul>
          <p>These are for informational purposes only and should not be considered:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Professional agricultural advice</li>
            <li>Medical advice</li>
            <li>Financial advice</li>
          </ul>
          <p>Use discretion and consult professionals when needed.</p>
        </Section>

        <Section title="8. Acceptable Use">
          <p>You agree NOT to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Use the platform for illegal purposes</li>
            <li>Upload harmful or malicious content</li>
            <li>Attempt to hack, disrupt, or reverse-engineer the platform</li>
            <li>Harass or harm other users</li>
          </ul>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>To the fullest extent permitted by law:</p>
          <p>RootSync is not liable for:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Indirect or incidental damages</li>
            <li>Loss of profits or data</li>
            <li>Issues arising from third-party vendors</li>
          </ul>
          <p>Use of the platform is at your own risk.</p>
        </Section>

        <Section title="10. Termination">
          <p>We reserve the right to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Suspend or terminate access at any time</li>
            <li>Remove content or listings that violate our policies</li>
          </ul>
        </Section>

        <Section title="11. Changes to Terms">
          <p>We may update these Terms at any time.</p>
          <p>Continued use of the platform means acceptance of updates.</p>
        </Section>

        <Section title="12. Contact">
          <p>For questions, contact: rootsync@rootsync.io</p>
        </Section>

        <div className="mt-10 border-t border-fix-border/15 pt-6 text-sm text-fix-text-muted">
          Related pages:{" "}
          <Link href="/privacy" className="text-fix-link hover:text-fix-link-hover">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link href="/vendor-agreement" className="text-fix-link hover:text-fix-link-hover">
            Vendor Agreement
          </Link>{" "}
          ·{" "}
          <Link href="/seller-terms" className="text-fix-link hover:text-fix-link-hover">
            Seller Terms
          </Link>{" "}
          ·{" "}
          <Link href="/disclaimer" className="text-fix-link hover:text-fix-link-hover">
            Disclaimer
          </Link>{" "}
          ·{" "}
          <Link href="/ai-disclaimer" className="text-fix-link hover:text-fix-link-hover">
            AI Tool Disclaimer
          </Link>
        </div>
      </div>
    </Container>
  );
}

