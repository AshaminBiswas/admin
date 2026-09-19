/**
 * purchaseOrderPdfGenerator.ts
 *
 * Official Purchase Order HTML Generator for Print and In-Browser Preview.
 * Strict Pure Black & White (Monochrome) Design mirroring the Proforma Invoice:
 * - High contrast black text (#000000)
 * - Solid black dividing rules and table grid (#000000 / #333333)
 * - Clean white / neutral table background (#F2F2F2 / #FFFFFF)
 * - Supports brand selection (Pacific Products & Solutions vs PRC Hardware) and logo selection
 */

import { PurchaseOrder } from '../types/purchaseOrder';
import { PRC_LOGO_DATA_URL } from '../assets/logo.base64';
import { PACIFIC_LOGO_DATA_URL } from '../assets/pacific_logo.base64';

export const COMPANY_PROFILES: Record<string, {
  name: string;
  title: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  signatory: string;
}> = {
  PACIFIC_PRODUCTS: {
    name: 'Pacific Products & Solutions',
    title: 'PACIFIC PRODUCTS & SOLUTIONS',
    gstin: '07AADFP3948F1Z1',
    address: 'H-3, J.R. Complex, Gate No 4, Mela Ram Farm, Mandoli, Delhi - 110093',
    phone: '+91 98185 92113 / +91 11 2233 4455',
    email: 'billing@pacifichardware.com',
    signatory: 'Pacific Products & Solutions, Delhi',
  },
  PRC_HARDWARE: {
    name: 'PRC Hardware',
    title: 'PRC HARDWARE (Pacific Rehousing Corp.)',
    gstin: '07AABCP1234F1Z9',
    address: 'H-5, J.R. Complex, Melaram Farm Gate No. 4, Sewa Dham Rd, Mandoli, Delhi 201102',
    phone: '+91 98185 92113',
    email: 'purchase@prchardware.com',
    signatory: 'PRC Hardware, Delhi',
  },
};

