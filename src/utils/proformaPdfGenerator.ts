import { ProformaInvoice } from '../types/proforma';
import { PRC_LOGO_DATA_URL } from '../assets/logo.base64';

/**
 * Generate official Proforma Invoice HTML for Print and PDF Export (Strict Monochrome Black & White)
 */
export function generateProformaInvoiceHtml(pi: ProformaInvoice): string {
  const isInterState = Number(pi.igstTotal || 0) > 0;
  const facility = pi.facility;
  const companyName = facility?.name || 'Pacific Products and Solutions';
  const companyGstin = facility?.gstin || '07AADFP3948F1Z1';
  const companyEmail = facility?.email || 'billing@pacifichardware.com';
  const companyPhone = facility?.phone || '+91 98185 92113';

  const customerName = pi.customerName || pi.companyName || 'Valued Commercial Client';
  const gstin = pi.customerGstin || (pi as any).gstin;
  const quoteRef = pi.quoteReference || (pi as any).quoteNumber;
  const poRef = pi.poReference || (pi as any).customerPoNumber;
  const issueDateFormatted = new Date(pi.issueDate || pi.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const advancePct = Number(pi.advancePercentage || 50);
  const advanceAmt = Number(pi.advancePayable || (pi as any).advanceAmount || (pi.grandTotal * advancePct) / 100);
  const balanceAmt = Number(pi.balancePayable || (pi as any).balanceDue || (pi.grandTotal - advanceAmt));
  const discountAmt = Number(pi.discountTotal || (pi as any).discount || 0);
  const shippingAmt = Number(pi.shippingCharges || (pi as any).shippingCost || 0);

  // Bank Info
  const bank = facility?.bankDetails || {
    bankName: facility?.bankName || 'HDFC Bank Ltd.',
    accountName: facility?.accountName || 'Pacific Products and Solutions',
    accountNumber: facility?.accountNumber || '50200012345678',
    ifsc: facility?.ifscCode || 'HDFC0001234',
    branch: facility?.branch || 'Mandoli, Delhi',
    upiId: facility?.upiId || 'pacificproducts@hdfcbank',
  };

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
      margin: 8mm 10mm 10mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #000000;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
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
    .logo-box {
      width: 74px;
      height: 74px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .logo-img {
      max-width: 72px;
      max-height: 72px;
      object-fit: contain;
      filter: grayscale(100%);
    }
    .brand-title {
      font-size: 15px;
      font-weight: 700;
      color: #000000;
      margin: 0 0 2px 0;
      line-height: 1.15;
    }
    .company-subtext {
      font-size: 9.5px;
      color: #000000;
      line-height: 1.35;
    }
    .qr-box {
      width: 72px;
      height: 72px;
      padding: 0;
      display: inline-block;
    }
    .qr-img {
      width: 72px;
      height: 72px;
      object-fit: contain;
    }
    .qr-label {
      font-size: 7.5px;
      font-weight: 700;
      color: #000000;
      text-align: right;
      margin-top: 2px;
      letter-spacing: 0.3px;
    }
    .pi-no-text {
      font-size: 12px;
      font-weight: 700;
      color: #000000;
      text-align: right;
      margin-top: 3px;
    }

    /* ── Dividing Rules ── */
    .rule-thick {
      height: 1.2px;
      background: #000000;
      margin: 6px 0;
    }
    .rule-thin {
      height: 0.9px;
      background: #000000;
      margin: 6px 0;
    }

    /* ── Title & Meta Strip ── */
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 4px 0 6px 0;
    }
    .doc-type-title {
      font-size: 21px;
      font-weight: 800;
      color: #000000;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .date-meta-table {
      border-collapse: collapse;
      font-size: 10.5px;
      color: #000000;
    }
    .date-meta-table td {
      padding: 1px 4px;
    }

    /* ── Two Column Party Details ── */
    .dossier-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .dossier-table td {
      vertical-align: top;
    }
    .dossier-heading {
      font-size: 10.5px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .dossier-client-name {
      font-size: 12px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 2px;
    }
    .dossier-text {
      font-size: 10px;
      color: #000000;
      line-height: 1.4;
    }

    /* ── Line Items Table ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 12px 0;
      font-size: 10px;
    }
    .items-table th, .items-table td {
      border: 1px solid #000000;
      padding: 6px 8px;
    }
    .items-table th {
      background: #f2f2f2;
      font-weight: 700;
      font-size: 9.5px;
      text-align: center;
      color: #000000;
    }
    .items-table th.left, .items-table td.left {
      text-align: left;
    }
    .items-table th.center, .items-table td.center {
      text-align: center;
    }
    .items-table th.right, .items-table td.right {
      text-align: right;
    }
    .product-title {
      font-weight: 700;
      color: #000000;
      font-size: 10.5px;
      text-transform: uppercase;
    }
    .sku-desc {
      font-size: 9px;
      color: #333333;
      margin-top: 2px;
    }

    /* ── Bottom Section: Bank Left & Summary Right ── */
    .bottom-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    .bottom-table td {
      vertical-align: top;
    }
    .bank-heading {
      font-size: 10.5px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 6px;
    }
    .bank-meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .bank-meta-table td {
      padding: 1.5px 2px;
      color: #000000;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    .summary-table td {
      padding: 2.5px 0;
      color: #000000;
    }
    .grand-total-row td {
      font-size: 12.5px;
      font-weight: 800;
      color: #000000;
      padding: 5px 0;
    }

    /* ── Signatory Section ── */
    .signatory-box {
      margin-top: 18px;
    }
    .sign-title {
      font-size: 11px;
      font-weight: 700;
      color: #000000;
    }
    .sign-company {
      font-size: 10px;
      color: #000000;
      margin-top: 1px;
      margin-bottom: 30px;
    }
    .sign-line {
      width: 160px;
      border-bottom: 1px solid #000000;
      margin-bottom: 4px;
    }
    .sign-name {
      font-size: 10px;
      color: #000000;
    }

    /* ── Fixed Footer ── */
    .footer-bar {
      margin-top: 20px;
      border-top: 1px solid #000000;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #000000;
    }

    /* ── Page 2: Terms ── */
    .page-break {
      page-break-before: always;
      margin-top: 20px;
    }
    .terms-main-title {
      font-size: 17px;
      font-weight: 800;
      color: #000000;
      margin-top: 2px;
      margin-bottom: 6px;
    }
    .terms-section-title {
      font-size: 11px;
      font-weight: 700;
      color: #000000;
      margin-top: 10px;
      margin-bottom: 3px;
    }
    .terms-list {
      margin: 0;
      padding-left: 18px;
      font-size: 9.8px;
      color: #000000;
      line-height: 1.45;
    }
    .terms-list li {
      margin-bottom: 3px;
    }
  </style>
</head>
<body>

  <div class="invoice-card">
    <!-- 1. Header Row -->
    <table class="header-table">
      <tr>
        <td style="width: 76px; vertical-align: top;">
          <div class="logo-box">
            <img src="${PRC_LOGO_DATA_URL}" class="logo-img" alt="PRC Logo" />
          </div>
        </td>
        <td style="padding-left: 12px; vertical-align: top;">
          <div class="brand-title">${companyName}</div>
          <div class="company-subtext">H -3, J.R. Complex Gate No 4, Mela Ram Farm,</div>
          <div class="company-subtext">Mandoli, Delhi 110093, India</div>
          <div class="company-subtext">GSTIN: ${companyGstin}</div>
          <div class="company-subtext">Email: ${companyEmail}</div>
          <div class="company-subtext">Phone: ${companyPhone}  |  Website: www.pacifichardware.com</div>
        </td>
        <td style="text-align: right; vertical-align: top; width: 140px;">
          ${pi.qrCodeDataUrl ? `
            <div style="display: inline-block; text-align: right;">
              <div class="qr-box">
                <img src="${pi.qrCodeDataUrl}" class="qr-img" alt="QR Verification" />
              </div>
              <div class="qr-label">QR VERIFICATION</div>
            </div>
          ` : ''}
          <div class="pi-no-text">PI No.: ${pi.piNumber}</div>
        </td>
      </tr>
    </table>

    <!-- 2. 1.2pt Horizontal Divider -->
    <div class="rule-thick"></div>

    <!-- 3. Title & Date Meta Row -->
    <div class="title-row">
      <div class="doc-type-title">PROFORMA INVOICE</div>
      <table class="date-meta-table">
        <tr>
          <td>Issue Date</td>
          <td>:</td>
          <td style="text-align: right; font-weight: 600;">${issueDateFormatted}</td>
        </tr>
        <tr>
          <td>Financial Year</td>
          <td>:</td>
          <td style="text-align: right; font-weight: 600;">${pi.financialYear || '2026-2027'}</td>
        </tr>
      </table>
    </div>

    <!-- 4. 0.9pt Horizontal Divider -->
    <div class="rule-thin"></div>

    <!-- 5. Two Column Party Details -->
    <table class="dossier-table">
      <tr>
        <td style="width: 48%;">
          <div class="dossier-heading">BILL TO (BUYER)</div>
          <div class="dossier-client-name">${customerName}</div>
          ${pi.companyName && pi.companyName !== customerName ? `<div class="dossier-text">${pi.companyName}</div>` : ''}
          ${gstin ? `<div class="dossier-text">GSTIN: ${gstin}</div>` : ''}
          <div class="dossier-text">${pi.customerEmail || ''}${pi.customerPhone ? `  |  Ph: ${pi.customerPhone}` : ''}</div>
          <div style="font-weight: 700; font-size: 10px; margin-top: 4px;">Billing Address:</div>
          <div class="dossier-text">${pi.billingAddress || 'As per client records'}</div>
        </td>
        <td style="width: 4%;">
          <div style="width: 0.7px; height: 110px; background: #000000; margin: 0 auto;"></div>
        </td>
        <td style="width: 48%;">
          <div class="dossier-heading">ORDER & PROJECT DETAILS</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <tr>
              <td style="width: 110px; padding: 1.5px 0;">Order Type</td>
              <td style="width: 10px;">:</td>
              <td style="font-weight: 600;">${quoteRef ? `Linked Quote #${quoteRef}` : (poRef ? `Client PO #${poRef}` : 'Commercial Supply Order')}</td>
            </tr>
            <tr>
              <td style="padding: 1.5px 0;">FY</td>
              <td>:</td>
              <td style="font-weight: 600;">${pi.financialYear || '2026-2027'}</td>
            </tr>
            <tr>
              <td style="padding: 1.5px 0;">PI Number</td>
              <td>:</td>
              <td style="font-weight: 600;">${pi.piNumber}</td>
            </tr>
            <tr>
              <td style="padding: 1.5px 0;">Payment Terms</td>
              <td>:</td>
              <td style="font-weight: 600;">${pi.paymentTerms || `${advancePct}% Advance, Balance at Dispatch`}</td>
            </tr>
            <tr>
              <td style="padding: 1.5px 0; vertical-align: top;">Delivery Address</td>
              <td style="vertical-align: top;">:</td>
              <td style="font-size: 9.5px; color: #000000;">${pi.shippingAddress || pi.billingAddress || 'To be confirmed prior to dispatch'}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- 6. Line Items Table with #F2F2F2 header -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="center" style="width: 34px;">#</th>
          <th class="left">DESCRIPTION / PRODUCT SPECIFICATION</th>
          <th class="center" style="width: 68px;">HSN / SAC</th>
          <th class="center" style="width: 48px;">UNIT</th>
          <th class="center" style="width: 52px;">QTY</th>
          <th class="center" style="width: 72px;">RATE (₹)</th>
          <th class="center" style="width: 68px;">${isInterState ? 'IGST (₹)' : 'GST (₹)'}</th>
          <th class="center" style="width: 73px;">TOTAL (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${(pi.items || []).map((item, idx) => {
          const unitRate = item.unitPrice || (item as any).unitRate || 0;
          const lineTotal = item.totalAmount || (item as any).lineTotal || (item as any).total || 0;
          const taxAmt = isInterState
            ? Number(item.igstAmount || 0)
            : Number(item.cgstAmount || 0) + Number(item.sgstAmount || 0);

          return `
            <tr>
              <td class="center">${idx + 1}</td>
              <td class="left">
                <div class="product-title">${item.productName || 'HARDWARE FITTING'}</div>
                <div class="sku-desc">SKU: ${item.sku || 'N/A'}${item.description ? `  |  ${item.description}` : ''}</div>
              </td>
              <td class="center">${item.hsnCode || '83024110'}</td>
              <td class="center">${item.unit || 'PCS'}</td>
              <td class="center">${Number(item.quantity || 1)}</td>
              <td class="right">${Number(unitRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="right">${taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="right" style="font-weight: 600;">${Number(lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <!-- 7. Bottom Table: Bank Account Details Left & Summary Breakdown Right -->
    <table class="bottom-table">
      <tr>
        <td style="width: 52%; padding-right: 18px;">
          <div class="bank-heading">BANK ACCOUNT DETAILS FOR RTGS / NEFT / IMPS</div>
          <table class="bank-meta-table">
            <tr>
              <td style="width: 95px;">Bank Name</td>
              <td style="width: 10px;">:</td>
              <td style="font-weight: 600;">${bank.bankName || 'HDFC Bank Ltd.'}</td>
            </tr>
            <tr>
              <td>Account Name</td>
              <td>:</td>
              <td style="font-weight: 600;">${bank.accountName || 'Pacific Products and Solutions'}</td>
            </tr>
            <tr>
              <td>Account No.</td>
              <td>:</td>
              <td style="font-weight: 600;">${bank.accountNumber || '50200012345678'}</td>
            </tr>
            <tr>
              <td>IFSC Code</td>
              <td>:</td>
              <td style="font-weight: 600;">${bank.ifsc || 'HDFC0001234'}</td>
            </tr>
            <tr>
              <td>Branch</td>
              <td>:</td>
              <td>${bank.branch || 'Mandoli, Delhi'}</td>
            </tr>
            <tr>
              <td>UPI / VPA</td>
              <td>:</td>
              <td>${bank.upiId || 'pacificproducts@hdfcbank'}</td>
            </tr>
          </table>

          <!-- Authorised Signatory Block -->
          <div class="signatory-box">
            <div class="sign-title">Authorised Signatory</div>
            <div class="sign-company">For ${companyName}</div>
            <div class="sign-line"></div>
            <div class="sign-name">(${pi.signedBy || 'Executive Desk'})</div>
          </div>
        </td>

        <td style="width: 48%;">
          <table class="summary-table">
            <tr>
              <td>Taxable Value (Basic)</td>
              <td style="text-align: right;">₹${Number(pi.taxableAmount || pi.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ${discountAmt > 0 ? `
              <tr>
                <td>Trade Discount</td>
                <td style="text-align: right;">- ₹${Number(discountAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ` : ''}
            ${isInterState ? `
              <tr>
                <td>IGST (18%)</td>
                <td style="text-align: right;">₹${Number(pi.igstTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ` : `
              <tr>
                <td>CGST (9%)</td>
                <td style="text-align: right;">₹${Number(pi.cgstTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>SGST (9%)</td>
                <td style="text-align: right;">₹${Number(pi.sgstTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `}
            ${shippingAmt > 0 ? `
              <tr>
                <td>Logistics & Freight</td>
                <td style="text-align: right;">₹${Number(shippingAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ` : ''}
            ${Number(pi.roundOff || 0) !== 0 ? `
              <tr>
                <td>Round Off Adjustment</td>
                <td style="text-align: right;">₹${Number(pi.roundOff).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ` : ''}
            <tr>
              <td colspan="2" style="padding: 3px 0;"><div style="height: 0.8px; background: #000000;"></div></td>
            </tr>
            <tr class="grand-total-row">
              <td>GRAND TOTAL</td>
              <td style="text-align: right;">₹${Number(pi.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 3px 0;"><div style="height: 0.8px; background: #000000;"></div></td>
            </tr>
            <tr>
              <td>Advance Payable (${advancePct}%)</td>
              <td style="text-align: right; font-weight: 600;">₹${Number(advanceAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Balance on Dispatch (${100 - advancePct}%)</td>
              <td style="text-align: right; font-weight: 600;">₹${Number(balanceAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Fixed Footer -->
    <div class="footer-bar">
      <div>Ref: PI #${pi.piNumber}    |    Computer Generated</div>
      <div>1 / 1</div>
    </div>

    <!-- ── PAGE 2: GENERAL TERMS & CONDITIONS ── -->
    <div class="page-break">
      <div style="font-size: 11px; font-weight: 700; color: #000000;">${companyName}</div>
      <div class="terms-main-title">GENERAL TERMS & CONDITIONS</div>
      <div class="rule-thick"></div>

      <div class="terms-section-title">1. SPECIFICATIONS REQUIRED FOR PRODUCTION</div>
      <div style="font-size: 9.8px; color: #000000; margin-bottom: 4px;">The following technical parameters and approvals are strictly required prior to commencing manufacturing:</div>
      <ol class="terms-list">
        <li>Actual site measurements verified and certified by the client / project architect.</li>
        <li>Formal shop drawing approval signed off by the client or authorized project consultant.</li>
        <li>Written approval and selection of colors for compact laminate boards and hardware finishes.</li>
      </ol>

      <div class="terms-section-title">2. OTHER TERMS & CONDITIONS</div>
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

      <div class="terms-section-title">3. PAYMENT TERMS FOR SUPPLY</div>
      <ol class="terms-list">
        <li>${advancePct}% advance along with confirmed Proforma Invoice (and balance ${100 - advancePct}% prior to dispatch / on delivery).</li>
        <li>Payments are to be made by the client based on the agreed terms and conditions with us, failing to do the same Pacific Products & Solutions reserves the right to cancel the order.</li>
      </ol>

      <div class="terms-section-title">4. SPECIAL NOTE (SITE DELAY & PAYMENT LIABILITY)</div>
      <div style="font-size: 9.8px; color: #000000; line-height: 1.45; margin-bottom: 8px;">
        If your site gets prolonged or is put on hold for whatever reason for more than 30 days from the date of delivery of material at your site, then we will be liable for 100% payment against material. You cannot delay our payment on account of unfinished project. However we will extend all help in installation etc. when you are ready for the same & we will provide you back up for the quality assurance therefore please do not hold back our payment for any reason in the interest of speedy supply to you.
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 6px;">
        <tr>
          <td style="width: 48%; vertical-align: top;">
            <div class="terms-section-title">5. DELIVERY TIMELINE</div>
            <div style="font-size: 9.8px; color: #000000; line-height: 1.45;">
              ${pi.deliveryTimeline || '12 - 15 working days from the date of your clear Advance Payment, purchase order, approval of shop drawing, and colour approval for compact board & hardware.'}
            </div>
          </td>
          <td style="width: 4%;"></td>
          <td style="width: 48%; vertical-align: top;">
            <div class="terms-section-title">6. STATUTORY COMPLIANCE</div>
            <div style="font-size: 9.8px; color: #000000; line-height: 1.45;">
              a) For SEZ sale: GST, Service Tax is exempted against the submission of SEZ approval certificate and FORM - I confirmation from the client.
            </div>
          </td>
        </tr>
      </table>

      <!-- Dual Signatures on Page 2 -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 36px;">
        <tr>
          <td style="width: 48%; vertical-align: top;">
            <div style="width: 180px; border-bottom: 1px solid #000000; margin-bottom: 6px;"></div>
            <div style="font-size: 10.5px; font-weight: 700; color: #000000;">${pi.digitalSignature ? `✔ Digitally Accepted by: ${customerName}` : 'Client Acceptance & Confirmed Signature'}</div>
            <div style="font-size: 9.5px; color: #333333;">Name, Designation & Company Official Stamp</div>
          </td>
          <td style="width: 4%;"></td>
          <td style="width: 48%; vertical-align: top;">
            <div style="width: 180px; border-bottom: 1px solid #000000; margin-bottom: 6px;"></div>
            <div style="font-size: 10.5px; font-weight: 700; color: #000000;">For ${companyName}, Delhi</div>
            <div style="font-size: 9.5px; color: #333333;">Authorised Signatory (${pi.signedBy || 'Executive Desk'})</div>
          </td>
        </tr>
      </table>

      <!-- Footer for Page 2 -->
      <div class="footer-bar" style="margin-top: 40px;">
        <div>Ref: PI #${pi.piNumber}    |    Computer Generated</div>
        <div>2 / 2</div>
      </div>
    </div>
  </div>

</body>
</html>
`;
}

/**
 * Trigger browser print dialog for a Proforma Invoice
 */
export function printProformaInvoice(pi: ProformaInvoice): void {
  const html = generateProformaInvoiceHtml(pi);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
