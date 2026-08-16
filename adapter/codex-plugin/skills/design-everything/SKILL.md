---
name: design-everything
description: Run the DesignEverything interview as a text-only workflow in Codex.
---

# DesignEverything interview (Codex text fallback)

Read `${PLUGIN_ROOT}/Design/Content/interview-script/script.yaml` and ask exactly one current
question at a time. This Codex plugin provides gate hooks and a text workflow only: it does not
provide native interactive question cards, AskUserQuestion, or a UserPromptSubmit capability.

For a question with `options`, list the labels and short trade-offs as text. A fixed
recommendation is guidance, not an automatic selection; a contextual recommendation has no
preselected answer. Always offer a free-text answer outside the catalog. For `option_hints`,
build exactly the requested number of suggestions only from already committed answers; identify
missing inputs as `unknown` rather than inventing them.

Translate the selected or typed answer into the question's normal prose/slots, ask the user to
confirm it, and commit at most one step after explicit confirmation. Keep the normal warning and
critic acknowledgement flows. If a card-specific instruction is encountered, use this text
fallback instead.

To enable the generic fallback outside this plugin, materialize
`Design/Adapters/generated/AGENTS.sample.md` as a root `AGENTS.md`. The legacy
`.agents/AGENTS.md` is not a discovery path and is not the generated source of truth.

Native Claude cards are supported by the Claude adapter. Native Codex interview support is
deferred in 8.1.0 — this skill is the text-only fallback for that gap, not a placeholder for it.

Use `${PLUGIN_ROOT}/cli.mjs status --json` to inspect the local workflow state.
