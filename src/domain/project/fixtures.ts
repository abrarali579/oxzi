import { parseCanonicalProject, type CanonicalProject } from "./schema";

const CREATED_AT = "2026-07-22T08:00:00.000Z";
const APPROVED_AT = "2026-07-22T09:00:00.000Z";

type FixtureConfig = {
  slug: string;
  name: string;
  oneLiner: string;
  projectType: "website" | "automation_system";
  industry: string;
  stage: string;
  problem: string;
  solution: string;
  targetUsers: Array<{ name: string; needs: string[]; painPoints: string[] }>;
  geography: string[];
  businessModel: string;
  goals: Array<{ name: string; outcome: string; priority: "primary" | "secondary" }>;
  metrics: Array<{ name: string; target: string; measurement: string }>;
  inScope: string[];
  outOfScope: string[];
  constraints: string[];
  assumption: string;
  assumptionRationale: string;
  dependencies: string[];
  platforms: string[];
  flows: Array<{ name: string; actor: string; steps: string[]; outcome: string }>;
  features: Array<{
    name: string;
    description: string;
    priority: "must" | "should" | "could";
    acceptanceCriteria: string[];
  }>;
  roles: string[];
  permissions: string[];
  content: string[];
  personality: string[];
  visualKeywords: string[];
  avoidList: string[];
  themes: string[];
  colors: string[];
  typography: string[];
  layoutRules: string[];
  motionRules: string[];
  threeDRules: string[];
  references: string[];
  stack: string[];
  architecture: string;
  entities: Array<{ name: string; purpose: string; owner: string }>;
  integrations: Array<{
    name: string;
    purpose: string;
    direction: "inbound" | "outbound" | "bidirectional";
    required: boolean;
  }>;
  authentication: string;
  storage: string;
  backgroundJobs: string;
  security: string[];
  privacy: string[];
  deployment: string;
  publicEnvironment: Record<string, string>;
  performance: string[];
  accessibility: string[];
  testing: string[];
  observability: string[];
  localization: string[];
  seo: string[];
  phases: string[];
  milestones: Array<{ name: string; exitCriteria: string[] }>;
  acceptanceCriteria: string[];
  risks: Array<{
    name: string;
    impact: "blocking" | "high" | "medium" | "low";
    mitigation: string;
  }>;
  currentTask: string;
  nextTask: string;
};

