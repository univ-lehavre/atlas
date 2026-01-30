# Atlas Verify - User Guide

Welcome to Atlas Verify, the platform for managing your bibliographic profile.

## Why Use Atlas Verify?

As a researcher, you face several challenges:

- **Data dispersion**: Your publications are scattered across OpenAlex, Google Scholar, HAL, ORCID, ResearchGate...
- **Attribution errors**: Namesakes may be confused with you
- **Incomplete profile**: Some publications are not correctly linked to your profile
- **Inconsistent affiliations**: Your institutional history varies across sources

Atlas Verify automatically aggregates your data from 15+ bibliographic sources and allows you to validate, correct, and enrich them.

## Main Features

### 1. Publication Verification

Confirm or reject publications attributed to you:

- "This is my article" - Confirm the attribution
- "This is not me" - Report an attribution error (namesake)
- "I'm not sure" - Mark for later review
- "This is a duplicate" - Merge multiple versions

> **Detailed documentation**: [Publication Verification](./verify-publications.md)

### 2. Career Profile

Visualize and correct your institutional history:

- Timeline of your affiliations (universities, laboratories)
- Automatic detection of missing periods
- Manual addition of undetected affiliations

> **Detailed documentation**: [Manage Your Career](./manage-career.md)

### 3. Expertise Profile

Discover your areas of expertise as identified by your publications:

- Mapping of your research topics
- Evolution of your expertise over time
- Identification of thematic pivots

> **Detailed documentation**: [Your Expertise Profile](./expertise-profile.md)

### 4. Collaboration Network

Explore your co-author network:

- Visualization of your collaborations
- Identification of recurring collaborators
- International collaboration statistics

> **Detailed documentation**: [Collaboration Network](./collaboration-network.md)

## Getting Started

### Step 1: Sign in with ORCID

Atlas Verify uses ORCID as the primary identifier. Sign in with your ORCID to:

- Securely authenticate your identity
- Automatically import your publications linked to ORCID
- Synchronize your validations to ORCID

### Step 2: Automatic Import

Once signed in, Atlas Verify automatically searches for your publications in:

| Source | Description |
|--------|-------------|
| **OpenAlex** | Global database of 240M+ academic publications |
| **Crossref** | Official DOI metadata from publishers |
| **HAL** | French open archive |
| **ArXiv** | Preprints in physics, mathematics, computer science |
| **ORCID** | Publications linked to your ORCID profile |
| **Semantic Scholar** | Publications with AI analysis |

### Step 3: Verification

Review the publications found and validate them one by one or in batches.

## Frequently Asked Questions

### How does automatic detection work?

Atlas Verify uses several criteria to associate you with a publication:

1. **ORCID**: If your ORCID is present in the publication -> very high confidence
2. **Institutional email**: Match with your email -> high confidence
3. **Name + Affiliation**: Your name associated with your institution -> good confidence
4. **Co-author network**: Co-authors you have already validated -> medium confidence

### Is my data secure?

- Your decisions are stored securely
- You can export your data at any time
- No data is shared without your consent

### Can I export my publications?

Yes, you can export your verified publications in:
- BibTeX
- RIS
- JSON
- CSV

## What Developers Are Building

Atlas Verify is developed as open source. Developers are working on:

- **Automatic aggregation**: Connection to 15+ bibliographic databases
- **Matching algorithms**: Artificial intelligence to detect namesakes
- **Career reconstruction**: Cross-referencing sources to reconstruct your history
- **Expertise analysis**: Automatic detection of your research domains

> See the [technical documentation](../dev/) to understand how it works.

## Support

- **General Atlas documentation**: [Back to home](../../)
- **Data sources**: [Source catalog](./sources.md)
- **Technical documentation**: [Developer guide](../dev/)
