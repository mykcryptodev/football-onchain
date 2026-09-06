# Contest visibility

Public Pick'em contest discovery is controlled by `hiddenPickemContestIds` in
`src/lib/hidden-contests.ts`.

To hide a Pick'em contest, add its numeric ID to that array and deploy the
change. To show it again, remove the ID. Hidden contests are omitted from the
home page, Pick'em browse lists, featured lists, and Bankr's `GET /contests`
discovery response.

Direct contest URLs, owned-entry history, and the settlement management view
remain available. This is intentional: hiding is a presentation control, not
an onchain deletion or access-control boundary.
