import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  QrCode,
  ScanLine,
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Package,
  Boxes,
  Truck,
  Building2,
  Printer,
  Download,
  ExternalLink,
  ChevronRight,
  Sliders,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  X,
  Volume2,
  VolumeX,
  Keyboard,
  Plus,
  Minus,
  Check,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { barcodeApi, inventoryApi, fetchAdminApi, API_BASE_URL } from '../api/adminApi';
import type { BarcodeScanResult, Branch } from '../types/admin';
import { useAdminAuth } from '../context/AdminAuthContext';

type TabMode = 'scanner' | 'studio' | 'dispatch-queue';

export const BarcodePage: React.FC = () => {
  const { setCurrentView } = useAdminAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState<TabMode>('scanner');

  // Scanner State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasTorchSupport, setHasTorchSupport] = useState<boolean>(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [scannerStatus, setScannerStatus] = useState<string>('Align barcode or QR code inside the viewfinder');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Manual & Hardware Scanner Input State
  const [manualCode, setManualCode] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<BarcodeScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<Array<{ sku: string; name: string; time: string; status: string }>>([]);

  // Dispatch Action State
  const [dispatchBranchId, setDispatchBranchId] = useState<string>('');
  const [dispatchQtyMap, setDispatchQtyMap] = useState<Record<string, number>>({});
  const [dispatchingOrder, setDispatchingOrder] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Studio / Label Generator State
  const [studioSearch, setStudioSearch] = useState<string>('');
  const [studioProducts, setStudioProducts] = useState<any[]>([]);
  const [selectedStudioProduct, setSelectedStudioProduct] = useState<any | null>(null);
  const [labelSize, setLabelSize] = useState<'58x40' | '80x40'>('58x40');
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);
  const hardwareBufferRef = useRef<string>('');
  const hardwareKeyTimerRef = useRef<any>(null);

  // Branches
  const [branches, setBranches] = useState<Branch[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Play audio chime on successful scan
  const playBeep = useCallback(() => {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.19);
    } catch {
      // AudioContext might be blocked until user interaction
    }
  }, [isSoundEnabled]);

  // Load Branches & Studio Products on Mount
  useEffect(() => {
    inventoryApi.getBranches().then((res) => {
      if (res.success && res.data) {
        setBranches(res.data);
        if (res.data.length > 0) setDispatchBranchId(res.data[0].id);
      }
    }).catch(() => {});

    fetchAdminApi<any>('/products?limit=25').then((res) => {
      const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : (res as any)?.items || [];
      setStudioProducts(items);
      if (items.length > 0) setSelectedStudioProduct(items[0]);
    }).catch(() => {});
  }, []);

  // ─── 1. Hardware Laser Barcode Scanner Listener ────────────────────────────
  // Physical USB/Bluetooth barcode guns send keystrokes rapidly ending with 'Enter'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'Enter') {
        const buffer = hardwareBufferRef.current.trim();
        if (buffer.length >= 3) {
          e.preventDefault();
          lookupBarcode(buffer);
        }
        hardwareBufferRef.current = '';
        return;
      }

      // Append printable single characters
      if (e.key.length === 1) {
        hardwareBufferRef.current += e.key;

        if (hardwareKeyTimerRef.current) clearTimeout(hardwareKeyTimerRef.current);
        // Reset buffer if delay between characters exceeds 80ms (human typing vs barcode gun)
        hardwareKeyTimerRef.current = setTimeout(() => {
          hardwareBufferRef.current = '';
        }, 120);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (hardwareKeyTimerRef.current) clearTimeout(hardwareKeyTimerRef.current);
    };
  }, []);

  // ─── 2. Camera Viewfinder & Stream Management ──────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        isScanningRef.current = true;
        setScannerStatus('Camera active. Point at barcode...');

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities && track.getCapabilities()) || {};
        setHasTorchSupport(Boolean((capabilities as any).torch));

        // Start scanning loop
        scanFrame();
      }
    } catch (err: any) {
      console.warn('[Barcode Scanner] Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings or use manual SKU input.'
          : 'Unable to start camera. Make sure no other app is using it.'
      );
      setIsCameraActive(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn('Torch failed:', err);
      }
    }
  };

  // Switch between Rear and Front cameras
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Start or Stop camera when tab changes or active state changes
  useEffect(() => {
    if (activeTab === 'scanner' && isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, isCameraActive, facingMode, startCamera, stopCamera]);

  // ─── 3. Video Frame Scanning Loop (Hardware Accelerated + jsQR fallback) ──
  const scanFrame = useCallback(async () => {
    if (!isScanningRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      let detectedCode: string | null = null;

      // Method 1: Modern Native BarcodeDetector API (Hardware Accelerated)
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['code_128', 'code_39', 'qr_code', 'ean_13', 'upc_a'],
          });
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0) {
            detectedCode = barcodes[0].rawValue;
          }
        } catch {
          // Fallback to jsQR below
        }
      }

      // Method 2: jsQR Fallback
      if (!detectedCode) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (qrCode && qrCode.data) {
          detectedCode = qrCode.data;
        }
      }

      // If code detected and not immediately repeated within 2.5s
      if (detectedCode) {
        const now = Date.now();
        if (detectedCode !== lastScannedCodeRef.current || now - lastScanTimestampRef.current > 2500) {
          lastScannedCodeRef.current = detectedCode;
          lastScanTimestampRef.current = now;

          // Haptic + Audio Feedback
          playBeep();
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([40, 60, 40]);
          }

          setScannerStatus(`Scanned: ${detectedCode}`);
          lookupBarcode(detectedCode);
        }
      }
    }

    if (isScanningRef.current) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
    }
  }, [playBeep]);

  // ─── 4. Lookup Scanned Barcode / SKU from Backend API ───────────────────────
  const lookupBarcode = async (code: string) => {
    if (!code || !code.trim()) return;
    setLookupLoading(true);

    try {
      const res = await barcodeApi.scanLookup(code.trim());
      if (res.success && res.data) {
        setScanResult(res.data);
        showToast(`SKU ${res.data.product.sku} resolved successfully`, 'success');

        // Add to recent scan history
        setScanHistory((prev) => [
          {
            sku: res.data!.product.sku,
            name: res.data!.product.name,
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            status: res.data!.metrics.healthStatus,
          },
          ...prev.slice(0, 9),
        ]);

        // Prepopulate dispatch quantity for any pending orders
        const initialQtyMap: Record<string, number> = {};
        res.data.dispatchOrders.forEach((o) => {
          initialQtyMap[o.orderId] = o.orderedQuantity;
        });
        setDispatchQtyMap(initialQtyMap);
      } else {
        showToast(res.message || `No product found for code "${code}"`, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || `Failed to lookup barcode "${code}"`, 'error');
    } finally {
      setLookupLoading(false);
    }
  };

  // ─── 5. Order Dispatch Verification Action ─────────────────────────────────
  const handleDispatchOrder = async (orderId: string, orderedQty: number) => {
    if (!scanResult) return;
    if (!dispatchBranchId) {
      showToast('Please select a dispatch facility/branch', 'error');
      return;
    }

    const qty = dispatchQtyMap[orderId] || orderedQty;
    setDispatchingOrder(orderId);

    try {
      const res = await barcodeApi.dispatchOrder({
        orderId,
        sku: scanResult.product.sku,
        quantity: qty,
        branchId: dispatchBranchId,
        notes: `Dispatched via Camera Barcode Scan Station`,
      });

      if (res.success) {
        showToast(`Order dispatched! ${qty} units deducted from physical stock.`, 'success');
        // Refresh the scanned SKU data to show updated live stock
        await lookupBarcode(scanResult.product.sku);
      } else {
        showToast(res.message || 'Dispatch failed', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to dispatch order', 'error');
    } finally {
      setDispatchingOrder(null);
    }
  };

  // ─── 6. Direct Print & Thermal Label Execution ──────────────────────────────
  const handlePrintThermalLabel = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-12 animate-in fade-in">
      {/* Toast Notification Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-500/25'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-500/25'
              : 'bg-slate-900 dark:bg-[#18181B] text-white border border-slate-700 dark:border-[#27272A]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-white" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-white" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── HEADER COMMAND BAR ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-xl">
                <ScanLine className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#FAFAFA] flex items-center gap-2">
                  Barcode & Dispatch Command Center
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#8B5CF6]/10 text-[#8B5CF6]">
                    LIVE
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-[#A1A1AA] mt-0.5">
                  Production camera scan, SKU inventory verification, order dispatch fulfillment, and thermal label generation.
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation Pill Bar */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#09090B] rounded-xl border border-slate-200 dark:border-[#27272A] self-start md:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'bg-white dark:bg-[#18181B] text-[#8B5CF6] shadow-sm'
                  : 'text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera & Laser Scanner</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'studio'
                  ? 'bg-white dark:bg-[#18181B] text-[#8B5CF6] shadow-sm'
                  : 'text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Thermal Label Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dispatch-queue')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'dispatch-queue'
                  ? 'bg-white dark:bg-[#18181B] text-[#8B5CF6] shadow-sm'
                  : 'text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatch Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: CAMERA & HARDWARE SCANNER ───────────────────────────────── */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Viewfinder & Manual Input (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Viewfinder Card */}
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-4 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272A] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-[#FAFAFA]">Camera Viewfinder</span>
                  {isCameraActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Scanning
                    </span>
                  )}
                </div>
                {/* Viewfinder Controls */}
                <div className="flex items-center gap-1">
                  {hasTorchSupport && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      title="Toggle Flashlight"
                      className={`p-1.5 rounded-lg border transition ${
                        isTorchOn
                          ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                          : 'bg-slate-100 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A]'
                      }`}
                    >
                      {isTorchOn ? <Flashlight className="w-3.5 h-3.5" /> : <FlashlightOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    title="Flip Camera (Front/Rear)"
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A] hover:text-[#8B5CF6] transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                    title={isSoundEnabled ? 'Mute Chime' : 'Enable Chime'}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A] hover:text-[#8B5CF6] transition"
                  >
                    {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(!isCameraActive)}
                    className={`p-1.5 rounded-lg border transition ${
                      isCameraActive
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    }`}
                  >
                    {isCameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Viewport Box */}
              <div className="relative mt-3 w-full aspect-square max-h-[360px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Viewfinder Overlay Crosshair & Laser Effect */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-3/4 h-3/4 border-2 border-dashed border-[#8B5CF6]/70 rounded-2xl relative">
                        {/* 4 Corner Brackets */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#8B5CF6] rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#8B5CF6] rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#8B5CF6] rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#8B5CF6] rounded-br-lg" />

                        {/* Animated Laser Scan Bar */}
                        <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse" />
                      </div>
                    </div>

                    <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg text-center">
                      <span className="text-[11px] font-mono text-white/90 truncate block">{scannerStatus}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <CameraOff className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs font-semibold">Camera is paused</p>
                    <button
                      type="button"
                      onClick={() => setIsCameraActive(true)}
                      className="mt-3 px-3 py-1.5 bg-[#8B5CF6] text-white rounded-xl text-xs font-bold shadow transition"
                    >
                      Start Camera
                    </button>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Manual & Laser Scanner Input Card */}
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Keyboard className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA]">
                  Laser Gun / Manual SKU Input
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                USB/Bluetooth barcode guns auto-fill here. You can also type or paste any SKU code.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualCode.trim()) lookupBarcode(manualCode);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter SKU (e.g. PRC-SS-001)..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono uppercase font-bold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {manualCode && (
                    <button
                      type="button"
                      onClick={() => setManualCode('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={lookupLoading || !manualCode.trim()}
                  className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-[#8B5CF6]/20 transition flex items-center gap-1.5"
                >
                  {lookupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Resolve</span>}
                </button>
              </form>

              {/* Sample Quick Test Chips */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#27272A]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Quick Catalog Samples
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {studioProducts.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setManualCode(p.sku);
                        lookupBarcode(p.sku);
                      }}
                      className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-slate-300 hover:bg-[#8B5CF6] hover:text-white transition font-bold"
                    >
                      {p.sku}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Scan History Dock */}
            {scanHistory.length > 0 && (
              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA]">Scan History</span>
                  <span className="text-[10px] text-slate-400">{scanHistory.length} items</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-[#27272A]">
                  {scanHistory.map((h, i) => (
                    <div
                      key={i}
                      onClick={() => lookupBarcode(h.sku)}
                      className="py-1.5 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-[#27272A]/40 px-1 rounded transition"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono font-bold text-[#8B5CF6] block truncate">{h.sku}</span>
                        <span className="text-[10px] text-slate-400 truncate block">{h.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Scan Result Dossier + Order Dispatch Suite (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-4">
            {lookupLoading ? (
              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-12 text-center shadow-sm">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#8B5CF6]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-[#FAFAFA]">Resolving Barcode & Inventory...</h3>
                <p className="text-xs text-slate-400 mt-1">Checking multi-branch physical counts & open orders</p>
              </div>
            ) : scanResult ? (
              <>
                {/* ─── SCAN RESULT DOSSIER CARD ──────────────────────────────────── */}
                <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 shadow-sm space-y-4">
                  {/* Top Product Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#27272A]">
                    <div className="flex items-start gap-3.5">
                      {scanResult.product.thumbnail ? (
                        <img
                          src={scanResult.product.thumbnail}
                          alt={scanResult.product.name}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-[#27272A] shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-[#27272A] flex items-center justify-center shrink-0">
                          <Package className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6]">
                            {scanResult.product.sku}
                          </span>
                          {scanResult.product.category && (
                            <span className="text-[11px] font-semibold text-slate-500">
                              {scanResult.product.category.name}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              scanResult.metrics.healthStatus === 'IN_STOCK'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : scanResult.metrics.healthStatus === 'LOW_STOCK'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {scanResult.metrics.healthStatus.replace('_', ' ')}
                          </span>
                        </div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-[#FAFAFA]">
                          {scanResult.product.name}
                        </h2>
                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                          <span className="font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                            ₹{scanResult.pricing.price.toLocaleString('en-IN')}
                          </span>
                          {scanResult.pricing.salePrice && (
                            <span className="text-slate-400 line-through text-[11px]">
                              ₹{scanResult.pricing.salePrice.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Barcode & QR Code Inline Preview */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                      <img
                        src={`${API_BASE_URL}${scanResult.barcodeUrl}`}
                        alt="Barcode"
                        className="h-9 max-w-[150px] object-contain bg-white p-1 rounded border border-slate-200 dark:border-[#27272A]"
                      />
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                        Code-128 Verified
                      </span>
                    </div>
                  </div>

                  {/* Hardware Attributes Row: Finish, Colour, Dimensions */}
                  <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-100 dark:border-[#27272A] text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Hardware Finish
                      </span>
                      <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-200/80 dark:bg-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                        {scanResult.specs.finish || 'Standard'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Surface Colour
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-slate-300"
                          style={{
                            backgroundColor:
                              scanResult.specs.colour?.toLowerCase().includes('gold')
                                ? '#F59E0B'
                                : scanResult.specs.colour?.toLowerCase().includes('black')
                                ? '#18181B'
                                : '#CBD5E1',
                          }}
                        />
                        <span className="font-semibold text-[11px] text-slate-800 dark:text-[#FAFAFA]">
                          {scanResult.specs.colour || 'Standard'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Dimensions (mm)
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-[#FAFAFA]">
                        {scanResult.specs.dimensions?.height || scanResult.specs.dimensions?.width
                          ? `${scanResult.specs.dimensions.height || '-'}×${
                              scanResult.specs.dimensions.width || '-'
                            }×${scanResult.specs.dimensions.length || '-'} mm`
                          : 'Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Multi-Branch Physical Stock Matrix */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        Multi-Branch Stock Allocation
                      </span>
                      <span className="text-xs font-extrabold text-[#8B5CF6]">
                        Net Available: {scanResult.metrics.totalAvailable} units
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#27272A]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-[#27272A]">
                          <tr>
                            <th className="py-2.5 px-3">Facility</th>
                            <th className="py-2.5 px-3 text-right">Physical On-Hand</th>
                            <th className="py-2.5 px-3 text-right">Reserved</th>
                            <th className="py-2.5 px-3 text-right font-extrabold text-slate-800 dark:text-white">
                              Available
                            </th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                          {scanResult.inventories.map((inv) => (
                            <tr key={inv.branchId} className="hover:bg-slate-50/60 dark:hover:bg-[#27272A]/40">
                              <td className="py-2.5 px-3 font-semibold flex items-center gap-2">
                                <span>{inv.branchName}</span>
                                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-slate-100 dark:bg-[#27272A] text-slate-500 font-bold">
                                  {inv.branchCode}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold">{inv.quantity}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">{inv.reservedQuantity}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                                {inv.availableQuantity}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                    inv.health === 'IN_STOCK'
                                      ? 'bg-emerald-500/10 text-emerald-600'
                                      : inv.health === 'LOW_STOCK'
                                      ? 'bg-amber-500/10 text-amber-600'
                                      : 'bg-rose-500/10 text-rose-600'
                                  }`}
                                >
                                  {inv.health.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Action Bar (Label Print, PDF, Dossier Link) */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#27272A]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudioProduct(scanResult.product);
                        setActiveTab('studio');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Thermal Sticker</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => barcodeApi.downloadLabelPdf(scanResult.product.sku)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-[#3F3F46] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-[#3F3F46]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF Label</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScanResult(null);
                        setManualCode('');
                        lastScannedCodeRef.current = '';
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-[#09090B] text-slate-600 dark:text-slate-400 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-[#27272A] ml-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Scan Another</span>
                    </button>
                  </div>
                </div>

                {/* ─── ORDER DISPATCH & FULFILLMENT SECTION ─────────────────────── */}
                <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272A]">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <Truck className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-[#FAFAFA]">
                          Orders Awaiting Dispatch for SKU: {scanResult.product.sku}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Verify physical item with camera scan and confirm dispatch deduction
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full font-bold text-xs bg-emerald-500/10 text-emerald-600">
                      {scanResult.dispatchOrders.length} Orders Pending
                    </span>
                  </div>

                  {scanResult.dispatchOrders.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/60" />
                      <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                        No pending customer orders waiting for this SKU
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Item is ready for storage allocation or branch transfer.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {/* Facility Selector for Dispatch Deduction */}
                      <div className="flex items-center gap-2 text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-100 dark:border-[#27272A]">
                        <span className="text-slate-500 font-semibold shrink-0">Dispatch Facility:</span>
                        <select
                          value={dispatchBranchId}
                          onChange={(e) => setDispatchBranchId(e.target.value)}
                          className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg px-2.5 py-1 font-bold text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                        >
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Orders Itemized List */}
                      <div className="divide-y divide-slate-100 dark:divide-[#27272A] border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden">
                        {scanResult.dispatchOrders.map((order) => (
                          <div
                            key={order.orderId}
                            className="p-3 bg-white dark:bg-[#18181B] hover:bg-slate-50/50 dark:hover:bg-[#27272A]/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#8B5CF6]">
                                  {order.orderNumber}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/10 text-amber-600">
                                  {order.orderStatus}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(order.orderDate).toLocaleDateString('en-IN')}
                                </span>
                              </div>
                              <div className="text-slate-600 dark:text-slate-300 mt-1">
                                <span className="font-semibold">{order.customerName}</span>
                                {order.city && <span className="text-slate-400 ml-1">({order.city})</span>}
                              </div>
                            </div>

                            {/* Quantity Stepper & Dispatch Trigger */}
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#27272A] rounded-lg p-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDispatchQtyMap((prev) => ({
                                      ...prev,
                                      [order.orderId]: Math.max(1, (prev[order.orderId] || order.orderedQuantity) - 1),
                                    }))
                                  }
                                  className="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-[#18181B] text-slate-600 dark:text-slate-300 font-bold"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-mono font-extrabold text-xs">
                                  {dispatchQtyMap[order.orderId] || order.orderedQuantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDispatchQtyMap((prev) => ({
                                      ...prev,
                                      [order.orderId]: (prev[order.orderId] || order.orderedQuantity) + 1,
                                    }))
                                  }
                                  className="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-[#18181B] text-slate-600 dark:text-slate-300 font-bold"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                disabled={dispatchingOrder === order.orderId || !order.canDispatch}
                                onClick={() => handleDispatchOrder(order.orderId, order.orderedQuantity)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                              >
                                {dispatchingOrder === order.orderId ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Verify & Dispatch</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Empty Placeholder */
              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-12 text-center shadow-sm">
                <QrCode className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-[#52525B]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-[#FAFAFA]">No SKU Scanned Yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Scan any SKU with your phone camera or barcode gun to view instant live stock, specs, and pending order dispatch queue.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: THERMAL LABEL STUDIO & GENERATOR ────────────────────────── */}
      {activeTab === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Controls & Product Search (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#8B5CF6]" />
                Thermal Label Settings
              </h2>

              {/* Product Search / Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Select Product / SKU
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search SKU or Name..."
                    value={studioSearch}
                    onChange={(e) => setStudioSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                {/* Filtered Products Dropdown / List */}
                <div className="mt-2 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-[#27272A] border border-slate-200 dark:border-[#27272A] rounded-xl">
                  {studioProducts
                    .filter((p) => {
                      if (!studioSearch.trim()) return true;
                      const q = studioSearch.toLowerCase();
                      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
                    })
                    .map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedStudioProduct(p)}
                        className={`p-2.5 text-xs cursor-pointer flex items-center justify-between transition ${
                          selectedStudioProduct?.id === p.id
                            ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-[#27272A]/40'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="font-mono font-bold block">{p.sku}</span>
                          <span className="text-[10px] text-slate-400 truncate block">{p.name}</span>
                        </div>
                        <span className="text-[11px] font-mono shrink-0">
                          ₹{Number(p.price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Label Roll Dimension Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Thermal Sticker Size
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLabelSize('58x40')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-0.5 ${
                      labelSize === '58x40'
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#8B5CF6]'
                        : 'border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>58mm × 40mm</span>
                    <span className="text-[9px] font-normal text-slate-400">Standard Barcode Roll</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabelSize('80x40')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-0.5 ${
                      labelSize === '80x40'
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#8B5CF6]'
                        : 'border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>80mm × 40mm</span>
                    <span className="text-[9px] font-normal text-slate-400">Wide Barcode Roll</span>
                  </button>
                </div>
              </div>

              {/* Print Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-[#27272A] space-y-2">
                <button
                  type="button"
                  disabled={!selectedStudioProduct}
                  onClick={handlePrintThermalLabel}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-[#8B5CF6]/25 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Thermal Sticker (1-Click)</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedStudioProduct}
                  onClick={() => selectedStudioProduct && barcodeApi.downloadLabelPdf(selectedStudioProduct.sku, labelSize)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-[#3F3F46] disabled:opacity-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-[#3F3F46]"
                >
                  <Download className="w-4 h-4 text-emerald-500" />
                  <span>Download Thermal PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Label Visual Preview (7 cols on lg) */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272A]">
                <span className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA]">
                  Physical Thermal Sticker Preview ({labelSize})
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Monochrome High-DPI Output</span>
              </div>

              {selectedStudioProduct ? (
                <div className="p-6 bg-slate-100 dark:bg-[#09090B] rounded-2xl flex items-center justify-center">
                  {/* Actual Physical Thermal Sticker Representation */}
                  <div
                    id="thermal-sticker-printable"
                    className="bg-white text-black p-4 rounded-lg shadow-xl border border-slate-300 w-full max-w-[360px] select-none font-sans"
                    style={{
                      aspectRatio: labelSize === '80x40' ? '80/40' : '58/40',
                    }}
                  >
                    {/* Top Row: Brand & Product Info + QR */}
                    <div className="flex items-start justify-between gap-2 border-b border-black/80 pb-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] font-black uppercase tracking-wider text-black/70">
                          PACIFIC HARDWARE (PRC)
                        </div>
                        <div className="text-xs font-black truncate text-black leading-tight mt-0.5">
                          {selectedStudioProduct.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-black/80">
                          <span>Fin: {selectedStudioProduct.finish || 'SS'}</span>
                          <span>Col: {selectedStudioProduct.colour || 'Golden'}</span>
                          <span>
                            {selectedStudioProduct.dimensions?.height
                              ? `${selectedStudioProduct.dimensions.height}×${selectedStudioProduct.dimensions.width}mm`
                              : ''}
                          </span>
                        </div>
                        <div className="text-[11px] font-black text-black mt-0.5">
                          MRP: ₹{Number(selectedStudioProduct.price || 0).toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Scannable QR Code */}
                      <img
                        src={barcodeApi.getQrImageUrl(
                          selectedStudioProduct.sku,
                          `https://pacificrestroomcubicles.com/product/${selectedStudioProduct.slug || selectedStudioProduct.sku}`
                        )}
                        alt="QR Code"
                        className="w-11 h-11 border border-black/60 p-0.5 shrink-0"
                      />
                    </div>

                    {/* Bottom: Code-128 Linear Barcode */}
                    <div className="mt-2 text-center">
                      <img
                        src={barcodeApi.getBarcodeImageUrl(selectedStudioProduct.sku)}
                        alt={selectedStudioProduct.sku}
                        className="w-full h-12 object-contain mx-auto"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Printer className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">Select a product to preview its thermal label</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: DISPATCH QUEUE ──────────────────────────────────────────── */}
      {activeTab === 'dispatch-queue' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Truck className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-[#FAFAFA]">
                  Order Fulfillment & Barcode Dispatch Station
                </h2>
                <p className="text-[11px] text-slate-400">
                  Instructions: Scan outgoing hardware parcels with camera to confirm items before handoff to courier.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className="px-3 py-1.5 bg-[#8B5CF6] text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Open Camera Scanner</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#09090B] rounded-xl border border-slate-200 dark:border-[#27272A] text-xs space-y-2">
            <h3 className="font-bold text-slate-800 dark:text-[#FAFAFA] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#8B5CF6]" />
              Warehouse Workflow Standard Operating Procedure (SOP)
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              <li>Open <strong>Camera & Laser Scanner</strong> on your phone or warehouse tablet.</li>
              <li>Point camera at the <strong>Code-128 Barcode</strong> or <strong>QR Code</strong> on the hardware package.</li>
              <li>System validates physical stock across Delhi HQ / Kolkata Branch and retrieves customer orders waiting for that SKU.</li>
              <li>Click <strong>Verify & Dispatch</strong> — stock is automatically deducted from physical inventory and order status updates to SHIPPED.</li>
            </ol>
          </div>
        </div>
      )}

      {/* ─── PRINT CSS STYLES FOR THERMAL PRINTERS ──────────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-sticker-printable,
          #thermal-sticker-printable * {
            visibility: visible;
          }
          #thermal-sticker-printable {
            position: fixed;
            left: 0;
            top: 0;
            width: 58mm !important;
            max-width: 58mm !important;
            margin: 0 !important;
            padding: 2mm !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BarcodePage;
