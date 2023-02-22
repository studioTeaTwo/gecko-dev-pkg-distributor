  # Bugzilla Triage

  **NOTE** This issue presumes the branches and tags for the next Firefox release have already been created in tor-browser.git

  - [ ] Generate Bugzilla triage CSV
    - Run (from `tor-browser-build` root):
    ```bash
      ./tools/browser/generate-bugzilla-triage-csv ${FIREFOX_VERSION} ${PREVIOUS_NIGHTLY_TAG} ${NEXT_NIGHLTY_TAG} ${TRIAGE_ISSUE_NUMBER} ${REVIEWERS} > out.csv
    ```
    - `${FIREFOX_VERSION}`: the major Firefox version of the nightly to review
      - **Example**: 129
    - `${PREVIOUS_NIGHTLY_TAG}`: the nightly 'end' tag of the previous major Firefox version
      - **Example**: `FIREFOX_NIGHTLY_128_END`
    - `${NEXT_NIGHLTY_TAG}`: the nightly 'end' tag of the next major Firefox version we are reviewing
      - **Example**: `FIREFOX_NIGHTLY_129_END`
    - `${TRIAGE_ISSUE_NUMBER}`: this `tor-browser` issue
      - **Example**: `43303`
    - `${REVIEWERS}`: `morgan` and two additional devs to triage this Firefox version
      - `boklm`
      - `brizental`
      - `clairehurst`
      - `dan`
      - `henry`
      - `jwilde`
      - `ma1`
      - `pierov`
    - **Example**:
      ```bash
      ./tools/browser/generate-bugzilla-triage-csv 129 FIREFOX_NIGHTLY_128_END FIREFOX_NIGHTLY_129_END 43303 morgan pierov henry > 129.csv
      ```
  - [ ] Attach the generated CSV file to the triage isssue
  - [ ] Import to Google Sheets ( https://sheets.google.com )
    - [ ] Create blank spreadsheet
    - [ ] **Title**: `Bugzilla Triage ${VERSION}`
    - [ ] Import CSV: File > Import > Upload
      - **Import location**: "Replace spreadsheet"
      - **Separator type**: "Comma"
      - **Convert text to numbers, dates, and fomulas**: "✅"
    - [ ] Convert 'Review' column's issue cells to check-boxes:
      - Select relevant cells (i.e.: `A2:A1554` for in the 129 triage)
      - Insert > Checkbox
    - [ ] Convert 'Triaged by' cells to check-boxes
    - [ ] Share Spreadsheet
      - 🔒 Share > General access
        - Change `Restricted` to `Anyone with the link`
      - Post link in an internal note on this issue
  - [ ] Page requested reviewers to this issue
  - [ ] Triage Completed by:
    - [ ] morgan
    - [ ] reviewer 1 <!-- replace with reviewer name :) -->
    - [ ] reviewer 2 <!-- replace with reviewer name :) -->
