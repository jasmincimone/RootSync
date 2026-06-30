import { Container } from "@/components/Container";

export const metadata = {
  title: "Vendor agreement",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-fix-heading">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-fix-text-muted">{children}</div>
    </section>
  );
}

export default function VendorAgreementPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
          RootSync Vendor Agreement
        </h1>
        <p className="mt-3 text-sm text-fix-text-muted">Effective date: 4/22/2026</p>
        <p className="mt-1 text-sm text-fix-text-muted">Platform: RootSync</p>
        <p className="mt-3 text-sm leading-relaxed text-fix-text-muted">
          This Vendor Agreement (&ldquo;Agreement&rdquo;) is entered into between RootSync, Inc. /
          RootSync (&ldquo;Platform,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) and the individual or
          entity registering as a vendor (&ldquo;Vendor,&rdquo; &ldquo;you&rdquo;). By creating a vendor
          account or listing products/services, you agree to these terms.
        </p>

        <Section title="1. Purpose of the Platform">
          <p>RootSync is a marketplace and community platform that enables Vendors to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>List and sell products (plants, produce, goods, tools, etc.)</li>
            <li>Offer services (consulting, gardening, education, etc.)</li>
            <li>Connect with customers and community members</li>
          </ul>
          <p>We provide the infrastructure, not the underlying goods or services.</p>
        </Section>

        <Section title="2. Vendor Eligibility">
          <p>To use RootSync as a Vendor, you must:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Be at least 18 years old</li>
            <li>Provide accurate business and contact information</li>
            <li>Have the legal right to sell your products/services</li>
            <li>Comply with all local, state, and federal laws</li>
          </ul>
        </Section>

        <Section title="3. Vendor Responsibilities">
          <p className="font-medium text-fix-heading">Product and Service Integrity</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Accurate descriptions, pricing, and images</li>
            <li>Product safety and quality</li>
            <li>Compliance with agricultural, food, and consumer safety laws</li>
          </ul>
          <p className="font-medium text-fix-heading">Fulfillment</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Shipping, delivery, or service execution</li>
            <li>Timely order processing</li>
            <li>Handling returns, refunds, and customer service</li>
          </ul>
          <p className="font-medium text-fix-heading">Legal Compliance</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Licenses, permits, and certifications</li>
            <li>Sales tax collection (if applicable)</li>
            <li>Compliance with cottage food laws, farm sales laws, etc.</li>
          </ul>
        </Section>

        <Section title="4. Prohibited Products and Activities">
          <p>You may not sell or promote:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Illegal goods or substances</li>
            <li>Unsafe or contaminated food/products</li>
            <li>Misleading or false claims (especially health claims)</li>
            <li>Stolen or counterfeit items</li>
            <li>Anything that violates platform values or applicable laws</li>
          </ul>
          <p>We reserve the right to remove listings at our discretion.</p>
        </Section>

        <Section title="5. Marketplace Structure and Transactions">
          <p>RootSync may operate in multiple ways, including:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Direct vendor-to-customer transactions</li>
            <li>External payment links</li>
            <li>Integrated checkout (current or future)</li>
          </ul>
          <p>Important:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>The Platform is not the seller of record</li>
            <li>
              Vendors are fully responsible for transactions unless explicitly stated otherwise
            </li>
          </ul>
        </Section>

        <Section title="6. Fees and Payments">
          <p>[Customize this based on your model]</p>
          <p>Examples:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Commission per sale: ___%</li>
            <li>Listing fees: $___</li>
            <li>Subscription tiers (if applicable)</li>
          </ul>
          <p>We reserve the right to modify fees with notice.</p>
        </Section>

        <Section title="7. Intellectual Property">
          <p>You retain ownership of your:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Product images</li>
            <li>Branding</li>
            <li>Content</li>
          </ul>
          <p>
            However, by listing on RootSync, you grant us a non-exclusive, royalty-free license to:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Display</li>
            <li>Market</li>
            <li>Promote your listings and brand</li>
          </ul>
        </Section>

        <Section title="8. Platform Rights">
          <p>We reserve the right to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Remove listings</li>
            <li>Suspend or terminate vendor accounts</li>
            <li>Moderate content</li>
            <li>Update platform features and policies</li>
          </ul>
        </Section>

        <Section title="9. Reviews and Reputation">
          <p>Customers may leave reviews.</p>
          <p>You agree:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Not to manipulate reviews</li>
            <li>Not to harass or retaliate against customers</li>
          </ul>
          <p>We may remove fraudulent or abusive reviews.</p>
        </Section>

        <Section title="10. Liability and Risk">
          <p>You agree that:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>You are solely responsible for your products/services</li>
            <li>
              The Platform is not liable for product issues, customer disputes, or delivery failures
            </li>
          </ul>
        </Section>

        <Section title="11. Indemnification">
          <p>
            You agree to indemnify and hold harmless RootSync, Inc. from legal claims,
            damages, and losses arising from your products, services, or business practices.
          </p>
        </Section>

        <Section title="12. Termination">
          <p>We may terminate this Agreement at any time.</p>
          <p>Upon termination:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Listings may be removed</li>
            <li>Access revoked</li>
          </ul>
          <p>You remain responsible for fulfilling existing orders.</p>
        </Section>

        <Section title="13. Changes to Agreement">
          <p>We may update this Agreement at any time.</p>
          <p>Continued use means acceptance of updates.</p>
        </Section>

        <Section title="14. Contact">
          <p>rootsync@rootsync.io</p>
        </Section>
      </div>
    </Container>
  );
}
