/**
 * PlanMeasure - Interaktives Maßband & Skalierungs-Web-App
 * GitHub Pages kompatibel (100% Client-Side, reines JavaScript/ES6)
 * Optimiert für Desktop und Touch-Smartphones / Tablets
 *
 * Architektur:
 * Screen-Sized Viewport Canvas + Screen-Sized SVG Vector Layer
 * Verhindert GPU-Tile-Cache-Überlauf und Browser-Glitches auf Mobilgeräten vollständig.
 */

class PlanMeasureApp {
    constructor() {
        // Kern-Zustand (State)
        this.image = null;
        this.imageLoaded = false;
        this.imageWidth = 0;
        this.imageHeight = 0;
        this.imageSrc = null;

        // Skalierung: Standardmäßig 100 Pixel = 1 Meter (wie vom Nutzer gewünscht)
        this.scaleConfig = {
            pixelsPerMeter: 100.0,
            unit: 'm' // 'm', 'cm', 'mm', 'km'
        };

        // Viewport Transform (Pan & Zoom)
        this.transform = {
            x: 0,
            y: 0,
            scale: 1.0
        };
        this.minScale = 0.01;
        this.maxScale = 80.0;

        // Aktives Werkzeug: 'pan' | 'line' | 'path' | 'area' | 'calibrate'
        this.currentTool = 'pan';

        // Messungen-Speicher
        // Jede Messung: { id, type, points: [{x, y}], name, color, visible }
        this.measurements = [];
        this.selectedMeasurementId = null;

        // Aktuell in Zeichnung befindliche Messung
        this.activeDrawing = null; // { type, points: [{x, y}] }
        this.hoverCoords = { x: 0, y: 0 };
        this.lastPreviewCoord = null;

        // Pointer- & Touch-Tracking
        this.activePointers = new Map(); // pointerId -> { clientX, clientY }
        this.dragState = null; // { type: 'pan'|'handle', startX, startY, ... }
        this.pinchStartDistance = 0;
        this.pinchStartScale = 1.0;
        this.pinchStartCenter = { x: 0, y: 0 };
        this.isSpacePressed = false;

        // Render-Throttle per requestAnimationFrame
        this.renderRequested = false;

        // Lupe-Zustand (Magnifier)
        this.isLoupeEnabled = true;
        this.isLoupeActive = false;

        // Farbauswahl für neue Messungen
        this.colorPalette = [
            '#3b82f6', // Blau
            '#10b981', // Grün
            '#f59e0b', // Gelb/Orange
            '#ec4899', // Pink
            '#8b5cf6', // Violett
            '#06b6d4', // Türkis
            '#ef4444'  // Rot
        ];
        this.colorIndex = 0;

        // DOM Elemente cachen
        this.initDomElements();

        // Event-Listener initialisieren
        this.initEvents();

        // Maßstabsanzeige und Messungsliste initialisieren
        this.updateScaleDisplay();
        this.updateMeasurementsList();
        this.updateScaleBar();
    }

    // =========================================================================
    // DOM Initialisierung
    // =========================================================================
    initDomElements() {
        this.el = {
            viewportContainer: document.getElementById('viewportContainer'),
            viewportCanvas: document.getElementById('viewportCanvas'),
            measureSvg: document.getElementById('measureSvg'),
            groupMeasurements: document.getElementById('groupMeasurements'),
            groupActive: document.getElementById('groupActive'),
            dropzoneOverlay: document.getElementById('dropzoneOverlay'),
            fileUploadInput: document.getElementById('fileUploadInput'),
            btnDropzoneUpload: document.getElementById('btnDropzoneUpload'),

            // Toolbar & Buttons
            scaleLabelText: document.getElementById('scaleLabelText'),
            btnScaleQuick: document.getElementById('btnScaleQuick'),
            btnToggleList: document.getElementById('btnToggleList'),
            btnSettings: document.getElementById('btnSettings'),
            badgeCount: document.getElementById('badgeCount'),

            // Floating Controls
            btnZoomIn: document.getElementById('btnZoomIn'),
            btnZoomOut: document.getElementById('btnZoomOut'),
            btnZoomFit: document.getElementById('btnZoomFit'),
            btnToggleLoupe: document.getElementById('btnToggleLoupe'),
            scaleBarContainer: document.getElementById('scaleBarContainer'),
            scaleBarLine: document.getElementById('scaleBarLine'),
            scaleBarText: document.getElementById('scaleBarText'),
            hudZoom: document.getElementById('hudZoom'),
            hudCoords: document.getElementById('hudCoords'),
            hudImageDim: document.getElementById('hudImageDim'),

            // Magnifier Loupe
            magnifierLoupe: document.getElementById('magnifierLoupe'),
            loupeCanvas: document.getElementById('loupeCanvas'),
            loupeLabel: document.getElementById('loupeLabel'),

            // Action Banner
            actionBanner: document.getElementById('actionBanner'),
            actionBannerText: document.getElementById('actionBannerText'),
            btnCancelAction: document.getElementById('btnCancelAction'),
            btnFinishAction: document.getElementById('btnFinishAction'),

            // Sidebar Drawer
            sidebarList: document.getElementById('sidebarList'),
            btnCloseSidebar: document.getElementById('btnCloseSidebar'),
            sidebarCount: document.getElementById('sidebarCount'),
            sumTotalDistance: document.getElementById('sumTotalDistance'),
            sumTotalArea: document.getElementById('sumTotalArea'),
            measurementsList: document.getElementById('measurementsList'),
            btnExportImage: document.getElementById('btnExportImage'),
            btnExportJson: document.getElementById('btnExportJson'),
            btnClearAll: document.getElementById('btnClearAll'),

            // Modals
            scaleModal: document.getElementById('scaleModal'),
            inputPxPerMeter: document.getElementById('inputPxPerMeter'),
            selectUnit: document.getElementById('selectUnit'),
            btnSaveScale: document.getElementById('btnSaveScale'),
            btnStartCalibrateWizard: document.getElementById('btnStartCalibrateWizard'),
            statImgResolution: document.getElementById('statImgResolution'),
            statImgMeters: document.getElementById('statImgMeters'),
            statImgMegapixels: document.getElementById('statImgMegapixels'),

            calibrationPromptModal: document.getElementById('calibrationPromptModal'),
            promptPixelDistance: document.getElementById('promptPixelDistance'),
            inputRealDistance: document.getElementById('inputRealDistance'),
            promptComputedScale: document.getElementById('promptComputedScale'),
            btnApplyCalibration: document.getElementById('btnApplyCalibration'),

            toast: document.getElementById('toast'),

            // Tool Buttons (Desktop & Mobile)
            desktopToolBtns: document.querySelectorAll('.tool-btn'),
            mobileNavBtns: document.querySelectorAll('.mobile-nav-btn')
        };

        this.canvasCtx = this.el.viewportCanvas.getContext('2d');
        this.loupeCtx = this.el.loupeCanvas.getContext('2d');
    }