function createFixture(config: FixtureConfig): CanonicalProject {
  const evidenceId = `evidence_${config.slug}_prompt`;
  const assumptionId = `assumption_${config.slug}_operating`;
  const decisionId = `decision_${config.slug}_architecture`;
  const fieldId = (group: string, key: string) => `field_${config.slug}_${group}_${key}`;

  const field = (
    group: string,
    key: string,
    value: unknown,
    criticality: "blocking" | "high" | "medium" | "low" = "medium",
    options: { assumption?: boolean } = {},
  ) => ({
    id: fieldId(group, key),
    value,
    status: "confirmed",
    confidence: 100,
    criticality,
    sourceType: "prompt",
    sourcePrecedence: "explicit_source",
    evidenceIds: [evidenceId],
    timestamps: { createdAt: CREATED_AT, updatedAt: APPROVED_AT },
    ...(options.assumption ? { assumption: { assumptionId, status: "accepted" as const } } : {}),
    approval: {
      status: "approved",
      approvedAt: APPROVED_AT,
      approvedBy: "fixture_owner",
    },
  });

  const rawProject = {
    metadata: {
      projectId: `project_${config.slug}`,
      workspaceId: `workspace_${config.slug}`,
      lifecycle: "approved",
      approvalStatus: "approved",
      createdAt: CREATED_AT,
      updatedAt: APPROVED_AT,
      lifecycleHistory: [
        { status: "draft", enteredAt: CREATED_AT },
        { status: "analyzing", enteredAt: "2026-07-22T08:05:00.000Z" },
        { status: "discovery_skipped", enteredAt: "2026-07-22T08:10:00.000Z" },
        { status: "understanding_review", enteredAt: "2026-07-22T08:20:00.000Z" },
        { status: "architecture_ready", enteredAt: "2026-07-22T08:30:00.000Z" },
        { status: "bible_generated", enteredAt: "2026-07-22T08:45:00.000Z" },
        { status: "approved", enteredAt: APPROVED_AT },
      ],
      version: {
        id: `version_${config.slug}_1`,
        number: 1,
        schemaVersion: "1.0.0",
        approvalStatus: "approved",
        createdAt: CREATED_AT,
        createdBy: "fixture_owner",
        approvedAt: APPROVED_AT,
        approvedBy: "fixture_owner",
      },
    },
    identity: {
      name: field("identity", "name", config.name, "blocking"),
      oneLiner: field("identity", "one_liner", config.oneLiner, "high"),
      projectType: field("identity", "project_type", config.projectType, "blocking"),
      industry: field("identity", "industry", config.industry),
      currentStage: field("identity", "current_stage", config.stage),
    },
    business: {
      problem: field("business", "problem", config.problem, "blocking"),
      solution: field("business", "solution", config.solution, "blocking"),
      targetUsers: field("business", "target_users", config.targetUsers, "blocking"),
      geography: field("business", "geography", config.geography, "high"),
      businessModel: field("business", "business_model", config.businessModel, "medium"),
      goals: field("business", "goals", config.goals, "blocking"),
      successMetrics: field("business", "success_metrics", config.metrics, "high"),
    },
    scope: {
      inScope: field("scope", "in_scope", config.inScope, "blocking"),
      outOfScope: field("scope", "out_of_scope", config.outOfScope, "high"),
      constraints: field("scope", "constraints", config.constraints, "high"),
      assumptionSummaries: field("scope", "assumption_summaries", [config.assumption], "medium", {
        assumption: true,
      }),
      dependencies: field("scope", "dependencies", config.dependencies, "high"),
    },
    product: {
      platforms: field("product", "platforms", config.platforms, "blocking"),
      coreUserFlows: field("product", "core_user_flows", config.flows, "blocking"),
      features: field("product", "features", config.features, "blocking"),
      roles: field("product", "roles", config.roles, "high"),
      permissions: field("product", "permissions", config.permissions, "high"),
      contentRequirements: field("product", "content_requirements", config.content, "high"),
    },
    visual: {
      personality: field("visual", "personality", config.personality, "high"),
      visualKeywords: field("visual", "visual_keywords", config.visualKeywords),
      avoidList: field("visual", "avoid_list", config.avoidList),
      themes: field("visual", "themes", config.themes, "high"),
      colors: field("visual", "colors", config.colors),
      typography: field("visual", "typography", config.typography),
      layoutRules: field("visual", "layout_rules", config.layoutRules, "high"),
      motionRules: field("visual", "motion_rules", config.motionRules),
      threeDRules: field("visual", "three_d_rules", config.threeDRules, "high"),
      references: field("visual", "references", config.references, "low"),
    },
    technical: {
      preferredStack: field("technical", "preferred_stack", config.stack, "high"),
      architectureStyle: field("technical", "architecture_style", config.architecture, "blocking"),
      dataEntities: field("technical", "data_entities", config.entities, "high"),
      integrations: field("technical", "integrations", config.integrations, "high"),
      authentication: field("technical", "authentication", config.authentication, "high"),
      storage: field("technical", "storage", config.storage, "high"),
      backgroundJobs: field("technical", "background_jobs", config.backgroundJobs, "high"),
      security: field("technical", "security", config.security, "blocking"),
      privacy: field("technical", "privacy", config.privacy, "high"),
      deployment: field("technical", "deployment", config.deployment, "blocking"),
      publicEnvironment: field(
        "technical",
        "public_environment",
        config.publicEnvironment,
        "medium",
      ),
    },
    quality: {
      performance: field("quality", "performance", config.performance, "high"),
      accessibility: field("quality", "accessibility", config.accessibility, "high"),
      testing: field("quality", "testing", config.testing, "high"),
      observability: field("quality", "observability", config.observability, "high"),
      localization: field("quality", "localization", config.localization, "high"),
      seo: field("quality", "seo", config.seo, "medium"),
    },
    execution: {
      phases: field("execution", "phases", config.phases, "high"),
      milestones: field("execution", "milestones", config.milestones, "high"),
      acceptanceCriteria: field(
        "execution",
        "acceptance_criteria",
        config.acceptanceCriteria,
        "blocking",
      ),
      risks: field("execution", "risks", config.risks, "high"),
      openDecisionIds: field("execution", "open_decision_ids", [], "medium"),
      currentTask: field("execution", "current_task", config.currentTask, "medium"),
      nextTask: field("execution", "next_task", config.nextTask, "medium"),
    },
    meta: {
      evidence: [
        {
          id: evidenceId,
          sourceType: "prompt",
          sourceId: `${config.slug}_master_prompt`,
          excerpt: config.oneLiner,
          interpretation:
            "The fixture values were normalized from an explicit complete project brief.",
          createdAt: CREATED_AT,
        },
      ],
      assumptions: [
        {
          id: assumptionId,
          fieldIds: [fieldId("scope", "assumption_summaries")],
          statement: config.assumption,
          status: "accepted",
          impact: "medium",
          rationale: config.assumptionRationale,
          createdAt: CREATED_AT,
          updatedAt: APPROVED_AT,
        },
      ],
      decisions: [
        {
          id: decisionId,
          fieldIds: [fieldId("technical", "architecture_style")],
          title: "Initial architecture",
          decision: config.architecture,
          rationale:
            "Matches the explicit workflow, quality, and deployment constraints in the source brief.",
          status: "approved",
          decidedAt: APPROVED_AT,
          createdAt: CREATED_AT,
          updatedAt: APPROVED_AT,
        },
      ],
      conflicts: [],
      completeness: {
        criticalCompleteness: 100,
        overallCompleteness: 100,
        contradictionCount: 0,
        blockingQuestionCount: 0,
        assumptionCount: 1,
      },
    },
  };

  return parseCanonicalProject(rawProject);
}

