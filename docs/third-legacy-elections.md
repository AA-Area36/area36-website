# Third Legacy elections

Administrators open **More → Elections** (`/admin/elections`) to create an
election, select an office, and enter candidates. The six offices match
`Election_Template.xlsx`: Delegate, Alt Delegate, Chair, Alt Chair, Secretary,
and Treasurer. Each office supports up to 40 candidates and five ballots.

This is a chair/teller tally tool. Members cast ballots through the assembly's
existing process; the teller enters whole-number **In person** and **Online**
counts. Candidate setup uses a separate field for each name, with add and remove
controls. Vote counts and the expected count support plus/minus buttons and
number entry.

Enter **Expected votes** on the first ballot. The count carries to later ballots
and becomes the default when preparing another office. Each ballot keeps its own
expected count, and the operator can change it when attendance changes. Candidate
votes plus **X / no candidate** are compared with that count. Differences show
a warning in entry, ballot review, and recorded history, but the operator can
still close or correct the ballot. The actual recorded total determines
percentages and the election threshold. Drafts can be saved while counts are
incomplete.

X is a separate, unelectable choice included in the percentage denominator and
the two-thirds threshold. For example, 60 votes for Alex, 30 for Blair, and 10 X
votes means 60%, 30%, and 10%, and 67 votes are needed to elect. X counts are
stored by channel on every ballot.

Use **Correct ballot N** on any recorded ballot to edit its totals and expected
count directly, with a correction reason. All other ballots, the current draft,
and other offices remain saved. Dependent ballots whose candidate lists no longer
match the corrected rules show a review notice and can be corrected directly.
If an older correction produces an earlier winner, later records remain visible
as archived ballots. Correcting the earlier count again can restore their role
in the procedure. Immutable revisions retain original totals and the reason.
Multiple tabs use revision checks; a stale tab must reload.

The procedure follows [The A.A. Service Manual, Appendix G, pages 114–115](https://www.aa.org/sites/default/files/literature/BM-31_2024-2026_AA_Service_Manual_12-2024.pdf):

- Election requires at least `ceil(total votes × 2 / 3)` votes, tested using exact
  integer arithmetic. Rounded display percentages never determine the outcome.
- After ballot 2, withdraw candidates below one-fifth. After ballot 3, withdraw
  candidates below one-third. The top two vote positions, including ties, remain.
- After ballot 4, withdraw the lowest totals except protected top positions and
  ties. Tied lowest candidates outside those protected positions are all withdrawn.
  The chair records whether a motion for ballot 5 carried by a simple majority.
- If the motion fails, draw among the remaining candidates. If ballot 5 finishes
  without an election, the top two positions remain for the hat. A tie for first
  keeps all tied leaders; otherwise, the leader and all tied runners-up remain.
- The teller performs the physical draw and records the result. The application
  does not select a random winner.

**Meeting display** increases tally sizes and hides editing controls. **Print
results** includes the selected office's recorded ballots and all office outcomes.

## Public election display

In the election workspace, use **Publish display** and then **Open public
display** to share `/elections/<election-id>`. Elections stay private until a
user with election write permission publishes them. Anyone with that link can
view the election without signing in. The page is excluded from search indexing.

The display refreshes every three seconds and shows saved counts, including the
ballot currently being counted, candidate percentages, X, expected turnout, the
two-thirds threshold, recorded ballot history, and confirmed results. Unsaved
inputs do not appear. It offers no voting or editing controls, and does not
include audit identities, correction reasons, sync errors, or Google Sheet links.
The Google Sheet keeps its existing Drive permissions.

The display initially follows the office selected when publishing. After
switching offices in the workspace, use **Show [office]** to change the public
focus. Viewers can inspect other offices and recorded ballots, then choose
**Follow live office** to return to the teller's focus. Corrections update the
display; affected ballots show a review notice, and later ballots superseded by
an earlier winner remain marked as archived.

Use **Stop sharing** to disable the page and its data endpoint. Open displays
remove the election totals on their next successful refresh. Both page and API
bypass shared caching. Publishing controls use the existing saved election state
and require no additional database migration.

## Storage and Google Drive

Apply migration `0032_third_legacy_elections.sql` before using the feature. The
normal `pnpm deploy:production` script applies migrations before deploying code.

D1 stores the current election and an immutable revision for every save, including
drafts, finalized ballots, motion decisions, hat results, and corrections. Saving
does not wait on Google. A background task creates one Google Sheet per
election and updates it with a Summary, six office tabs containing formulas, and
the latest 200 changes in History. All recorded ballot totals remain in office
tabs, and all revisions remain in D1. Office tabs include thin row/cell dividers,
stronger ballot dividers, merged ballot headings, X percentages, expected counts,
and reconciliation formulas. Unused candidate rows are hidden. These styles
also carry into Excel exports.

Connect the Area account using **Connect Google Drive** on the election list.
This reuses the existing OAuth offline grant and `drive.file` scope, configured
by `QUORUM_DRIVE_OWNER_EMAIL` (falling back to `GMAIL_SENDER_EMAIL`). If that
account already connected Drive through Quorum in this environment, no extra
connection is required. No credentials or voter details are sent to the browser.

Election spreadsheets are created in [Website → vote-records](https://drive.google.com/drive/folders/1N3YtOwXuEhLGt-AESn7_Tzkkz-S4PEzF).
`GDRIVE_ELECTIONS_FOLDER_ID` in `wrangler.jsonc` sets this destination. Files
inherit the folder's access permissions. Use the page for changes: background sync refreshes
the managed sheet cells from the saved election, replacing manual cell edits.

The current revision stays pending until Google confirms the complete snapshot.
A per-election lease serializes syncs. The open page checks pending syncs every
three seconds; the existing half-hour Worker cron also retries pending elections,
including when the page is closed. **Retry Drive sync** is available after failure.
The page distinguishes unsaved work, saved votes awaiting Drive, and a confirmed
Google Sheets revision. Closing a page with unsaved inputs triggers a browser
warning; do not navigate away until the save is confirmed.

A lost Drive creation response does not trigger a second create. Recovery looks
for the original sheet's `area36ElectionId` app property. If creation cannot be
reconciled, an administrator should inspect Drive for that ID. Only after
confirming no original create is in flight and no marked file exists should they
reset `drive_creation_attempted` to `0` for that election in D1 and retry. Never
reset this flag merely because a create request timed out.

## Validation

`lib/elections/model.test.ts` covers rounding, channel totals, withdrawal
boundaries, protected ties, the fifth-ballot motion, the hat, and corrections.
`store.test.ts` exercises the migration against SQLite, idempotent saves,
concurrent tabs, and durable revisions. `google.test.ts` checks typed formulas,
private sheet creation, serialized syncs, outages, and lost-response recovery.
