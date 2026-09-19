import { CustomerDuesDetail } from '../types/paymentFollowup';
import { PACIFIC_LOGO_DATA_URL } from '../assets/pacific_logo.base64';

function formatINR(val: number | null | undefined): string {
  const n = Number(val || 0);
  return `\u20B9${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Generate official Statement of Account HTML for Print & PDF Export (Pure Black & White)
 */
export function generateStatementOfAccountHtml(detail: CustomerDuesDetail): string {
  const customer = detail.customer;
  const summary = detail.summary;
  const statementDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Calculate chronological events
  const allEvents: Array<{
    date: Date;
    refNo: string;
    description: string;
    debit: number;
    credit: number;
  }> = [];

  for (const d of detail.dues) {
    allEvents.push({
      date: new Date(d.referenceDate),
      refNo: d.documentNumber,
      description: d.sourceType === 'OPENING_BALANCE' ? 'Historical Opening Dues' : `${d.sourceType} Billing`,
      debit: d.totalAmount,
      credit: 0,
    });
  }

  for (const a of detail.paymentAllocations) {
    allEvents.push({
      date: new Date(a.paymentDate),
      refNo: a.transactionRef ? `REF-${a.transactionRef}` : 'PAYMENT',
      description: `Payment via ${a.paymentMode} (${a.targetDocumentNumber || a.targetType})`,
      debit: 0,
      credit: a.allocatedAmount,
    });
  }

  allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  let totalDebit = 0;
  let totalCredit = 0;
  let runningBalance = 0;

  const tableRowsHtml = allEvents
    .map((ev) => {
      totalDebit += ev.debit;
      totalCredit += ev.credit;
      runningBalance += ev.debit - ev.credit;

      return `
      <tr>
        <td style="text-align: center; border-bottom: 1px solid #ddd; padding: 6px 8px;">${formatDate(ev.date)}</td>
        <td style="border-bottom: 1px solid #ddd; padding: 6px 8px; font-weight: 500;">
          ${ev.refNo}
          <div style="font-size: 10px; color: #555; font-weight: normal;">${ev.description}</div>
        </td>
        <td style="text-align: right; border-bottom: 1px solid #ddd; padding: 6px 8px;">${ev.debit > 0 ? formatINR(ev.debit) : '-'}</td>
        <td style="text-align: right; border-bottom: 1px solid #ddd; padding: 6px 8px;">${ev.credit > 0 ? formatINR(ev.credit) : '-'}</td>
        <td style="text-align: right; border-bottom: 1px solid #ddd; padding: 6px 8px; font-weight: bold;">${formatINR(runningBalance)}</td>
      </tr>
    `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>STATEMENT OF ACCOUNT — ${customer.companyName || customer.name}</title>
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
      color: #000000;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      border-bottom: 2px solid #000000;
      padding-bottom: 8px;
    }
    .dossier-box {
      width: 100%;
      border: 1px solid #000000;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .dossier-box td {
      padding: 8px 10px;
      vertical-align: top;
    }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .ledger-table th {
      background-color: #f2f2f2;
      border-top: 1px solid #000000;
      border-bottom: 1px solid #000000;
      padding: 6px 8px;
      font-size: 10.5px;
      text-transform: uppercase;
      font-weight: bold;
    }
    .total-box {
      width: 100%;
      border: 2px solid #000000;
      background: #f8f8f8;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .signatory-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <!-- Letterhead Header -->
  <table class="header-table">
    <tr>
      <td style="vertical-align: middle; width: 45%;">
        <img src="${PACIFIC_LOGO_DATA_URL}" style="max-height: 48px; max-width: 180px; object-fit: contain;" alt="Pacific Products & Solutions" />
      </td>
      <td style="text-align: right; vertical-align: middle; width: 55%;">
        <div style="font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Pacific Products & Solutions</div>
        <div style="font-size: 10px; color: #444;">Kh. No. 59/23, Gali No. 8, Friends Colony, Industrial Area, Mandoli, Delhi - 110093</div>
        <div style="font-size: 10px; color: #444;">GSTIN: <strong>07AADFP3948F1Z1</strong> | Ph: +91 99990 00000 | billing@pacifichardware.com</div>
      </td>
    </tr>
  </table>

  <!-- Title & Date -->
  <table style="width: 100%; margin-bottom: 10px;">
    <tr>
      <td>
        <span style="font-size: 15px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Statement of Account</span>
      </td>
      <td style="text-align: right;">
        <span style="font-size: 11px; font-weight: bold;">Statement Date: ${statementDate}</span>
      </td>
    </tr>
  </table>

  <!-- Two Column Dossier Box -->
  <table class="dossier-box">
    <tr>
      <td style="width: 55%; border-right: 1px solid #000000;">
        <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #666; margin-bottom: 4px;">Customer / Account Profile</div>
        <div style="font-size: 13px; font-weight: bold;">${customer.companyName || customer.name}</div>
        ${customer.companyName && customer.name !== customer.companyName ? `<div style="font-size: 10.5px; color: #333;">Attn: ${customer.name}</div>` : ''}
        ${customer.billingAddress ? `<div style="font-size: 10px; color: #444; margin-top: 2px;">Address: ${customer.billingAddress}</div>` : ''}
        ${customer.gstin ? `<div style="font-size: 10.5px; font-weight: bold; margin-top: 2px;">GSTIN: ${customer.gstin}</div>` : ''}
        ${customer.phone ? `<div style="font-size: 10px; margin-top: 2px;">Phone: ${customer.phone}</div>` : ''}
        ${customer.email ? `<div style="font-size: 10px;">Email: ${customer.email}</div>` : ''}
      </td>
      <td style="width: 45%; background-color: #fafafa;">
        <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #666; margin-bottom: 6px;">Receivables Summary</div>
        <table style="width: 100%; font-size: 10.5px;">
          <tr>
            <td>Total Invoiced Value:</td>
            <td style="text-align: right; font-weight: 600;">${formatINR(totalDebit)}</td>
          </tr>
          <tr>
            <td>Total Payments Received:</td>
            <td style="text-align: right; font-weight: 600;">${formatINR(totalCredit)}</td>
          </tr>
          <tr>
            <td colspan="2" style="border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;"></td>
          </tr>
          <tr style="font-size: 12px; font-weight: bold;">
            <td>TOTAL OUTSTANDING:</td>
            <td style="text-align: right;">${formatINR(summary.totalOutstanding)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Itemized Ledger Table -->
  <table class="ledger-table">
    <thead>
      <tr>
        <th style="width: 14%; text-align: center;">Date</th>
        <th style="width: 40%; text-align: left;">Particulars / Reference</th>
        <th style="width: 15%; text-align: right;">Debit (₹)</th>
        <th style="width: 15%; text-align: right;">Credit (₹)</th>
        <th style="width: 16%; text-align: right;">Balance (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
    <tfoot>
      <tr style="background: #f2f2f2; font-weight: bold; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000;">
        <td colspan="2" style="text-align: right; padding: 6px 8px;">TOTALS:</td>
        <td style="text-align: right; padding: 6px 8px;">${formatINR(totalDebit)}</td>
        <td style="text-align: right; padding: 6px 8px;">${formatINR(totalCredit)}</td>
        <td style="text-align: right; padding: 6px 8px;">${formatINR(summary.totalOutstanding)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Prominent Total Outstanding Box -->
  <div class="total-box">
    <table style="width: 100%;">
      <tr>
        <td style="font-size: 13px; font-weight: 800; text-transform: uppercase;">
          Total Outstanding Balance Due:
        </td>
        <td style="text-align: right; font-size: 16px; font-weight: 900;">
          ${formatINR(summary.totalOutstanding)}
        </td>
      </tr>
    </table>
  </div>

  <!-- Bank Remittance & Dual Signatory Block -->
  <table class="signatory-table">
    <tr>
      <td style="width: 60%; vertical-align: top; font-size: 10px; line-height: 1.5;">
        <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #555;">Official Bank Remittance Details:</div>
        <div>Bank Name: <strong>HDFC Bank Ltd.</strong></div>
        <div>Account Name: <strong>Pacific Products and Solutions</strong></div>
        <div>Current Account No: <strong>50200088991122</strong></div>
        <div>IFSC Code: <strong>HDFC0001234</strong> | Branch: <strong>Mandoli, Delhi - 110093</strong></div>
        <div>UPI ID / VPA: <strong>prchardware@hdfcbank</strong></div>
        <div style="font-style: italic; color: #666; margin-top: 3px;">Please share the transaction UTR number or deposit receipt upon transfer.</div>
      </td>
      <td style="width: 40%; text-align: right; vertical-align: bottom;">
        <div style="font-size: 11px; font-weight: bold;">For PACIFIC PRODUCTS & SOLUTIONS</div>
        <div style="height: 45px;"></div>
        <div style="display: inline-block; border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 4px; font-size: 10px; color: #444;">
          Authorized Signatory / Accounts Desk
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Triggers native browser print preview for Statement of Account.
 */
export function printStatementOfAccount(detail: CustomerDuesDetail): void {
  const html = generateStatementOfAccountHtml(detail);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to preview and print Statement of Account');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 350);
}
