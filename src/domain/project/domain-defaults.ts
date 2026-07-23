/**
 * Domain Bootstrap — injects intelligent default values into a CanonicalProject
 * based on the detected project type and domain keywords found in the brief.
 *
 * Only fills fields that are still "missing" (status === "missing" && value === null)
 * after extraction. Marks applied defaults as status "inferred" with confidence 40.
 *
 * This bridges the gap between a short user prompt and a useful project skeleton,
 * giving the discovery engine enough structure to generate relevant questions.
 */

import type { CanonicalProject } from "./schema";

// ── Domain knowledge registry ─────────────────────────────────

interface DomainRule {
  /** Project types this rule activates for */
  projectTypes: string[];
  /** Keywords that must ALL be present (case-insensitive, substring match) */
  requireAll?: string[];
  /** Keywords where at least ONE must be present */
  requireAny?: string[];
  /** Fields to populate with default values */
  defaults: Partial<{
    features: Array<{ name: string; description: string; priority: "must" | "should" | "could"; acceptanceCriteria: string[] }>;
    goals: Array<{ name: string; outcome: string; priority: "primary" | "secondary" }>;
    constraints: string[];
    security: string[];
    privacy: string[];
    inScope: string[];
    platforms: string[];
    stack: string[];
    roles: string[];
    architecture: string;
    authentication: string;
    storage: string;
    backgroundJobs: string;
    risks: Array<{ name: string; impact: "blocking" | "high" | "medium" | "low"; mitigation: string }>;
    targetUserExtras: Array<{ name: string; needs: string[]; painPoints: string[] }>;
    performance: string[];
    testing: string[];
  }>;
}

// ── Normalization ────────────────────────────────────────────

function norm(text: string): string {
  return text.toLowerCase().trim();
}

function keywordMatch(brief: string, keywords: string[]): boolean {
  const lower = norm(brief);
  return keywords.every((kw) => lower.includes(norm(kw)));
}

function keywordMatchAny(brief: string, keywords: string[]): boolean {
  const lower = norm(brief);
  return keywords.some((kw) => lower.includes(norm(kw)));
}

// ── Domain rules ─────────────────────────────────────────────

