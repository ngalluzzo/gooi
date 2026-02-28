# Golden Update Records

Use this directory to record approved golden artifact updates.

When changing golden files, add one record file from
`docs/engineering/golden-updates/TEMPLATE.md` and include all changed golden
paths in the record.

The `golden:governance` gate requires:

- at least one update record in the same change set
- required fields (`Date`, `Approver`, `Contract Version`, `Justification`)
- explicit references to all changed golden file paths
