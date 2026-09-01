/**
 * QRDocumentValidatorPage.tsx
 *
 * Comprehensive QR Scanner & Cryptographic Document Tamper Validation Hub for Admin Panel.
 * Features:
 * 1. Live Camera Scanner (HTML5 Video + jsQR decoder)
 * 2. Image / Screenshot Drag & Drop QR Decoder
 * 3. Manual Identifier Lookup (Token, URL, Verification ID, PI Number, Hash)
 * 4. Claimed Values Tamper Inspection Matrix (detects physical paper invoice forgery)
 * 5. Complete Registry of all QR-secured commercial documents with high-res modal & print badges
 * 6. Audit logs of all scan verification verdicts
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  QrCode, ShieldCheck, ShieldAlert, ShieldX, Search, Camera,
  Upload, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  FileText, Copy, Check, ExternalLink, Download, Printer,
  Eye, Building2, User, Hash, DollarSign, Calendar, ArrowRight,
  Sparkles, Lock, Layers, Sliders, Info, AlertCircle, Maximize2,
  Minimize2, ChevronRight, X, FileCheck2, FileUp, Loader2
} from 'lucide-react';
import jsQR from 'jsqr';
import * as pdfjsLib from 'pdfjs-dist';
import { proformaService } from '../api/proformaService';
import { ProformaInvoice } from '../types/proforma';
import { useAdminAuth } from '../context/AdminAuthContext';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('[pdfjs-dist] Worker init:', e);
  }
}

type ActiveTab = 'scanner' | 'registry' | 'audit';
type ScanMode = 'camera' | 'upload' | 'manual';

interface TamperDiscrepancy {
  field: string;
  originalValue: any;
  claimedValue: any;
  status: 'MATCH' | 'MISMATCH';
  message: string;
}

interface ValidationReport {
  success: boolean;
  verdict: 'AUTHENTIC' | 'MANIPULATED' | 'UNSIGNED_DRAFT' | 'DOCUMENT_NOT_FOUND';
  isTampered: boolean;
  message: string;
  discrepancies?: TamperDiscrepancy[];
  cryptoResult?: any;
  document?: any;
}

export function QRDocumentValidatorPage() {
  const { setCurrentView } = useAdminAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  const [scanMode, setScanMode] = useState<ScanMode>('manual');

  // Scanner & Query State
  const [queryInput, setQueryInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);

  // PDF Parsing & Upload State
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Claimed Discrepancy Form (for physical paper audit)
  const [enableClaimedCheck, setEnableClaimedCheck] = useState(false);
  const [claimedTotal, setClaimedTotal] = useState<string>('');
  const [claimedAdvance, setClaimedAdvance] = useState<string>('');
  const [claimedGstin, setClaimedGstin] = useState<string>('');
  const [claimedCustomer, setClaimedCustomer] = useState<string>('');
  const [claimedItemsCount, setClaimedItemsCount] = useState<string>('');

  // Camera Scanner State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const animFrameIdRef = useRef<number | null>(null);

  // QR Registry State
  const [registryInvoices, setRegistryInvoices] = useState<ProformaInvoice[]>([]);
  const [loadingRegistry, setLoadingRegistry] = useState(false);
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryStatusFilter, setRegistryStatusFilter] = useState('ALL');

  // QR Modal State
  const [selectedQrInvoice, setSelectedQrInvoice] = useState<ProformaInvoice | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Audit Logs (locally tracked in session)
  const [auditLogs, setAuditLogs] = useState<Array<{
    id: string;
    timestamp: string;
    query: string;
    piNumber?: string;
    customerName?: string;
    verdict: string;
    isTampered: boolean;
    discrepanciesCount: number;
  }>>([]);

  // Load Registry on Mount
  const loadRegistry = async () => {
    setLoadingRegistry(true);
    try {
      const res = await proformaService.listProformaInvoices({ limit: 100 });
      if (res && res.data) {
        setRegistryInvoices(res.data);
      }
    } catch (err) {
      console.warn('[QRValidator] Failed to load registry:', err);
    } finally {
      setLoadingRegistry(false);
    }
  };

  useEffect(() => {
    loadRegistry();
  }, []);

  // ── Camera Scanner Logic ───────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this device/browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        requestAnimationFrame(tickScanner);
      }
    } catch (err: any) {
      console.error('[Camera Error]:', err);
      setCameraError(err?.message || 'Failed to open camera. Please check browser permissions.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const tickScanner = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx && videoRef.current) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          // QR Decoded!
          stopCamera();
          setQueryInput(code.data);
          handleValidate(code.data);
          return;
        }
      }
    }
    if (isCameraActive) {
      animFrameIdRef.current = requestAnimationFrame(tickScanner);
    }
  };

  useEffect(() => {
    if (scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [scanMode, cameraFacing]);

  // ── Unified File Upload (PDF & Image) QR Decoder ───────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      await parseAndValidatePdf(file);
    } else {
      parseAndValidateImage(file);
    }
  };

  const parseAndValidateImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          setQueryInput(code.data);
          handleValidate(code.data);
        } else {
          alert('No QR code detected in this image. Please ensure the QR code is clearly visible or enter the PI Number manually.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const parseAndValidatePdf = async (file: File) => {
    setIsParsingPdf(true);
    setPdfStatus('Reading PDF document structure...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      setPdfStatus('Rendering pages and inspecting QR code...');

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = Math.min(pdf.numPages, 5);

      let detectedQrData = '';
      let extractedText = '';

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setPdfStatus(`Scanning Page ${pageNum} of ${numPages} for security QR seal...`);
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          await (page.render({ canvasContext: ctx, viewport, canvas } as any).promise);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            detectedQrData = code.data;
          }
        }

        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((it: any) => (it as any).str || '').join(' ');
        extractedText += ' ' + pageText;

        if (detectedQrData) break;
      }

      setPdfStatus('Extracting commercial identifiers...');

      // Extract potential identifiers from text if QR code was not decoded
      const piMatch = extractedText.match(/PRC[\/-]PI[\/-][A-Z0-9\/-]+/i) || extractedText.match(/PI\s*(?:No\.?|#)\s*:?\s*([A-Z0-9\/-]+)/i);
      const verMatch = extractedText.match(/VER-PI-[0-9A-Za-z-]+/i);
      const urlMatch = extractedText.match(/pacifichardware\.com\/verify\/pi\/([a-zA-Z0-9_-]+)/i);

      const resolvedQuery =
        detectedQrData ||
        (urlMatch ? urlMatch[0] : null) ||
        (verMatch ? verMatch[0] : null) ||
        (piMatch ? piMatch[0] : null) ||
        '';

      // Auto-populate claimed values if found in PDF text
      const totalMatch = extractedText.match(/(?:Grand\s*Total|Total\s*Payable|Invoice\s*Total)[^\d]*([\d,]+\.?\d*)/i);
      if (totalMatch && totalMatch[1]) {
        const parsed = parseFloat(totalMatch[1].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          setClaimedTotal(String(parsed));
          setEnableClaimedCheck(true);
        }
      }

      const gstinMatch = extractedText.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b/);
      if (gstinMatch && gstinMatch[0]) {
        setClaimedGstin(gstinMatch[0]);
        setEnableClaimedCheck(true);
      }

      if (resolvedQuery) {
        setQueryInput(resolvedQuery);
        setPdfStatus(`Found identifier: ${resolvedQuery}. Validating...`);
        await handleValidate(resolvedQuery);
      } else {
        alert('Could not automatically detect a PRC QR code or PI Number in this PDF. Please enter the PI number or token manually.');
      }
    } catch (err: any) {
      console.error('[PDF Parsing Error]:', err);
      alert('Failed to parse PDF document: ' + (err?.message || err));
    } finally {
      setIsParsingPdf(false);
      setPdfStatus('');
    }
  };

  // ── Core Validation Handler ────────────────────────────────────────────────
  const handleValidate = async (targetQuery?: string) => {
    const q = (targetQuery || queryInput).trim();
    if (!q) {
      alert('Please enter a verification token, URL, Verification ID, or PI Number.');
      return;
    }

    setIsValidating(true);
    setValidationReport(null);

    try {
      const payload: any = { query: q };
      if (enableClaimedCheck) {
        if (claimedTotal) payload.claimedTotal = parseFloat(claimedTotal);
        if (claimedAdvance) payload.claimedAdvance = parseFloat(claimedAdvance);
        if (claimedGstin) payload.claimedGstin = claimedGstin.trim();
        if (claimedCustomer) payload.claimedCustomer = claimedCustomer.trim();
        if (claimedItemsCount) payload.claimedItemsCount = parseInt(claimedItemsCount, 10);
      }

      const res = await proformaService.validateDocumentTamper(payload);
      setValidationReport(res as any);

      // Append to audit log
      setAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          query: q,
          piNumber: res?.document?.piNumber,
          customerName: res?.document?.customerName,
          verdict: res?.verdict || 'UNKNOWN',
          isTampered: Boolean(res?.isTampered),
          discrepanciesCount: res?.discrepancies?.filter((d) => d.status === 'MISMATCH').length || 0,
        },
        ...prev.slice(0, 49),
      ]);
    } catch (err: any) {
      console.error('[Tamper Validator Error]:', err);
      setValidationReport({
        success: false,
        verdict: 'DOCUMENT_NOT_FOUND',
        isTampered: true,
        message: err?.message || 'Verification service failed to query database record.',
        discrepancies: [
          {
            field: 'SERVER_QUERY',
            originalValue: 'DATABASE_RECORD',
            claimedValue: q,
            status: 'MISMATCH',
            message: 'Network or database query failure.',
          },
        ],
      });
    } finally {
      setIsValidating(false);
    }
  };

  // ── Quick Validate from Registry ───────────────────────────────────────────
  const quickValidateFromRegistry = (inv: ProformaInvoice) => {
    setActiveTab('scanner');
    setScanMode('manual');
    const token = inv.verificationToken || inv.piNumber;
    setQueryInput(token);
    handleValidate(token);
  };

  // ── Filtered Registry Invoices ─────────────────────────────────────────────
  const filteredRegistry = useMemo(() => {
    return registryInvoices.filter((inv) => {
      const q = registrySearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.piNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        (inv.companyName && inv.companyName.toLowerCase().includes(q)) ||
        (inv.customerGstin && inv.customerGstin.toLowerCase().includes(q)) ||
        (inv.verificationId && inv.verificationId.toLowerCase().includes(q));

      const matchesStatus =
        registryStatusFilter === 'ALL' ||
        (registryStatusFilter === 'SEALED' && Boolean(inv.digitalSignature)) ||
        (registryStatusFilter === 'DRAFT' && !inv.digitalSignature) ||
        inv.status.toUpperCase() === registryStatusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [registryInvoices, registrySearch, registryStatusFilter]);

  // Registry KPI metrics
  const registryKpis = useMemo(() => {
    const total = registryInvoices.length;
    const sealed = registryInvoices.filter((i) => Boolean(i.digitalSignature)).length;
    const totalValue = registryInvoices.reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);
    return { total, sealed, totalValue };
  }, [registryInvoices]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 font-sans">

      {/* ── Page Header & Zero-Trust Trust Badge ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#27272A]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400">
              <QrCode size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#FAFAFA] tracking-tight">
                QR Scanner & Document Authenticity Validator
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#A1A1AA] mt-0.5">
                Real-time cryptographic tamper detection & anti-fraud verification engine for commercial invoices
              </p>
            </div>
          </div>
        </div>

        {/* Global Security Pill & Mode Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Zero-Trust Hash Verifier: ACTIVE
          </div>
          <button
            onClick={() => setCurrentView('proforma-invoices')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA] text-xs font-bold hover:bg-slate-200 dark:hover:bg-[#3F3F46] transition-colors"
          >
            <FileText size={14} /> Back to PI Hub
          </button>
        </div>
      </div>

      {/* ── Top Tabs Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#27272A] pb-px">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 ${
            activeTab === 'scanner'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-500/5'
              : 'border-transparent text-slate-500 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-[#FAFAFA]'
          }`}
        >
          <Camera size={16} /> Live Scanner & Tamper Inspector
        </button>
        <button
          onClick={() => setActiveTab('registry')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 ${
            activeTab === 'registry'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-500/5'
              : 'border-transparent text-slate-500 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-[#FAFAFA]'
          }`}
        >
          <Layers size={16} /> All Generated QR Registry
          <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-[#27272A] text-[10px] font-bold">
            {registryInvoices.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 ${
            activeTab === 'audit'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-500/5'
              : 'border-transparent text-slate-500 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-[#FAFAFA]'
          }`}
        >
          <ShieldAlert size={16} /> Scan Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ─── TAB 1: SCANNER & TAMPER INSPECTOR ───────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Input Controller (Camera / Image / Manual) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm space-y-4">
              
              {/* Scan Mode Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-[#FAFAFA]">
                  Scanning Method
                </span>
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#27272A]">
                  <button
                    onClick={() => setScanMode('camera')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      scanMode === 'camera'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-[#FAFAFA]'
                    }`}
                  >
                    <Camera size={13} /> Camera
                  </button>
                  <button
                    onClick={() => setScanMode('upload')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      scanMode === 'upload'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-[#FAFAFA]'
                    }`}
                  >
                    <Upload size={13} /> Upload
                  </button>
                  <button
                    onClick={() => setScanMode('manual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      scanMode === 'manual'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-[#FAFAFA]'
                    }`}
                  >
                    <Hash size={13} /> Manual
                  </button>
                </div>
              </div>

              {/* Mode 1: Camera Scanner Viewport */}
              {scanMode === 'camera' && (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-dashed border-violet-500/40">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scanning Crosshair Overlay */}
                    {isCameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-2 border-violet-400 rounded-2xl relative">
                          <div className="absolute inset-x-0 top-0 h-0.5 bg-violet-400 shadow-[0_0_8px_#8B5CF6] animate-[bounce_2s_infinite]" />
                          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-violet-400" />
                          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-violet-400" />
                          <div className="absolute bottom-2 left-2 w-3 h-2 border-b-2 border-l-2 border-violet-400" />
                          <div className="absolute bottom-2 right-2 w-3 h-2 border-b-2 border-r-2 border-violet-400" />
                        </div>
                      </div>
                    )}

                    {!isCameraActive && !cameraError && (
                      <div className="text-center p-4 text-slate-400 space-y-2">
                        <Camera size={36} className="mx-auto text-violet-400 animate-pulse" />
                        <p className="text-xs">Initializing camera feed...</p>
                      </div>
                    )}

                    {cameraError && (
                      <div className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center text-center space-y-2 text-red-400">
                        <AlertTriangle size={32} />
                        <p className="text-xs font-bold">{cameraError}</p>
                        <button
                          onClick={startCamera}
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-bold hover:bg-red-500/30"
                        >
                          Retry Camera
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="flex items-center justify-between text-xs">
                    <button
                      onClick={() => setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA] font-bold hover:bg-slate-200 dark:hover:bg-[#3F3F46]"
                    >
                      Flip Camera ({cameraFacing === 'environment' ? 'Rear' : 'Front'})
                    </button>
                    <span className="text-[11px] text-slate-400">Point at invoice QR code</span>
                  </div>
                </div>
              )}

              {/* Mode 2: Upload PDF File / Image / Screenshot */}
              {scanMode === 'upload' && (
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center p-7 rounded-xl border-2 border-dashed border-slate-300 dark:border-[#3F3F46] hover:border-violet-500 bg-slate-50 dark:bg-[#27272A]/30 cursor-pointer transition-all relative overflow-hidden group">
                    {isParsingPdf ? (
                      <div className="flex flex-col items-center justify-center space-y-2.5 py-4 text-center">
                        <Loader2 size={36} className="text-violet-500 animate-spin" />
                        <span className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA]">
                          Inspecting PDF Document Pages...
                        </span>
                        <span className="text-[11px] text-violet-400 font-mono animate-pulse">{pdfStatus}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2 text-violet-500">
                          <FileUp size={30} />
                          <QrCode size={24} />
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA] text-center">
                          Upload PDF Proforma Invoice or Image
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 text-center">
                          Click or drag official PDF invoice, scan screenshot, or image
                        </span>

                        <div className="mt-3 flex items-center gap-1.5 flex-wrap justify-center">
                          <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-bold">
                            PDF Invoices (.pdf)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-[#27272A] text-slate-700 dark:text-[#A1A1AA] text-[10px] font-bold">
                            PNG / JPG / WEBP
                          </span>
                        </div>
                      </>
                    )}

                    <input
                      type="file"
                      accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileUpload}
                      disabled={isParsingPdf}
                      className="hidden"
                    />
                  </label>

                  {uploadedFileName && (
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#27272A] text-xs">
                      <span className="font-mono text-slate-700 dark:text-[#FAFAFA] truncate max-w-[240px]">
                        📄 {uploadedFileName}
                      </span>
                      {isParsingPdf && (
                        <span className="text-[10px] text-violet-400 font-bold flex items-center gap-1">
                          <Loader2 size={12} className="animate-spin" /> Scanning...
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mode 3: Manual Input Bar */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-[#A1A1AA] flex items-center justify-between">
                  <span>Document Identifier or Verification Link</span>
                  <span className="text-[10px] text-slate-400">PI No, Token, Hash</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                    placeholder="e.g. PRC/PI/2026-2027/0001 or paste URL..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  />
                  {queryInput && (
                    <button
                      onClick={() => setQueryInput('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Physical Paper Discrepancy Inspector Toggle */}
              <div className="pt-2 border-t border-slate-200 dark:border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setEnableClaimedCheck(!enableClaimedCheck)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-[#A1A1AA] hover:text-violet-500 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sliders size={14} />
                    Physical Paper Forgery Inspector
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    enableClaimedCheck ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-200 dark:bg-[#27272A]'
                  }`}>
                    {enableClaimedCheck ? 'ON' : 'OFF'}
                  </span>
                </button>

                {enableClaimedCheck && (
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#27272A]/50 border border-slate-200 dark:border-[#3F3F46] space-y-3 animate-in fade-in duration-200">
                    <p className="text-[11px] text-slate-500 dark:text-[#A1A1AA] leading-relaxed">
                      Enter what is printed on the physical paper to check if someone altered text after printing:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Printed Total (₹)</label>
                        <input
                          type="number"
                          value={claimedTotal}
                          onChange={(e) => setClaimedTotal(e.target.value)}
                          placeholder="e.g. 50000"
                          className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#3F3F46] text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Printed Advance (₹)</label>
                        <input
                          type="number"
                          value={claimedAdvance}
                          onChange={(e) => setClaimedAdvance(e.target.value)}
                          placeholder="e.g. 15000"
                          className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#3F3F46] text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Printed GSTIN</label>
                        <input
                          type="text"
                          value={claimedGstin}
                          onChange={(e) => setClaimedGstin(e.target.value)}
                          placeholder="07AAAAA0000A1Z5"
                          className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#3F3F46] text-xs font-mono uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Line Items Count</label>
                        <input
                          type="number"
                          value={claimedItemsCount}
                          onChange={(e) => setClaimedItemsCount(e.target.value)}
                          placeholder="e.g. 4"
                          className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#3F3F46] text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Validation Button */}
              <button
                onClick={() => handleValidate()}
                disabled={isValidating || !queryInput.trim()}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Verifying Against Cryptographic Ledger...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> Execute Full Tamper Validation
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Verdict & Discrepancy Report */}
          <div className="lg:col-span-7 space-y-5">
            {validationReport ? (
              <div className="space-y-4">
                
                {/* ── Master Verdict Banner ──────────────────────────────────── */}
                {validationReport.verdict === 'AUTHENTIC' && (
                  <div className="p-6 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-md">
                        <ShieldCheck size={28} />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-[10px] tracking-widest uppercase">
                          CRYPTOGRAPHICALLY VERIFIED
                        </span>
                        <h2 className="text-lg font-black text-emerald-950 dark:text-emerald-100">
                          Authentic Document · Zero Tampering Detected
                        </h2>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                      {validationReport.message}
                    </p>
                  </div>
                )}

                {validationReport.verdict === 'MANIPULATED' && (
                  <div className="p-6 rounded-2xl bg-red-500/10 border-2 border-red-500 space-y-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md">
                        <ShieldX size={28} />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 font-black text-[10px] tracking-widest uppercase">
                          CRITICAL TAMPER ALERT
                        </span>
                        <h2 className="text-lg font-black text-red-950 dark:text-red-100">
                          Document Manipulated or Forged!
                        </h2>
                      </div>
                    </div>
                    <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed font-semibold">
                      {validationReport.message}
                    </p>
                  </div>
                )}

                {validationReport.verdict === 'UNSIGNED_DRAFT' && (
                  <div className="p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md">
                        <ShieldAlert size={28} />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black text-[10px] tracking-widest uppercase">
                          VALID RECORD · UNSIGNED DRAFT
                        </span>
                        <h2 className="text-lg font-black text-amber-950 dark:text-amber-100">
                          Invoice Exists But Is Awaiting Administrative Seal
                        </h2>
                      </div>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      {validationReport.message}
                    </p>
                  </div>
                )}

                {validationReport.verdict === 'DOCUMENT_NOT_FOUND' && (
                  <div className="p-6 rounded-2xl bg-slate-500/10 border-2 border-slate-500/40 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-600 text-white shadow-md">
                        <XCircle size={28} />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-700 dark:text-slate-300 font-black text-[10px] tracking-widest uppercase">
                          UNKNOWN IDENTIFIER
                        </span>
                        <h2 className="text-lg font-black text-slate-900 dark:text-[#FAFAFA]">
                          Document Not Found In PRC Hardware Ledger
                        </h2>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#A1A1AA] leading-relaxed">
                      {validationReport.message}
                    </p>
                  </div>
                )}

                {/* ── Discrepancy Breakdown Table (If claimed values submitted) ─ */}
                {validationReport.discrepancies && validationReport.discrepancies.length > 0 && (
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-[#FAFAFA] flex items-center gap-2">
                      <Sliders size={14} className="text-violet-500" />
                      Field-by-Field Integrity Analysis
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-[#27272A] text-slate-500 dark:text-[#A1A1AA]">
                            <th className="py-2 px-3 font-semibold">Field</th>
                            <th className="py-2 px-3 font-semibold">Official Database Value</th>
                            <th className="py-2 px-3 font-semibold">Claimed Value</th>
                            <th className="py-2 px-3 font-semibold text-right">Verdict</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                          {validationReport.discrepancies.map((d, i) => (
                            <tr key={i} className={d.status === 'MISMATCH' ? 'bg-red-500/5' : ''}>
                              <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-[#FAFAFA] font-mono">
                                {d.field}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 dark:text-[#A1A1AA] font-mono">
                                {String(d.originalValue)}
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                <span className={d.status === 'MISMATCH' ? 'text-red-500 font-bold' : 'text-slate-600 dark:text-[#A1A1AA]'}>
                                  {String(d.claimedValue)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold">
                                {d.status === 'MATCH' ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 size={13} /> MATCH
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-500 font-black">
                                    <AlertTriangle size={13} /> MISMATCH
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Document Details Dossier (If document found) ───────────── */}
                {validationReport.document && (
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#27272A]">
                      <div>
                        <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">
                          Official Server Record
                        </span>
                        <h3 className="text-sm font-black text-slate-900 dark:text-[#FAFAFA] font-mono">
                          {validationReport.document.piNumber}
                        </h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA]">
                        Status: {validationReport.document.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#27272A]/50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Customer</span>
                        <p className="font-bold text-slate-900 dark:text-[#FAFAFA] mt-0.5 truncate">
                          {validationReport.document.customerName}
                        </p>
                        {validationReport.document.companyName && (
                          <p className="text-[10px] text-slate-500 truncate">{validationReport.document.companyName}</p>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#27272A]/50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Grand Total (₹)</span>
                        <p className="font-black text-slate-900 dark:text-[#FAFAFA] mt-0.5 font-mono text-sm">
                          ₹{Number(validationReport.document.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Advance: ₹{Number(validationReport.document.advanceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({validationReport.document.advancePercentage}%)
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#27272A]/50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Customer GSTIN</span>
                        <p className="font-mono font-bold text-slate-900 dark:text-[#FAFAFA] mt-0.5">
                          {validationReport.document.gstin || 'Unregistered / None'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#27272A]/50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Authorized Signer</span>
                        <p className="font-bold text-slate-900 dark:text-[#FAFAFA] mt-0.5">
                          {validationReport.document.signedBy || 'Unsigned Draft'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#27272A]/50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Issued Date</span>
                        <p className="font-bold text-slate-900 dark:text-[#FAFAFA] mt-0.5">
                          {new Date(validationReport.document.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#27272A]/50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Line Items</span>
                        <p className="font-bold text-slate-900 dark:text-[#FAFAFA] mt-0.5">
                          {validationReport.document.items?.length || 0} Products
                        </p>
                      </div>
                    </div>

                    {/* Cryptographic Identifiers */}
                    <div className="p-3.5 rounded-xl bg-slate-950 text-slate-200 text-xs font-mono space-y-1.5 border border-slate-800">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-sans">
                        <span>SHA-256 Document Hash Fingerprint</span>
                        <span>Immutable</span>
                      </div>
                      <p className="text-[11px] text-violet-400 break-all">
                        {validationReport.document.documentHash}
                      </p>
                    </div>

                    {/* Quick Direct Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => proformaService.downloadProformaPdf(validationReport.document.id, validationReport.document.piNumber)}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                      >
                        <Download size={14} /> Download Official PDF
                      </button>
                      <a
                        href={`https://pacifichardware.com/verify/pi/${validationReport.document.verificationToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA] text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-[#3F3F46] transition-colors"
                      >
                        <ExternalLink size={14} /> Public Portal View
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty Standby State */
              <div className="h-full min-h-[380px] p-8 rounded-2xl bg-white dark:bg-[#18181B] border border-dashed border-slate-200 dark:border-[#27272A] flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-4 rounded-2xl bg-violet-500/10 text-violet-500">
                  <ShieldCheck size={42} />
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-[#FAFAFA]">
                  Ready to Validate Commercial Documents
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A1A1AA] max-w-sm leading-relaxed">
                  Scan a QR code with the camera, upload an invoice screenshot, or enter a PI number to run real-time cryptographic tamper verification.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ─── TAB 2: SYSTEM-WIDE QR REGISTRY ─────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          
          {/* Top KPI Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm">
              <span className="text-xs text-slate-500 font-bold uppercase">Total Secured Invoices</span>
              <p className="text-2xl font-black text-slate-900 dark:text-[#FAFAFA] mt-1 font-mono">
                {registryKpis.total}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm">
              <span className="text-xs text-emerald-600 font-bold uppercase">Cryptographically Sealed</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                {registryKpis.sealed} / {registryKpis.total}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm">
              <span className="text-xs text-violet-600 font-bold uppercase">Secured Value</span>
              <p className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1 font-mono">
                ₹{registryKpis.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Registry Search & Filter Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={registrySearch}
                onChange={(e) => setRegistrySearch(e.target.value)}
                placeholder="Search by PI #, Buyer, GSTIN, Token..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {['ALL', 'SEALED', 'DRAFT', 'SENT', 'ACCEPTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setRegistryStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    registryStatusFilter === st
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-200 dark:hover:bg-[#3F3F46]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Registry Table */}
          <div className="rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#27272A]/50 border-b border-slate-200 dark:border-[#27272A] text-slate-500 dark:text-[#A1A1AA]">
                    <th className="py-3 px-4 font-bold">QR & Document #</th>
                    <th className="py-3 px-4 font-bold">Customer / Entity</th>
                    <th className="py-3 px-4 font-bold">Grand Total (₹)</th>
                    <th className="py-3 px-4 font-bold">Advance Amount</th>
                    <th className="py-3 px-4 font-bold">Digital Seal</th>
                    <th className="py-3 px-4 font-bold">Verification ID</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                  {loadingRegistry ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-violet-500" />
                        Loading QR verification registry...
                      </td>
                    </tr>
                  ) : filteredRegistry.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No Proforma Invoices found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRegistry.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {inv.qrCodeDataUrl ? (
                              <button
                                onClick={() => setSelectedQrInvoice(inv)}
                                title="Click to view full QR Code"
                                className="w-9 h-9 rounded-lg p-0.5 bg-white border border-slate-200 dark:border-[#3F3F46] flex-shrink-0 hover:scale-105 transition-transform"
                              >
                                <img src={inv.qrCodeDataUrl} alt="QR" className="w-full h-full object-contain" />
                              </button>
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#27272A] flex items-center justify-center text-slate-400">
                                <QrCode size={16} />
                              </div>
                            )}
                            <div>
                              <p className="font-black font-mono text-slate-900 dark:text-[#FAFAFA]">
                                {inv.piNumber}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(inv.createdAt || '').toLocaleDateString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800 dark:text-[#FAFAFA] truncate max-w-[180px]">
                            {inv.customerName}
                          </p>
                          {inv.customerGstin && (
                            <span className="text-[10px] font-mono text-slate-400">
                              GST: {inv.customerGstin}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-[#FAFAFA]">
                          ₹{Number(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-[#A1A1AA]">
                          ₹{Number(inv.advanceAmount || inv.advancePayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          <span className="text-[10px] text-slate-400 ml-1">({inv.advancePercentage}%)</span>
                        </td>

                        <td className="py-3 px-4">
                          {inv.digitalSignature ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              <CheckCircle2 size={11} /> SEALED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#27272A] text-slate-500 text-[10px] font-bold">
                              DRAFT
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[120px]">
                          {inv.verificationId || inv.verificationToken?.slice(0, 8)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => quickValidateFromRegistry(inv)}
                              title="Run Tamper Check in Validator"
                              className="px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 font-bold text-xs flex items-center gap-1"
                            >
                              <ShieldCheck size={13} /> Validate
                            </button>
                            <button
                              onClick={() => proformaService.downloadProformaPdf(inv.id, inv.piNumber)}
                              title="Download PDF"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-200 dark:hover:bg-[#3F3F46]"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ─── TAB 3: SCAN AUDIT LOG ───────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-[#FAFAFA] flex items-center gap-2">
              <ShieldAlert size={16} className="text-violet-500" />
              Real-Time Verification Audit Trail
            </h3>
            <span className="text-xs text-slate-400">{auditLogs.length} scans recorded in this session</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-1">
              <ShieldCheck size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-bold">No Scans Performed Yet</p>
              <p className="text-[11px] text-slate-500">Every scan executed in the validator will log its verdict here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#27272A] text-slate-500">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Query / Token</th>
                    <th className="py-2.5 px-3">Resolved PI #</th>
                    <th className="py-2.5 px-3">Customer Entity</th>
                    <th className="py-2.5 px-3">Verdict</th>
                    <th className="py-2.5 px-3 text-right">Tamper Detected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2 px-3 font-mono text-slate-400">{log.timestamp}</td>
                      <td className="py-2 px-3 font-mono text-slate-600 dark:text-[#A1A1AA] truncate max-w-[140px]">{log.query}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">{log.piNumber || 'N/A'}</td>
                      <td className="py-2 px-3 text-slate-700 dark:text-[#A1A1AA]">{log.customerName || 'Unknown'}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.verdict === 'AUTHENTIC'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : log.verdict === 'MANIPULATED'
                            ? 'bg-red-500/10 text-red-600 font-black'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {log.verdict}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {log.isTampered ? (
                          <span className="text-red-500 font-bold">YES ({log.discrepanciesCount} errors)</span>
                        ) : (
                          <span className="text-emerald-500 font-bold">NO</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ─── HIGH-RES 400px QR CODE MODAL ────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {selectedQrInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl max-w-md w-full border border-slate-200 dark:border-[#27272A] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#27272A]">
              <div>
                <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">
                  High-Resolution Security QR
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-[#FAFAFA] font-mono">
                  {selectedQrInvoice.piNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedQrInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* QR Display */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              {selectedQrInvoice.qrCodeDataUrl ? (
                <img
                  src={selectedQrInvoice.qrCodeDataUrl}
                  alt="High Res QR"
                  className="w-56 h-56 object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                  No QR generated
                </div>
              )}
              <span className="mt-2 text-[10px] font-black tracking-widest text-slate-900 uppercase">
                SCAN TO VERIFY AUTHENTICITY
              </span>
              <span className="text-[9px] text-slate-500 font-mono">pacifichardware.com/verify/pi</span>
            </div>

            {/* Direct Copy URL */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#27272A] space-y-1 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Public Verification URL</span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-slate-700 dark:text-[#FAFAFA] truncate">
                  https://pacifichardware.com/verify/pi/{selectedQrInvoice.verificationToken}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://pacifichardware.com/verify/pi/${selectedQrInvoice.verificationToken}`);
                    setCopiedToken(true);
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  className="p-1 text-violet-500 hover:text-violet-600"
                >
                  {copiedToken ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <a
                href={selectedQrInvoice.qrCodeDataUrl || ''}
                download={`QR-${selectedQrInvoice.piNumber.replace(/[\/\\]/g, '-')}.png`}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs text-center shadow-md transition-colors"
              >
                Download 400px QR PNG
              </a>
              <button
                onClick={() => {
                  setSelectedQrInvoice(null);
                  quickValidateFromRegistry(selectedQrInvoice);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA] font-bold text-xs hover:bg-slate-200"
              >
                Validate Tamper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
