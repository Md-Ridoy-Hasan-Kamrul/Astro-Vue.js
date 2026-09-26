# AI feature prompt (Astro + Vue)

**Location:** `docs/AI feature prompt.md` (this file)  
**Rules:** `docs/Rules for Vue code quality.md`  
**README:** Section **5** (Engineering Rules) + Section **6** (Code Quality Standards)

Copy a block below and paste it into chat.

---

## Single section (most common)

Use this when building one section — fill in the `[…]` placeholders:

```md
# Role & Prerequisites
Act as a Principal Frontend Architect (10+ years of experience). Before writing any code, you MUST read and fully understand:
1. `README.md` (Strictly follow Section 5 for Engineering Rules and Section 6 for Code Quality Standards).
2. `docs/Rules for Vue code quality.md` (Adhere to pure components, Vue 3 Composition API, Astro islands, and the A–Z project checklist).
3. The provided Figma design: [Insert Figma Link] (Analyze the UI/UX, states, and layouts thoroughly before starting). If no Figma is given, match `src/styles/global.css` and nearby sections.

# Task
Implement the **single section** `[Insert Section Name]` as one scoped piece of UI (prefer `src/components/sections/*.astro` for static, or `src/components/islands/*.vue` only if it needs client interactivity). Wire it into the page only where needed (e.g. `src/pages/index.astro`). Ensure a pixel-perfect implementation.

# Execution Rules & Constraints
- **Stack:** Astro + Vue 3 + Tailwind v4 only. No React, no Svelte, no Jest, no React `sonner` (use `vue-sonner` if toasts are needed).
- **Responsiveness:** Must be fully responsive across all breakpoints (Desktop, Laptop (W-1020Px), Tablet (W-768Px), and Mobile L (W-425Px), Mobile M (W-375Px), Mobile S (W-320Px)).
- **Isolation:** Do NOT modify or break any other existing files in the project except the minimum wiring (import + place the section). Keep changes strictly scoped to this section.
- **Test-Driven Development (TDD):** You MUST write comprehensive unit/integration tests FIRST (Vitest / Astro Container), before providing the section implementation code.
- **Code Quality:** Ensure one level of abstraction per function, separate business logic into `lib/` / stores / composables (not React hooks), avoid magic numbers, and strictly maintain the folder architecture from README.

# Output Directive & Self-Review
Follow this strict order for your response:
1. **Analysis:** Briefly list any potential architectural mistakes you plan to avoid for this specific section and confirm your approach aligns perfectly with my .md files.
2. **Tests:** Provide the comprehensive tests first.
3. **Implementation:** Provide the production-ready section code (+ minimal page wiring if required).
4. **Final Validation:** After generating the code, you MUST explicitly answer this exact question: *"Does this code perfectly follow the 'One level of abstraction per function' rule from my Vue Code Quality rules? Identify if there are any magic numbers or mixed abstractions here."* If you find any issues during this self-review, refactor the code immediately before finishing your response.
```

---

## Full page / bigger feature

```md
# Role & Prerequisites
Act as a Principal Frontend Architect (10+ years of experience). Before writing any code, you MUST read and fully understand:
1. `README.md` (Strictly follow **Section 5 — Engineering Rules** and **Section 6 — Code Quality Standards**).
2. `docs/Rules for Vue code quality.md` (Adhere to Vue 3 Composition API, Astro islands, pure components, and the A–Z checklist).
3. The provided Figma design: [Insert Figma Link] (Analyze UI/UX, states, and layouts thoroughly before starting). If no Figma link is given, match the existing landing visual system in `src/styles/global.css` and nearby sections.

# Task
Implement the [Insert Page/Component Name] strictly in accordance with the Figma design (or existing design system). Ensure a pixel-perfect, production-ready implementation for this Astro + Vue codebase.

# Execution Rules & Constraints
- **Stack:** Astro pages/layouts/sections + Vue 3 islands only. No React, no Svelte, no Jest, no `sonner` (use `vue-sonner`).
- **Responsiveness:** Fully responsive across Desktop, Laptop (~1020px), Tablet (768px), Mobile L (425px), Mobile M (375px), Mobile S (320px).
- **Isolation:** Do NOT modify or break unrelated files. Keep changes scoped to this feature.
- **Test-Driven Development (TDD):** Write comprehensive Vitest unit/integration tests FIRST, then implement. Use Playwright only if the task needs full-page E2E.
- **Code Quality:** One level of abstraction per function; put business logic in `lib/` / stores / composables; avoid magic numbers; keep folder architecture from `README.md`.
- **Data roles:** Axios = HTTP; TanStack Query = server cache; Zustand = client UI status only; toasts via `vue-sonner`.

# Output Directive & Self-Review
Follow this strict order for your response:
1. **Analysis:** Briefly list architectural mistakes you will avoid and confirm alignment with `README.md` Sections 5–6 and `docs/Rules for Vue code quality.md`.
2. **Tests:** Provide the comprehensive tests first.
3. **Implementation:** Provide the production-ready code.
4. **Final Validation:** After generating the code, you MUST explicitly answer this exact question: *"Does this code perfectly follow the 'One level of abstraction per function' rule from my Vue Code Quality rules? Identify if there are any magic numbers or mixed abstractions here."* If you find any issues during this self-review, refactor the code immediately before finishing your response.
```

---

## Quick one-liner

```md
Read README.md (§5–6) + docs/Rules for Vue code quality.md.
Build single section [Name] with TDD (Vitest first). Astro/Vue only. Scoped files. Responsive 320–desktop. End with abstraction + magic-numbers self-review.
```