const DOMAIN_RULES: DomainRule[] = [
  // ── Pregnancy / Maternal health ──────────────────────────
  {
    projectTypes: ["mobile_app", "saas_application"],
    requireAny: ["pregnant", "pregnancy", "maternal", "maternity", "prenatal", "postnatal", "ibu hamil", "kehamilan"],
    defaults: {
      goals: [
        { name: "Safe exercise guidance", outcome: "Provide pregnancy-safe workout plans tailored to each trimester", priority: "primary" },
        { name: "Health monitoring", outcome: "Track maternal health metrics and flag concerning changes", priority: "primary" },
        { name: "Educational content", outcome: "Deliver trusted information about pregnancy stages, nutrition, and wellness", priority: "secondary" },
      ],
      features: [
        { name: "Trimester-based workout plans", description: "Curated exercise routines safe for each pregnancy stage with video demonstrations", priority: "must", acceptanceCriteria: ["Workouts filterable by trimester", "Each exercise includes safety notes"] },
        { name: "Daily health logging", description: "Track weight, blood pressure, symptoms, and mood with trend visualization", priority: "must", acceptanceCriteria: ["At least 5 health metrics tracked", "Trend charts for each metric"] },
        { name: "Appointment & reminder system", description: "Schedule prenatal checkups with push notification reminders", priority: "should", acceptanceCriteria: ["Calendar integration", "Customizable reminder intervals"] },
        { name: "Nutrition guide", description: "Trimester-specific meal plans with calorie and nutrient tracking", priority: "should", acceptanceCriteria: ["At least 20 meal suggestions", "Dietary restriction filters"] },
        { name: "Baby development tracker", description: "Week-by-week fetal development information with size comparisons", priority: "should", acceptanceCriteria: ["Visual size comparisons", "Weekly update notifications"] },
        { name: "Emergency contacts & alerts", description: "Quick-dial for doctor/emergency with location sharing", priority: "must", acceptanceCriteria: ["One-tap emergency call", "Optional location sharing"] },
      ],
      constraints: [
        "HIPAA/GDPR-compliant health data storage required",
        "Medical disclaimer must be shown before any exercise content",
        "No medical diagnosis — app is informational only",
        "Offline access to workout plans required",
      ],
      security: [
        "End-to-end encryption for health data",
        "Biometric authentication support",
        "Automatic session timeout after inactivity",
      ],
      privacy: [
        "Health data must never be shared with third parties",
        "Clear consent flow for data collection",
        "Right-to-deletion compliance",
      ],
      targetUserExtras: [
        { name: "Healthcare providers", needs: ["Review patient-reported metrics", "Receive alert notifications"], painPoints: ["No visibility into patient between visits", "Manual data collection is time-consuming"] },
        { name: "Partners / family members", needs: ["Follow pregnancy progress", "Receive appointment reminders"], painPoints: ["Feeling disconnected from the pregnancy journey", "Difficulty tracking important dates"] },
      ],
      roles: ["User", "Healthcare Provider", "Administrator"],
      authentication: "Email and password",
      storage: "Managed cloud",
      backgroundJobs: "Daily health reminder push notifications, weekly report generation, data backup",
      performance: ["Smooth 60fps UI scrolling", "Offline-first data access", "Background sync when connectivity restored"],
      testing: ["Unit tests for health metric calculations", "Integration tests for notification delivery", "E2E test for emergency contact flow", "Accessibility audit for screen readers"],
      risks: [
        { name: "Medical liability", impact: "blocking", mitigation: "Prominent medical disclaimer, no diagnostic claims, legal review before launch" },
        { name: "Health data breach", impact: "blocking", mitigation: "End-to-end encryption, SOC 2 compliant infrastructure, regular penetration testing" },
        { name: "Low user retention", impact: "high", mitigation: "Gamification of health goals, weekly progress reports, push notification re-engagement" },
      ],
    },
  },

  // ── Fitness / Workout (generic) ───────────────────────────
  {
    projectTypes: ["mobile_app", "saas_application"],
    requireAny: ["fitness", "workout", "exercise", "gym", "training", "sport", "health", "wellness", "kebugaran", "olahraga", "latihan", "sehat"],
    defaults: {
      goals: [
        { name: "User engagement & retention", outcome: "Keep users active with personalized workout plans and progress tracking", priority: "primary" },
        { name: "Health outcome improvement", outcome: "Measurable improvement in user fitness levels over 12-week programs", priority: "primary" },
      ],
      features: [
        { name: "Personalized workout plans", description: "AI-generated or trainer-curated workout routines based on user goals and fitness level", priority: "must", acceptanceCriteria: ["User can set fitness goals", "Plans adapt based on progress"] },
        { name: "Progress tracking & analytics", description: "Charts and summaries of workouts, calories, and health metrics over time", priority: "must", acceptanceCriteria: ["At least 5 chart types", "Exportable reports"] },
        { name: "Exercise library with video guides", description: "Searchable catalog of exercises with proper form demonstrations", priority: "should", acceptanceCriteria: ["At least 50 exercises", "Video or animation for each"] },
        { name: "Reminders & scheduling", description: "Customizable workout reminders with calendar integration", priority: "should", acceptanceCriteria: ["Push notification support", "Calendar sync"] },
        { name: "Social & community features", description: "Share achievements, join challenges, follow friends", priority: "could", acceptanceCriteria: ["Activity feed", "Challenge leaderboards"] },
      ],
      constraints: [
        "Must work offline for core workout tracking",
        "Health data must be stored securely",
      ],
      security: ["Secure user authentication", "Health data encryption at rest"],
      performance: ["Fast app launch under 2 seconds", "Smooth scrolling in workout lists"],
      testing: ["Unit tests for workout logic", "Integration tests for data sync"],
      risks: [
        { name: "Injury liability from exercise guidance", impact: "high", mitigation: "Include safety disclaimers, proper form instructions, and recommend consulting a physician" },
      ],
    },
  },

  // ── Android-specific defaults ─────────────────────────────
  {
    projectTypes: ["mobile_app"],
    requireAny: ["android"],
    defaults: {
      stack: ["Kotlin", "Jetpack Compose", "Room Database", "WorkManager"],
      platforms: ["Android"],
      architecture: "MVVM with Clean Architecture layers (data, domain, presentation)",
      constraints: [
        "Target Android API 26+ (Android 8.0)",
        "Follow Material Design 3 guidelines",
        "Support light and dark themes",
      ],
      performance: ["Cold start under 2 seconds", "60fps animations", "Efficient background work via WorkManager"],
      testing: ["JUnit for ViewModels and UseCases", "Espresso for UI tests", "Compose UI testing"],
    },
  },

  // ── iOS-specific defaults ─────────────────────────────────
  {
    projectTypes: ["mobile_app"],
    requireAny: ["ios", "iphone", "ipad", "apple"],
    defaults: {
      stack: ["Swift", "SwiftUI", "Core Data", "CloudKit"],
      platforms: ["iOS"],
      architecture: "MVVM with SwiftUI and Combine",
      constraints: [
        "Target iOS 16+",
        "Follow Human Interface Guidelines",
        "Support Dynamic Type for accessibility",
      ],
    },
  },

  // ── General mobile app defaults (applied when projectType is mobile_app) ──
  {
    projectTypes: ["mobile_app"],
    defaults: {
      constraints: [
        "Responsive layout for phone and tablet form factors",
        "Offline-first architecture for core features",
        "Push notification support for re-engagement",
      ],
      authentication: "Email link",
      storage: "Managed cloud",
      roles: ["User"],
      performance: ["Fast cold start", "Smooth 60fps scrolling"],
      testing: ["Unit tests for business logic", "UI tests for critical flows", "Accessibility testing"],
      risks: [
        { name: "App store rejection", impact: "medium", mitigation: "Follow platform guidelines strictly, test against latest review criteria" },
      ],
    },
  },
];

