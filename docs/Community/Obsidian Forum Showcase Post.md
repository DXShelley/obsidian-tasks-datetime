---
publish: false
---

# Obsidian Forum Showcase Post

## Publishing details

- **Category:** [Share & showcase](https://forum.obsidian.md/c/share-showcase/9)
- **Title:** `Tasks Datetime: when a date is not enough for a task`
- **Optional tags:** `plugin`, `tasks`, `productivity`
- **Canonical links:** [Repository](https://github.com/DXShelley/obsidian-tasks-datetime), [latest release](https://github.com/DXShelley/obsidian-tasks-datetime/releases/latest), [issues](https://github.com/DXShelley/obsidian-tasks-datetime/issues)

## Post body

````markdown
Most task systems ask one question: “What day is this due?”

That is enough for many tasks. But a task such as “join the client call at 14:30”, “start the backup at 23:00”, or “take medication at 08:00” loses useful meaning when it is reduced to a calendar day.

I built **Tasks Datetime**, an independently maintained task-management plugin for people who want to keep their tasks in Markdown while adding an optional time of day, down to seconds.

It is deliberately narrow in scope:

- Keep the familiar date-only workflow when dates are all you need.
- Turn on time support only when a task genuinely needs it.
- Plan, edit, query, and review tasks without moving them into a separate task app.

For example:

```text
- [ ] Join the client call 📅 2026-07-29 14:30:00
- [ ] Start the overnight backup ⏳ 2026-07-29 23:00:00
```

The plugin provides a combined date-and-time picker, time-aware task queries, recurrence presets, four-quadrant priority editing, and a dashboard for today, this week, and this month. Its date-only presentation can remain compact when you do not need to see times.

This may be a good fit if you plan meetings, study blocks, shifts, routines, or deadline-driven project work in your vault. It is probably not a good fit if a date-only task list already gives you the right amount of structure; in that case, keeping your current workflow simple is the better choice.

**Install:** [download the latest release](https://github.com/DXShelley/obsidian-tasks-datetime/releases/latest), unzip it, copy `main.js`, `manifest.json`, and `styles.css` to `.obsidian/plugins/tasks-datetime/` in your vault, then enable **Tasks Datetime** under Community plugins.

The project is open source (MIT), local-first, and makes no network requests or telemetry. It is an independent derivative of [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks), not an official, affiliated, or endorsed replacement for it.

I would especially value feedback from people who schedule real work by time: which part of your task workflow becomes awkward when “a date” is not precise enough? Please share a small example, a query you wish you had, or an issue on [GitHub](https://github.com/DXShelley/obsidian-tasks-datetime/issues).
````

## Pre-publication checklist

- Replace no links: all links above point to the canonical project or release.
- Add one authentic screenshot of the combined picker or dashboard after it has been manually checked against the current build.
- Verify the current release contains `main.js`, `manifest.json`, and `styles.css`.
- Do not claim marketplace availability until the plugin is accepted into the Community Plugins directory.
- Post once, then answer substantive replies with the user’s actual workflow, limitations, or documentation links. Do not manufacture endorsements or use multiple accounts to amplify the post.

## Growth operating note (do not publish)

### Goal and measurement

Treat “10,000 downloads” as **10,000 downloads of the versioned release ZIP**, not as three individual asset downloads and not as an estimate of unique users. GitHub release asset counts are a transparent proxy, but they cannot establish installs, active users, or retention. Record the ZIP count weekly in a spreadsheet and label the target as a proxy.

The repository intentionally has no analytics or telemetry. Do not add tracking merely to make the campaign measurable; use GitHub release counts, forum views, GitHub traffic, issue quality, and voluntary feedback instead.

Use **12 months** as the planning horizon: 835 ZIP downloads per month on average. Until a four-week baseline exists, this is a planning target, not a forecast. Set cumulative checkpoints at 1,000 (month 2), 3,000 (month 4), 5,000 (month 6), 7,500 (month 9), and 10,000 (month 12). At any missed checkpoint, inspect activation and retention signals before increasing distribution: more reach cannot compensate for a confusing install or first-use experience.

### Why this post is designed this way

| Principle | Implementation in the post | Intended effect |
| --- | --- | --- |
| Jobs to be done | Starts with concrete timed tasks, rather than a feature list. | Readers can recognize the moment their date-only workflow fails. |
| Cognitive fluency | Uses one contrast: date-only tasks versus timed tasks, then two Markdown examples. | Lowers the effort needed to understand the product. |
| Self-selection | Says plainly who should not install it. | Builds trust and reduces unsuitable installs and support burden. |
| Risk reduction | States manual install steps, MIT license, local-first behavior, no telemetry, and independent status. | Addresses adoption anxiety before the reader leaves the forum. |
| Participatory communication | Ends with one specific question about a real workflow. | Produces useful replies and language for follow-up content. |
| Social proof | Do not invent it. Add attributed user stories only after explicit permission. | Preserves credibility in a technical community. |

### Funnel to 10,000 ZIP downloads

The forum announcement is an activation event, not a credible standalone path to 10,000 downloads. Use it as the hub for a 12-month loop:

| Stage | Target action | Leading measure | Operating action |
| --- | --- | --- | --- |
| Discovery | A timed-workflow user sees a relevant example. | Forum views, linked-documentation views, mentions. | Publish one authentic use-case tutorial per month: meetings, study blocks, shifts, recurring routines, and project deadlines. |
| Evaluation | The reader reaches the release page. | Forum-link click-through rate and GitHub repository visits. | Keep the first paragraph, task examples, privacy statement, and compatibility status current. |
| Installation | The reader downloads the ZIP and enables the plugin. | ZIP asset downloads per release. | Keep the three-file install path and a short troubleshooting section accurate; reduce first-run friction before spending on promotion. |
| Activation | The user creates a first timed task and sees it in a query/dashboard. | Voluntary issue/discussion feedback and repeat release downloads. | Provide a copy-paste starter note with three real scenarios; ask for the first use case rather than a generic review. |
| Advocacy | A user shares a workflow that helped them. | Permissioned forum replies, GitHub discussions, referrals. | Quote only opt-in, attributable feedback and turn recurring questions into documentation. |

### Cadence and guardrails

1. **Launch week:** publish this post, respond within 24 hours, and fix any installation/documentation issue exposed by replies.
2. **Weeks 2-6:** publish one narrow workflow per week in places where that workflow is already being discussed. Each post must add a complete answer on its own; link to the plugin only when it is a direct fit.
3. **Months 2-3:** consolidate the most repeated questions into a “Timed tasks in Obsidian” guide and a starter vault. Request permission before turning any user workflow into a case study.
4. **Months 4-12:** ship small, visible improvements; publish concise release notes that connect each improvement to a reported workflow. Repost only for a material release, not to keep the announcement artificially active.

Avoid engagement bait, download-count claims without an exact source and date, comparison attacks on the upstream plugin, paid or undisclosed endorsements, and cross-posting the same copy into unrelated forum threads. Those tactics can increase impressions while damaging the trust needed for sustained adoption.

### Review rhythm

Review the funnel every four weeks. If release-page visits are high but ZIP downloads are low, improve installation clarity and compatibility information. If downloads are high but feedback shows no successful timed workflow, improve onboarding before expanding reach. If a particular use case produces detailed, voluntary examples, make that use case the next documentation and community-content cluster.
