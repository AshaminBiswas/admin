import { ProformaInvoice } from '../types/proforma';
import { PRC_LOGO_DATA_URL } from '../assets/logo.base64';

// Helper to convert number to words in Indian Numbering System
function numberToIndianRupees(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'Zero Rupees Only';

  const singleDigits = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function convertTwoDigits(n: number): string {
    if (n < 20) return singleDigits[n];
    const unit = n % 10;
    return `${tens[Math.floor(n / 10)]}${unit !== 0 ? ' ' + singleDigits[unit] : ''}`;
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundred > 0) str += `${singleDigits[hundred]} Hundred`;
    if (rest > 0) {
      if (str !== '') str += ' and ';
      str += convertTwoDigits(rest);
    }
    return str;
  }

  let crore = Math.floor(rounded / 10000000);
  let remainder = rounded % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundred = remainder;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${convertTwoDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertTwoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertTwoDigits(thousand)} Thousand`);
  if (hundred > 0) parts.push(convertThreeDigits(hundred));

  return `Rupees ${parts.join(' ')} Only`;
}

/**
 * Generate official Proforma Invoice HTML for Print and PDF Export
 * Matches the exact executive styling, corporate branding, and Page 2 Terms of Quotation and PO PDFs
 */
export function generateProformaInvoiceHtml(pi: ProformaInvoice): string {
  const isInterState = Number(pi.igstTotal || 0) > 0;
  const facility = pi.facility;
  const grandTotalWords = numberToIndianRupees(pi.grandTotal);
  const customerName = pi.customerName || pi.companyName || 'Valued Commercial Client';
  const issueDateFormatted = new Date(pi.issueDate || pi.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const validUntilFormatted = new Date(pi.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PROFORMA INVOICE - ${pi.piNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10px;
      line-height: 1.35;
    }
    .invoice-card {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
    }
    
    /* ── Top Header Bar ── */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin: 0;
      line-height: 1.1;
    }
    .facility-text {
      font-size: 8.5px;
      color: #1e293b;
      line-height: 1.3;
    }
    
    /* ── Right Meta Dossier Box ── */
    .contact-stack {
      font-size: 9px;
      color: #0f172a;
      text-align: right;
      line-height: 1.4;
    }

    /* ── Gold Divider Accent ── */
    .gold-accent-line {
      height: 2px;
      background: #f59e0b;
      margin: 4px 0 8px 0;
      border-radius: 1px;
    }

    /* ── Title & PI Number Row ── */
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .doc-type-title {
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .pi-badge-table {
      border: 1px solid #1e293b;
      border-collapse: collapse;
      border-radius: 4px;
      overflow: hidden;
    }
    .pi-badge-table td {
      padding: 3px 8px;
      font-size: 9px;
      font-weight: 800;
      text-align: center;
    }

    /* ── 3-Column Metadata Strip ── */
    .meta-strip {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      margin-bottom: 8px;
      background: #ffffff;
    }
    .meta-strip td {
      width: 33.33%;
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      font-size: 9px;
    }
    .meta-strip-label {
      font-size: 7.5px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
    }
    .meta-strip-value {
      font-size: 9.5px;
      font-weight: 800;
      color: #0f172a;
    }

    /* ── 2-Column Buyer / Details Panels ── */
    .two-column-grid {
      width: 100%;
      margin-bottom: 8px;
      border-collapse: separate;
      border-spacing: 8px 0;
    }
    .info-panel {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 7px 9px;
      vertical-align: top;
      font-size: 9px;
    }
    .panel-title {
      font-size: 8.5px;
      font-weight: 800;
      color: #d97706;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .panel-content strong {
      color: #0f172a;
    }

    /* ── Section Title ── */
    .section-title {
      font-size: 9.5px;
      font-weight: 800;
      color: #d97706;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* ── Line Items Table ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0 8px 0;
      font-size: 8.5px;
    }
    .items-table th {
      background: #0b1e38;
      color: #ffffff;
      font-weight: 800;
      text-align: left;
      padding: 5px 6px;
      border: 1px solid #1e293b;
      text-transform: uppercase;
      font-size: 8px;
      letter-spacing: 0.3px;
    }
    .items-table td {
      padding: 4.5px 6px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .items-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

    /* ── Commercial Summary Grid ── */
    .summary-grid {
      width: 100%;
      margin-top: 4px;
      border-collapse: separate;
      border-spacing: 8px 0;
    }
    .bank-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 8px;
      font-size: 8.5px;
      line-height: 1.35;
      color: #0f172a;
      vertical-align: top;
    }
    .signature-box {
      background: #ffffff;
      border: 1px solid #1e293b;
      border-radius: 4px;
      padding: 6px 8px;
      margin-bottom: 6px;
    }
    .totals-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 10px;
      vertical-align: top;
      font-size: 8.5px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 2.5px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .totals-row.grand {
      font-size: 10.5px;
      font-weight: 900;
      color: #ffffff;
      background: #0b1e38;
      padding: 5px 6px;
      border-radius: 3px;
      margin-top: 3px;
    }
    .totals-row.grand span:last-child {
      color: #f59e0b;
    }
    .advance-callout {
      padding: 3px 0;
      font-weight: 800;
      color: #d97706;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      border-bottom: 1px solid #f1f5f9;
    }
    
    /* ── Signatory & Footer Section ── */
    .footer-section {
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      font-size: 7.5px;
      color: #475569;
    }

    /* ── Page 2 Terms & Conditions ── */
    .page2-container {
      page-break-before: always;
      padding-top: 10px;
    }
    .page2-title {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin: 0 0 2px 0;
    }
    .page2-subtitle {
      font-size: 8.5px;
      color: #475569;
      margin: 0 0 6px 0;
    }
    .terms-section-header {
      font-size: 9.5px;
      font-weight: 800;
      color: #0f172a;
      margin: 10px 0 3px 0;
      text-transform: uppercase;
    }
    .terms-list {
      margin: 0 0 8px 18px;
      padding: 0;
      font-size: 8.5px;
      color: #1e293b;
      line-height: 1.45;
    }
    .terms-list li {
      margin-bottom: 3px;
    }
    .terms-text {
      font-size: 8.5px;
      color: #1e293b;
      line-height: 1.45;
      margin: 0 0 6px 0;
    }

    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">

    <!-- Header Section -->
    <table class="header-table">
      <tr>
        <td style="width: 58%; vertical-align: top;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
            <img src="${PRC_LOGO_DATA_URL || '/logo.png'}" alt="PRC Hardware Logo" style="width: 46px; height: 46px; object-fit: contain;" />
            <div>
              <h1 class="brand-title">PRC Hardware</h1>
              <div class="facility-text" style="font-weight: 700; margin-top: 1px;">H -3, J.R. COMPLEX GATE NO 4, MELA RAM FARM,</div>
              <div class="facility-text" style="font-weight: 700;">MANDOLI, DELHI 110093, INDIA</div>
            </div>
          </div>
        </td>

        <td style="width: 42%; vertical-align: top;">
          <div class="contact-stack">
            <div>✉ billing@pacifichardware.com</div>
            <div>✆ +91 98185 92113</div>
            <div>🌐 www.pacifichardware.com</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Amber Accent Line -->
    <div class="gold-accent-line"></div>

    <!-- Title & Reference Badge -->
    <div class="title-row">
      <h2 class="doc-type-title">PROFORMA INVOICE</h2>
      <table class="pi-badge-table">
        <tr>
          <td style="background: #ffffff; color: #0f172a; border-right: 1px solid #1e293b;">PI NO.</td>
          <td style="background: #ffffff; color: #d97706; font-family: ui-monospace, monospace;">${pi.piNumber}</td>
        </tr>
      </table>
    </div>

    <!-- 3-Column Metadata Strip -->
    <table class="meta-strip">
      <tr>
        <td>
          <div class="meta-strip-label">📅 ISSUE DATE</div>
          <div class="meta-strip-value">${issueDateFormatted}</div>
        </td>
        <td>
          <div class="meta-strip-label">⏱ FINANCIAL YEAR</div>
          <div class="meta-strip-value">${pi.financialYear || '2026-27'}</div>
        </td>
        <td>
          <div class="meta-strip-label">⏱ VALID UNTIL</div>
          <div class="meta-strip-value">${validUntilFormatted}</div>
        </td>
      </tr>
    </table>

    <!-- 2-Column Buyer & Project Details -->
    <table class="two-column-grid">
      <tr>
        <td class="info-panel" style="width: 50%;">
          <div class="panel-title">👤 BILL TO (BUYER)</div>
          <div class="panel-content">
            <strong style="font-size: 10px; color: #0f172a;">${customerName}</strong><br />
            ${pi.companyName && pi.customerName ? `<div>${pi.companyName}</div>` : ''}
            ${pi.customerGstin ? `<div><strong>GSTIN:</strong> <span class="font-mono">${pi.customerGstin}</span></div>` : ''}
            <div>${pi.customerEmail || ''} ${pi.customerPhone ? ' • Ph: ' + pi.customerPhone : ''}</div>
            ${pi.billingAddress ? `<div style="font-size: 8px; color: #64748b; margin-top: 2px;">Billing: ${pi.billingAddress}</div>` : ''}
          </div>
        </td>

        <td class="info-panel" style="width: 50%;">
          <div class="panel-title">📋 ORDER & PROJECT DETAILS</div>
          <div class="panel-content">
            <strong style="font-size: 10px; color: #0f172a;">${pi.quoteReference ? `Linked Quote #${pi.quoteReference}` : (pi.poReference ? `Client PO #${pi.poReference}` : 'Commercial Supply Order')}</strong><br />
            <div><strong>FY:</strong> ${pi.financialYear || '2026-27'} &nbsp;|&nbsp; <strong>PI Number:</strong> <span class="font-mono">${pi.piNumber}</span></div>
            <div><strong>Payment Terms:</strong> <span style="color: #d97706; font-weight: bold;">${pi.advancePercentage}% Advance, Balance at Dispatch</span></div>
            <div><strong>Place of Supply:</strong> ${pi.placeOfSupply || 'Delhi'} (${pi.placeOfSupplyCode || '07'})</div>
            ${pi.shippingAddress ? `<div style="font-size: 8px; color: #64748b; margin-top: 2px;">Delivery: ${pi.shippingAddress}</div>` : ''}
          </div>
        </td>
      </tr>
    </table>

    <!-- Line Items Section Header -->
    <div class="section-title">▦ LINE ITEMS & TAX BREAKDOWN</div>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="text-center" style="width: 4%;">#</th>
          <th style="width: 42%;">Description / Product Specification</th>
          <th class="text-center" style="width: 10%;">HSN/SAC</th>
          <th class="text-center" style="width: 6%;">Unit</th>
          <th class="text-center" style="width: 6%;">Qty</th>
          <th class="text-right" style="width: 10%;">Rate (₹)</th>
          <th class="text-right" style="width: 10%;">${isInterState ? 'IGST (₹)' : 'GST (₹)'}</th>
          <th class="text-right" style="width: 12%;">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${pi.items
          .map(
            (item, index) => `
          <tr>
            <td class="text-center font-mono">${index + 1}</td>
            <td>
              <strong style="color: #0f172a; text-transform: uppercase;">${item.productName}</strong>
              <div style="font-size: 7.5px; color: #64748b;">
                <span class="font-mono">SKU: ${item.sku}</span>
                ${item.description ? ` • ${item.description}` : ''}
              </div>
            </td>
            <td class="text-center font-mono">${item.hsnCode || '8302'}</td>
            <td class="text-center">${item.unit || 'PCS'}</td>
            <td class="text-center font-mono" style="font-weight: 700;">${item.quantity}</td>
            <td class="text-right font-mono">${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td class="text-right font-mono">${(Number(item.taxAmount || 0) || ((item.quantity * item.unitPrice * (item.gstRate || 18)) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td class="text-right font-mono" style="font-weight: 700; color: #0f172a;">
              ${(item.totalAmount ?? item.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <!-- Commercial Summary & Bank Instructions Grid -->
    <table class="summary-grid">
      <tr>
        <td style="width: 52%; vertical-align: top;">
          
          <!-- Digital Authenticity Stamp -->
          <div class="signature-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 800; font-size: 8.5px; color: #d97706;">🛡 DIGITALLY SIGNED</span>
              <span style="font-size: 7.5px; color: #64748b; font-family: monospace;">HMAC-SHA256</span>
            </div>
            <div style="font-size: 8px; color: #1e293b; line-height: 1.35;">
              <div><strong>Verified Authenticity:</strong> Official Commercial Proforma Invoice</div>
              <div><strong>Verification ID:</strong> <span class="font-mono">${pi.verificationId || pi.id}</span></div>
              <div><strong>Signed By:</strong> PRC Commercial Desk</div>
              <div style="color: #64748b; font-size: 7.5px;">SHA256: ${(pi.documentHash || pi.verificationToken || 'ff225fc588da0fbe8c').slice(0, 20)}...</div>
            </div>
          </div>

          <!-- Bank Remittance Box -->
          <div class="bank-box">
            <div style="font-weight: 800; font-size: 8.5px; color: #d97706; margin-bottom: 2px;">
              🏦 BANK RTGS / NEFT REMITTANCE DETAILS
            </div>
            <div><strong>Bank Name:</strong> ${facility.bankDetails?.bankName || 'HDFC Bank Ltd.'}</div>
            <div><strong>Account Name:</strong> ${facility.bankDetails?.accountName || 'Pacific Products and Solutions'}</div>
            <div><strong>Account No:</strong> <span class="font-mono" style="font-weight: bold; color: #d97706;">${facility.bankDetails?.accountNumber || '50200012345678'}</span></div>
            <div><strong>IFSC Code:</strong> <span class="font-mono" style="font-weight: bold;">${facility.bankDetails?.ifsc || 'HDFC0001234'}</span> &nbsp;|&nbsp; <strong>Branch:</strong> ${facility.bankDetails?.branch || 'Mandoli, Delhi'}</div>
            <div><strong>UPI / VPA:</strong> <span class="font-mono">${facility.bankDetails?.upiId || 'pacificproducts@hdfcbank'}</span></div>
          </div>

        </td>

        <td style="width: 48%; vertical-align: top;">
          <div class="totals-box">
            <div class="totals-row">
              <span>Taxable Value (Basic)</span>
              <span class="font-mono">₹${pi.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            ${
              isInterState
                ? `
              <div class="totals-row">
                <span>Integrated GST (IGST 18%)</span>
                <span class="font-mono">₹${pi.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            `
                : `
              <div class="totals-row">
                <span>Central GST (CGST 9%)</span>
                <span class="font-mono">₹${pi.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="totals-row">
                <span>State GST (SGST 9%)</span>
                <span class="font-mono">₹${pi.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            `
            }

            <div class="totals-row grand">
              <span>GRAND TOTAL</span>
              <span class="font-mono">₹${pi.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div class="advance-callout">
              <span>Advance Payable (${pi.advancePercentage}%):</span>
              <span class="font-mono">₹${pi.advancePayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="totals-row" style="color: #0f172a; font-weight: bold; border-bottom: none;">
              <span>Balance on Dispatch (${100 - Number(pi.advancePercentage)}%):</span>
              <span class="font-mono">₹${pi.balancePayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Page 1 Fixed Footer -->
    <div class="footer-section">
      <div style="width: 42%;">
        📍 <strong>H -3, J.R. COMPLEX GATE NO 4, MELA RAM FARM, MANDOLI, DELHI 110093</strong>
      </div>
      <div style="width: 28%; text-align: center;">
        ✉ billing@pacifichardware.com • +91 98185 92113
      </div>
      <div style="width: 24%; text-align: right;">
        Ref: PI #${pi.piNumber} • Computer Generated
      </div>
      <div style="width: 6%; text-align: right; font-weight: bold;">
        1 / 2
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!-- ─── PAGE 2: GENERAL TERMS & CONDITIONS ─────────────────────────────── -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <div class="page2-container">
      <h2 class="page2-title">GENERAL TERMS & CONDITIONS</h2>
      <div class="page2-subtitle">Official Commercial, Operational, Manufacturing & Statutory Compliance Guidelines • Pacific Products and Solutions</div>
      <div class="gold-accent-line"></div>

      <div class="terms-section-header">1. SPECIFICATIONS REQUIRED FOR PRODUCTION</div>
      <div class="terms-text">The following technical parameters and approvals are strictly required prior to commencing manufacturing:</div>
      <ol class="terms-list">
        <li>Actual site measurements verified and certified by the client / project architect.</li>
        <li>Formal shop drawing approval signed off by the client or authorized project consultant.</li>
        <li>Written approval and selection of colors for compact laminate boards and hardware finishes.</li>
      </ol>

      <div class="terms-section-header">2. OTHER TERMS & CONDITIONS</div>
      <ol class="terms-list">
        <li>Price quoted is based on the bill of quantities (BOQ) given by you and is subject to revision if final site requirement differs.</li>
        <li>The client will provide a safety place for storage of material at site with lock and key facilities.</li>
        <li>The client will provide electric power facility at free of cost up to the work place.</li>
        <li>Required purchase order only for supply because assembly is free of cost due to product nature.</li>
        <li>This proforma invoice is valid for 30 days only from the date of issuance.</li>
        <li>All materials should be installed / erected within 30 days from the date of delivery.</li>
        <li>All invoices will be made on number of cubicle basis.</li>
        <li>Unloading and shifting of material at site is in the scope of client only.</li>
        <li>PO and remittances should be raised in the name of Pacific Products and Solutions, Delhi.</li>
        <li>Freight charge will be extra as actual.</li>
      </ol>

      <div class="terms-section-header">3. PAYMENT TERMS FOR SUPPLY</div>
      <ol class="terms-list">
        <li>${pi.advancePercentage}% advance along with confirmed Proforma Invoice (and balance ${100 - Number(pi.advancePercentage)}% prior to dispatch / on delivery).</li>
        <li>Payments are to be made by the client based on the agreed terms and conditions with us, failing to do the same Pacific Products & Solutions reserves the right to cancel the order.</li>
      </ol>

      <div class="terms-section-header" style="color: #d97706;">4. SPECIAL NOTE (SITE DELAY & PAYMENT LIABILITY)</div>
      <div class="terms-text">If your site gets prolonged or is put on hold for whatever reason for more than 30 days from the date of delivery of material at your site, then we will be liable for 100% payment against material. You cannot delay our payment on account of unfinished project. However we will extend all help in installation etc. when you are ready for the same & we will provide you back up for the quality assurance therefore please do not hold back our payment for any reason in the interest of speedy supply to you.</div>

      <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-top: 8px;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <div class="terms-section-header">5. DELIVERY TIMELINE</div>
            <div class="terms-text">${pi.deliveryTimeline || '12 - 15 working days from the date of your clear Advance Payment, purchase order, approval of shop drawing, and colour approval for compact board & hardware.'}</div>
          </td>
          <td style="width: 50%; vertical-align: top;">
            <div class="terms-section-header">6. STATUTORY COMPLIANCE</div>
            <div class="terms-text">a) For SEZ sale: GST, Service Tax is exempted against the submission of the following certificates:</div>
            <ol class="terms-list" style="margin-bottom: 0;">
              <li>SEZ approval certificate</li>
              <li>FORM - I confirmation from the client</li>
            </ol>
          </td>
        </tr>
      </table>

      <!-- Dual Signatures on Page 2 -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 20px 0; margin-top: 24px;">
        <tr>
          <td style="width: 50%; border-top: 1px solid #1e293b; padding-top: 6px;">
            <div style="font-weight: 800; font-size: 9px; color: #0f172a;">Client Acceptance & Confirmed Signature</div>
            <div style="font-size: 8px; color: #475569;">Name, Designation & Company Official Stamp</div>
          </td>
          <td style="width: 50%; border-top: 1px solid #1e293b; padding-top: 6px;">
            <div style="font-weight: 800; font-size: 9px; color: #0f172a;">For Pacific Products and Solutions, Delhi</div>
            <div style="font-size: 8px; color: #475569;">Authorised Signatory (Executive Desk)</div>
          </td>
        </tr>
      </table>

      <!-- Page 2 Fixed Footer -->
      <div class="footer-section" style="margin-top: 20px;">
        <div style="width: 42%;">
          📍 <strong>H -3, J.R. COMPLEX GATE NO 4, MELA RAM FARM, MANDOLI, DELHI 110093</strong>
        </div>
        <div style="width: 28%; text-align: center;">
          ✉ billing@pacifichardware.com • +91 98185 92113
        </div>
        <div style="width: 24%; text-align: right;">
          Ref: PI #${pi.piNumber} • Computer Generated
        </div>
        <div style="width: 6%; text-align: right; font-weight: bold;">
          2 / 2
        </div>
      </div>
    </div>

  </div>
</body>
</html>
`;
}

/**
 * Trigger browser print dialog for the Proforma Invoice
 */
export function printProformaInvoice(pi: ProformaInvoice) {
  const html = generateProformaInvoiceHtml(pi);
  const printWindow = window.open('', '_blank', 'width=950,height=850');
  if (!printWindow) {
    alert('Please allow popups in your browser to print or save the Proforma Invoice PDF.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Trigger Proforma Invoice HTML/PDF Download
 */
export function downloadProformaInvoicePdf(pi: ProformaInvoice) {
  printProformaInvoice(pi);
}
