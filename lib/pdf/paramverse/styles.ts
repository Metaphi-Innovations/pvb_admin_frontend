/** Shared Paramverse PDF base styles matching PVB Delivery Challan sample. */
export function paramverseBaseCss(): string {
  return `
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1a1a1a;
      font-size: 8.5px;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pv-sheet { width: 100%; }
    .pv-header {
      display: grid;
      grid-template-columns: 56px 1fr auto;
      gap: 10px;
      align-items: start;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1.5px solid #1a1a1a;
    }
    .pv-logo img {
      max-height: 36px;
      max-width: 56px;
      object-fit: contain;
      display: block;
    }
    .pv-company-name {
      font-size: 13.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #1a1a1a;
      margin-bottom: 4px;
      letter-spacing: 0.2px;
      line-height: 1.35;
    }
    .pv-muted {
      color: #333333;
      font-size: 8px;
      line-height: 1.55;
      margin-bottom: 1px;
    }
    .pv-doc-title-wrap {
      text-align: right;
      padding-top: 2px;
    }
    .pv-doc-title {
      font-size: 14px;
      font-weight: 700;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      white-space: nowrap;
      line-height: 1.15;
    }
    .pv-doc-subtitle {
      font-size: 8px;
      font-weight: 700;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-top: 2px;
    }
    .pv-section-title {
      font-size: 7.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #1a1a1a;
      letter-spacing: 0.35px;
      border-bottom: 1px solid #1a1a1a;
      padding-bottom: 3px;
      margin: 10px 0 6px;
    }
    /* Open meta strip — labels/values in a row, NO cell borders (sample PDF). */
    .pv-meta {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin: 4px 0 0;
    }
    .pv-meta td {
      border: none !important;
      padding: 3px 10px 4px 0;
      vertical-align: top;
    }
    .pv-meta-label {
      font-size: 6px;
      color: #5a5a5a;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.25px;
    }
    .pv-meta-value {
      font-size: 8px;
      font-weight: 700;
      color: #1a1a1a;
      margin-top: 1px;
      min-height: 10px;
      line-height: 1.25;
    }
    .pv-meta-value.dotted {
      border-bottom: 1px dotted #9ca3af;
      min-height: 12px;
      margin-top: 4px;
    }
    .pv-meta-divider {
      border: none;
      border-top: 1px solid #c4c4c4;
      margin: 8px 0 6px;
    }
    /* Party columns — grey vertical dividers between Bill From / Bill To / Ship To. */
    .pv-parties {
      display: grid;
      gap: 0;
      border: none;
      margin: 0 0 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #c4c4c4;
    }
    .pv-parties.cols-2 { grid-template-columns: 1fr 1fr; }
    .pv-parties.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
    .pv-party {
      padding: 2px 12px 8px 0;
    }
    .pv-party + .pv-party {
      padding-left: 12px;
      border-left: 1px solid #c4c4c4;
    }
    .pv-party-title {
      font-size: 6.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #5a5a5a;
      letter-spacing: 0.3px;
      margin: 0 0 3px;
    }
    .pv-party .name {
      font-weight: 700;
      font-size: 8px;
      margin: 0 0 3px;
      color: #1a1a1a;
    }
    .pv-party p {
      margin: 0 0 1px;
      color: #2a2a2a;
      font-size: 7px;
      line-height: 1.35;
    }
    .pv-party .lbl { color: #5a5a5a; font-weight: 700; }
    table.pv-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 7.2px;
    }
    table.pv-table th,
    table.pv-table td {
      border: 1px solid #d1d5db;
      padding: 3px 3px;
      vertical-align: middle;
    }
    table.pv-table th {
      background: #f3f4f6;
      text-align: center;
      font-size: 6.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: #1a1a1a;
      white-space: nowrap;
    }
    table.pv-table .sub {
      display: block;
      font-size: 6px;
      color: #6e6e6e;
      font-weight: 400;
      margin-top: 1px;
    }
    .pv-totals-row td { background: #f9fafb; font-weight: 700; }
    .pv-r { text-align: right; }
    .pv-c { text-align: center; }
    .pv-fw { font-weight: 700; }
    .pv-nowrap { white-space: nowrap; }
    .pv-num {
      white-space: nowrap !important;
      font-variant-numeric: tabular-nums;
    }
    .pv-box {
      border: 1px solid #e5e7eb;
      margin-top: 6px;
    }
    .pv-box .body { padding: 5px 7px; font-weight: 600; }
    .pv-summary {
      width: 100%;
      border-collapse: collapse;
      border: none;
    }
    .pv-summary td {
      border-bottom: 1px solid #eceff1;
      padding: 3px 2px;
      font-size: 7.5px;
    }
    .pv-summary tr:last-child td {
      border-bottom: none;
      background: transparent;
      font-weight: 700;
      font-size: 9px;
      padding: 5px 2px 2px;
    }
    .pv-summary .lbl { color: #3a3a3a; }
    .pv-bullets {
      margin: 0;
      padding: 4px 6px 4px 16px;
      line-height: 1.35;
      color: #1e1e1e;
    }
    .pv-bullets li { margin-bottom: 1px; }
    .pv-sign {
      margin-top: 16px;
      text-align: right;
      page-break-inside: avoid;
    }
    .pv-sign-company {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8px;
      color: #1a1a1a;
    }
    .pv-sign-gap { height: 34px; }
    .pv-sign-label {
      font-size: 7.5px;
      color: #5a5a5a;
      border-top: 1px solid #d1d5db;
      display: inline-block;
      padding-top: 3px;
      min-width: 140px;
    }
    .pv-footer {
      margin-top: 10px;
      border-top: 1px solid #cccccc;
      padding-top: 4px;
      font-size: 6.5px;
      color: #444444;
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    @media print {
      body { padding: 0; }
    }
  `;
}
