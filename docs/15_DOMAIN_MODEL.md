---
title: Domain Model
version: 1.0
status: Active
owner: Jasmin Smith
related:
  - ROOTSYNC_CONSTITUTION.md
  - ROOTSYNC_PRODUCT_BIBLE.md
  - 03_BUSINESS_RULES.md
  - 05_DATABASE_SCHEMA.md
---

# RootSync Domain Model

## Purpose

The Domain Model defines the primary business entities that make up the RootSync platform.

This document is implementation-independent.

It describes concepts, relationships, and business meaning rather than database tables or API endpoints.

---

# Platform Hierarchy

Visitor

↓

Member

↓

Vendor

↓

Offerings

↓

Listings

↓

Products
Services
Resources
Events

---

# Core Entities

## Visitor

A Visitor has not created a RootSync account.

Visitors may:

- Browse public content
- View Vendors
- View Directory Listings
- Search Discover
- View Products, Services, Resources, and Events

Visitors may NOT:

- Purchase
- Book Services
- Message Vendors
- Leave Reviews
- Save Favorites
- Claim Listings

---

## Member

A Member has a RootSync account.

Members may:

- Purchase Listings
- Book Services
- Message Vendors
- Participate in Community
- Follow Vendors
- Save Favorites
- Leave Reviews

Every Vendor is also a Member.

---

## Vendor

A Vendor is a verified Member who offers goods and/or services.

Vendors may:

- Create Offerings
- Publish Listings
- Receive Payments
- Receive Bookings
- Receive Messages
- Manage Storefront

---

## Offering

An Offering is an internal object managed by a Vendor.

Offerings may exist in one of several states:

- Draft
- Scheduled
- Active
- Paused
- Archived

Offerings become public when published as Listings.

---

## Listing

A Listing is a publicly discoverable Offering.

Listing Types:

- Product
- Service
- Resource
- Event

Every Listing belongs to exactly one Vendor.

---

## Product

A physical good.

Examples:

- Books
- Seed Kits
- Plants
- Handmade Goods

---

## Service

A service performed by a Vendor.

Service Types:

- Consultation
- One-Time Service
- Subscription Service

Examples:

- Garden Consultation
- Raised Bed Installation
- Weekly Garden Maintenance

---

## Resource

A digital product.

Examples:

- eBooks
- Build Plans
- Guides
- Templates
- Courses

---

## Event

A scheduled activity with optional ticket tiers (variants) and attendance mode:

- In person (venue / address)
- Digital via Google Meet (platform calendar)
- Digital via external host link (Whova, Cvent, Zoom, etc.)

Examples:

- Farmers Market
- Workshop
- Class
- Community Event

---

## Directory Listing

A public listing imported from external sources.

Directory Listings:

- Are not Vendors
- Cannot receive messages
- Cannot receive payments
- May be claimed by business owners

---

# Relationships

Visitor

↓

Member

↓

Vendor

↓

Offerings

↓

Listings

↓

Products | Services | Resources | Events

Directory Listings exist alongside Vendor Listings until claimed.

---

# Guiding Principles

Every entity should have one clear responsibility.

Relationships should be intuitive.

The Domain Model should evolve slowly and intentionally.

Changes should be documented through an ADR (Architecture Decision Record) when they alter core platform concepts.