export function formatINR(value: number | null | undefined): string {
  const n = Number(value || 0);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Generates official Purchase Order HTML for preview and browser print.
 */
export function generatePurchaseOrderHtml(po: PurchaseOrder): string {
  const entityKey = (po.companyEntity || 'PACIFIC_PRODUCTS').toUpperCase();
  const profile = COMPANY_PROFILES[entityKey] || COMPANY_PROFILES.PACIFIC_PRODUCTS;

  const logoChoice = po.companyLogo || (entityKey === 'PRC_HARDWARE' ? 'prc' : 'pacific');
  const selectedLogo = logoChoice === 'prc' ? PRC_LOGO_DATA_URL : PACIFIC_LOGO_DATA_URL;

  const fullPoNumber = po.revision && po.revision > 0 ? `${po.poNumber}-R${po.revision}` : po.poNumber;
  const isInterState = Boolean(po.isInterState || Number(po.igstTotal || 0) > 0);

  const supplier = po.supplier || {
    name: 'Supplier / Vendor',
    contactPerson: '—',
    phone: '—',
    email: '—',
    address: '—',
    gstNumber: '—',
  };

  const branch = po.branch || {
    name: 'Delhi HQ',
    address: profile.address,
    city: 'Delhi',
    state: 'Delhi',
    gstin: profile.gstin,
    phone: profile.phone,
    email: profile.email,
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PURCHASE ORDER - ${fullPoNumber}</title>
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
    .po-card {
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
    .po-header-right {
      text-align: right;
    }
    .po-title {
      font-size: 20px;
      font-weight: 800;
      color: #000000;
      letter-spacing: 0.5px;
      margin: 0 0 4px 0;
    }
    .po-no-badge {
      font-size: 12px;
      font-weight: 700;
      font-family: monospace;
      color: #000000;
    }

    /* ── Dividing Rules ── */
    .rule-thick {
      height: 1.2px;
      background: #000000;
      margin: 6px 0;
    }
    .rule-thin {
      height: 0.8px;
      background: #000000;
      margin: 6px 0;
    }

    /* ── Two Column Dossier ── */
    .dossier-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .dossier-box {
      width: 49%;
      vertical-align: top;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      border-radius: 4px;
    }
    .dossier-heading {
      font-size: 9.5px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 4px;
      text-transform: uppercase;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
    }
    .dossier-name {
      font-size: 12px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 2px;
    }
    .dossier-text {
      font-size: 10px;
      color: #18181b;
      line-height: 1.4;
    }

    /* ── Line Items Table ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 10px 0;
      font-size: 10px;
    }
    .items-table th, .items-table td {
      border: 1px solid #000000;
      padding: 5px 6px;
    }
    .items-table th {
      background: #f2f2f2;
      font-weight: 700;
      font-size: 9px;
      text-align: center;
      color: #000000;
      text-transform: uppercase;
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
    .item-title {
      font-weight: 700;
      color: #000000;
      font-size: 10px;
    }
    .item-sku {
      font-size: 8.5px;
      color: #333333;
      font-family: monospace;
    }

    /* ── Bottom Section ── */
    .bottom-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    .bottom-table td {
      vertical-align: top;
    }
    .terms-heading {
      font-size: 9.5px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .terms-text {
      font-size: 9px;
      color: #27272a;
      line-height: 1.4;
    }
    .calc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .calc-table td {
      padding: 2.5px 4px;
    }
    .calc-total-row td {
      font-size: 12px;
      font-weight: 800;
      color: #000000;
      border-top: 1px solid #000000;
      border-bottom: 1px solid #000000;
      background: #f2f2f2;
      padding: 4px;
    }

    /* ── Words Box ── */
    .words-box {
      background: #f8fafc;
      border: 1px solid #000000;
      padding: 4px 8px;
      font-size: 9.5px;
      font-weight: 700;
      color: #000000;
      margin: 8px 0;
    }

    /* ── Signatures ── */
    .signatory-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
    }
    .sign-line {
      width: 160px;
      border-bottom: 1px solid #000000;
      margin-bottom: 4px;
    }
    .sign-title {
      font-size: 10px;
      font-weight: 700;
      color: #000000;
    }
    .sign-subtext {
      font-size: 8.5px;
      color: #52525b;
    }

    /* ── Footer ── */
    .footer-bar {
      margin-top: 16px;
      border-top: 1px solid #000000;
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #52525b;
    }
  </style>
</head>
<body>

  <div class="po-card">
    <!-- Header Table -->
    <table class="header-table">
      <tr>
        <td style="width: 80px; vertical-align: middle;">
          <div class="logo-box">
            <img src="${selectedLogo}" class="logo-img" alt="Logo" />
          </div>
        </td>
        <td style="vertical-align: middle; padding-left: 8px;">
          <div class="brand-title">${profile.title}</div>
          <div class="company-subtext">${profile.address}</div>
          <div class="company-subtext"><strong>GSTIN:</strong> ${profile.gstin}  |  <strong>Email:</strong> ${profile.email}  |  <strong>Phone:</strong> ${profile.phone}</div>
        </td>
        <td class="po-header-right" style="vertical-align: middle;">
          <div class="po-title">PURCHASE ORDER</div>
          <div class="po-no-badge">PO #: ${fullPoNumber}</div>
          <div style="font-size: 10px; color: #000000; margin-top: 2px;">Date: <strong>${formatDate(po.issueDate)}</strong></div>
          <div style="font-size: 9.5px; color: #27272a; margin-top: 1px;">Delivery Due: <strong>${po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : 'Within 10 Days'}</strong></div>
        </td>
      </tr>
    </table>

    <div class="rule-thick"></div>

    <!-- Two-Column Party Details Dossier -->
    <table class="dossier-table">
      <tr>
        <!-- Left: Vendor Block -->
        <td class="dossier-box">
          <div class="dossier-heading">Vendor / Supplier Details</div>
          <div class="dossier-name">${supplier.name}</div>
          <div class="dossier-text">${supplier.address || 'Address on file'}</div>
          <div class="dossier-text" style="margin-top: 2px;">
            <strong>Contact Person:</strong> ${supplier.contactPerson || '—'} ${supplier.phone ? `(${supplier.phone})` : ''}
          </div>
          <div class="dossier-text"><strong>GSTIN:</strong> ${supplier.gstNumber || 'Unregistered / Not Provided'}</div>
          <div class="dossier-text"><strong>Email:</strong> ${supplier.email || '—'}</div>
        </td>

        <td style="width: 2%;"></td>

        <!-- Right: Ship-To Branch Block -->
        <td class="dossier-box">
          <div class="dossier-heading">Ship-To / Delivery Destination</div>
          <div class="dossier-name">${branch.name} Depot</div>
          <div class="dossier-text">${branch.address || profile.address}</div>
          <div class="dossier-text">${branch.city || 'Delhi'}, ${branch.state || 'Delhi'}</div>
          <div class="dossier-text" style="margin-top: 2px;">
            <strong>Receiving GSTIN:</strong> ${branch.gstin || profile.gstin}
          </div>
          <div class="dossier-text"><strong>Depot Phone:</strong> ${branch.phone || profile.phone}</div>
        </td>
      </tr>
    </table>

    <div class="rule-thin"></div>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 4%;">Sr.</th>
          <th class="left" style="width: 32%;">Item / Hardware Specification</th>
          <th style="width: 9%;">HSN</th>
          <th class="right" style="width: 7%;">Qty</th>
          <th style="width: 7%;">Unit</th>
          <th class="right" style="width: 12%;">Rate (₹)</th>
          <th class="right" style="width: 12%;">Taxable (₹)</th>
          <th style="width: 5%;">GST</th>
          <th class="right" style="width: 12%;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${po.items.map((item, idx) => `
          <tr>
            <td class="center">${idx + 1}</td>
            <td class="left">
              <div class="item-title">${item.itemName}</div>
              <div class="item-sku">SKU: ${item.itemSku}${item.description ? ` | ${item.description}` : ''}</div>
            </td>
            <td class="center" style="font-family: monospace;">${item.hsnCode || '8302'}</td>
            <td class="right font-bold" style="font-weight: 700;">${item.quantity}</td>
            <td class="center">${item.unit || 'PCS'}</td>
            <td class="right font-mono">${Number(item.unitRate).toFixed(2)}</td>
            <td class="right font-mono">${Number(item.taxableAmount).toFixed(2)}</td>
            <td class="center font-mono">${Number(item.gstRate || 18)}%</td>
            <td class="right font-mono font-bold" style="font-weight: 700;">${Number(item.lineTotal).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Bottom Breakdown -->
    <table class="bottom-table">
      <tr>
        <!-- Terms & Notes Left -->
        <td style="width: 54%; padding-right: 12px;">
          <div class="terms-heading">Standard Terms & Conditions</div>
          <div class="terms-text">
            1. <strong>Payment Terms:</strong> ${po.paymentTerms || '30 days from material receipt and tax invoice submission.'}<br />
            2. <strong>Delivery Terms:</strong> ${po.deliveryTerms || 'Door delivery at destination branch with freight paid by supplier.'}<br />
            3. <strong>Quality & Inspection:</strong> Material subject to factory incoming QC. Rejected items to be replaced within 7 days.<br />
            4. <strong>Statutory Compliance:</strong> Tax charged strictly per valid GST rules. HSN must match delivery challan.
          </div>
          ${po.notes ? `
            <div style="margin-top: 6px; padding: 4px 6px; background: #f4f4f5; border-left: 2px solid #000000; font-size: 8.5px;">
              <strong>Special Instructions:</strong> ${po.notes}
            </div>
          ` : ''}
        </td>

        <!-- Tax Calculation Right -->
        <td style="width: 46%;">
          <table class="calc-table">
            <tr>
              <td>Subtotal (Taxable Amount):</td>
              <td style="text-align: right; font-weight: 600;">${formatINR(po.taxableAmount)}</td>
            </tr>
            ${isInterState ? `
              <tr>
                <td>Integrated GST (IGST):</td>
                <td style="text-align: right;">${formatINR(po.igstTotal)}</td>
              </tr>
            ` : `
              <tr>
                <td>Central GST (CGST):</td>
                <td style="text-align: right;">${formatINR(po.cgstTotal)}</td>
              </tr>
              <tr>
                <td>State GST (SGST):</td>
                <td style="text-align: right;">${formatINR(po.sgstTotal)}</td>
              </tr>
            `}
            <tr class="calc-total-row">
              <td>TOTAL ORDER VALUE:</td>
              <td style="text-align: right;">${formatINR(po.grandTotal)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Amount in Words -->
    <div class="words-box">
      Amount in Words: <span>${po.totalInWords || 'Indian Rupees Only'}</span>
    </div>

    <!-- Dual Signatures -->
    <table class="signatory-table">
      <tr>
        <td style="width: 48%; vertical-align: top;">
          <div class="sign-line" style="margin-top: 24px;"></div>
          <div class="sign-title">Vendor Acceptance & Confirmed Signature</div>
          <div class="sign-subtext">Authorised Representative with Firm Official Stamp</div>
        </td>
        <td style="width: 4%;"></td>
        <td style="width: 48%; vertical-align: top;">
          <div class="sign-line" style="margin-top: 24px;"></div>
          <div class="sign-title">For ${profile.signatory}</div>
          <div class="sign-subtext">Authorised Signatory (Procurement Desk)</div>
        </td>
      </tr>
    </table>

    <!-- Footer Bar -->
    <div class="footer-bar">
      <div>Ref: ${fullPoNumber}  |  Computer Generated Purchase Order</div>
      <div>Page 1 of 1</div>
    </div>
  </div>

</body>
</html>
  `;
}

/**
 * Trigger browser print preview window for a Purchase Order
 */
export function printPurchaseOrder(po: PurchaseOrder): void {
  const html = generatePurchaseOrderHtml(po);
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