export const oxzire3dWebsiteFixture = createFixture({
  slug: "oxzire_3d",
  name: "Oxzire 3D Website",
  oneLiner:
    "A cinematic, bilingual portfolio website that turns Oxzire's 3D work into qualified enquiries.",
  projectType: "website",
  industry: "3D design and creative production",
  stage: "Validated portfolio redesign",
  problem:
    "Prospects cannot quickly understand Oxzire's capabilities, process, or production quality on mobile.",
  solution:
    "A fast editorial portfolio with an optional 3D hero, case-study video, localized content, and a direct enquiry path.",
  targetUsers: [
    {
      name: "Brand and agency producers",
      needs: [
        "Assess visual quality quickly",
        "Understand services and availability",
        "Request a scoped quote",
      ],
      painPoints: [
        "Slow showreels",
        "Unclear project ownership",
        "Portfolio sites that fail on mobile",
      ],
    },
    {
      name: "Creative directors",
      needs: ["Review relevant case studies", "Share work internally"],
      painPoints: ["Missing context around production decisions"],
    },
  ],
  geography: ["Indonesia", "Southeast Asia", "Global remote clients"],
  businessModel: "Project-based creative services with custom quotations",
  goals: [
    {
      name: "Generate qualified enquiries",
      outcome: "Visitors submit briefs with budget and timeline context",
      priority: "primary",
    },
    {
      name: "Demonstrate production range",
      outcome: "Decision-makers can find a relevant case study in under two minutes",
      priority: "secondary",
    },
  ],
  metrics: [
    {
      name: "Qualified enquiry conversion",
      target: "At least 3% of case-study visitors",
      measurement: "Completed enquiry forms divided by case-study sessions",
    },
    {
      name: "Mobile performance",
      target: "LCP at or below 2.5 seconds at p75",
      measurement: "Field Core Web Vitals",
    },
  ],
  inScope: [
    "Home",
    "Work index",
    "Case studies",
    "Services",
    "About",
    "Contact",
    "English and Bahasa Indonesia",
  ],
  outOfScope: ["Client portal", "E-commerce", "Real-time 3D configurator"],
  constraints: [
    "Mobile-first",
    "3D enhancement must never block navigation",
    "Editors must update projects without code changes",
  ],
  assumption: "Editors will provide compressed poster images for every video and 3D scene.",
  assumptionRationale:
    "Accepted to guarantee resilient fallbacks and predictable mobile performance.",
  dependencies: ["Approved portfolio media", "Bilingual copy", "Analytics property", "CMS access"],
  platforms: ["Responsive web", "Modern evergreen browsers"],
  flows: [
    {
      name: "Portfolio to enquiry",
      actor: "Prospective client",
      steps: ["Open landing page", "Filter work", "Watch a case study", "Submit project brief"],
      outcome: "A qualified lead reaches Oxzire",
    },
    {
      name: "Publish case study",
      actor: "Content editor",
      steps: ["Create draft", "Upload optimized media", "Review both locales", "Publish"],
      outcome: "A localized case study is live",
    },
  ],
  features: [
    {
      name: "Adaptive 3D hero",
      description:
        "Progressively enhances a static art-directed hero when device capability permits.",
      priority: "must",
      acceptanceCriteria: [
        "Static fallback renders without JavaScript",
        "Reduced-motion preference disables nonessential motion",
      ],
    },
    {
      name: "Video case studies",
      description: "Presents project video with poster, captions, and written context.",
      priority: "must",
      acceptanceCriteria: [
        "Playback is user initiated",
        "Captions and descriptive copy are available",
      ],
    },
    {
      name: "Localized CMS",
      description: "Editors manage English and Indonesian project content.",
      priority: "must",
      acceptanceCriteria: ["Missing translations cannot publish silently"],
    },
  ],
  roles: ["Visitor", "Content editor", "Administrator"],
  permissions: [
    "Visitors read published content",
    "Editors manage drafts and media",
    "Administrators publish and manage access",
  ],
  content: [
    "Project summary",
    "Role and services",
    "Process narrative",
    "Image and video assets",
    "Client outcome",
    "Localized SEO metadata",
  ],
  personality: ["Cinematic", "Precise", "Experimental", "Human"],
  visualKeywords: ["Deep space", "Gallery lighting", "Editorial scale", "Tactile depth"],
  avoidList: [
    "Generic neon gradients",
    "Constant camera motion",
    "Tiny gray text",
    "Decorative loading screens",
  ],
  themes: ["Dark default", "Accessible light theme"],
  colors: ["Near-black canvas", "Warm white text", "Electric blue accent used sparingly"],
  typography: ["Expressive display sans for titles", "Highly legible sans-serif for body copy"],
  layoutRules: [
    "Case-study media owns the widest column",
    "Primary enquiry action remains visible after project context",
    "Mobile content order matches reading priority",
  ],
  motionRules: [
    "Motion communicates depth or navigation state",
    "All nonessential motion honors prefers-reduced-motion",
  ],
  threeDRules: [
    "Load after core content",
    "Use compressed assets",
    "Fall back to an art-directed poster",
    "Pause when offscreen",
  ],
  references: [
    "Contemporary editorial portfolios",
    "Museum collection interfaces",
    "Film title pacing",
  ],
  stack: [
    "Next.js",
    "Strict TypeScript",
    "Tailwind CSS",
    "Headless CMS",
    "WebGL progressive enhancement",
  ],
  architecture:
    "Server-rendered content site with CMS webhooks, image/video optimization, and isolated client-side 3D enhancement.",
  entities: [
    {
      name: "Project",
      purpose: "Localized case-study content and publishing state",
      owner: "Oxzire",
    },
    {
      name: "MediaAsset",
      purpose: "Optimized image, video, poster, and 3D variants",
      owner: "Oxzire",
    },
    {
      name: "Enquiry",
      purpose: "Qualified project brief submitted by a prospect",
      owner: "Oxzire",
    },
  ],
  integrations: [
    {
      name: "Headless CMS",
      purpose: "Localized editorial publishing",
      direction: "inbound",
      required: true,
    },
    {
      name: "Transactional email",
      purpose: "Deliver enquiry notifications and receipts",
      direction: "outbound",
      required: true,
    },
    {
      name: "Privacy-aware analytics",
      purpose: "Measure content and conversion performance",
      direction: "outbound",
      required: false,
    },
  ],
  authentication:
    "Public site; CMS authentication is managed by the selected CMS and is outside the public application.",
  storage: "CMS-managed media with optimized delivery variants and immutable cache keys.",
  backgroundJobs: "CMS webhook revalidation and asynchronous media processing only.",
  security: [
    "Validate enquiry payloads server-side",
    "Rate-limit public submissions",
    "Apply a restrictive content security policy",
    "Never expose CMS write credentials",
  ],
  privacy: [
    "Collect only contact and project-scoping data",
    "Record consent for enquiry follow-up",
    "Define retention and deletion handling",
  ],
  deployment: "Vercel production deployment with CMS-hosted content and media CDN.",
  publicEnvironment: { NEXT_PUBLIC_SITE_URL: "https://oxzire.example" },
  performance: [
    "LCP at or below 2.5 seconds at p75",
    "Lazy-load video and 3D assets",
    "Provide responsive media sizes",
  ],
  accessibility: [
    "WCAG 2.2 AA target",
    "Keyboard-complete navigation",
    "Captions for portfolio video",
    "Reduced-motion mode",
  ],
  testing: [
    "Schema tests",
    "Component tests for fallbacks",
    "Cross-browser responsive smoke tests",
    "Accessibility audit",
  ],
  observability: ["Web Vitals reporting", "Enquiry delivery failures", "CMS webhook failures"],
  localization: [
    "English",
    "Bahasa Indonesia",
    "Locale-specific metadata and routes",
    "Visible locale fallback policy",
  ],
  seo: [
    "Localized canonical URLs",
    "Project structured data",
    "Image metadata",
    "Generated sitemap",
  ],
  phases: [
    "Content model and foundations",
    "Portfolio experience",
    "3D enhancement",
    "Localization and launch hardening",
  ],
  milestones: [
    {
      name: "Content-complete beta",
      exitCriteria: [
        "All required pages have approved bilingual copy",
        "Every case study has poster fallbacks",
      ],
    },
    {
      name: "Production launch",
      exitCriteria: [
        "Accessibility review passes",
        "Performance budgets pass on representative mobile hardware",
      ],
    },
  ],
  acceptanceCriteria: [
    "A visitor can reach a relevant project and submit an enquiry on mobile",
    "The site remains usable when 3D or video fails",
    "Editors can publish both locales without developer help",
  ],
  risks: [
    {
      name: "Heavy 3D assets degrade mobile experience",
      impact: "high",
      mitigation: "Capability-gate enhancement and make the poster experience complete",
    },
    {
      name: "Late bilingual content delays launch",
      impact: "medium",
      mitigation: "Track per-locale readiness in the CMS",
    },
  ],
  currentTask: "Validate canonical project state",
  nextTask: "Score discovery completeness from canonical fields",
});

