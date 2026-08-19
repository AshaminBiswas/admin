/**
 * GST Calculator — decimal-safe, integer-paise arithmetic.
 * CLIENT-SIDE DISPLAY ONLY: server always recalculates before persisting.
 * Uses Math.round(value * 100) integer arithmetic to avoid JS float errors.
 */

export interface DraftLineItem {
  sl_no: number;
  description: string;
  hsn_sac: string;
  is_service: boolean;
  quantity: number;    // may be fractional (e.g. 2.5 kg)
  unit: string;
  unit_price: number;  // rupees per unit
  discount: number;    // flat discount in rupees
  gst_rate: number;   // e.g. 18 for 18%
  cess_rate: number;  // e.g. 0 or 3
  product_id?: string;
}

export interface CalculatedLineItem extends DraftLineItem {
  total_amount: number;    // unit_price × quantity
  taxable_value: number;   // total_amount - discount
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  total_item_value: number; // taxable + all taxes
}

export interface InvoiceTotals {
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  round_off: number;
  grand_total: number;
  grand_total_before_round: number;
}

// ─── Core arithmetic helpers ───────────────────────────────────────────────────

/** Safely multiply to paise and round */
function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert paise back to rupees (2 decimal places) */
function toRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/** Compute rounded paise from a percentage: paise = round(basePaise * rate / 100) */
function taxPaise(basePaise: number, ratePercent: number): number {
  return Math.round(basePaise * ratePercent / 100);
}

// ─── Intra / Inter-state determination ────────────────────────────────────────

/**
 * Returns true if the transaction is inter-state (IGST applies).
 * Supply Type: if customer state_code !== company state_code → IGST.
 */
export function isInterState(
  customerStateCode: string,
  companyStateCode: string
): boolean {
  if (!customerStateCode || !companyStateCode) return false;
  return customerStateCode.trim() !== companyStateCode.trim();
}

// ─── Per-line calculation ──────────────────────────────────────────────────────

export function calculateLineItem(
  item: DraftLineItem,
  interstate: boolean
): CalculatedLineItem {
  const qty = item.quantity || 0;
  const unitPricePaise = toPaise(item.unit_price || 0);
  const discountPaise = toPaise(item.discount || 0);

  // total_amount = unit_price × qty (no discount here — discount is on taxable)
  const totalAmountPaise = Math.round(unitPricePaise * qty); // qty may be decimal
  // taxable_value = total_amount - discount
  const taxableValuePaise = Math.max(0, totalAmountPaise - discountPaise);

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (interstate) {
    igstPaise = taxPaise(taxableValuePaise, item.gst_rate || 0);
  } else {
    const halfRate = (item.gst_rate || 0) / 2;
    cgstPaise = taxPaise(taxableValuePaise, halfRate);
    sgstPaise = taxPaise(taxableValuePaise, halfRate);
  }

  const cessPaise = taxPaise(taxableValuePaise, item.cess_rate || 0);
  const totalItemValuePaise =
    taxableValuePaise + cgstPaise + sgstPaise + igstPaise + cessPaise;

  return {
    ...item,
    total_amount: toRupees(totalAmountPaise),
    taxable_value: toRupees(taxableValuePaise),
    cgst_amount: toRupees(cgstPaise),
    sgst_amount: toRupees(sgstPaise),
    igst_amount: toRupees(igstPaise),
    cess_amount: toRupees(cessPaise),
    total_item_value: toRupees(totalItemValuePaise),
  };
}

// ─── Invoice-level totals ──────────────────────────────────────────────────────

export function calculateInvoiceTotals(
  calculatedItems: CalculatedLineItem[]
): InvoiceTotals {
  let taxableAmtPaise = 0;
  let cgstAmtPaise = 0;
  let sgstAmtPaise = 0;
  let igstAmtPaise = 0;
  let cessAmtPaise = 0;

  for (const item of calculatedItems) {
    taxableAmtPaise += toPaise(item.taxable_value);
    cgstAmtPaise += toPaise(item.cgst_amount);
    sgstAmtPaise += toPaise(item.sgst_amount);
    igstAmtPaise += toPaise(item.igst_amount);
    cessAmtPaise += toPaise(item.cess_amount);
  }

  const grandBeforeRoundPaise =
    taxableAmtPaise + cgstAmtPaise + sgstAmtPaise + igstAmtPaise + cessAmtPaise;

  // Round-off to nearest rupee
  const grandRoundedPaise = Math.round(grandBeforeRoundPaise / 100) * 100;
  const roundOffPaise = grandRoundedPaise - grandBeforeRoundPaise;

  return {
    taxable_amount: toRupees(taxableAmtPaise),
    cgst_amount: toRupees(cgstAmtPaise),
    sgst_amount: toRupees(sgstAmtPaise),
    igst_amount: toRupees(igstAmtPaise),
    cess_amount: toRupees(cessAmtPaise),
    grand_total_before_round: toRupees(grandBeforeRoundPaise),
    round_off: toRupees(roundOffPaise),
    grand_total: toRupees(grandRoundedPaise),
  };
}

// ─── Formatting helpers ────────────────────────────────────────────────────────

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatINRCompact(amount: number): string {
  if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return formatINR(amount);
}

/** Converts grand total to words (Indian numbering) */
export function amountInWords(amount: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function numToWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
  }

  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);
  let result = numToWords(rupees);
  if (!result) result = 'Zero';
  result += ' Rupees';
  if (paise > 0) result += ' and ' + numToWords(paise) + ' Paise';
  result += ' Only';
  return result;
}
