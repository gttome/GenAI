# SOLV1 Content Editor

Public boss-facing text editor for the AI Adoption Benchmark homepage.

Live URL after GitHub Pages rebuild:
https://gttome.github.io/GenAI/solv1-editor/

The editor does not modify the production ChatGPT Site. Text changes are stored locally until Submit for approval is used. Submission opens a pre-filled GitHub issue in gttome/GenAI, which provides the approval record and notification path.

Source images are loaded read-only from the public SOLV1 Site.


## Approval behavior

The boss-facing page can now:
- expand and edit the **Show My Next Step** result area;
- turn on **Annotate images** mode, drag a highlight over image text, and attach replacement wording;
- submit HTML text edits and image requests separately.

Image annotations are review-only. They never modify image files automatically.

For an approval issue, the repository owner can comment:

`/approve-text`

The GitHub Action then applies only approved HTML text to `solv1-editor/approved-text.json`. The public editor loads that file on startup, so the GitHub-hosted copy reflects approved text. Image notes remain pending for manual image work.
