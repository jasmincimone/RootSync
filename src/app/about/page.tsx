import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/Container";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = {
  title: "About us",
  description:
    "RootSync connects food, goods, and communities through one unified system for local economies.",
};

export default function AboutPage() {
  return (
    <div>
      <section className="border-b border-fix-border/15">
        <Container className="py-12 sm:py-16">
          <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
            About us
          </h1>
          <div className="mt-5">
            <Image
              src="/images/platform/rootsync/logo.png"
              alt="RootSync"
              width={72}
              height={72}
              className="h-16 w-16 rounded-full object-cover sm:h-[72px] sm:w-[72px]"
            />
          </div>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-fix-text-muted">
            RootSync is building the infrastructure for local economies—connecting food, goods, and
            communities through one unified system. It combines smart planning tools, a local marketplace,
            and community-driven access to help growers and makers stop guessing and start building with
            purpose.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-fix-text-muted">
            Whether you&apos;re producing, selling, or simply looking to buy local, RootSync makes it easier
            to stay connected to what&apos;s happening right where you are.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/rootsync" variant="cta" size="md">
              Enter RootSync
            </ButtonLink>
            <ButtonLink href="/signup" variant="secondary" size="md">
              Join now
            </ButtonLink>
            <Link
              href="/"
              className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium text-fix-link ring-1 ring-fix-border/20 hover:bg-fix-bg-muted"
            >
              Back to home
            </Link>
          </div>

          <h2 className="mt-12 text-3xl font-semibold tracking-tight text-fix-heading sm:mt-16 sm:text-4xl">
            RootSync Demo
          </h2>
          <div className="mt-6 max-w-4xl overflow-hidden rounded-2xl border border-fix-border/15 bg-black shadow-soft">
            <video
              className="aspect-video w-full object-contain"
              controls
              playsInline
              preload="metadata"
            >
              <source src="/videos/RootSyncDemo2026.MP4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </Container>
      </section>
    </div>
  );
}
