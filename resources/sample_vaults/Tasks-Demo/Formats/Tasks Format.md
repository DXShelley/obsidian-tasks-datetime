# Tasks Format

## Tasks Format for Dates

<!-- placeholder to force blank line before included text --><!-- include: DocsSamplesForTaskFormats.test.Serializer_Dates_tasksPluginEmoji-include.approved.md -->

- [ ] #task Has a created date ➕ 2023-04-13 00:00:00
- [ ] #task Has a scheduled date ⏳ 2023-04-14 00:00:00
- [ ] #task Has a start date 🛫 2023-04-15 00:00:00
- [ ] #task Has a due date 📅 2023-04-16 00:00:00
- [x] #task Has a done date ✅ 2023-04-17 00:00:00
- [-] #task Has a cancelled date ❌ 2023-04-18 00:00:00

<!-- placeholder to force blank line after included text --><!-- endInclude -->

## Tasks Format for Priorities

<!-- placeholder to force blank line before included text --><!-- include: DocsSamplesForTaskFormats.test.Serializer_Priorities_tasksPluginEmoji-include.approved.md -->

- [ ] #task Lowest priority ⏬
- [ ] #task Low priority 🔽
- [ ] #task Normal priority
- [ ] #task Medium priority 🔼
- [ ] #task High priority ⏫
- [ ] #task Highest priority 🔺

<!-- placeholder to force blank line after included text --><!-- endInclude -->

## Tasks Format for Recurrence

- [ ] #task Is a recurring task 🔁 every day when done

## Tasks Format for OnCompletion

<!-- placeholder to force blank line before included text --><!-- include: DocsSamplesForTaskFormats.test.Serializer_OnCompletion_tasksPluginEmoji-include.approved.md -->

- [ ] #task Keep this task when done
- [ ] #task Keep this task when done too 🏁 keep
- [ ] #task Remove this task when done 🏁 delete
- [ ] #task Remove completed instance of this recurring task when done 🔁 every day 🏁 delete

<!-- placeholder to force blank line after included text --><!-- endInclude -->

## Tasks Format for Dependencies

<!-- placeholder to force blank line before included text --><!-- include: DocsSamplesForTaskFormats.test.Serializer_Dependencies_tasksPluginEmoji-include.approved.md -->

- [ ] #task do this first 🆔 dcf64c
- [ ] #task do this after first and some other task ⛔ dcf64c,0h17ye

<!-- placeholder to force blank line after included text --><!-- endInclude -->

## Confirming that the fields are read correctly

```tasks
path regex matches /^Formats\/Tasks Format/
group by heading
sort by description
```
