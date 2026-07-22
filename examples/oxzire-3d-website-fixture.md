# Validation Fixture — Oxzire 3D Website

The executable canonical fixture is `src/domain/project/fixtures.ts` as `oxzire3dWebsiteFixture`. It is validated when imported and contains field-level evidence, confidence, criticality, approval, lifecycle, version, assumption, and decision metadata.

## Structured Scenario

```yaml
identity:
  name: Oxzire 3D Website
  project_type: website
business:
  primary_goal: Generate qualified creative-production enquiries
  target_users:
    - Brand and agency producers
    - Creative directors
product:
  core_flows:
    - Portfolio to enquiry
    - Localized case-study publishing
  required_capabilities:
    - Adaptive 3D hero with static fallback
    - Captioned video case studies
    - Localized CMS content
quality:
  localization: [English, Bahasa Indonesia]
  performance: LCP at or below 2.5 seconds at p75
  accessibility: WCAG 2.2 AA with reduced-motion support
technical:
  architecture: Server-rendered content with isolated progressive 3D enhancement
  deployment: Vercel with CMS-hosted content and optimized media
```

This scenario exercises complete-master-prompt handling, mobile and media fallbacks, bilingual content, dark/light presentation, CMS ownership, visual exclusions, and zero-question eligibility without replacing the executable fixture.

## Deterministic Extraction Variant

The extraction regression suite also covers this mixed-language form of the same scenario:

```text
Oxzire ke liye mobile first website bnana hai. Hamara goal qualified creative-production enquiries generate krna hai.
Features: adaptive 3D hero, captioned video case studies, localized CMS
Design: cinematic, premium, editorial, dark mode and light mode
Languages: English, Bhasa Indonesia
Later: real-time 3D configurator
Must not remove the static WebGL fallback.
```

The hardened extractor must normalize obvious aliases, keep the later configurator outside current features, preserve the fallback prohibition, and retain original evidence wording.