export const newsAutomation2026Fixture = createFixture({
  slug: "news_automation_2026",
  name: "News Website Automation Systems 2026",
  oneLiner:
    "An editor-controlled pipeline that ingests, verifies, rewrites, and publishes attributable news briefs.",
  projectType: "automation_system",
  industry: "Digital news publishing",
  stage: "MVP workflow definition",
  problem:
    "A small newsroom cannot monitor high-volume feeds, remove duplicates, and publish timely summaries without losing source traceability.",
  solution:
    "A scheduled ingestion and editorial workflow with deduplication, source-linked AI drafting, human approval, idempotent publishing, and audit history.",
  targetUsers: [
    {
      name: "News editors",
      needs: [
        "Review prioritized drafts",
        "Verify every factual claim",
        "Approve or reject publication",
      ],
      painPoints: ["Duplicate stories", "Missing attribution", "Opaque automated changes"],
    },
    {
      name: "Audience editors",
      needs: ["Publish consistent briefs quickly", "Correct or retract safely"],
      painPoints: ["Manual CMS copying", "Unclear publish status"],
    },
  ],
  geography: ["Indonesia", "Regional English-language audience"],
  businessModel: "Advertising-supported publisher with optional paid newsletters",
  goals: [
    {
      name: "Reduce editorial handling time",
      outcome: "Editors review normalized drafts instead of manually aggregating feeds",
      priority: "primary",
    },
    {
      name: "Preserve trust",
      outcome: "Every published brief is attributable, reviewed, and auditable",
      priority: "primary",
    },
  ],
  metrics: [
    {
      name: "Median ingest-to-review time",
      target: "Under 10 minutes",
      measurement: "Pipeline timestamps from source fetch to review queue",
    },
    {
      name: "Duplicate publish rate",
      target: "Below 0.5%",
      measurement: "Confirmed duplicates divided by published articles",
    },
    { name: "Unattributed claims", target: "Zero", measurement: "Weekly editorial audit" },
  ],
  inScope: [
    "RSS and approved API ingestion",
    "Normalization",
    "Deduplication",
    "AI-assisted briefs",
    "Fact checklist",
    "Editorial review",
    "CMS publishing",
    "Monitoring and audit logs",
  ],
  outOfScope: [
    "Autonomous publication without approval",
    "Web scraping behind authentication",
    "Automated legal judgment",
    "Original investigative reporting",
  ],
  constraints: [
    "Human approval is mandatory",
    "Source URLs and retrieved timestamps are immutable",
    "Retries must not duplicate publication",
  ],
  assumption: "The launch CMS exposes idempotency metadata or a stable external identifier field.",
  assumptionRationale:
    "Accepted for MVP because safe retry behavior requires a stable publication key; adapters must reject incompatible destinations.",
  dependencies: [
    "Licensed source feeds",
    "CMS API access",
    "Editorial taxonomy",
    "Provider-neutral language model gateway",
  ],
  platforms: ["Editor web application", "Background worker", "CMS adapter"],
  flows: [
    {
      name: "Scheduled story processing",
      actor: "Background worker",
      steps: [
        "Fetch due sources",
        "Normalize items",
        "Detect duplicates",
        "Generate cited draft",
        "Queue editorial review",
      ],
      outcome: "A traceable draft awaits a human decision",
    },
    {
      name: "Editorial approval",
      actor: "Editor",
      steps: [
        "Open draft and sources",
        "Verify fact checklist",
        "Edit headline and body",
        "Approve publication",
        "Confirm CMS result",
      ],
      outcome: "One reviewed article is published exactly once",
    },
    {
      name: "Failure recovery",
      actor: "Operator",
      steps: [
        "Receive alert",
        "Inspect run and attempt history",
        "Correct recoverable cause",
        "Retry idempotently",
      ],
      outcome: "Processing resumes without duplicate side effects",
    },
  ],
  features: [
    {
      name: "Source ingestion",
      description: "Polls allow-listed RSS and API sources on per-source schedules.",
      priority: "must",
      acceptanceCriteria: [
        "Conditional requests are supported",
        "Raw source identity and retrieval time are retained",
      ],
    },
    {
      name: "Semantic deduplication",
      description: "Groups URL, text, and event-level duplicates before drafting.",
      priority: "must",
      acceptanceCriteria: [
        "Editors can inspect matching reasons",
        "Confirmed distinct stories can be separated",
      ],
    },
    {
      name: "Cited draft generation",
      description:
        "Creates structured summaries with claim-to-source references through a provider-neutral gateway.",
      priority: "must",
      acceptanceCriteria: [
        "Unsupported claims block approval",
        "Provider output is schema validated",
      ],
    },
    {
      name: "Editorial gate",
      description: "Requires an authenticated editor decision before any publish attempt.",
      priority: "must",
      acceptanceCriteria: [
        "Approval identity and timestamp are immutable audit events",
        "Rejected drafts cannot publish",
      ],
    },
  ],
  roles: ["Editor", "Managing editor", "Operator", "Administrator"],
  permissions: [
    "Editors review and edit assigned drafts",
    "Managing editors approve publication and retractions",
    "Operators retry failed runs without editing content",
    "Administrators configure sources and destinations",
  ],
  content: [
    "Canonical source URL",
    "Source attribution",
    "Normalized headline and body",
    "Fact checklist",
    "Publication status",
    "Correction history",
  ],
  personality: ["Calm", "Dense", "Trustworthy", "Operational"],
  visualKeywords: ["News desk", "Evidence first", "Clear status", "High information density"],
  avoidList: [
    "Engagement gamification",
    "Hidden automation status",
    "Color-only severity",
    "Auto-advancing review queues",
  ],
  themes: ["Light newsroom workspace", "Low-glare dark option"],
  colors: ["Neutral canvas", "Blue information", "Amber warning", "Red blocker", "Green verified"],
  typography: [
    "Readable editorial serif for article previews",
    "Compact sans-serif for controls and metadata",
  ],
  layoutRules: [
    "Draft and source evidence remain visible together",
    "Blocking validation precedes the publish action",
    "Audit history is chronological",
  ],
  motionRules: [
    "Use motion only for queue changes and progress feedback",
    "Never animate critical alerts away",
  ],
  threeDRules: [],
  references: [
    "Editorial assignment desks",
    "Incident-management timelines",
    "Version review tools",
  ],
  stack: [
    "Next.js",
    "Strict TypeScript",
    "PostgreSQL",
    "Database-backed workers",
    "Zod",
    "Provider-neutral AI gateway",
  ],
  architecture:
    "Event-driven ingestion pipeline with durable database jobs, immutable source snapshots, validated AI output, mandatory editorial approval, and idempotent CMS adapters.",
  entities: [
    { name: "Source", purpose: "Allow-listed feed configuration and schedule", owner: "Publisher" },
    { name: "SourceItem", purpose: "Immutable normalized source snapshot", owner: "Publisher" },
    { name: "StoryCluster", purpose: "Duplicate and related-story grouping", owner: "Publisher" },
    {
      name: "Draft",
      purpose: "Versioned generated and editor-modified article",
      owner: "Publisher",
    },
    {
      name: "ReviewDecision",
      purpose: "Immutable approval, rejection, correction, or retraction event",
      owner: "Publisher",
    },
    {
      name: "PublicationAttempt",
      purpose: "Idempotent CMS request and response history",
      owner: "Publisher",
    },
  ],
  integrations: [
    {
      name: "RSS and news APIs",
      purpose: "Ingest licensed source items",
      direction: "inbound",
      required: true,
    },
    {
      name: "Language model gateway",
      purpose: "Generate schema-constrained cited drafts",
      direction: "bidirectional",
      required: true,
    },
    {
      name: "Publisher CMS",
      purpose: "Publish approved articles and corrections",
      direction: "outbound",
      required: true,
    },
    {
      name: "Alerting service",
      purpose: "Notify operators of exhausted retries and stale queues",
      direction: "outbound",
      required: true,
    },
  ],
  authentication:
    "Workspace authentication with role-based editor, managing editor, operator, and administrator permissions.",
  storage:
    "PostgreSQL for workflow state and immutable audit metadata; object storage for permitted raw payload archives.",
  backgroundJobs:
    "Database-backed scheduled ingestion, generation, and publish jobs with exponential backoff, bounded retries, leases, and idempotency keys.",
  security: [
    "Server-side role authorization",
    "Encrypted provider and CMS credentials",
    "Source allow-listing",
    "Schema validation at every external boundary",
    "Immutable approval audit events",
  ],
  privacy: [
    "Minimize copied source content",
    "Do not send restricted feeds to unapproved cloud models",
    "Support local provider routing for private sources",
    "Define retention by source license",
  ],
  deployment:
    "Region-controlled web and worker services with managed PostgreSQL and private object storage.",
  publicEnvironment: { NEXT_PUBLIC_EDITOR_APP_URL: "https://news-ops.example" },
  performance: [
    "Process scheduled sources within ten minutes",
    "Keep review-queue reads below one second at p95",
    "Bound model and CMS timeouts",
  ],
  accessibility: [
    "WCAG 2.2 AA target",
    "Keyboard-complete review workflow",
    "Text labels for every status and severity",
  ],
  testing: [
    "Schema and transition tests",
    "Adapter contract tests",
    "Idempotency and retry tests",
    "End-to-end editorial approval smoke test",
  ],
  observability: [
    "Per-stage latency and failure metrics",
    "Queue depth and age alerts",
    "Structured run logs",
    "Immutable attempt history",
  ],
  localization: [
    "English editorial UI at launch",
    "Indonesian source content preserved without lossy translation",
    "Locale metadata retained per source item",
  ],
  seo: [
    "CMS templates own public SEO",
    "Generated drafts include canonical source attribution metadata",
  ],
  phases: [
    "Source ingestion and audit model",
    "Deduplication and drafting",
    "Editorial review and publishing",
    "Operational hardening",
  ],
  milestones: [
    {
      name: "Shadow pipeline",
      exitCriteria: [
        "Sources ingest on schedule",
        "No content is publishable",
        "Duplicate clusters are editor-reviewed",
      ],
    },
    {
      name: "Controlled production",
      exitCriteria: [
        "Mandatory approval is enforced",
        "Publish retries prove idempotent",
        "Operators receive actionable alerts",
      ],
    },
  ],
  acceptanceCriteria: [
    "No article publishes without an approved review decision",
    "Every claim links to retained source evidence",
    "Retrying any job cannot create duplicate publication",
    "Every external call and human decision is auditable",
  ],
  risks: [
    {
      name: "Generated text introduces unsupported claims",
      impact: "blocking",
      mitigation:
        "Require claim-level citations, schema validation, and human verification before approval",
    },
    {
      name: "CMS retries publish duplicates",
      impact: "high",
      mitigation: "Use stable external IDs and persist attempt outcomes before retry",
    },
    {
      name: "Source license forbids model processing",
      impact: "high",
      mitigation: "Attach routing policy to each source and support approved local inference",
    },
  ],
  currentTask: "Validate canonical automation state",
  nextTask: "Rank discovery questions from unresolved critical fields",
});
