/** Shared Paramverse PDF base styles matching PVB sample PDFs. */
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
      grid-template-columns: 68px 1fr auto;
      gap: 10px;
      align-items: start;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .pv-logo img {
      max-height: 52px;
      max-width: 68px;
      object-fit: contain;
      display: block;
    }
    .pv-company-name {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #1a1a1a;
      margin-bottom: 2px;
      letter-spacing: 0.2px;
    }
    .pv-muted {
      color: #333333;
      font-size: 6.5px;
      line-height: 1.4;
    }
    .pv-doc-title {
      font-size: 15px;
      font-weight: 700;
      color: #1a1a1a;
      text-align: right;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      white-space: nowrap;
      padding-top: 2px;
    }
    .pv-section-title {
      font-size: 7.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #1a1a1a;
      letter-spacing: 0.3px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
      margin: 10px 0 6px;
    }
    .pv-meta {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 2px;
    }
    .pv-meta td {
      border: 1px solid #e5e7eb;
      padding: 4px 6px;
      vertical-align: top;
    }
    .pv-meta-label {
      font-size: 6.2px;
      color: #5a5a5a;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    .pv-meta-value {
      font-size: 7.5px;
      font-weight: 700;
      color: #1a1a1a;
      margin-top: 2px;
      min-height: 10px;
    }
    .pv-meta-value.dotted {
      border-bottom: 1px dotted #9ca3af;
      min-height: 12px;
      margin-top: 6px;
    }
    .pv-parties {
      display: grid;
      gap: 0;
      border: 1px solid #e5e7eb;
      margin-bottom: 4px;
    }
    .pv-parties.cols-2 { grid-template-columns: 1fr 1fr; }
    .pv-parties.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
    .pv-party {
      padding: 6px 8px;
      min-height: 72px;
    }
    .pv-party + .pv-party { border-left: 1px solid #e5e7eb; }
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
      border: 1px solid #e5e7eb;
    }
    .pv-summary td {
      border-bottom: 1px solid #eceff1;
      padding: 3px 6px;
      font-size: 7.5px;
    }
    .pv-summary tr:last-child td {
      border-bottom: none;
      background: #f3f4f6;
      font-weight: 700;
      font-size: 9px;
      padding: 5px 6px;
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
      .pv-footer { position: running(footer); }
    }
  `;
}