// ── Public API ──────────────────────────────────────────────

/**
 * Apply domain-specific default values to a canonical project.
 * Only fills fields that are still "missing" after extraction.
 * Safe to call multiple times — already-populated fields are never overwritten.
 */
export function bootstrapDomainDefaults(project: CanonicalProject, brief: string): void {
  const projectType = project.identity.projectType.value;
  if (!projectType) return;

  const now = new Date().toISOString();
  const bootstrapEvidenceId = "evidence_domain_bootstrap";

  // Collect all matching rules
  const appliedFields = new Set<string>();

  for (const rule of DOMAIN_RULES) {
    // Check project type match
    if (!rule.projectTypes.includes(projectType)) continue;

    // Check keyword requirements
    if (rule.requireAll && !keywordMatch(brief, rule.requireAll)) continue;
    if (rule.requireAny && !keywordMatchAny(brief, rule.requireAny)) continue;

    // Apply defaults for fields that are still missing
    applyIfMissing(project, "product.features", rule.defaults.features, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "business.goals", rule.defaults.goals, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "scope.constraints", rule.defaults.constraints, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "technical.security", rule.defaults.security, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "technical.privacy", rule.defaults.privacy, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "scope.inScope", rule.defaults.inScope, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "product.platforms", rule.defaults.platforms, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "technical.preferredStack", rule.defaults.stack, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "product.roles", rule.defaults.roles, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "technical.architectureStyle", rule.defaults.architecture, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "technical.authentication", rule.defaults.authentication, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "technical.storage", rule.defaults.storage, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "technical.backgroundJobs", rule.defaults.backgroundJobs, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "execution.risks", rule.defaults.risks, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "quality.performance", rule.defaults.performance, appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "quality.testing", rule.defaults.testing, appliedFields, now, bootstrapEvidenceId);

    // Merge target user extras
    if (rule.defaults.targetUserExtras && rule.defaults.targetUserExtras.length > 0) {
      mergeTargetUsers(project, rule.defaults.targetUserExtras, now, bootstrapEvidenceId);
    }
  }

  // ── Ensure minimal scaffolding even without specific domain matches ──
  if (projectType === "mobile_app") {
    applyIfMissing(project, "product.platforms", ["Android", "iOS"], appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "technical.architectureStyle", "MVVM with repository pattern", appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "product.roles", ["User"], appliedFields, now, bootstrapEvidenceId);
  }

  if (projectType === "website") {
    applyIfMissing(project, "product.platforms", ["Responsive web"], appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "technical.architectureStyle", "SSR with client hydration (Next.js)", appliedFields, now, bootstrapEvidenceId);
  }

  if (projectType === "saas_application") {
    applyIfMissing(project, "product.roles", ["Member", "Administrator"], appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "technical.authentication", "Email and password", appliedFields, now, bootstrapEvidenceId);
    applyIfMissing(project, "technical.storage", "Managed cloud", appliedFields, now, bootstrapEvidenceId);
  }
}

