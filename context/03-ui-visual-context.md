# OXZI — UI and Visual Context

## Experience Character

OXZI should feel intelligent, calm, premium, and frank. It is a focused project workspace, not a corporate form builder and not a playful chatbot.

## Interaction Voice

Preferred examples:

- “Got it. Most of the project is already clear.”
- “Bas do decisions lock karni hain.”
- “Your master prompt covers everything important. Skipping the interview.”
- “I found one conflict before generating the architecture.”

Avoid:

- Long robotic explanations
- Excessive praise
- Repeating the user's entire prompt
- Formal phrases such as “Please provide the following mandatory information”
- Asking multiple open-ended questions when selectable answers are possible

## Core UX Rules

1. Show progress through understanding, not through a long form.
2. Prefer one high-value question per screen.
3. Provide 2–4 smart suggested answers where appropriate.
4. Keep free typing optional whenever a safe selection can answer the question.
5. Let users approve inferred details in batches.
6. Clearly separate confirmed facts, assumptions, defaults, and unresolved conflicts.
7. Provide an immediate “Generate Bible” action when critical completeness is sufficient.
8. Never force users to complete low-impact fields.

## Main Screens

- Landing page
- Dashboard
- New project intake
- Input analysis state
- Minimal discovery interview
- Understanding review
- Project Bible workspace
- Visual direction view
- Architecture view
- Decisions and assumptions view
- Export dialog
- AI provider settings

## New Project Screen

Primary prompt:

> Tell OXZI what you are building. A rough idea or full master prompt both work.

Input options:

- Paste text
- Upload existing material
- Use example

The interface should not ask users to choose “Quick Idea” versus “Master Prompt.” OXZI detects completeness automatically.

## Analysis Feedback

After analysis, show compact facts such as:

- `23 details understood`
- `2 assumptions proposed`
- `1 critical decision missing`
- `Interview can be skipped`

## Interview UI

Each question contains:

- One concise question
- Why it matters, hidden by default
- Suggested answer chips
- Optional custom answer
- “Use recommended default” when appropriate
- “Decide later” only for non-blocking questions

## Project Bible Workspace

Desktop layout:

- Left: six-file navigation
- Center: readable Markdown/editor view
- Right: evidence, assumptions, decisions, and approval status

Mobile layout:

- Single active panel
- Bottom sheet for navigation and evidence
- No forced desktop-style split view

## Initial Visual Direction

Final brand design will be developed in the design phase. MVP direction:

- Dark and light mode
- Spacious layout
- Layered translucent surfaces used selectively
- Clear hierarchy and restrained motion
- Strong typography
- Minimal decorative dashboard cards
- No generic purple SaaS gradient overload
- No visual clutter around the project input

## Accessibility

- Keyboard-complete discovery flow
- Visible focus states
- WCAG AA contrast target
- Reduced-motion support
- Screen-reader labels for status and confidence indicators
