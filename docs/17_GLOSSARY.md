---
title: RootSync Glossary
version: 1.0
status: Active
owner: Jasmin Smith
last_updated: 2026-06-27
related:
  - ROOTSYNC_CONSTITUTION.md
  - ROOTSYNC_PRODUCT_BIBLE.md
  - 03_BUSINESS_RULES.md
  - 15_DOMAIN_MODEL.md
  - 16_ENGINEERING_HANDBOOK.md
---

# RootSync Glossary

## Purpose

The RootSync Glossary defines the official terminology used throughout the RootSync platform.

This document serves as the single source of truth for platform terminology. Documentation, APIs, database schemas, UI copy, engineering discussions, and future product planning should use these definitions consistently.

---

# Platform

## RootSync

A local-living platform that helps people discover, support, and participate in their local communities through commerce, education, services, events, and community.

---

## RootSync, Inc.

The parent company and umbrella brand that owns and operates RootSync and other initiatives.

---

# User Types

## Visitor

A person browsing RootSync without creating an account.

Visitors may:

- Browse public listings
- Search Discover
- View Vendors
- View Directory Listings

Visitors may not:

- Purchase
- Book Services
- Message Vendors
- Save Favorites
- Leave Reviews
- Claim Listings

---

## Member

A registered RootSync account.

Members may:

- Purchase Listings
- Book Services
- Participate in Community
- Message Vendors
- Follow Vendors
- Save Favorites
- Leave Reviews

---

## Vendor

A verified Member who offers Products, Services, Resources, and/or Events.

Every Vendor is also a Member.

---

## Administrator

A Member responsible for moderating, verifying, supporting, and maintaining the platform.

---

# Marketplace

## Offering

An internal object managed by a Vendor.

Offerings may exist in one of the following states:

- Draft
- Scheduled
- Active
- Paused
- Archived

Offerings become public when published as Listings.

---

## Listing

The public representation of an Offering.

Listing Types include:

- Product
- Service
- Resource
- Event

Every Listing belongs to exactly one Vendor.

---

## Product

A physical good sold by a Vendor.

Examples:

- Books
- Plants
- Seed Kits
- Handmade Goods

---

## Service

Work performed by a Vendor.

Service Types include:

- Consultation
- One-Time Service
- Subscription Service

Examples:

- Garden Consultation
- Raised Bed Installation
- Weekly Garden Maintenance

---

## Consultation

A type of Service intended to evaluate a Member's needs and recommend additional Products or Services.

Consultations are not a standalone platform feature.

They are a specialized Service.

---

## Resource

A digital product.

Examples:

- eBooks
- Build Plans
- Templates
- Guides
- Courses (future)

---

## Event

A scheduled activity hosted by a Vendor or organization.

Examples:

- Farmers Markets
- Workshops
- Classes
- Meetups

---

# Discovery

## Discover

The primary experience for finding local opportunities.

Discover includes:

- Vendors
- Products
- Services
- Resources
- Events
- Directory Listings

---

## Directory Listing

A publicly available business imported from external sources.

Directory Listings:

- Are view-only
- Cannot receive payments
- Cannot receive bookings
- Cannot receive messages
- May be claimed by the business owner

---

## Verified Vendor

A Vendor that has completed RootSync's verification process.

Verified Vendors receive additional trust indicators and platform capabilities.

---

# Community

## Community

The social experience where Members ask questions, share knowledge, and support one another.

---

## Follow

Allows Members to receive updates from Vendors and other Members.

---

## Favorite

A saved Listing, Vendor, or Directory Listing (Members only).

---

## Message

A private conversation between Members.

---

# Commerce

## Stripe Connect

The payment infrastructure used for Vendor onboarding and payouts.

---

## Checkout

The purchasing process for Listings.

---

## Booking

The scheduling and payment process for **Services** on RootSync.

- Member books a time slot → Stripe Checkout → calendar + Google Meet
- Statuses: pending payment, confirmed, completed, cancelled
- Cancellation of paid bookings issues a **full Stripe refund**
- See [19_SERVICE_BOOKINGS.md](./19_SERVICE_BOOKINGS.md)

---

# Pulse (Platform Service)

## Pulse

The foundational contribution signal and permanent activity ledger of RootSync. Pulse represents **contribution**, not points. Every meaningful member action generates Pulse.

Pulse is the heartbeat of the ecosystem.

---

## Individual Pulse

A member's lifetime contribution score, calculated as the sum of their Pulse Events. Individual Pulse **never decreases**.

---

## Platform Pulse

A living health index (0 – 1,000,000) measuring ecosystem vitality. **Not** the sum of all member scores. Calculated from weighted platform metrics.

---

## Pulse Event

An append-only ledger row recording a meaningful contribution. Source of truth for Individual Pulse.

---

## Give a Pulse

The action of reacting to a Pulse post or vendor — replaces "Like" or star ratings.

---

## Activity Trend

A member's recent participation pattern: Increasing, Stable, Quiet, or Returning. Separate from lifetime Pulse score — does not punish inactivity.

---

## Pulse Status

Individual tier based on lifetime Pulse: Emerging, Growing, Rooted, Flourishing, Connected, Canopy.

---

## Platform Status

Ecosystem tier based on Platform Pulse: Awakening, Growing, Rooted, Flourishing, Thriving, Fully Synced.

---

## Stay Synced

RootSync messaging between members and vendors. Formerly Messages / Messenger.

---

# Product Development

## RFC (Request for Comments)

A proposal describing a significant change before implementation.

---

## PRD (Product Requirements Document)

A document describing the business requirements, user stories, functional requirements, technical requirements, and acceptance criteria for a feature.

---

## ADR (Architecture Decision Record)

A document explaining why an important architectural decision was made.

---

## Changelog

A historical record of releases and platform changes.

---

## Semantic Versioning

The versioning strategy used by RootSync.

Examples:

- 1.0.0 — Major Release
- 1.1.0 — Minor Feature Release
- 1.1.1 — Patch Release

---

# Deprecated Terms

| Deprecated | Preferred Term |
|------------|----------------|
| User | Member |
| Seller | Vendor |
| Download | Resource |
| Marketplace Item | Listing |
| Consultation (feature) | Service → Consultation |
| Community (feed) | Pulse |
| Like | Give a Pulse |
| Star rating | Pulse rating |
| Messages | Stay Synced |

---

# Guiding Principle

Words become architecture.

Consistent language creates consistent software.

If a new platform concept requires a new term, update this glossary before implementing the feature.