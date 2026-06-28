---
title: Engineering Handbook
version: 1.0
status: Active
owner: Jasmin Smith
related:
  - ROOTSYNC_CONSTITUTION.md
  - ROOTSYNC_PRODUCT_BIBLE.md
  - 04_ARCHITECTURE.md
  - governance/
---

# RootSync Engineering Handbook

Welcome to the RootSync engineering team.

Whether you're a human developer or an AI assistant, this handbook explains how software is built within RootSync.

---

# Engineering Philosophy

We optimize for:

- Simplicity
- Maintainability
- Reusability
- Long-term thinking
- Community impact

Every feature should strengthen local living.

---

# Platform Ownership Philosophy

RootSync owns the user experience, business rules, and platform workflow.

Whenever possible, RootSync should integrate with best-in-class infrastructure rather than rebuilding commodity services.

Examples include:

- Stripe for payment processing
- Google Calendar and Google Meet for scheduling and virtual meetings
- Resend for transactional email
- PostgreSQL as the source of truth for platform data

External services provide infrastructure.

RootSync provides the intelligence, orchestration, workflow, and user experience.

When evaluating a new feature, prefer integrating mature infrastructure over rebuilding functionality that already exists unless doing so creates a strategic advantage for RootSync.

Technology should be replaceable.

Business logic should not.

---

# Read Before Coding

Always review:

1. RootSync Constitution
2. Product Bible
3. Business Rules
4. Architecture
5. Design System
6. Domain Model
7. Relevant PRD

before implementing a feature.

---

# Development Workflow

Idea

↓

RFC (Request for Comments)

↓

PRD (Product Requirements Document)

↓

Implementation Plan

↓

Development

↓

Testing

↓

ADR (Architecture Decision Record)

↓

Release

↓

Changelog

---

# Before Writing Code

Understand the existing implementation.

Prefer extending existing systems over creating new ones.

Reuse components whenever possible.

Avoid duplicate functionality.

Ask:

"Can this become a reusable platform capability?"

---

# Coding Standards

- Small, focused components
- Modular architecture
- RESTful APIs
- PostgreSQL as source of truth
- UUID primary keys
- Type safety
- Mobile-first
- Accessibility first
- Clear naming

---

# Definition of Done

A feature is complete when:

✓ Requirements satisfied

✓ Tests pass

✓ Mobile verified

✓ Documentation updated

✓ ADR created (if applicable)

✓ Changelog updated

✓ Reviewed against the Constitution

---

# AI Development Guidelines

AI is an engineering partner.

AI should:

- Read documentation first
- Plan before coding
- Explain reasoning
- Reuse existing code
- Avoid unnecessary dependencies
- Recommend the simplest scalable solution

AI should never assume undocumented behavior.

---

# Git Workflow

Current

main

Future

main

↓

develop

↓

feature branches

↓

release branches

↓

main

Hotfixes should branch directly from main.

---

# Documentation-Driven Development

Documentation guides implementation.

Documentation should be updated before or alongside major features.

If documentation and code disagree, resolve the discrepancy before continuing.

---

# Release Philosophy

RootSync uses Semantic Versioning.

Major:

1.0.0

Minor:

1.1.0

Patch:

1.1.1

Every release should include:

- Release Notes
- Updated Changelog
- Updated Documentation

---

# New Concepts 

If a new platform concept requires a new word, update 17_GLOSSARY.md before implementing the feature.

---

# Engineering Principles

Build platforms, not one-off features.

Leave the codebase better than you found it.

Prefer clarity over cleverness.

Think in systems.

Protect the long-term vision of RootSync.

---

---

## Additional Engineering Principles

### Documentation Drives Implementation

Documentation is a first-class part of the RootSync codebase.

Significant features should be documented before or alongside implementation. Documentation should guide engineering decisions, not simply describe completed work.

When documentation and implementation disagree, resolve the discrepancy before continuing.

---

### PostgreSQL Is the Source of Truth

RootSync owns its business data.

PostgreSQL is the authoritative source for all platform data, including users, vendors, listings, bookings, orders, messages, and business workflows.

Third-party services should never become the source of truth.

---

### RootSync Owns the Workflow

RootSync owns the platform experience, business rules, and orchestration.

Whenever practical, RootSync should integrate with best-in-class infrastructure rather than rebuilding commodity services.

Examples include:

- Stripe for payment processing
- Google Calendar and Google Meet for scheduling
- Resend for transactional email
- OpenStreetMap for mapping

These services provide infrastructure.

RootSync provides the intelligence, workflow, business rules, and user experience.

Technology should be replaceable.

Business logic should remain platform-owned.

---

### Reuse Before Creating

Before creating a new component, service, utility, or abstraction:

- Look for an existing solution.
- Extend existing capabilities when appropriate.
- Avoid duplicate functionality.

Consistency creates maintainability.

---

### Optimize for Simplicity

Choose the simplest solution that satisfies today's requirements while preserving a clean path for future growth.

Avoid premature optimization and unnecessary complexity.

Simple systems scale better than complicated ones.

---

### The RootSync Test

Every significant engineering decision should be able to answer **Yes** to the following questions:

- Does this make local living easier?
- Does this strengthen communities?
- Does this align with the RootSync Constitution and Product Bible?
- Can it be explained simply?
- Does it create long-term value?

If the answer is **No**, reconsider the implementation.