// ── Internal helpers ────────────────────────────────────────

interface ProjectFieldAccess {
  value: unknown;
  status: string;
  confidence: number;
  evidenceIds: string[];
  timestamps: { createdAt: string; updatedAt: string };
  approval: { status: string };
}

function getField(project: CanonicalProject, path: string): ProjectFieldAccess | null {
  const [group, key] = path.split(".") as [string, string];
  const section = (project as unknown as Record<string, Record<string, ProjectFieldAccess>>)[group];
  if (!section) return null;
  return section[key] ?? null;
}

function isMissing(field: ProjectFieldAccess | null): boolean {
  if (!field) return true;
  return field.status === "missing" && (field.value === null || field.value === undefined || (Array.isArray(field.value) && field.value.length === 0));
}

function applyIfMissing(
  project: CanonicalProject,
  path: string,
  value: unknown,
  appliedFields: Set<string>,
  now: string,
  evidenceId: string,
): void {
  if (value === undefined || value === null) return;
  if (appliedFields.has(path)) return; // already applied by a higher-priority rule

  const field = getField(project, path);
  if (!field) return;
  if (!isMissing(field)) return; // already has extracted data — don't overwrite

  // For string fields, check if a single string was passed vs array
  const isStringField = typeof value === "string" && !Array.isArray(value);

  if (isStringField && Array.isArray(field.value)) {
    // Don't overwrite array field with string
    return;
  }

  field.value = value;
  field.status = "inferred";
  field.confidence = 55;
  field.evidenceIds = [evidenceId as never];
  field.timestamps = { createdAt: now, updatedAt: now };
  field.approval = { status: "not_requested" };
  appliedFields.add(path);
}

function mergeTargetUsers(
  project: CanonicalProject,
  extras: Array<{ name: string; needs: string[]; painPoints: string[] }>,
  now: string,
  evidenceId: string,
): void {
  const field = getField(project, "business.targetUsers");
  if (!field) return;

  const existing = (Array.isArray(field.value) ? field.value : []) as Array<{ name: string; needs: string[]; painPoints: string[] }>;
  const existingNames = new Set(existing.map((u) => norm(u.name)));

  const merged = [...existing];
  for (const extra of extras) {
    if (!existingNames.has(norm(extra.name))) {
      merged.push(extra);
      existingNames.add(norm(extra.name));
    }
  }

  if (merged.length > existing.length) {
    field.value = merged;
    field.status = "inferred";
    field.confidence = Math.max(field.confidence, 55);
    if (!field.evidenceIds.includes(evidenceId as never)) {
      field.evidenceIds = [...field.evidenceIds, evidenceId as never];
    }
    field.timestamps = { createdAt: now, updatedAt: now };
  }
}
