import type { TestSuite } from "../schema";

export const extractionSuite: TestSuite = {
  name: "Extraction Suite",
  description:
    "Tests the deterministic extraction engine with various input formats and languages.",
  cases: [
    {
      name: "english_master_prompt",
      description: "A complete English master prompt with clear sections.",
      engine: "extraction",
      input: {
        sources: [
          {
            sourceId: "source_brief",
            kind: "master_prompt",
            content:
              "Build a SaaS dashboard for monitoring API usage. Users should see real-time metrics, set up alerts, and view usage history. Tech stack: Next.js, PostgreSQL, Tailwind.",
            capturedAt: "2026-07-23T12:00:00.000Z",
          },
        ],
        existingProject: null,
      },
      expectedAssertions: ["completes without error"],
    },
    {
      name: "bahasa_indonesia",
      description: "Input in Bahasa Indonesia to test multilingual extraction.",
      engine: "extraction",
      input: {
        sources: [
          {
            sourceId: "source_brief",
            kind: "master_prompt",
            content:
              "Buat aplikasi mobile untuk tracking pengeluaran harian. Pengguna bisa input pengeluaran, lihat laporan bulanan, dan export ke PDF.",
            capturedAt: "2026-07-23T12:00:00.000Z",
          },
        ],
        existingProject: null,
      },
      expectedAssertions: ["completes without error"],
    },
    {
      name: "roman_urdu_mixed",
      description: "Roman Urdu mixed with English to test code-switching extraction.",
      engine: "extraction",
      input: {
        sources: [
          {
            sourceId: "source_brief",
            kind: "master_prompt",
            content:
              "Mujhe ek website chahiye jahan log apni recipes share kar sakein. Users can upload photos, rate recipes, aur comments kar sakein. Bas authentication bhi chahiye.",
            capturedAt: "2026-07-23T12:00:00.000Z",
          },
        ],
        existingProject: null,
      },
      expectedAssertions: ["completes without error"],
    },
    {
      name: "sectionless_brief",
      description: "A brief without clear sections to test structure detection.",
      engine: "extraction",
      input: {
        sources: [
          {
            sourceId: "source_brief",
            kind: "master_prompt",
            content:
              "I need a tool that helps small businesses track inventory. Barcode scanning, low stock alerts, supplier management. Should be web-based with mobile support.",
            capturedAt: "2026-07-23T12:00:00.000Z",
          },
        ],
        existingProject: null,
      },
      expectedAssertions: ["completes without error"],
    },
  ],
};
