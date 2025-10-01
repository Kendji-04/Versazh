/**
 * Minimal Web App receiver for MVP logging.
 * Expects JSON: { event: "cta_click", variant: "B", userId: "...", ts: 1699999999999 }
 * Returns JSON { ok: true } on success.
 * Accepts x-www-form-urlencoded from e.parameter and appends to Sheet.
 */
function doPost(e) {
  var p = e && e.parameter ? e.parameter : {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('logs') || ss.insertSheet('logs');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['ts_iso','event','variant','userId','meta']);
  }
  var ts = p.ts ? new Date(Number(p.ts)) : new Date();
  sh.appendRow([
    ts.toISOString(),
    p.event || '',
    p.variant || '',
    p.userId || '',
    p.meta || ''
  ]);
  return ContentService.createTextOutput('OK'); // text is fine for simple requests
}
