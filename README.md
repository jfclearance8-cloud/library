# IQRA'A Library

Responsive library management interface with a Google Sheets / Apps Script backend.

## Deployment order

1. Follow [Malayalam installation instructions](INSTALL_MALAYALAM.md) to install Code.gs in the Apps Script project bound to the existing Sheet.
2. Add an Apps Script HTML file named Index with the contents of index.html.
3. Deploy a new version of the backend and confirm the /exec URL.
4. Update WEB_APP_URL in index.html if the deployment URL changes.
5. Merge this upgrade branch and use the existing GitHub Pages publishing configuration.

The new frontend requires the new backend session API. Updating GitHub does not automatically deploy Code.gs to Google Apps Script.

Existing Sheet rows and column order are preserved. Delete blocks records with transaction history.

## Validation

`node tests/backend.cjs` runs mocked Apps Script regression checks. See tests/README.md for DOM integration checks. Browser layout, live Google authorization/CORS and PDF output still require deployment testing.
