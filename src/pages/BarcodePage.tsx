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
  Upload,
  Image as ImageIcon,
  ShieldAlert,
  Smartphone,
  Lock,
  Unlock,
  ShieldCheck,
  DownloadCloud,
  AlertCircle,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { barcodeApi, inventoryApi, fetchAdminApi, API_BASE_URL } from '../api/adminApi';
import type { BarcodeScanResult, Branch } from '../types/admin';
import { useAdminAuth } from '../context/AdminAuthContext';

type TabMode = 'scanner' | 'studio' | 'dispatch-queue';

/**
 * High-performance vector Code-128 SVG generator.
 * Completely offline, zero network requests, 100% crisp vector output for thermal printers.
 */
const BarcodeSvg: React.FC<{
  value: string;
  className?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
}> = ({ value, className = '', width = 2, height = 50, displayValue = true }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value && value.trim()) {
      try {
        JsBarcode(svgRef.current, value.trim().toUpperCase(), {
          format: 'CODE128',
          lineColor: '#000000',
          width,
          height,
          displayValue,
          font: 'monospace',
          fontSize: 13,
          textMargin: 2,
          margin: 0,
        });
      } catch (err) {
        console.warn('[BarcodeSvg] Error generating barcode:', err);
      }
    }
  }, [value, width, height, displayValue]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
};

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  // Play warning buzz on duplicate/locked scan or invalid stage attempt
  const playWarningBeep = useCallback(() => {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch {
      // Ignore audio failure
    }
  }, [isSoundEnabled]);

  // ─── 0. Persistent Device ID & Single-Device Scan Lock ──────────────────────
  const [deviceId] = useState<string>(() => {
    try {
      const existing = localStorage.getItem('prc_barcode_device_id');
      if (existing && existing.trim()) return existing.trim();
      const newId = `DEV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      localStorage.setItem('prc_barcode_device_id', newId);
      return newId;
    } catch {
      return 'DEV-WEB-STATION';
    }
  });

  const [deviceName] = useState<string>(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    if (/iPhone/i.test(ua)) return 'iPhone Scanner';
    if (/iPad/i.test(ua)) return 'iPad Terminal';
    if (/Android/i.test(ua)) return 'Android Scanner';
    if (/Mac/i.test(ua)) return 'Mac Workstation';
    if (/Windows/i.test(ua)) return 'Windows Terminal';
    return 'Mobile Terminal';
  });

  // Single-Device Lock: Prevents rapid double scanning on the same physical device
  const [lockedSku, setLockedSku] = useState<string | null>(null);
  const [lockCooldown, setLockCooldown] = useState<number>(0);
  const lockedSkuRef = useRef<string | null>(null);
  const lockCooldownRef = useRef<number>(0);

  useEffect(() => {
    lockedSkuRef.current = lockedSku;
    lockCooldownRef.current = lockCooldown;
  }, [lockedSku, lockCooldown]);

  useEffect(() => {
    if (lockCooldown <= 0) return;
    const timer = setInterval(() => {
      setLockCooldown((prev) => {
        if (prev <= 1) {
          setLockedSku(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockCooldown]);

  // ─── 2-Stage Fulfillment Mode: PACKING (Scan 1) vs RECEIVED (Scan 2) ────────
  const [stageMode, setStageMode] = useState<'PACKING' | 'RECEIVED'>(() => {
    try {
      const saved = localStorage.getItem('prc_barcode_stage_mode');
      if (saved === 'PACKING' || saved === 'RECEIVED') return saved;
    } catch {}
    return 'PACKING';
  });
  const [executingStage, setExecutingStage] = useState<boolean>(false);

  const handleStageModeChange = (mode: 'PACKING' | 'RECEIVED') => {
    setStageMode(mode);
    try {
      localStorage.setItem('prc_barcode_stage_mode', mode);
    } catch {}
  };

  // ─── PWA Download & Standalone App State ──────────────────────────────────
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandaloneApp, setIsStandaloneApp] = useState<boolean>(false);
  const [showIosInstallModal, setShowIosInstallModal] = useState<boolean>(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandaloneApp(Boolean(isStandalone));

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast('PRC Scanner App installed to home screen!', 'success');
        setDeferredPrompt(null);
      }
    } else {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIos) {
        setShowIosInstallModal(true);
      } else {
        showToast(
          isStandaloneApp
            ? 'PRC Scanner is already running as an installed app!'
            : 'To install: Open browser menu (⋮) and tap "Install app" or "Add to Home screen".',
          'info'
        );
      }
    }
  };

  // Unlock scanner for next item
  const handleScanNext = () => {
    setLockedSku(null);
    setLockCooldown(0);
    lastScannedCodeRef.current = '';
    lastScanTimestampRef.current = 0;
    setScanResult(null);
    setManualCode('');
    showToast('Scanner unlocked. Ready to scan next item.', 'info');
  };

  // Execute Stage Scan (Packing Scan 1 or Received Scan 2)
  const handleExecuteStageScan = async (stage: 'PACKING' | 'RECEIVED') => {
    if (!scanResult) return;
    const sku = scanResult.product.sku;

    // Guard against invalid stages
    if (stage === 'PACKING') {
      if (scanResult.lifecycle && !scanResult.lifecycle.canPack) {
        playWarningBeep();
        showToast('This product has already completed Packing Scan (Scan 1/2). Cannot pack again.', 'error');
        return;
      }
    } else if (stage === 'RECEIVED') {
      if (scanResult.lifecycle && !scanResult.lifecycle.canReceive) {
        playWarningBeep();
        if (scanResult.lifecycle.scanCount === 0) {
          showToast('Cannot receive yet: Product must first complete Packing Scan (Scan 1/2).', 'error');
        } else if (scanResult.lifecycle.scanCount >= 2) {
          showToast('Lifecycle complete (2/2 scans used). This product has already been received.', 'error');
        }
        return;
      }
    }

    setExecutingStage(true);
    try {
      const res = await barcodeApi.executeStageScan({
        sku,
        stage,
        deviceId,
        deviceName,
        branchId: dispatchBranchId || undefined,
        notes: `Scanned on ${deviceName} (${deviceId}) via ${stage.toLowerCase()} station`,
      });

      if (res.success) {
        playBeep();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([60, 80, 60, 80]);
        }
        showToast(res.message || `Stage scan successful: ${stage}`, 'success');
        // Refresh product scan result to reflect new lifecycle status and scan count
        await lookupBarcode(sku, true);
      } else {
        playWarningBeep();
        showToast(res.message || 'Stage scan failed', 'error');
      }
    } catch (err: any) {
      playWarningBeep();
      showToast(err?.message || 'Failed to record stage scan', 'error');
    } finally {
      setExecutingStage(false);
    }
  };

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
        setIsCameraActive(true);
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
      setIsCameraActive(false);
      const isPermError =
        err.name === 'NotAllowedError' ||
        String(err).includes('Permission dismissed') ||
        String(err).includes('Permission denied');
      setCameraError(
        isPermError
          ? 'PERMISSION_DISMISSED'
          : err.message || 'Unable to start camera. Make sure no other app is using it.'
      );
    }
  }, [facingMode]);

  // ─── Photo / File Upload Barcode Scanner ──────────────────────────────────
  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLookupLoading(true);
    showToast('Analyzing image for barcode...', 'info');

    try {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            setLookupLoading(false);
            return;
          }

          ctx.drawImage(img, 0, 0, img.width, img.height);
          let detectedCode: string | null = null;

          if ('BarcodeDetector' in window) {
            try {
              const detector = new (window as any).BarcodeDetector({
                formats: ['code_128', 'code_39', 'qr_code', 'ean_13', 'upc_a'],
              });
              const barcodes = await detector.detect(canvas);
              if (barcodes && barcodes.length > 0) {
                detectedCode = barcodes[0].rawValue;
              }
            } catch {}
          }

          if (!detectedCode) {
            const imgData = ctx.getImageData(0, 0, img.width, img.height);
            const qr = jsQR(imgData.data, imgData.width, imgData.height);
            if (qr && qr.data) detectedCode = qr.data;
          }

          if (detectedCode) {
            const normalized = detectedCode.trim().toUpperCase();
            if (lockedSkuRef.current === normalized && lockCooldownRef.current > 0) {
              playWarningBeep();
              showToast(`🔒 SKU "${normalized}" is locked on this device. Wait ${lockCooldownRef.current}s or tap "Scan Next".`, 'error');
              setLookupLoading(false);
              return;
            }
            playBeep();
            if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
            showToast(`Decoded barcode: ${detectedCode}`, 'success');
            lookupBarcode(detectedCode);
          } else {
            showToast('No readable barcode or QR code detected. Try taking a clearer photo or typing SKU.', 'error');
            setLookupLoading(false);
          }
        } catch (err: any) {
          showToast(err?.message || 'Error processing image', 'error');
          setLookupLoading(false);
        }
      };
      img.src = URL.createObjectURL(file);
    } catch {
      setLookupLoading(false);
    }
    e.target.value = '';
  };

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

      // If code detected
      if (detectedCode) {
        const normalized = detectedCode.trim().toUpperCase();
        const now = Date.now();

        // Check Single-Device Lock: If currently locked, suppress rapid camera scan and alert operator
        if (lockedSkuRef.current === normalized && lockCooldownRef.current > 0) {
          if (now - lastScanTimestampRef.current > 3500) {
            lastScanTimestampRef.current = now;
            playWarningBeep();
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
            setScannerStatus(`🔒 SKU ${normalized} locked on this device (${lockCooldownRef.current}s)`);
            showToast(`🔒 Single-device lock active: "${normalized}" is locked for ${lockCooldownRef.current}s. Tap "Scan Next" to scan another item.`, 'error');
          }
        } else if (normalized !== lastScannedCodeRef.current || now - lastScanTimestampRef.current > 2500) {
          lastScannedCodeRef.current = normalized;
          lastScanTimestampRef.current = now;

          // Haptic + Audio Feedback
          playBeep();
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([40, 60, 40]);
          }

          setScannerStatus(`Scanned: ${normalized}`);
          lookupBarcode(normalized);
        }
      }
    }

    if (isScanningRef.current) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
    }
  }, [playBeep, playWarningBeep]);

  // ─── 4. Lookup Scanned Barcode / SKU from Backend API ───────────────────────
  const lookupBarcode = async (code: string, bypassLock = false) => {
    if (!code || !code.trim()) return;
    const normalized = code.trim().toUpperCase();

    // Check Single-Device Lock
    if (!bypassLock && lockedSkuRef.current === normalized && lockCooldownRef.current > 0) {
      playWarningBeep();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      showToast(
        `🔒 Device Lock: "${normalized}" was just scanned on this device (${lockCooldownRef.current}s remaining). Tap "Scan Next Item" to unlock.`,
        'error'
      );
      return;
    }

    // Acquire Single-Device Lock for this SKU (8 seconds cooldown)
    setLockedSku(normalized);
    setLockCooldown(8);

    setLookupLoading(true);

    try {
      const res = await barcodeApi.scanLookup(normalized);
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

          {/* Header Action Controls: Terminal Badge, PWA Download Button, and Tabs */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Terminal Device ID */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-[11px] font-mono text-slate-600 dark:text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span className="text-slate-400 font-sans">Terminal:</span>
              <span className="font-bold text-slate-900 dark:text-white">{deviceId}</span>
            </div>

            {/* PWA Mobile App Download Button / Standalone Badge */}
            {isStandaloneApp ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile App Active</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white rounded-xl text-xs font-bold shadow-md shadow-[#8B5CF6]/25 transition hover:scale-[1.02] active:scale-[0.98]"
                title="Download / Install PRC Barcode Scanner directly onto your mobile device"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>📲 Download Mobile App</span>
              </button>
            )}

            {/* Tab Navigation Pill Bar */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#09090B] rounded-xl border border-slate-200 dark:border-[#27272A] overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab('scanner')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'scanner'
                    ? 'bg-white dark:bg-[#18181B] text-[#8B5CF6] shadow-sm'
                    : 'text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scanner Station</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('studio')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'studio'
                    ? 'bg-white dark:bg-[#18181B] text-[#8B5CF6] shadow-sm'
                    : 'text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Label Studio</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dispatch-queue')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
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
      </div>

      {/* ─── TAB 1: CAMERA & HARDWARE SCANNER ───────────────────────────────── */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Viewfinder & Manual Input (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Operational Station Mode Switcher */}
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  Fulfillment Mode:
                </span>
                <span className="text-[10px] font-mono text-slate-400">Strict 2-Scan Protocol</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleStageModeChange('PACKING')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                    stageMode === 'PACKING'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Package className="w-4 h-4 shrink-0" />
                  <div className="text-left min-w-0">
                    <span className="block truncate font-bold">📦 Packing Scan</span>
                    <span className="text-[9px] font-normal text-slate-400 block truncate">Stage 1 of 2</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleStageModeChange('RECEIVED')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                    stageMode === 'RECEIVED'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <div className="text-left min-w-0">
                    <span className="block truncate font-bold">📥 Received Scan</span>
                    <span className="text-[9px] font-normal text-slate-400 block truncate">Stage 2 of 2 (Final)</span>
                  </div>
                </button>
              </div>
            </div>

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

                    {/* Viewfinder Overlay Single-Device Lock Warning */}
                    {lockedSku && lockCooldown > 0 && (
                      <div className="absolute top-3 left-3 right-3 z-20 bg-amber-950/90 border border-amber-500/50 backdrop-blur-md px-3.5 py-2.5 rounded-xl flex items-center justify-between shadow-2xl text-amber-200 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="text-[11px] font-mono truncate">
                            <span className="font-bold text-white">{lockedSku}</span> locked ({lockCooldown}s)
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleScanNext}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] uppercase tracking-wide shrink-0 transition"
                        >
                          Scan Next
                        </button>
                      </div>
                    )}

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
                ) : cameraError === 'PERMISSION_DISMISSED' ? (
                  <div className="text-center p-5 text-slate-300 max-w-sm mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Camera Access Dismissed</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Camera access was dismissed or blocked. Tap the lock <span className="text-amber-400 font-bold">🔒</span> in your browser address bar to allow camera access, then click below.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraError(null);
                          setIsCameraActive(true);
                          startCamera();
                        }}
                        className="w-full py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Request Camera Permission</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700 flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Upload / Take Photo Instead</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <CameraOff className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs font-semibold">Camera is paused</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraError(null);
                          setIsCameraActive(true);
                          startCamera();
                        }}
                        className="px-3.5 py-1.5 bg-[#8B5CF6] text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Start Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Upload Photo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden file input for photo/image upload scanning */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageFileScan}
              />

              {/* Viewfinder Bottom Action Bar */}
              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#27272A]">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#09090B] hover:bg-slate-200 dark:hover:bg-[#27272A] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#27272A] transition"
                  title="Upload a barcode image or take a photo"
                >
                  <Upload className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>Scan From Photo / File</span>
                </button>

                <span className="text-[10px] text-slate-400 font-mono">
                  {isCameraActive ? 'Live 60fps' : 'Standby'}
                </span>
              </div>

              {cameraError && cameraError !== 'PERMISSION_DISMISSED' && (
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

                    {/* Barcode Inline Preview (Vector SVG - 100% Reliable) */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-1 shrink-0 bg-white p-2 rounded-xl border border-slate-200 dark:border-[#27272A] shadow-sm">
                      <BarcodeSvg
                        value={scanResult.product.sku}
                        width={1.6}
                        height={34}
                        displayValue={true}
                        className="max-w-[160px] h-auto"
                      />
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold">
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

                  {/* ─── 2-STAGE FULFILLMENT LIFECYCLE PROTECTION ───────────────── */}
                  <div className="rounded-2xl border border-slate-200 dark:border-[#27272A] p-4 bg-slate-50/70 dark:bg-[#09090B]/60 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-[#27272A]">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6]">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                              2-Stage Scan Lifecycle Protection
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-slate-200 dark:bg-[#27272A] text-slate-800 dark:text-slate-200">
                              {scanResult.lifecycle?.scanCount ?? 0} / 2 Scans Used
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Strict protocol: Product can ONLY be scanned twice (Scan 1: Packing, Scan 2: Received).
                          </p>
                        </div>
                      </div>

                      {/* Overall Status Badge */}
                      <span
                        className={`self-start sm:self-auto px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 ${
                          scanResult.lifecycle?.status === 'RECEIVED'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : scanResult.lifecycle?.status === 'PACKED'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {scanResult.lifecycle?.status === 'RECEIVED' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>LIFECYCLE COMPLETE (2/2)</span>
                          </>
                        ) : scanResult.lifecycle?.status === 'PACKED' ? (
                          <>
                            <Truck className="w-3 h-3" />
                            <span>PACKED — AWAITING RECEIPT (1/2)</span>
                          </>
                        ) : (
                          <>
                            <Package className="w-3 h-3" />
                            <span>AWAITING PACKING (0/2)</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* The Two Stages Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Stage 1: Packing Scan */}
                      <div
                        className={`p-3.5 rounded-xl border transition ${
                          scanResult.lifecycle?.stage1
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30'
                            : stageMode === 'PACKING'
                            ? 'bg-white dark:bg-[#18181B] border-amber-500/80 ring-1 ring-amber-500/20 shadow-sm'
                            : 'bg-white dark:bg-[#18181B] border-slate-200 dark:border-[#27272A]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                                scanResult.lifecycle?.stage1
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-200 dark:bg-[#27272A] text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              1
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-[#FAFAFA]">
                              Packing Scan (Scan 1)
                            </span>
                          </div>
                          {scanResult.lifecycle?.stage1 ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              Pending
                            </span>
                          )}
                        </div>

                        {scanResult.lifecycle?.stage1 ? (
                          <div className="space-y-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                            <div className="flex items-center justify-between">
                              <span>Packed At:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {new Date(scanResult.lifecycle.stage1.packedAt).toLocaleString('en-IN', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>
                            {scanResult.lifecycle.stage1.packedByName && (
                              <div className="flex items-center justify-between">
                                <span>Packed By:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                                  {scanResult.lifecycle.stage1.packedByName}
                                </span>
                              </div>
                            )}
                            {scanResult.lifecycle.stage1.packedDeviceId && (
                              <div className="flex items-center justify-between">
                                <span>Terminal:</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                  {scanResult.lifecycle.stage1.packedDeviceId}
                                </span>
                              </div>
                            )}
                            <div className="pt-2">
                              <div className="w-full py-1.5 px-2 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-center">
                                ✅ Scan 1 Complete (Already Packed)
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                              Scan this item into dispatch package before sealing parcel.
                            </p>
                            <button
                              type="button"
                              disabled={executingStage || !scanResult.lifecycle?.canPack}
                              onClick={() => handleExecuteStageScan('PACKING')}
                              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-1.5"
                            >
                              {executingStage ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Package className="w-3.5 h-3.5" />
                              )}
                              <span>📦 Confirm Packing (Scan 1/2)</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Stage 2: Received Scan */}
                      <div
                        className={`p-3.5 rounded-xl border transition ${
                          scanResult.lifecycle?.stage2
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30'
                            : stageMode === 'RECEIVED'
                            ? 'bg-white dark:bg-[#18181B] border-emerald-500/80 ring-1 ring-emerald-500/20 shadow-sm'
                            : 'bg-white dark:bg-[#18181B] border-slate-200 dark:border-[#27272A]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                                scanResult.lifecycle?.stage2
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-200 dark:bg-[#27272A] text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              2
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-[#FAFAFA]">
                              Received Scan (Scan 2)
                            </span>
                          </div>
                          {scanResult.lifecycle?.stage2 ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Received
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">
                              {scanResult.lifecycle?.canReceive ? 'Awaiting Receipt' : 'Locked'}
                            </span>
                          )}
                        </div>

                        {scanResult.lifecycle?.stage2 ? (
                          <div className="space-y-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                            <div className="flex items-center justify-between">
                              <span>Received At:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {new Date(scanResult.lifecycle.stage2.receivedAt).toLocaleString('en-IN', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>
                            {scanResult.lifecycle.stage2.receivedByName && (
                              <div className="flex items-center justify-between">
                                <span>Received By:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                                  {scanResult.lifecycle.stage2.receivedByName}
                                </span>
                              </div>
                            )}
                            {scanResult.lifecycle.stage2.receivedDeviceId && (
                              <div className="flex items-center justify-between">
                                <span>Terminal:</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                  {scanResult.lifecycle.stage2.receivedDeviceId}
                                </span>
                              </div>
                            )}
                            <div className="pt-2">
                              <div className="w-full py-1.5 px-2 rounded-lg text-[11px] font-extrabold bg-slate-100 dark:bg-[#27272A] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#3F3F46] text-center">
                                🔒 Terminal State: 2/2 Scans Completed
                              </div>
                            </div>
                          </div>
                        ) : !scanResult.lifecycle?.stage1 ? (
                          <div className="space-y-2">
                            <p className="text-[11px] text-slate-400 italic leading-snug">
                              ⏳ Product must be packed (Scan 1) before it can be scanned as received.
                            </p>
                            <button
                              type="button"
                              disabled
                              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-slate-400 bg-slate-100 dark:bg-[#27272A] cursor-not-allowed text-center"
                            >
                              Blocked: Must Pack First
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                              Confirm parcel arrived safely at destination facility.
                            </p>
                            <button
                              type="button"
                              disabled={executingStage || !scanResult.lifecycle?.canReceive}
                              onClick={() => handleExecuteStageScan('RECEIVED')}
                              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-1.5"
                            >
                              {executingStage ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>📥 Confirm Received (Scan 2/2)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Single-Device Lock Status & Unlock Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#27272A] text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          Device: <strong className="font-mono text-slate-700 dark:text-slate-300">{deviceId}</strong>
                          {lockCooldown > 0 ? (
                            <span className="text-amber-500 font-bold ml-1.5">
                              (Locked: {lockCooldown}s cooldown)
                            </span>
                          ) : (
                            <span className="text-emerald-500 font-bold ml-1.5">(Ready)</span>
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleScanNext}
                        className="px-3 py-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Scan Next Item</span>
                      </button>
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
                      onClick={async () => {
                        try {
                          await barcodeApi.downloadLabelPdf(scanResult.product.sku);
                          showToast('Thermal label PDF downloaded', 'success');
                        } catch (err: any) {
                          showToast(err?.message || 'Failed to download thermal label PDF', 'error');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-[#3F3F46] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-[#3F3F46]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF Label</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleScanNext}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-[#09090B] text-slate-600 dark:text-slate-400 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-[#27272A] ml-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Scan Next Item</span>
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
                  onClick={async () => {
                    if (!selectedStudioProduct) return;
                    try {
                      await barcodeApi.downloadLabelPdf(selectedStudioProduct.sku, labelSize);
                      showToast('Thermal label PDF downloaded', 'success');
                    } catch (err: any) {
                      showToast(err?.message || 'Failed to download thermal label PDF', 'error');
                    }
                  }}
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
                    {/* Top Row: Brand & Bold SKU + QR */}
                    <div className="flex items-start justify-between gap-2 border-b-2 border-black pb-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black uppercase tracking-wider text-black/70">
                          PACIFIC HARDWARE (PRC)
                        </div>
                        <div className="text-sm sm:text-base font-black font-mono tracking-tight text-black mt-1">
                          SKU: {selectedStudioProduct.sku}
                        </div>
                      </div>

                      {/* Scannable QR Code */}
                      <img
                        src={barcodeApi.getQrImageUrl(
                          selectedStudioProduct.sku,
                          `https://pacificrestroomcubicles.com/product/${selectedStudioProduct.slug || selectedStudioProduct.sku}`
                        )}
                        alt="QR Code"
                        className="w-12 h-12 border border-black/60 p-0.5 shrink-0 bg-white"
                      />
                    </div>

                    {/* Bottom: Code-128 Linear Barcode (Vector SVG - 100% Crisp & Reliable) */}
                    <div className="mt-3 text-center flex items-center justify-center">
                      <BarcodeSvg
                        value={selectedStudioProduct.sku}
                        width={labelSize === '80x40' ? 2.4 : 1.9}
                        height={labelSize === '80x40' ? 52 : 44}
                        displayValue={true}
                        className="max-w-full h-auto mx-auto"
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

      {/* ─── IOS SAFARI PWA INSTALLATION MODAL ──────────────────────────────── */}
      {showIosInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272A]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#8B5CF6]" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Install PRC Scanner App</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosInstallModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>Install the Barcode Scanner directly to your iPhone / iPad home screen:</p>
              <ol className="list-decimal list-inside space-y-2 text-[11px] bg-slate-50 dark:bg-[#09090B] p-3 rounded-xl border border-slate-200 dark:border-[#27272A]">
                <li>Tap the <strong>Share</strong> button <span className="font-bold text-base text-[#8B5CF6]">⎋</span> in Safari.</li>
                <li>Scroll down and select <strong>"Add to Home Screen"</strong> <span className="font-bold text-[#8B5CF6]">➕</span>.</li>
                <li>Tap <strong>"Add"</strong> in the top right corner.</li>
                <li>Launch the <strong>PRC Scanner</strong> app from your home screen for full-screen camera scanning!</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={() => setShowIosInstallModal(false)}
              className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold transition shadow-md shadow-[#8B5CF6]/25"
            >
              Understood
            </button>
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
            width: ${labelSize === '80x40' ? '80mm' : '58mm'} !important;
            max-width: ${labelSize === '80x40' ? '80mm' : '58mm'} !important;
            margin: 0 !important;
            padding: 3mm !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BarcodePage;
