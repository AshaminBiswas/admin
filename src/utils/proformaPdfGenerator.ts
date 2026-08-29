import { ProformaInvoice } from '../types/proforma';

/**
 * Generate official Proforma Invoice HTML for Print and PDF Export
 */
export function generateProformaInvoiceHtml(pi: ProformaInvoice): string {
  const isInterState = pi.igstTotal > 0;
  const facility = pi.facility;

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
      margin: 12mm 15mm 15mm 15mm;
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
      font-size: 11px;
      line-height: 1.4;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #34150F;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      color: #34150F;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 10px;
      font-weight: 700;
      color: #85431E;
      text-transform: uppercase;
      margin: 2px 0 6px 0;
    }
    .facility-badge {
      display: inline-block;
      background: #EACEAA;
      color: #34150F;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .facility-text {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.35;
    }
    .doc-type-title {
      font-size: 18px;
      font-weight: 900;
      color: #34150F;
      text-align: right;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-number {
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      font-weight: 800;
      color: #85431E;
      text-align: right;
      margin: 2px 0 6px 0;
    }
    .meta-box {
      background: #FAF5EE;
      border: 1px solid #EACEAA;
      border-radius: 6px;
      padding: 6px 10px;
      text-align: right;
      font-size: 10px;
      line-height: 1.5;
    }
    .meta-box strong {
      color: #34150F;
    }
    .two-column-grid {
      width: 100%;
      margin-bottom: 14px;
      border-collapse: separate;
      border-spacing: 10px 0;
    }
    .info-panel {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      vertical-align: top;
      font-size: 10px;
    }
    .panel-title {
      font-size: 10px;
      font-weight: 800;
      color: #34150F;
      text-transform: uppercase;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
      margin-bottom: 5px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 9.5px;
    }
    .items-table th {
      background: #34150F;
      color: #EACEAA;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #34150F;
      text-transform: uppercase;
      font-size: 9px;
    }
    .items-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .items-table tr:nth-child(even) td {
      background: #FAF5EE;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .font-mono {
      font-family: "Courier New", Courier, monospace;
    }
    .summary-grid {
      width: 100%;
      margin-top: 10px;
      border-collapse: separate;
      border-spacing: 10px 0;
    }
    .bank-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 9.5px;
      line-height: 1.45;
      color: #166534;
      vertical-align: top;
    }
    .bank-box strong {
      color: #14532d;
    }
    .totals-box {
      background: #FAF5EE;
      border: 1px solid #EACEAA;
      border-radius: 6px;
      padding: 8px 12px;
      vertical-align: top;
      font-size: 10px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 2.5px 0;
      border-bottom: 1px dashed #e2e8f0;
    }
    .totals-row.grand {
      font-size: 12px;
      font-weight: 900;
      color: #34150F;
      border-top: 1.5px solid #34150F;
      border-bottom: 1.5px solid #34150F;
      margin-top: 4px;
      padding: 5px 0;
    }
    .advance-callout {
      background: #fef3c7;
      border: 1px solid #fde047;
      border-radius: 6px;
      padding: 6px 10px;
      margin-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      font-weight: 800;
      color: #854d0e;
    }
    .footer-section {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #64748b;
    }
    .seal-box {
      text-align: right;
      width: 200px;
    }
    .seal-box .sign-space {
      height: 40px;
      border-bottom: 1px solid #94a3b8;
      margin-bottom: 4px;
    }
    @media print {
      body {
        margin: 0;
        background: transparent;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    
    <!-- Top Header -->
    <table class="header-table" style="border-collapse: collapse;">
      <tr>
        <td style="width: 58%; vertical-align: top;">
          <h1 class="brand-title">PRC HARDWARE</h1>
          <div class="brand-subtitle">Architectural & Commercial Hardware Solutions</div>
          <span class="facility-badge">${facility.name}</span>
          <div class="facility-text">
            <strong>Facility Origin:</strong> ${facility.address}, ${facility.city}, ${facility.state} - ${facility.pincode}<br/>
            <strong>GSTIN:</strong> ${facility.gstin} | <strong>State Code:</strong> ${facility.stateCode}<br/>
            <strong>Official Email:</strong> ${facility.email} | <strong>Phone:</strong> ${facility.phone}
          </div>
        </td>
        <td style="width: 42%; vertical-align: top;">
          <h2 class="doc-type-title">PROFORMA INVOICE</h2>
          <div class="doc-number">${pi.piNumber}</div>
          <div class="meta-box">
            <div><strong>Date of Issue:</strong> ${new Date(pi.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div><strong>Valid Until:</strong> ${new Date(pi.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            ${pi.poReference ? `<div><strong>Customer PO Ref:</strong> ${pi.poReference}</div>` : ''}
            ${pi.quoteReference ? `<div><strong>Quote Ref:</strong> ${pi.quoteReference}</div>` : ''}
            <div><strong>Place of Supply:</strong> ${pi.placeOfSupply} (${pi.placeOfSupplyCode})</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Buyer & Consignee Information -->
    <table class="two-column-grid">
      <tr>
        <td class="info-panel" style="width: 50%;">
          <div class="panel-title">Billed To (Customer / Entity)</div>
          <strong style="color: #34150F; font-size: 11px;">${pi.companyName || pi.customerName}</strong><br/>
          <strong>Contact Person:</strong> ${pi.customerName}<br/>
          <strong>Billing Address:</strong> ${pi.billingAddress}<br/>
          <strong>GSTIN / UIN:</strong> ${pi.customerGstin || 'Unregistered / B2C'}<br/>
          <strong>Phone:</strong> ${pi.customerPhone || 'N/A'} | <strong>Email:</strong> ${pi.customerEmail || 'N/A'}
        </td>
        <td class="info-panel" style="width: 50%;">
          <div class="panel-title">Shipped / Delivered To (Site Destination)</div>
          <strong style="color: #34150F; font-size: 11px;">${pi.companyName || pi.customerName}</strong><br/>
          <strong>Delivery Destination:</strong> ${pi.shippingAddress || pi.billingAddress}<br/>
          <strong>Dispatch Timeline:</strong> ${pi.deliveryTimeline}<br/>
          <strong>Payment Terms:</strong> ${pi.paymentTerms}<br/>
          <strong>Transport Mode:</strong> Surface Express / Dedicated Logistics
        </td>
      </tr>
    </table>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 32px;" class="text-center">#</th>
          <th>Item Description & Specification</th>
          <th style="width: 70px;">HSN/SAC</th>
          <th style="width: 55px;" class="text-right">Qty</th>
          <th style="width: 75px;" class="text-right">Rate (₹)</th>
          <th style="width: 75px;" class="text-right">Taxable (₹)</th>
          <th style="width: 50px;" class="text-center">GST %</th>
          <th style="width: 85px;" class="text-right">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${pi.items
          .map(
            (item, idx) => `
          <tr>
            <td class="text-center font-mono">${idx + 1}</td>
            <td>
              <strong>${item.productName}</strong>
              <div style="font-size: 8.5px; color: #64748b; font-family: monospace;">SKU: ${item.sku}</div>
              ${item.description ? `<div style="font-size: 8.5px; color: #475569;">${item.description}</div>` : ''}
            </td>
            <td class="font-mono">${item.hsnCode || '8302'}</td>
            <td class="text-right"><strong>${item.quantity}</strong> <span style="font-size: 8.5px; color: #64748b;">${item.unit}</span></td>
            <td class="text-right font-mono">₹${Number(item.unitPrice).toLocaleString('en-IN')}</td>
            <td class="text-right font-mono">₹${Number(item.taxableAmount).toLocaleString('en-IN')}</td>
            <td class="text-center font-mono">${item.gstRate}%</td>
            <td class="text-right font-mono"><strong>₹${Number(item.totalAmount).toLocaleString('en-IN')}</strong></td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <!-- Summary, Banking & Advance Breakdown -->
    <table class="summary-grid">
      <tr>
        <td class="bank-box" style="width: 52%;">
          <div style="font-weight: 800; font-size: 10.5px; margin-bottom: 4px; text-transform: uppercase;">
            Bank Account Details for RTGS / NEFT / IMPS
          </div>
          <div><strong>Bank Name:</strong> ${facility.bankName}</div>
          <div><strong>Account Name:</strong> ${facility.accountName}</div>
          <div><strong>Account Number:</strong> <span class="font-mono" style="font-size: 11px; font-weight: 800;">${facility.accountNumber}</span></div>
          <div><strong>IFSC Code:</strong> <span class="font-mono" style="font-weight: 800;">${facility.ifscCode}</span></div>
          <div><strong>Branch:</strong> ${facility.branch}</div>
          ${facility.upiId ? `<div><strong>UPI Virtual ID:</strong> <span class="font-mono">${facility.upiId}</span></div>` : ''}
          <div style="margin-top: 6px; font-size: 8.5px; color: #15803d;">
            * Please mention PI Reference <strong>${pi.piNumber}</strong> in NEFT narration.
          </div>
        </td>

        <td class="totals-box" style="width: 48%;">
          <div class="totals-row">
            <span>Basic Subtotal:</span>
            <span class="font-mono">₹${pi.subtotal.toLocaleString('en-IN')}</span>
          </div>

          ${
            isInterState
              ? `
            <div class="totals-row">
              <span>Integrated GST (IGST 18%):</span>
              <span class="font-mono">₹${pi.igstTotal.toLocaleString('en-IN')}</span>
            </div>
          `
              : `
            <div class="totals-row">
              <span>Central GST (CGST 9%):</span>
              <span class="font-mono">₹${pi.cgstTotal.toLocaleString('en-IN')}</span>
            </div>
            <div class="totals-row">
              <span>State GST (SGST 9%):</span>
              <span class="font-mono">₹${pi.sgstTotal.toLocaleString('en-IN')}</span>
            </div>
          `
          }

          <div class="totals-row grand">
            <span>Grand Total (Incl. Taxes):</span>
            <span class="font-mono">₹${pi.grandTotal.toLocaleString('en-IN')}</span>
          </div>

          <div class="advance-callout">
            <span>Advance Payable (${pi.advancePercentage}%):</span>
            <span class="font-mono">₹${pi.advancePayable.toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748b; margin-top: 3px; padding: 0 4px;">
            <span>Balance due at dispatch:</span>
            <span class="font-mono">₹${pi.balancePayable.toLocaleString('en-IN')}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Commercial Terms -->
    <div style="margin-top: 10px; background: #FAF5EE; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 8.5px; color: #475569;">
      <strong>Terms & Conditions:</strong><br/>
      1. This Proforma Invoice is valid for 30 calendar days from the date of issue.<br/>
      2. Production/Dispatch lead time commences upon receipt of the confirmed advance deposit.<br/>
      3. Prices quoted are inclusive of 18% GST and standard factory packing. Freight is chargeable as per agreed logistics terms.<br/>
      4. All disputes are subject to Delhi jurisdiction only.
    </div>

    <!-- Signatory Footer -->
    <div class="footer-section">
      <div style="width: 60%;">
        <strong>PRC HARDWARE</strong> • Architectural Hardware Specialists<br/>
        Computer-generated Proforma Invoice • Verification Ref: ${pi.id}
      </div>
      <div class="seal-box">
        <div class="sign-space"></div>
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
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Please allow popups to print or save the Proforma Invoice PDF.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 350);
}

/**
 * Trigger Proforma Invoice HTML/PDF Download
 */
export function downloadProformaInvoicePdf(pi: ProformaInvoice) {
  printProformaInvoice(pi);
}
