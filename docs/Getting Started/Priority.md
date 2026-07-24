---
publish: true
---

# Priority

## Priority Quadrants

Tasks uses a four-quadrant priority matrix. Select one quadrant, or leave the priority empty.

| Quadrant | Icon |
| --- | --- |
| Important and urgent | 🔥 |
| Important and not urgent | 🎯 |
| Not important and urgent | ⚡ |
| Not important and not urgent | 💤 |

When a quadrant is selected, its icon is written at the end of the task. The Priority field in a task list displays that one icon, while the task description does not repeat it.

```markdown
- [ ] Respond to the production incident 🔥
```

Tasks does not use `#IU`, `#IN`, `#NU`, `#NN`, or `#tasks-*` tags for quadrant priorities.

## Selecting a Priority

You can select a quadrant in either of these places:

- In the `Tasks: Create or edit` modal, select one quadrant in the Priority matrix. Select the clear control to remove it.
- In [[Auto-Suggest|Intelligent Auto-Suggest]], select one of the four quadrant icon suggestions when using the Tasks Emoji Format. The icon is inserted directly into the task. Dataview Format keeps its compatible `priority::` inline-field suggestions.

## Related Tasks Block Instructions

The following instructions use the priority value derived from the selected quadrant.

- `priority is (above, below)? (lowest, low, none, medium, high, highest)`
  - [[Filters#Priority|Documentation]]
- `sort by priority`
  - [[Sorting#Priority|Documentation]]
- `group by priority`
  - [[Grouping#Priority|Documentation]]
- `hide priority`
  - [[Layout|Documentation]]

- Accessible as [[Task Properties#Values for Other Task Properties|task properties]]:
  - `task.priorityNumber`
  - `task.priorityName`
  - `task.priorityNameGroupText`
