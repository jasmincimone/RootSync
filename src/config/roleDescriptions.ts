/**
 * Role copy aligned with docs/17_GLOSSARY.md (Member, Vendor) and live platform features.
 */
export type PlatformRole = "member" | "vendor";

export type RoleDescription = {
  title: string;
  intro: string;
  privileges: string[];
  footnote?: string;
};

export const ROLE_DESCRIPTIONS: Record<PlatformRole, RoleDescription> = {
  member: {
    title: "RootSync Member",
    intro:
      "A registered account for anyone who wants to discover, support, and participate in local communities on RootSync.",
    privileges: [
      "Purchase Products and Resources from verified Vendors on Discover",
      "Book Services — consultations, sessions, and appointments with scheduling and Google Meet links",
      "Join Pulse to ask questions, share knowledge, and support one another",
      "Use Stay Synced to talk with Vendors and other Members",
      "Track orders, bookings, and account settings in one place",
    ],
    footnote:
      "Visitors can browse public Listings and Vendor profiles. Members can purchase, book, use Stay Synced, and participate in Pulse.",
  },
  vendor: {
    title: "RootSync Vendor",
    intro:
      "A verified Member approved to offer Products, Services, Resources, and Events. Every Vendor is also a Member.",
    privileges: [
      "Publish Listings on Discover — Products, Services, Resources, and Events",
      "Public Vendor profile with bio, map location, and media carousel",
      "Accept payments through Stripe Connect or optional payment links per Listing",
      "Manage orders and Service bookings from your vendor dashboard",
      "Configure bookable Services — availability, variants, pricing, and intake questions",
    ],
    footnote:
      "Apply with your business details. An Administrator reviews your application before you appear as a verified Vendor on Discover.",
  },
};
