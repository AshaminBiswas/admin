import { ProformaInvoice } from '../types/proforma';

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
 * Matches the exact executive styling and corporate branding of Quotation and PO PDFs
 */
export function generateProformaInvoiceHtml(pi: ProformaInvoice): string {
  const isInterState = pi.igstTotal > 0;
  const facility = pi.facility;
  const grandTotalWords = numberToIndianRupees(pi.grandTotal);

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
      margin: 10mm 12mm 12mm 12mm;
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
      font-size: 10.5px;
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
      margin-bottom: 8px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin: 0;
      line-height: 1.1;
    }
    .brand-subtitle {
      font-size: 9.5px;
      font-weight: 800;
      color: #d97706;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 3px 0 6px 0;
    }
    .facility-badge {
      display: inline-block;
      background: #0f172a;
      color: #f59e0b;
      font-size: 8.5px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .facility-text {
      font-size: 9px;
      color: #475569;
      line-height: 1.35;
    }
    
    /* ── Right Meta Dossier Box ── */
    .doc-type-title {
      font-size: 19px;
      font-weight: 900;
      color: #0f172a;
      text-align: right;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }
    .doc-number {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      font-weight: 800;
      color: #d97706;
      text-align: right;
      margin: 2px 0 6px 0;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 3px solid #d97706;
      border-radius: 6px;
      padding: 6px 10px;
      text-align: right;
      font-size: 9.5px;
      line-height: 1.45;
    }
    .meta-box strong {
      color: #0f172a;
    }

    /* ── Gold Divider Accent ── */
    .gold-accent-line {
      height: 3px;
      background: linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #0f172a 100%);
      margin: 6px 0 12px 0;
      border-radius: 2px;
    }

    /* ── 2-Column Buyer / Consignee Panels ── */
    .two-column-grid {
      width: 100%;
      margin-bottom: 10px;
      border-collapse: separate;
      border-spacing: 10px 0;
    }
    .info-panel {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      vertical-align: top;
      font-size: 9.5px;
    }
    .panel-title {
      font-size: 9.5px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1.5px solid #d97706;
      padding-bottom: 3px;
      margin-bottom: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .panel-content strong {
      color: #0f172a;
    }

    /* ── Line Items Table ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 9px;
    }
    .items-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 6px 7px;
      border: 1px solid #1e293b;
      text-transform: uppercase;
      font-size: 8.5px;
      letter-spacing: 0.3px;
    }
    .items-table td {
      padding: 5.5px 7px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .items-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* ── Commercial Summary Grid ── */
    .summary-grid {
      width: 100%;
      margin-top: 8px;
      border-collapse: separate;
      border-spacing: 10px 0;
    }
    .bank-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 3px solid #16a34a;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 9px;
      line-height: 1.45;
      color: #166534;
      vertical-align: top;
    }
    .bank-box strong {
      color: #14532d;
    }
    .totals-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      vertical-align: top;
      font-size: 9.5px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      border-bottom: 1px dashed #e2e8f0;
    }
    .totals-row.grand {
      font-size: 11.5px;
      font-weight: 900;
      color: #0f172a;
      border-top: 1.5px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
      padding: 4px 0;
      margin-top: 4px;
    }
    .advance-callout {
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-left: 3px solid #d97706;
      border-radius: 4px;
      padding: 4px 6px;
      margin-top: 5px;
      font-weight: 800;
      color: #92400e;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
    }
    
    /* ── Signatory & Footer Section ── */
    .footer-section {
      margin-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      font-size: 8.5px;
      color: #64748b;
    }
    .seal-box {
      text-align: right;
      min-width: 190px;
    }
    .sign-space {
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
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
        <td style="width: 55%; vertical-align: top;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <div>
              <h1 class="brand-title">PRC HARDWARE</h1>
              <div class="brand-subtitle">Commercial Architectural Hardware Solutions</div>
            </div>
          </div>
          <span class="facility-badge">${facility.name} • DISPATCH WORKS</span>
          <div class="facility-text">
            <strong>${facility.addressLine1 || facility.address}</strong>${facility.addressLine2 ? ', ' + facility.addressLine2 : ''}<br />
            ${facility.city}, ${facility.state} - ${facility.postalCode || facility.pincode}, India<br />
            <strong>GSTIN:</strong> ${facility.gstin} &nbsp;|&nbsp; <strong>State Code:</strong> ${facility.stateCode}<br />
            <strong>Support:</strong> ${facility.email} &nbsp;|&nbsp; <strong>Phone:</strong> ${facility.phone}
          </div>
        </td>

        <td style="width: 45%; vertical-align: top;">
          <h2 class="doc-type-title">PROFORMA INVOICE</h2>
          <div class="doc-number">${pi.piNumber}</div>
          <div class="meta-box">
            <div><strong>Issue Date:</strong> ${new Date(pi.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div><strong>Valid Until:</strong> ${new Date(pi.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div><strong>Place of Supply:</strong> ${pi.placeOfSupply} (${pi.placeOfSupplyCode || '07'})</div>
            ${pi.quoteReference ? `<div><strong>Quote Ref:</strong> <span class="font-mono">${pi.quoteReference}</span></div>` : ''}
            ${pi.poReference ? `<div><strong>Buyer PO Ref:</strong> <span class="font-mono">${pi.poReference}</span></div>` : ''}
          </div>
        </td>
      </tr>
    </table>

    <!-- Gold Accent Line -->
    <div class="gold-accent-line"></div>

    <!-- 2-Column Buyer & Consignee Details -->
    <table class="two-column-grid">
      <tr>
        <td class="info-panel" style="width: 50%;">
          <div class="panel-title">
            <span>Billed To (Buyer Entity)</span>
            <span style="font-size: 8px; color: #d97706; font-weight: 700;">COMMERCIAL CLIENT</span>
          </div>
          <div class="panel-content">
            <strong style="font-size: 11px; color: #0f172a;">${pi.companyName || pi.customerName}</strong><br />
            ${pi.customerName && pi.companyName ? `<strong>Contact Person:</strong> ${pi.customerName}<br />` : ''}
            <strong>GSTIN:</strong> <span class="font-mono">${pi.customerGstin || 'Not Registered / Unregistered'}</span><br />
            <strong>Billing Address:</strong><br />
            ${pi.billingAddress.replace(/\n/g, '<br />')}<br />
            ${pi.customerPhone ? `<strong>Phone:</strong> ${pi.customerPhone} &nbsp;|&nbsp; ` : ''}
            ${pi.customerEmail ? `<strong>Email:</strong> ${pi.customerEmail}` : ''}
          </div>
        </td>

        <td class="info-panel" style="width: 50%;">
          <div class="panel-title">
            <span>Shipped To (Delivery Destination)</span>
            <span style="font-size: 8px; color: #059669; font-weight: 700;">SITE LOCATION</span>
          </div>
          <div class="panel-content">
            <strong style="font-size: 11px; color: #0f172a;">${pi.companyName || pi.customerName}</strong><br />
            <strong>Site / Delivery Address:</strong><br />
            ${pi.shippingAddress.replace(/\n/g, '<br />')}<br />
            <strong>Delivery Timeline:</strong> ${pi.deliveryTimeline || 'Standard dispatch upon advance realization'}<br />
            <strong>Commercial Terms:</strong> ${pi.paymentTerms || `${pi.advancePercentage}% Advance Deposit`}
          </div>
        </td>
      </tr>
    </table>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="text-center" style="width: 4%;">#</th>
          <th style="width: 44%;">Product Description & Specification</th>
          <th class="text-center" style="width: 10%;">HSN Code</th>
          <th class="text-center" style="width: 6%;">Qty</th>
          <th class="text-center" style="width: 7%;">Unit</th>
          <th class="text-right" style="width: 9%;">Rate (₹)</th>
          <th class="text-center" style="width: 6%;">GST %</th>
          <th class="text-right" style="width: 14%;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${pi.items
          .map(
            (item, index) => `
          <tr>
            <td class="text-center font-mono">${index + 1}</td>
            <td>
              <strong style="color: #0f172a;">${item.productName}</strong>
              <div style="font-size: 8px; color: #64748b; margin-top: 1px;">
                <span class="font-mono" style="color: #d97706; font-weight: bold;">SKU: ${item.sku}</span>
                ${item.description ? ` • ${item.description}` : ''}
              </div>
            </td>
            <td class="text-center font-mono">${item.hsnCode || '83024110'}</td>
            <td class="text-center font-mono" style="font-weight: 700;">${item.quantity}</td>
            <td class="text-center">${item.unit || 'PCS'}</td>
            <td class="text-right font-mono">₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td class="text-center font-mono">${item.gstRate || 18}%</td>
            <td class="text-right font-mono" style="font-weight: 700; color: #0f172a;">
              ₹${(item.totalAmount ?? item.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <!-- Amount in Words -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px 8px; font-size: 9px; margin-bottom: 6px;">
      <strong>Amount Chargeable (in words):</strong> <span style="font-style: italic; color: #0f172a;">${grandTotalWords}</span>
    </div>

    <!-- Commercial Summary & Bank Instructions Grid -->
    <table class="summary-grid">
      <tr>
        <td class="bank-box" style="width: 52%;">
          <div style="font-weight: 800; font-size: 10px; color: #166534; margin-bottom: 4px; border-bottom: 1px solid #bbf7d0; padding-bottom: 2px;">
            🏦 Official Bank Account Details for Advance RTGS / NEFT:
          </div>
          <strong>Beneficiary Account:</strong> ${facility.bankDetails?.accountName || facility.accountName}<br />
          <strong>Bank Name:</strong> ${facility.bankDetails?.bankName || facility.bankName}<br />
          <strong>Account Number:</strong> <span class="font-mono" style="font-weight: 900; font-size: 10px;">${facility.bankDetails?.accountNumber || facility.accountNumber}</span><br />
          <strong>IFSC Code:</strong> <span class="font-mono" style="font-weight: 900;">${facility.bankDetails?.ifsc || facility.ifscCode}</span> &nbsp;|&nbsp; <strong>Branch:</strong> ${facility.bankDetails?.branch || facility.branch}<br />
          <strong>Account Type:</strong> ${facility.bankDetails?.accountType || 'Current Account'} &nbsp;|&nbsp; <strong>UPI ID:</strong> <span class="font-mono">${facility.bankDetails?.upiId || facility.upiId || 'prchardware@hdfcbank'}</span>
        </td>

        <td class="totals-box" style="width: 48%;">
          <div class="totals-row">
            <span>Taxable Basic Subtotal:</span>
            <span class="font-mono">₹${pi.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          ${
            isInterState
              ? `
            <div class="totals-row">
              <span>Integrated GST (IGST 18%):</span>
              <span class="font-mono">₹${pi.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          `
              : `
            <div class="totals-row">
              <span>Central GST (CGST 9%):</span>
              <span class="font-mono">₹${pi.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="totals-row">
              <span>State GST (SGST 9%):</span>
              <span class="font-mono">₹${pi.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          `
          }

          <div class="totals-row grand">
            <span>Grand Total (Incl. GST):</span>
            <span class="font-mono">₹${pi.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div class="advance-callout">
            <span>Commercial Advance Payable (${pi.advancePercentage}%):</span>
            <span class="font-mono">₹${pi.advancePayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; color: #64748b; margin-top: 3px; padding: 0 2px;">
            <span>Balance due upon delivery readiness:</span>
            <span class="font-mono">₹${pi.balancePayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Commercial Terms -->
    <div style="margin-top: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #0f172a; border-radius: 4px; padding: 5px 8px; font-size: 8px; color: #475569; line-height: 1.35;">
      <strong>Commercial Terms & Conditions:</strong><br/>
      1. This Proforma Invoice is valid for 30 calendar days from the date of issuance.<br/>
      2. Production queueing and dispatch scheduling commence immediately upon receipt of the agreed advance deposit.<br/>
      3. Quoted prices include standard export-grade protective packaging and GST as applicable.<br/>
      4. All commercial transactions and agreements are subject to Delhi jurisdiction only.
    </div>

    <!-- Signatory Footer -->
    <div class="footer-section">
      <div style="width: 60%;">
        <strong>PRC HARDWARE</strong> • Premium Architectural Hardware<br/>
        Official Proforma Invoice Document • System Ref: ${pi.id}
      </div>
      <div class="seal-box">
        <div class="sign-space">
          <svg width="100" height="24" viewBox="0 0 110 32" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 24 C 14 6, 18 4, 26 21 C 30 28, 36 8, 44 16 C 52 24, 58 6, 68 20 C 76 12, 86 16, 98 22" />
            <line x1="2" y1="30" x2="108" y2="30" stroke="#94a3b8" stroke-width="0.75" />
          </svg>
        </div>
        <strong>Authorized Signatory</strong><br/>
        <span>Pacific Products & Solutions</span>
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