    // =========================================================================
    // Event Registrierung
    // =========================================================================
    initEvents() {
        // Window Resize
        window.addEventListener('resize', () => {
            this.updateScaleBar();
            this.requestRender();
        });

        // Dateiupload & Drag & Drop
        this.el.fileUploadInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.el.btnDropzoneUpload.addEventListener('click', () => this.el.fileUploadInput.click());

        // Drag & Drop auf dem Viewport
        ['dragenter', 'dragover'].forEach(eventName => {
            this.el.viewportContainer.addEventListener(eventName, (e) => {
                e.preventDefault();
                this.el.dropzoneOverlay.classList.remove('hidden');
                this.el.dropzoneOverlay.querySelector('.dropzone-card').classList.add('drag-over');
            });
        });
        ['dragleave', 'drop'].forEach(eventName => {
            this.el.viewportContainer.addEventListener(eventName, (e) => {
                e.preventDefault();
                this.el.dropzoneOverlay.querySelector('.dropzone-card').classList.remove('drag-over');
            });
        });
        this.el.viewportContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                this.loadImageFile(files[0]);
            }
        });

        // Clipboard Paste (Strg+V für Bilder)
        window.addEventListener('paste', (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    this.loadImageFile(blob);
                    this.showToast('Bild aus Zwischenablage eingefügt!');
                    break;
                }
            }
        });

        // Werkzeug-Auswahl (Desktop & Mobile)
        this.el.desktopToolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTool(btn.getAttribute('data-tool'));
            });
        });
        this.el.mobileNavBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTool(btn.getAttribute('data-tool'));
            });
        });

        // Pointer Events für Pan, Zoom & Messen (Desktop Maus & Mobile Touch)
        const vp = this.el.viewportContainer;
        vp.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        vp.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        vp.addEventListener('pointerup', (e) => this.handlePointerUp(e));
        vp.addEventListener('pointercancel', (e) => this.handlePointerUp(e));

        // Mausrad Zoom
        vp.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Tastatur Shortcuts
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Floating Zoom-Buttons
        this.el.btnZoomIn.addEventListener('click', () => this.zoomStep(1.3));
        this.el.btnZoomOut.addEventListener('click', () => this.zoomStep(1 / 1.3));
        this.el.btnZoomFit.addEventListener('click', () => this.zoomFit());
        this.el.btnToggleLoupe.addEventListener('click', () => {
            this.isLoupeEnabled = !this.isLoupeEnabled;
            this.el.btnToggleLoupe.style.color = this.isLoupeEnabled ? 'var(--primary)' : 'var(--text-muted)';
            this.showToast(`Präzisions-Lupe: ${this.isLoupeEnabled ? 'Aktiviert' : 'Deaktiviert'}`);
        });

        // Action Banner Buttons
        this.el.btnCancelAction.addEventListener('click', () => this.cancelActiveDrawing());
        this.el.btnFinishAction.addEventListener('click', () => this.finishActiveDrawing());

        // Sidebar & Modals
        this.el.btnToggleList.addEventListener('click', () => this.toggleSidebar());
        this.el.btnCloseSidebar.addEventListener('click', () => this.toggleSidebar(false));
        this.el.btnClearAll.addEventListener('click', () => this.clearAllMeasurements());
        this.el.btnExportJson.addEventListener('click', () => this.exportJson());
        this.el.btnExportImage.addEventListener('click', () => this.exportAnnotatedImage());

        // Skalierungs-Modal
        this.el.btnScaleQuick.addEventListener('click', () => this.openScaleModal());
        this.el.btnSettings.addEventListener('click', () => this.openScaleModal());
        this.el.btnSaveScale.addEventListener('click', () => this.saveScaleSettings());
        this.el.btnStartCalibrateWizard.addEventListener('click', () => {
            this.closeAllModals();
            this.setTool('calibrate');
        });

        // Presets im Skalierungs-Modal
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.el.inputPxPerMeter.value = btn.getAttribute('data-px');
            });
        });

        // Tabs im Modal
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const targetId = btn.getAttribute('data-tab');
                document.getElementById(targetId).classList.add('active');
            });
        });

        // Kalibrierungs-Dialog (nach 2-Punkte-Zug)
        this.el.inputRealDistance.addEventListener('input', () => this.updateCalibrationPreview());
        this.el.btnApplyCalibration.addEventListener('click', () => this.applyCalibrationFromDialog());

        // Modal Schließen-Buttons (data-close)
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.getAttribute('data-close');
                document.getElementById(modalId).classList.add('hidden');
            });
        });
    }

    // =========================================================================
    // Bildverwaltung & Loading
    // =========================================================================
    handleFileSelect(e) {
        const file = e.target.files && e.target.files[0];
        if (file) {
            this.loadImageFile(file);
        }
    }

    loadImageFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showToast('Bitte wähle eine gültige Bilddatei (PNG, JPG, WebP)!');
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        this.loadImageUrl(objectUrl, file.name, null, file);
    }

    loadImageUrl(url, fileName = 'Bild', callback = null, originalFile = null) {
        const img = new Image();
        img.onload = () => {
            this.image = img;
            this.imageLoaded = true;
            this.imageWidth = img.naturalWidth;
            this.imageHeight = img.naturalHeight;
            this.imageSrc = url;

            this.el.dropzoneOverlay.classList.add('hidden');

            // HUD & Stats Info
            const mp = ((this.imageWidth * this.imageHeight) / 1000000).toFixed(1);
            this.el.hudImageDim.textContent = `${this.imageWidth} × ${this.imageHeight} px (${mp} MP)`;
            this.updateImageStats();

            // Zoom auf Fenster anpassen und neu zeichnen
            this.zoomFit();
            this.updateScaleBar();

            if (callback) callback();
        };

        img.onerror = async () => {
            if (originalFile && window.createImageBitmap) {
                this.showToast('Optimiere extrem großes Bild für Mobilgerät...');
                try {
                    const bitmap = await createImageBitmap(originalFile, {
                        resizeWidth: 4096,
                        resizeQuality: 'high'
                    });
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = bitmap.width;
                    tempCanvas.height = bitmap.height;
                    const ctx = tempCanvas.getContext('2d');
                    ctx.drawImage(bitmap, 0, 0);

                    const ratio = bitmap.width / (originalFile.width || 4096);
                    this.scaleConfig.pixelsPerMeter = this.scaleConfig.pixelsPerMeter * ratio;
                    this.updateScaleDisplay();

                    tempCanvas.toBlob((b) => {
                        const downsampledUrl = URL.createObjectURL(b);
                        this.loadImageUrl(downsampledUrl, fileName, callback);
                    }, 'image/png');
                    return;
                } catch (e) {
                    console.error('Bitmap Fallback fehlgeschlagen:', e);
                }
            }
            this.showToast('Fehler beim Laden des Bildes! Möglicherweise übersteigt die Datei das Speicherlimit Ihres Browsers.');
        };

        img.src = url;
    }

    updateImageStats() {
        if (!this.imageLoaded) return;
        const wMeters = (this.imageWidth / this.scaleConfig.pixelsPerMeter).toFixed(1);
        const hMeters = (this.imageHeight / this.scaleConfig.pixelsPerMeter).toFixed(1);
        const mp = ((this.imageWidth * this.imageHeight) / 1000000).toFixed(1);

        this.el.statImgResolution.textContent = `${this.imageWidth} × ${this.imageHeight} px`;
        this.el.statImgMeters.textContent = `${wMeters} m × ${hMeters} m`;
        this.el.statImgMegapixels.textContent = `${mp} Megapixel`;
    }

    // =========================================================================
    // Transform, Pan & Zoom Mechanik (Hardware-beschleunigt)
    // =========================================================================
    applyTransform() {
        // HUD Zoom aktualisieren
        this.el.hudZoom.textContent = `Zoom: ${Math.round(this.transform.scale * 100)}%`;

        // Dynamischen Maßstabsbalken aktualisieren
        this.updateScaleBar();

        // Neuzeichnen über requestAnimationFrame triggern
        this.requestRender();
    }

    requestRender() {
        if (this.renderRequested) return;
        this.renderRequested = true;
        requestAnimationFrame(() => {
            this.renderRequested = false;
            this.renderScene();
        });
    }

    renderScene() {
        this.renderCanvas();
        this.renderAllMeasurements();
        if (this.activeDrawing && this.lastPreviewCoord) {
            this.renderDrawingPreview(this.lastPreviewCoord);
        }
    }

    zoomStep(factor, center = null) {
        if (!this.imageLoaded) return;

        const rect = this.el.viewportContainer.getBoundingClientRect();
        const cx = center ? center.x : rect.width / 2;
        const cy = center ? center.y : rect.height / 2;

        const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.transform.scale * factor));
        if (newScale === this.transform.scale) return;

        // Skalierung um den Mittelpunkt (cx, cy)
        const scaleChange = newScale / this.transform.scale;
        this.transform.x = cx - (cx - this.transform.x) * scaleChange;
        this.transform.y = cy - (cy - this.transform.y) * scaleChange;
        this.transform.scale = newScale;

        this.applyTransform();
    }

    zoomFit() {
        if (!this.imageLoaded) return;

        const rect = this.el.viewportContainer.getBoundingClientRect();
        const padding = 20;
        const availW = Math.max(10, rect.width - padding * 2);
        const availH = Math.max(10, rect.height - padding * 2);

        const scaleX = availW / this.imageWidth;
        const scaleY = availH / this.imageHeight;
        const fitScale = Math.min(scaleX, scaleY, 1.5);

        this.transform.scale = Math.max(fitScale, this.minScale);
        this.transform.x = (rect.width - this.imageWidth * this.transform.scale) / 2;
        this.transform.y = (rect.height - this.imageHeight * this.transform.scale) / 2;

        this.applyTransform();
    }

    handleWheel(e) {
        e.preventDefault();
        const rect = this.el.viewportContainer.getBoundingClientRect();
        const cursor = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        const zoomFactor = e.deltaY < 0 ? 1.15 : (1 / 1.15);
        this.zoomStep(zoomFactor, cursor);

        // Bildkoordinaten unter Cursor für HUD aktualisieren
        this.updateHoverCoords(e.clientX, e.clientY);
    }

    // =========================================================================
    // Koordinaten-Umrechnung (Screen <-> Image Coordinates)
    // =========================================================================
    screenToImageCoords(screenX, screenY) {
        const rect = this.el.viewportContainer.getBoundingClientRect();
        const vx = screenX - rect.left;
        const vy = screenY - rect.top;

        return {
            x: (vx - this.transform.x) / this.transform.scale,
            y: (vy - this.transform.y) / this.transform.scale
        };
    }

    imageToScreenCoords(imgX, imgY) {
        // Relativ zum Viewport-Container für die exakte Positionierung der SVG-Elemente
        return {
            x: this.transform.x + imgX * this.transform.scale,
            y: this.transform.y + imgY * this.transform.scale
        };
    }

    updateHoverCoords(screenX, screenY) {
        const imgCoords = this.screenToImageCoords(screenX, screenY);
        this.hoverCoords = imgCoords;

        if (this.imageLoaded) {
            const metersX = (imgCoords.x / this.scaleConfig.pixelsPerMeter).toFixed(1);
            const metersY = (imgCoords.y / this.scaleConfig.pixelsPerMeter).toFixed(1);
            this.el.hudCoords.textContent = `X: ${metersX} m | Y: ${metersY} m`;
        }
    }

    // =========================================================================
    // Canvas Viewport Rendering (Kein GPU-Tiling, absolut stabil)
    // =========================================================================
    renderCanvas() {
        if (!this.imageLoaded || !this.image) return;

        const canvas = this.el.viewportCanvas;
        const ctx = this.canvasCtx;
        const rect = this.el.viewportContainer.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        const viewW = rect.width;
        const viewH = rect.height;

        const targetW = Math.round(viewW * dpr);
        const targetH = Math.round(viewH * dpr);

        if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
        }

        ctx.save();
        ctx.clearRect(0, 0, targetW, targetH);

        const scale = this.transform.scale;
        const tx = this.transform.x;
        const ty = this.transform.y;
        const imgW = this.imageWidth;
        const imgH = this.imageHeight;

        // Sichtbarer Bildausschnitt berechnen
        const srcX0 = -tx / scale;
        const srcY0 = -ty / scale;
        const srcX1 = (viewW - tx) / scale;
        const srcY1 = (viewH - ty) / scale;

        // Innerhalb der Bildgrenzen beschränken
        const clampX0 = Math.max(0, Math.min(imgW, srcX0));
        const clampY0 = Math.max(0, Math.min(imgH, srcY0));
        const clampX1 = Math.max(0, Math.min(imgW, srcX1));
        const clampY1 = Math.max(0, Math.min(imgH, srcY1));

        if (clampX1 > clampX0 && clampY1 > clampY0) {
            const sw = clampX1 - clampX0;
            const sh = clampY1 - clampY0;

            const dx = (clampX0 * scale + tx) * dpr;
            const dy = (clampY0 * scale + ty) * dpr;
            const dw = sw * scale * dpr;
            const dh = sh * scale * dpr;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = scale < 1 ? 'high' : 'medium';

            ctx.drawImage(this.image, clampX0, clampY0, sw, sh, dx, dy, dw, dh);
        }

        ctx.restore();
    }

    // =========================================================================
    // Pointer Events (Maus & Touch-Gesten)
    // =========================================================================
    handlePointerDown(e) {
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Wenn 2 Pointer aktiv sind: Sofort Pinch-to-Zoom initialisieren (egal welches Tool!)
        if (this.activePointers.size === 2) {
            this.initPinchZoom();
            this.hideLoupe();
            return;
        }

        // Wenn 1 Pointer: Prüfe ob ein Griff (Handle) angeklickt wurde
        const handleTarget = e.target.closest('.handle-point');
        if (handleTarget) {
            const mId = handleTarget.getAttribute('data-mid');
            const pIdx = parseInt(handleTarget.getAttribute('data-pidx'), 10);
            this.startHandleDrag(e, mId, pIdx);
            return;
        }

        // Wenn mittlere Maustaste oder Leertaste gedrückt ist: Pan erzwingen
        if (e.button === 1 || this.isSpacePressed || this.currentTool === 'pan') {
            this.dragState = {
                type: 'pan',
                startX: e.clientX,
                startY: e.clientY,
                origTransformX: this.transform.x,
                origTransformY: this.transform.y
            };
            this.el.viewportContainer.setPointerCapture(e.pointerId);
            return;
        }

        // Nur linke Maustaste oder Touch für Messwerkzeuge
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        // Messpunkt setzen
        const imgCoords = this.screenToImageCoords(e.clientX, e.clientY);
        this.handleMeasureClick(imgCoords, e);
    }

    handlePointerMove(e) {
        if (this.activePointers.has(e.pointerId)) {
            this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }

        this.updateHoverCoords(e.clientX, e.clientY);

        // 2 Pointer aktiv -> Pinch Zoom & Pan
        if (this.activePointers.size === 2) {
            this.processPinchZoom();
            return;
        }

        // 1 Pointer: Griff ziehen (Handle Drag)
        if (this.dragState && this.dragState.type === 'handle') {
            const imgCoords = this.screenToImageCoords(e.clientX, e.clientY);
            this.updateDraggedHandle(imgCoords);
            this.showLoupeAt(e.clientX, e.clientY, imgCoords);
            return;
        }

        // 1 Pointer: Pan (Bewegen)
        if (this.dragState && this.dragState.type === 'pan') {
            const dx = e.clientX - this.dragState.startX;
            const dy = e.clientY - this.dragState.startY;
            this.transform.x = this.dragState.origTransformX + dx;
            this.transform.y = this.dragState.origTransformY + dy;
            this.applyTransform();
            return;
        }

        // In aktiver Zeichnung: Vorschau-Linie mitbewegen
        if (this.activeDrawing && this.activeDrawing.points.length > 0) {
            const imgCoords = this.screenToImageCoords(e.clientX, e.clientY);
            this.renderDrawingPreview(imgCoords);

            // Auf Touch oder mit Lupe: Lupe anzeigen
            if (this.isLoupeEnabled && (e.pointerType === 'touch' || this.isLoupeActive)) {
                this.showLoupeAt(e.clientX, e.clientY, imgCoords);
            }
        }
    }

    handlePointerUp(e) {
        this.activePointers.delete(e.pointerId);

        // Handle Drag beenden
        if (this.dragState && this.dragState.type === 'handle') {
            this.dragState = null;
            this.renderAllMeasurements();
            this.updateMeasurementsList();
            this.hideLoupe();
            return;
        }

        // Pan beenden
        if (this.dragState && this.dragState.type === 'pan') {
            this.dragState = null;
        }

        // Wenn alle Finger angehoben wurden, Lupe ausblenden
        if (this.activePointers.size === 0) {
            this.hideLoupe();
        }
    }

    // =========================================================================
    // Dual-Finger Pinch-To-Zoom & Pan (Mobile Ergonomie)
    // =========================================================================
    initPinchZoom() {
        const pts = Array.from(this.activePointers.values());
        if (pts.length < 2) return;

        const p1 = pts[0];
        const p2 = pts[1];

        this.pinchStartDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        this.pinchStartScale = this.transform.scale;

        const rect = this.el.viewportContainer.getBoundingClientRect();
        this.pinchStartCenter = {
            x: (p1.x + p2.x) / 2 - rect.left,
            y: (p1.y + p2.y) / 2 - rect.top
        };
        this.pinchStartTransform = { ...this.transform };
    }

    processPinchZoom() {
        const pts = Array.from(this.activePointers.values());
        if (pts.length < 2) return;

        const p1 = pts[0];
        const p2 = pts[1];

        const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (this.pinchStartDistance <= 0) return;

        const scaleFactor = currentDist / this.pinchStartDistance;
        const targetScale = Math.min(this.maxScale, Math.max(this.minScale, this.pinchStartScale * scaleFactor));

        const rect = this.el.viewportContainer.getBoundingClientRect();
        const currentCenter = {
            x: (p1.x + p2.x) / 2 - rect.left,
            y: (p1.y + p2.y) / 2 - rect.top
        };

        const scaleChange = targetScale / this.pinchStartScale;
        const newX = this.pinchStartCenter.x - (this.pinchStartCenter.x - this.pinchStartTransform.x) * scaleChange;
        const newY = this.pinchStartCenter.y - (this.pinchStartCenter.y - this.pinchStartTransform.y) * scaleChange;

        const deltaPanX = currentCenter.x - this.pinchStartCenter.x;
        const deltaPanY = currentCenter.y - this.pinchStartCenter.y;

        this.transform.scale = targetScale;
        this.transform.x = newX + deltaPanX;
        this.transform.y = newY + deltaPanY;

        this.applyTransform();
    }

    // =========================================================================
    // Präzisions-Lupe (Magnifier Loupe für Finger & Cursor)
    // =========================================================================
    showLoupeAt(screenX, screenY, imgCoords) {
        if (!this.isLoupeEnabled || !this.imageLoaded || !this.image) return;

        const loupe = this.el.magnifierLoupe;
        loupe.classList.remove('hidden');

        // Positioniere die Lupe 80px oberhalb des Fingers / Cursors
        loupe.style.left = `${screenX}px`;
        loupe.style.top = `${screenY}px`;

        const ctx = this.loupeCtx;
        const loupeSize = 160;
        const zoomSample = 50 / (this.transform.scale > 1 ? Math.sqrt(this.transform.scale) : 1);
        const zoomFactor = loupeSize / zoomSample;

        ctx.save();
        ctx.clearRect(0, 0, loupeSize, loupeSize);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, loupeSize, loupeSize);

        // Robuste Matrix-Transformation verhindert jegliche Edge-Clipping-Fehler auf Safari
        ctx.imageSmoothingEnabled = false;
        ctx.translate(loupeSize / 2 - imgCoords.x * zoomFactor, loupeSize / 2 - imgCoords.y * zoomFactor);
        ctx.scale(zoomFactor, zoomFactor);
        ctx.drawImage(this.image, 0, 0);
        ctx.restore();

        // Koordinaten / Längeninfo in Lupe Label
        const mx = (imgCoords.x / this.scaleConfig.pixelsPerMeter).toFixed(2);
        const my = (imgCoords.y / this.scaleConfig.pixelsPerMeter).toFixed(2);
        this.el.loupeLabel.textContent = `${mx}m, ${my}m`;
    }

    hideLoupe() {
        this.el.magnifierLoupe.classList.add('hidden');
    }

    // =========================================================================
    // Werkzeug- & Mess-Logik
    // =========================================================================
    setTool(tool) {
        if (!this.imageLoaded && tool !== 'pan') {
            this.showToast('Bitte öffne zuerst ein Bild (PNG), um Werkzeuge zu nutzen.');
        }

        if (this.currentTool === tool) return;

        if (this.activeDrawing) {
            this.cancelActiveDrawing();
        }

        this.currentTool = tool;

        this.el.desktopToolBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tool') === tool);
        });
        this.el.mobileNavBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tool') === tool);
        });

        this.el.viewportContainer.className = `viewport-container mode-${tool === 'pan' ? 'pan' : 'measure'}`;
        this.updateActionBanner();
    }

    updateActionBanner() {
        const banner = this.el.actionBanner;
        const text = this.el.actionBannerText;
        const btnFinish = this.el.btnFinishAction;

        if (this.currentTool === 'pan') {
            banner.classList.add('hidden');
            return;
        }

        banner.classList.remove('hidden');
        btnFinish.classList.add('hidden');

        switch (this.currentTool) {
            case 'line':
                text.textContent = '📏 Strecke: Klicke auf Start- und Endpunkt';
                break;
            case 'path':
                text.textContent = '📐 Pfad: Klicke Punkte an (Fertigstellen mit Button)';
                if (this.activeDrawing && this.activeDrawing.points.length >= 2) {
                    btnFinish.classList.remove('hidden');
                }
                break;
            case 'area':
                text.textContent = '⬡ Fläche: Klicke die Eckpunkte der Fläche an';
                if (this.activeDrawing && this.activeDrawing.points.length >= 3) {
                    btnFinish.classList.remove('hidden');
                }
                break;
            case 'calibrate':
                text.textContent = '🎯 Kalibrieren: Klicke 2 Punkte einer bekannten Strecke an';
                break;
        }
    }

    handleMeasureClick(point, e) {
        if (!this.imageLoaded) {
            this.showToast('Bitte öffne zuerst ein Bild (PNG), um zu messen!');
            return;
        }

        if (!this.activeDrawing) {
            this.activeDrawing = {
                type: this.currentTool,
                points: [point],
                color: this.colorPalette[this.colorIndex % this.colorPalette.length]
            };
            this.colorIndex++;
            this.updateActionBanner();
            this.renderDrawingPreview(point);
            return;
        }

        if (this.activeDrawing.type === 'line' || this.activeDrawing.type === 'calibrate') {
            this.activeDrawing.points.push(point);
            this.finishActiveDrawing();
        } else if (this.activeDrawing.type === 'path') {
            this.activeDrawing.points.push(point);
            this.updateActionBanner();
            this.renderDrawingPreview(point);
        } else if (this.activeDrawing.type === 'area') {
            this.activeDrawing.points.push(point);
            this.updateActionBanner();
            this.renderDrawingPreview(point);
        }
    }

    renderDrawingPreview(currentCursorImg) {
        if (!this.activeDrawing) return;
        this.lastPreviewCoord = currentCursorImg;

        const pts = this.activeDrawing.points;
        const type = this.activeDrawing.type;
        const g = this.el.groupActive;
        g.innerHTML = '';

        if (pts.length === 0) return;

        const screenPts = pts.map(p => this.imageToScreenCoords(p.x, p.y));
        const sCursor = this.imageToScreenCoords(currentCursorImg.x, currentCursorImg.y);
        const allScreenPts = [...screenPts, sCursor];

        if (type === 'line' || type === 'calibrate') {
            const p1 = pts[0];
            const p2 = currentCursorImg;
            const s1 = screenPts[0];
            const s2 = sCursor;
            const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const distStr = this.formatDistance(distPx);

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', s1.x);
            line.setAttribute('y1', s1.y);
            line.setAttribute('x2', s2.x);
            line.setAttribute('y2', s2.y);
            line.setAttribute('class', type === 'calibrate' ? 'measure-calibrate-line' : 'measure-line-preview');
            g.appendChild(line);

            // Startpunkt Marker
            g.appendChild(this.createHandleElement(s1.x, s1.y, null, 0));

            // Mittiges Label mit Distanz
            const midX = (s1.x + s2.x) / 2;
            const midY = (s1.y + s2.y) / 2;
            g.appendChild(this.createBadgeElement(midX, midY, distStr));
        } else if (type === 'path') {
            const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            polyline.setAttribute('points', allScreenPts.map(s => `${s.x},${s.y}`).join(' '));
            polyline.setAttribute('class', 'measure-line-preview');
            g.appendChild(polyline);

            screenPts.forEach((s, idx) => {
                g.appendChild(this.createHandleElement(s.x, s.y, null, idx));
            });

            // Gesamtlänge berechnen
            const allImgPts = [...pts, currentCursorImg];
            let totalPx = 0;
            for (let i = 1; i < allImgPts.length; i++) {
                totalPx += Math.hypot(allImgPts[i].x - allImgPts[i - 1].x, allImgPts[i].y - allImgPts[i - 1].y);
            }
            g.appendChild(this.createBadgeElement(sCursor.x, sCursor.y, `Gesamt: ${this.formatDistance(totalPx)}`));
        } else if (type === 'area') {
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', allScreenPts.map(s => `${s.x},${s.y}`).join(' '));
            polygon.setAttribute('class', 'measure-area-polygon');
            g.appendChild(polygon);

            screenPts.forEach((s, idx) => {
                g.appendChild(this.createHandleElement(s.x, s.y, null, idx));
            });
        }
    }

    finishActiveDrawing() {
        if (!this.activeDrawing) return;

        const pts = this.activeDrawing.points;
        const type = this.activeDrawing.type;

        // Validierung
        if (type === 'line' && pts.length < 2) return;
        if (type === 'path' && pts.length < 2) return;
        if (type === 'area' && pts.length < 3) return;

        // Wenn Kalibrierung: Kalibrierungsdialog aufrufen
        if (type === 'calibrate') {
            const p1 = pts[0];
            const p2 = pts[1];
            const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            this.openCalibrationPrompt(distPx);
            this.cancelActiveDrawing();
            this.setTool('pan');
            return;
        }

        // Reguläre Messung speichern
        const newMeasurement = {
            id: 'm-' + Date.now(),
            type: type,
            points: [...pts],
            color: this.activeDrawing.color,
            name: this.generateMeasurementName(type),
            visible: true
        };

        this.measurements.push(newMeasurement);
        this.cancelActiveDrawing();
        this.renderAllMeasurements();
        this.updateMeasurementsList();
        this.showToast(`${newMeasurement.name} hinzugefügt!`);

        // Zurück auf Pan schalten nach Strecke
        if (type === 'line') {
            this.setTool('pan');
        }
    }

    cancelActiveDrawing() {
        this.activeDrawing = null;
        this.lastPreviewCoord = null;
        this.el.groupActive.innerHTML = '';
        this.updateActionBanner();
    }

    generateMeasurementName(type) {
        const count = this.measurements.filter(m => m.type === type).length + 1;
        switch (type) {
            case 'line': return `Strecke ${count}`;
            case 'path': return `Pfad ${count}`;
            case 'area': return `Fläche ${count}`;
            default: return `Messung ${count}`;
        }
    }

    // =========================================================================
    // Griffe (Handles) & Ziehen
    // =========================================================================
    startHandleDrag(e, measurementId, pointIndex) {
        e.stopPropagation();
        const m = this.measurements.find(item => item.id === measurementId);
        if (!m) return;

        this.dragState = {
            type: 'handle',
            measurement: m,
            pointIndex: pointIndex
        };

        const imgCoords = this.screenToImageCoords(e.clientX, e.clientY);
        this.showLoupeAt(e.clientX, e.clientY, imgCoords);
    }

    updateDraggedHandle(imgCoords) {
        if (!this.dragState || this.dragState.type !== 'handle') return;

        const m = this.dragState.measurement;
        const idx = this.dragState.pointIndex;

        m.points[idx] = { x: imgCoords.x, y: imgCoords.y };
        this.renderAllMeasurements();
    }

    // =========================================================================
    // SVG Rendering aller Messungen (In Bildschirmkoordinaten)
    // =========================================================================
    renderAllMeasurements() {
        const g = this.el.groupMeasurements;
        g.innerHTML = '';

        this.measurements.forEach(m => {
            if (!m.visible) return;

            const mGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            mGroup.setAttribute('data-id', m.id);

            if (m.type === 'line') {
                const p1 = m.points[0];
                const p2 = m.points[1];
                const s1 = this.imageToScreenCoords(p1.x, p1.y);
                const s2 = this.imageToScreenCoords(p2.x, p2.y);
                const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);

                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', s1.x);
                line.setAttribute('y1', s1.y);
                line.setAttribute('x2', s2.x);
                line.setAttribute('y2', s2.y);
                line.setAttribute('class', 'measure-line');
                line.setAttribute('stroke', m.color);
                mGroup.appendChild(line);

                // Handles an Endpunkten
                mGroup.appendChild(this.createHandleElement(s1.x, s1.y, m.id, 0, m.color));
                mGroup.appendChild(this.createHandleElement(s2.x, s2.y, m.id, 1, m.color));

                // Distanz Badge
                const midX = (s1.x + s2.x) / 2;
                const midY = (s1.y + s2.y) / 2;
                mGroup.appendChild(this.createBadgeElement(midX, midY, this.formatDistance(distPx)));

            } else if (m.type === 'path') {
                const screenPts = m.points.map(p => this.imageToScreenCoords(p.x, p.y));

                const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                polyline.setAttribute('points', screenPts.map(s => `${s.x},${s.y}`).join(' '));
                polyline.setAttribute('class', 'measure-path');
                polyline.setAttribute('stroke', m.color);
                mGroup.appendChild(polyline);

                let totalPx = 0;
                m.points.forEach((p, idx) => {
                    const s = screenPts[idx];
                    mGroup.appendChild(this.createHandleElement(s.x, s.y, m.id, idx, m.color));
                    if (idx > 0) {
                        const prev = m.points[idx - 1];
                        totalPx += Math.hypot(p.x - prev.x, p.y - prev.y);
                    }
                });

                // Gesamt-Badge am letzten Punkt
                const last = screenPts[screenPts.length - 1];
                mGroup.appendChild(this.createBadgeElement(last.x, last.y, `Gesamt: ${this.formatDistance(totalPx)}`));

            } else if (m.type === 'area') {
                const screenPts = m.points.map(p => this.imageToScreenCoords(p.x, p.y));

                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                polygon.setAttribute('points', screenPts.map(s => `${s.x},${s.y}`).join(' '));
                polygon.setAttribute('class', 'measure-area-polygon');
                polygon.setAttribute('stroke', m.color);
                polygon.setAttribute('fill', this.hexToRgba(m.color, 0.25));
                mGroup.appendChild(polygon);

                m.points.forEach((p, idx) => {
                    const s = screenPts[idx];
                    mGroup.appendChild(this.createHandleElement(s.x, s.y, m.id, idx, m.color));
                });

                // Flächenberechnung & Schwerpunkt
                const areaPx = this.computePolygonArea(m.points);
                const centroid = this.computePolygonCentroid(m.points);
                const sCentroid = this.imageToScreenCoords(centroid.x, centroid.y);
                mGroup.appendChild(this.createBadgeElement(sCentroid.x, sCentroid.y, this.formatArea(areaPx)));
            }

            g.appendChild(mGroup);
        });
    }

    createHandleElement(x, y, mid, pidx, color = '#3b82f6') {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'handle-point');
        if (mid) g.setAttribute('data-mid', mid);
        g.setAttribute('data-pidx', pidx);
        g.setAttribute('transform', `translate(${x}, ${y})`);

        // Unsichtbare, große Touch-Hitbox (44px Touch-Fläche für Handys)
        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hit.setAttribute('r', '22');
        hit.setAttribute('class', 'handle-hitbox');
        g.appendChild(hit);

        // Sichtbarer runder Punkt
        const visual = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        visual.setAttribute('r', '6.5');
        visual.setAttribute('class', 'handle-visual');
        visual.setAttribute('stroke', color);
        g.appendChild(visual);

        return g;
    }

    createBadgeElement(x, y, textString) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'measure-badge');
        g.setAttribute('transform', `translate(${x}, ${y})`);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('class', 'badge-text');
        text.textContent = textString;

        const charW = 7.5;
        const boxW = Math.max(50, textString.length * charW + 16);
        const boxH = 22;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', -boxW / 2);
        rect.setAttribute('y', -boxH / 2);
        rect.setAttribute('width', boxW);
        rect.setAttribute('height', boxH);
        rect.setAttribute('class', 'badge-bg');

        g.appendChild(rect);
        g.appendChild(text);

        return g;
    }

    // =========================================================================
    // Berechnungen & Geometrie
    // =========================================================================
    computePolygonArea(points) {
        let area = 0;
        const n = points.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area / 2);
    }

    computePolygonCentroid(points) {
        let cx = 0, cy = 0;
        points.forEach(p => {
            cx += p.x;
            cy += p.y;
        });
        return {
            x: cx / points.length,
            y: cy / points.length
        };
    }

    formatDistance(pixels) {
        const meters = pixels / this.scaleConfig.pixelsPerMeter;
        switch (this.scaleConfig.unit) {
            case 'cm':
                return `${(meters * 100).toFixed(1)} cm`;
            case 'mm':
                return `${(meters * 1000).toFixed(0)} mm`;
            case 'km':
                return meters >= 1000 ? `${(meters / 1000).toFixed(3)} km` : `${meters.toFixed(2)} m`;
            case 'm':
            default:
                return `${meters.toFixed(2)} m`;
        }
    }

    formatArea(pixelsSq) {
        const metersSq = pixelsSq / (this.scaleConfig.pixelsPerMeter * this.scaleConfig.pixelsPerMeter);
        if (metersSq >= 10000) {
            const ha = (metersSq / 10000).toFixed(2);
            return `${metersSq.toLocaleString('de-DE', { maximumFractionDigits: 1 })} m² (${ha} ha)`;
        }
        return `${metersSq.toLocaleString('de-DE', { maximumFractionDigits: 2 })} m²`;
    }

    hexToRgba(hex, alpha = 1) {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    }

    // =========================================================================
    // Dynamische Maßstabsleiste (Google Maps / CAD Style)
    // =========================================================================
    updateScaleBar() {
        if (!this.imageLoaded) {
            if (this.el.scaleBarContainer) this.el.scaleBarContainer.style.display = 'none';
            return;
        }
        if (this.el.scaleBarContainer) this.el.scaleBarContainer.style.display = 'flex';

        const targetPx = 110;
        const pxPerMeterScreen = this.scaleConfig.pixelsPerMeter * this.transform.scale;
        const targetMeters = targetPx / pxPerMeterScreen;

        const niceValues = [
            0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000
        ];

        let bestMeters = niceValues[0];
        let minDiff = Infinity;
        for (let val of niceValues) {
            const diff = Math.abs(val - targetMeters);
            if (diff < minDiff) {
                minDiff = diff;
                bestMeters = val;
            }
        }

        const barWidthPx = bestMeters * pxPerMeterScreen;
        this.el.scaleBarLine.style.width = `${Math.round(barWidthPx)}px`;

        if (bestMeters >= 1000) {
            this.el.scaleBarText.textContent = `${bestMeters / 1000} km`;
        } else if (bestMeters < 1) {
            this.el.scaleBarText.textContent = `${Math.round(bestMeters * 100)} cm`;
        } else {
            this.el.scaleBarText.textContent = `${bestMeters} m`;
        }
    }

    // =========================================================================
    // Skalierung & Kalibrierung
    // =========================================================================
    updateScaleDisplay() {
        const px = this.scaleConfig.pixelsPerMeter;
        this.el.scaleLabelText.textContent = `${px.toFixed(px % 1 === 0 ? 0 : 2)} px = 1.00 m`;
    }

    openScaleModal() {
        this.el.inputPxPerMeter.value = this.scaleConfig.pixelsPerMeter;
        this.el.selectUnit.value = this.scaleConfig.unit;
        this.updateImageStats();
        this.el.scaleModal.classList.remove('hidden');
    }

    saveScaleSettings() {
        const val = parseFloat(this.el.inputPxPerMeter.value);
        if (isNaN(val) || val <= 0) {
            this.showToast('Bitte eine gültige Zahl größer 0 für Pixel pro Meter eingeben!');
            return;
        }

        this.scaleConfig.pixelsPerMeter = val;
        this.scaleConfig.unit = this.el.selectUnit.value;

        this.updateScaleDisplay();
        this.updateScaleBar();
        this.renderAllMeasurements();
        this.updateMeasurementsList();
        this.updateImageStats();

        this.closeAllModals();
        this.showToast(`Neuer Maßstab: ${val} px = 1.00 m`);
    }

    openCalibrationPrompt(distPx) {
        this.currentCalibrationDistPx = distPx;
        this.el.promptPixelDistance.textContent = `${distPx.toFixed(1)} Pixel`;
        this.el.inputRealDistance.value = '';
        this.el.promptComputedScale.textContent = '- px/m';
        this.el.calibrationPromptModal.classList.remove('hidden');
        setTimeout(() => this.el.inputRealDistance.focus(), 100);
    }

    updateCalibrationPreview() {
        const realMeters = parseFloat(this.el.inputRealDistance.value);
        if (!isNaN(realMeters) && realMeters > 0) {
            const computedPxPerM = this.currentCalibrationDistPx / realMeters;
            this.el.promptComputedScale.textContent = `${computedPxPerM.toFixed(2)} px/m (100 px = ${(100 / computedPxPerM).toFixed(2)} m)`;
        } else {
            this.el.promptComputedScale.textContent = '- px/m';
        }
    }

    applyCalibrationFromDialog() {
        const realMeters = parseFloat(this.el.inputRealDistance.value);
        if (isNaN(realMeters) || realMeters <= 0) {
            this.showToast('Bitte eine gültige Länge in Metern eingeben!');
            return;
        }

        const newScale = this.currentCalibrationDistPx / realMeters;
        this.scaleConfig.pixelsPerMeter = newScale;

        this.updateScaleDisplay();
        this.updateScaleBar();
        this.renderAllMeasurements();
        this.updateMeasurementsList();
        this.updateImageStats();

        this.closeAllModals();
        this.showToast(`Kalibrierung erfolgreich: ${newScale.toFixed(2)} px = 1.00 m`);
    }

    closeAllModals() {
        this.el.scaleModal.classList.add('hidden');
        this.el.calibrationPromptModal.classList.add('hidden');
    }

    // =========================================================================
    // Sidebar & Messungsliste
    // =========================================================================
    toggleSidebar(forceState = null) {
        const isOpen = this.el.sidebarList.classList.contains('open');
        const nextState = forceState !== null ? forceState : !isOpen;
        this.el.sidebarList.classList.toggle('open', nextState);
    }

    updateMeasurementsList() {
        const list = this.el.measurementsList;
        const count = this.measurements.length;

        this.el.badgeCount.textContent = count;
        this.el.sidebarCount.textContent = count;

        if (count === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    Noch keine Messungen vorhanden.<br>
                    Wähle oben <strong>Strecke</strong>, <strong>Pfad</strong> oder <strong>Fläche</strong>, um auf dem Plan zu messen.
                </div>
            `;
            this.el.sumTotalDistance.textContent = '0.00 m';
            this.el.sumTotalArea.textContent = '0.00 m²';
            return;
        }

        let totalDistPx = 0;
        let totalAreaPx = 0;
        list.innerHTML = '';

        this.measurements.forEach((m) => {
            let valStr = '';
            let detailsStr = '';

            if (m.type === 'line') {
                const distPx = Math.hypot(m.points[1].x - m.points[0].x, m.points[1].y - m.points[0].y);
                totalDistPx += distPx;
                valStr = this.formatDistance(distPx);
                detailsStr = `Start: (${(m.points[0].x / this.scaleConfig.pixelsPerMeter).toFixed(1)}m, ${(m.points[0].y / this.scaleConfig.pixelsPerMeter).toFixed(1)}m)`;
            } else if (m.type === 'path') {
                let pDist = 0;
                for (let i = 1; i < m.points.length; i++) {
                    pDist += Math.hypot(m.points[i].x - m.points[i - 1].x, m.points[i].y - m.points[i - 1].y);
                }
                totalDistPx += pDist;
                valStr = this.formatDistance(pDist);
                detailsStr = `${m.points.length} Punkte`;
            } else if (m.type === 'area') {
                const aPx = this.computePolygonArea(m.points);
                totalAreaPx += aPx;
                valStr = this.formatArea(aPx);
                detailsStr = `${m.points.length} Eckpunkte`;
            }

            const card = document.createElement('div');
            card.className = 'measurement-card';
            card.innerHTML = `
                <div class="measurement-card-header">
                    <div class="card-title-group">
                        <span class="color-dot" style="background:${m.color}"></span>
                        <span>${m.name}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-icon btn-sm btn-copy" title="Messwert in Zwischenablage kopieren">📋</button>
                        <button class="btn btn-icon btn-sm btn-delete" title="Messung löschen">🗑️</button>
                    </div>
                </div>
                <div class="measurement-value">${valStr}</div>
                <div class="measurement-details">${detailsStr}</div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-actions')) return;
                this.focusMeasurement(m);
            });

            card.querySelector('.btn-copy').addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(valStr);
                this.showToast(`Kopiert: ${valStr}`);
            });

            card.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteMeasurement(m.id);
            });

            list.appendChild(card);
        });

        this.el.sumTotalDistance.textContent = this.formatDistance(totalDistPx);
        this.el.sumTotalArea.textContent = this.formatArea(totalAreaPx);
    }

    focusMeasurement(m) {
        if (!m || m.points.length === 0) return;
        const centroid = this.computePolygonCentroid(m.points);
        const rect = this.el.viewportContainer.getBoundingClientRect();

        this.transform.x = rect.width / 2 - centroid.x * this.transform.scale;
        this.transform.y = rect.height / 2 - centroid.y * this.transform.scale;
        this.applyTransform();

        this.showToast(`Zentriert auf: ${m.name}`);
    }

    deleteMeasurement(id) {
        this.measurements = this.measurements.filter(m => m.id !== id);
        this.renderAllMeasurements();
        this.updateMeasurementsList();
        this.showToast('Messung gelöscht.');
    }

    clearAllMeasurements() {
        if (this.measurements.length === 0) return;
        if (confirm('Möchtest du wirklich alle Messungen löschen?')) {
            this.measurements = [];
            this.renderAllMeasurements();
            this.updateMeasurementsList();
            this.showToast('Alle Messungen wurden entfernt.');
        }
    }

    // =========================================================================
    // Export (Bild mit Messungen & JSON)
    // =========================================================================
    exportAnnotatedImage() {
        if (!this.imageLoaded) return;

        const maxCanvasDim = 8192;
        let exportScale = 1.0;
        if (this.imageWidth > maxCanvasDim || this.imageHeight > maxCanvasDim) {
            exportScale = maxCanvasDim / Math.max(this.imageWidth, this.imageHeight);
            this.showToast(`Exportiere Bild (skaliert auf ${Math.round(this.imageWidth * exportScale)}px für Browser-Speicher)...`);
        } else {
            this.showToast('Exportiere hochauflösendes Bild...');
        }

        const outW = Math.round(this.imageWidth * exportScale);
        const outH = Math.round(this.imageHeight * exportScale);

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(this.image, 0, 0, outW, outH);

        const scX = (x) => x * exportScale;
        const scY = (y) => y * exportScale;

        this.measurements.forEach(m => {
            if (!m.visible) return;

            const baseLineWidth = Math.max(3, outW / 1000);
            ctx.lineWidth = baseLineWidth;
            ctx.strokeStyle = m.color;
            ctx.fillStyle = m.color;

            if (m.type === 'line') {
                const p1 = m.points[0];
                const p2 = m.points[1];

                ctx.beginPath();
                ctx.moveTo(scX(p1.x), scY(p1.y));
                ctx.lineTo(scX(p2.x), scY(p2.y));
                ctx.stroke();

                [p1, p2].forEach(p => {
                    ctx.beginPath();
                    ctx.arc(scX(p.x), scY(p.y), baseLineWidth * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                });

                const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const text = this.formatDistance(distPx);
                this.drawCanvasLabel(ctx, scX((p1.x + p2.x) / 2), scY((p1.y + p2.y) / 2), text);

            } else if (m.type === 'path') {
                ctx.beginPath();
                m.points.forEach((p, idx) => {
                    if (idx === 0) ctx.moveTo(scX(p.x), scY(p.y));
                    else ctx.lineTo(scX(p.x), scY(p.y));
                });
                ctx.stroke();

                m.points.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(scX(p.x), scY(p.y), baseLineWidth * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                });

                let totalPx = 0;
                for (let i = 1; i < m.points.length; i++) {
                    totalPx += Math.hypot(m.points[i].x - m.points[i - 1].x, m.points[i].y - m.points[i - 1].y);
                }
                const last = m.points[m.points.length - 1];
                this.drawCanvasLabel(ctx, scX(last.x), scY(last.y), `Gesamt: ${this.formatDistance(totalPx)}`);

            } else if (m.type === 'area') {
                ctx.beginPath();
                m.points.forEach((p, idx) => {
                    if (idx === 0) ctx.moveTo(scX(p.x), scY(p.y));
                    else ctx.lineTo(scX(p.x), scY(p.y));
                });
                ctx.closePath();
                ctx.fillStyle = this.hexToRgba(m.color, 0.25);
                ctx.fill();
                ctx.stroke();

                const aPx = this.computePolygonArea(m.points);
                const centroid = this.computePolygonCentroid(m.points);
                this.drawCanvasLabel(ctx, scX(centroid.x), scY(centroid.y), this.formatArea(aPx));
            }
        });

        canvas.toBlob((blob) => {
            if (!blob) {
                this.showToast('Fehler beim Exportieren des Bildes.');
                return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `plan-messung-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('Bild erfolgreich gespeichert!');
        }, 'image/png');
    }

    drawCanvasLabel(ctx, x, y, text) {
        const fontSize = Math.max(16, this.imageWidth / 120);
        ctx.font = `bold ${fontSize}px sans-serif`;

        const padding = fontSize * 0.4;
        const textMetrics = ctx.measureText(text);
        const boxW = textMetrics.width + padding * 2;
        const boxH = fontSize + padding * 1.5;

        ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, 6);
        } else {
            ctx.rect(x - boxW / 2, y - boxH / 2, boxW, boxH);
        }
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
    }

    exportJson() {
        const exportData = {
            version: '1.0',
            scale: this.scaleConfig,
            imageDimensions: {
                width: this.imageWidth,
                height: this.imageHeight
            },
            measurements: this.measurements
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planmeasure-daten-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('JSON exportiert!');
    }

    // =========================================================================
    // Tastatur-Bedienung & Hilfen
    // =========================================================================
    handleKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        if (e.code === 'Space') {
            this.isSpacePressed = true;
            this.el.viewportContainer.classList.add('mode-pan');
        } else if (e.key === 'Escape') {
            this.cancelActiveDrawing();
            this.closeAllModals();
        } else if (e.key === '+' || e.key === '=') {
            this.zoomStep(1.3);
        } else if (e.key === '-') {
            this.zoomStep(1 / 1.3);
        } else if (e.key === '0') {
            this.zoomFit();
        } else if (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'l') {
            this.setTool('line');
        } else if (e.key.toLowerCase() === 'p') {
            this.setTool('path');
        } else if (e.key.toLowerCase() === 'a') {
            this.setTool('area');
        } else if (e.key.toLowerCase() === 'c') {
            this.setTool('calibrate');
        } else if (e.key.toLowerCase() === 'h') {
            this.setTool('pan');
        }
    }

    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.isSpacePressed = false;
            if (this.currentTool !== 'pan') {
                this.el.viewportContainer.classList.remove('mode-pan');
            }
        }
    }

    // =========================================================================
    // Toast Benachrichtigungen
    // =========================================================================
    showToast(message, duration = 3000) {
        const toast = this.el.toast;
        toast.textContent = message;
        toast.classList.remove('hidden');

        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, duration);
    }
}

// App starten sobald DOM bereit
window.addEventListener('DOMContentLoaded', () => {
    window.app = new PlanMeasureApp();
});
