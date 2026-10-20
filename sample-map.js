/**
 * Sample Map Generator
 * Erzeugt einen realistischen 200m x 200m Bau- & Lageplan im Maßstab 100 Pixel = 1 Meter.
 * (Generiert auf Canvas: 2000 x 2000 px, entspricht 200m x 200m bei 10 px = 1 m für schnelles Rendering,
 *  oder hochauflösend 4000x4000 / 20000x20000 je nach Wahl).
 */
export function generateSampleMap(scalePxPerMeter = 100, widthMeters = 200, heightMeters = 200) {
    const canvas = document.createElement('canvas');
    // Wir rendern standardmäßig 2000 x 2000 Pixel (200m x 200m bei 10 px/m) oder wahlweise 4000x4000
    // um die Browser-Performance auf Handys optimal zu halten, während die Skala exakt passt.
    const renderScale = 20; // 20 px pro Meter für das Demo-Bild (4000 x 4000 px = 16 Megapixel, flüssig & gestochen scharf)
    const w = widthMeters * renderScale;
    const h = heightMeters * renderScale;
    
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Hintergrund (Gelände: sanftes warmes Ingenieur-Grau / Planweiß)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // 1. Koordinatengitter (Grid)
    // 5-Meter-Gitter (fein)
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e2e8f0';
    for (let x = 0; x <= w; x += 5 * renderScale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = 0; y <= h; y += 5 * renderScale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // 25-Meter-Gitter (Hauptlinien)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#cbd5e1';
    for (let x = 0; x <= w; x += 25 * renderScale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = 0; y <= h; y += 25 * renderScale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Gitter-Beschriftungen (alle 25m)
    ctx.fillStyle = '#64748b';
    ctx.font = `bold ${Math.max(12, 10 * (renderScale / 10))}px sans-serif`;
    for (let x = 25; x < widthMeters; x += 25) {
        ctx.fillText(`${x} m`, x * renderScale + 4, 18);
        ctx.fillText(`${x} m`, x * renderScale + 4, h - 8);
    }
    for (let y = 25; y < heightMeters; y += 25) {
        ctx.fillText(`${y} m`, 6, y * renderScale - 4);
        ctx.fillText(`${y} m`, w - 45, y * renderScale - 4);
    }

    // Grünfläche abgerundet
    ctx.fillStyle = '#dcfce7';
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(15 * renderScale, 15 * renderScale, 60 * renderScale, 45 * renderScale, 15);
    } else {
        ctx.rect(15 * renderScale, 15 * renderScale, 60 * renderScale, 45 * renderScale);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#15803d';
    ctx.font = `bold ${16 * (renderScale / 10)}px sans-serif`;
    ctx.fillText('Grünfläche / Park (60 m × 45 m)', 18 * renderScale, 22 * renderScale);

    // Bäume auf der Grünfläche
    const trees = [
        [22, 28, 4], [32, 25, 5], [45, 30, 4.5], [58, 26, 4],
        [25, 45, 5], [40, 50, 4.5], [60, 48, 5.5]
    ];
    trees.forEach(([tx, ty, tr]) => {
        ctx.beginPath();
        ctx.fillStyle = '#22c55e';
        ctx.arc(tx * renderScale, ty * renderScale, tr * renderScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = '#166534';
        ctx.arc(tx * renderScale, ty * renderScale, 1.2 * renderScale, 0, Math.PI * 2);
        ctx.fill();
    });

    // 3. Straßennetz
    // Hauptstraße horizontal (Breite 12m)
    const roadY = 85 * renderScale;
    const roadH = 12 * renderScale;
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, roadY, w, roadH);

    // Fahrbahnmarkierung gestrichelt
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    ctx.moveTo(0, roadY + roadH / 2);
    ctx.lineTo(w, roadY + roadH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${13 * (renderScale / 10)}px sans-serif`;
    ctx.fillText('Hauptstraße (Breite 12.0 m)', 10 * renderScale, roadY + roadH / 2 - 8);

    // Kreisverkehr
    const circleX = 140 * renderScale;
    const circleY = (85 + 6) * renderScale;
    const circleOuterR = 18 * renderScale;
    const circleInnerR = 8 * renderScale;

    ctx.beginPath();
    ctx.fillStyle = '#334155';
    ctx.arc(circleX, circleY, circleOuterR, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#22c55e';
    ctx.arc(circleX, circleY, circleInnerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${10 * (renderScale / 10)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Kreisel Ø 36m', circleX, circleY + 4);
    ctx.textAlign = 'start';

    // Zufahrtsstraße nach Süden ab Kreisel (Breite 8m)
    const roadSouthX = circleX - 4 * renderScale;
    ctx.fillStyle = '#334155';
    ctx.fillRect(roadSouthX, circleY + circleOuterR - 2, 8 * renderScale, h - (circleY + circleOuterR));

    // 4. Hauptgebäude (Industrie / Gewerbe: 50m x 30m)
    const bld1X = 20 * renderScale;
    const bld1Y = 115 * renderScale;
    const bld1W = 50 * renderScale;
    const bld1H = 30 * renderScale;

    // Schatten
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(bld1X + 4, bld1Y + 4, bld1W, bld1H);

    // Gebäudeumriss
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(bld1X, bld1Y, bld1W, bld1H);
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 3;
    ctx.strokeRect(bld1X, bld1Y, bld1W, bld1H);

    // Beschriftung Gebäude 1
    ctx.fillStyle = '#9a3412';
    ctx.font = `bold ${16 * (renderScale / 10)}px sans-serif`;
    ctx.fillText('Hauptgebäude A', bld1X + 15, bld1Y + 30);
    ctx.font = `${13 * (renderScale / 10)}px sans-serif`;
    ctx.fillText('Maße: 50.0 m × 30.0 m (Fläche 1.500 m²)', bld1X + 15, bld1Y + 55);

    // 5. Parkplatz (neben Hauptgebäude: 40m x 25m)
    const parkX = 80 * renderScale;
    const parkY = 115 * renderScale;
    const parkW = 40 * renderScale;
    const parkH = 25 * renderScale;

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(parkX, parkY, parkW, parkH);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(parkX, parkY, parkW, parkH);

    ctx.fillStyle = '#475569';
    ctx.font = `bold ${12 * (renderScale / 10)}px sans-serif`;
    ctx.fillText('Parkplatz (40 m × 25 m)', parkX + 10, parkY + 22);

    // Parkbuchten zeichnen (je 2.5m x 5m)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    for (let px = parkX + 5 * renderScale; px <= parkX + 35 * renderScale; px += 2.5 * renderScale) {
        ctx.beginPath();
        ctx.moveTo(px, parkY + 28);
        ctx.lineTo(px, parkY + 28 + 5 * renderScale);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(px, parkY + parkH - 2);
        ctx.lineTo(px, parkY + parkH - 2 - 5 * renderScale);
        ctx.stroke();
    }

    // 6. Wohnkomplex / Büro B (L-Form)
    const bld2X = 95 * renderScale;
    const bld2Y = 20 * renderScale;
    ctx.fillStyle = '#bae6fd';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(bld2X, bld2Y);
    ctx.lineTo(bld2X + 55 * renderScale, bld2Y);
    ctx.lineTo(bld2X + 55 * renderScale, bld2Y + 45 * renderScale);
    ctx.lineTo(bld2X + 35 * renderScale, bld2Y + 45 * renderScale);
    ctx.lineTo(bld2X + 35 * renderScale, bld2Y + 20 * renderScale);
    ctx.lineTo(bld2X, bld2Y + 20 * renderScale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0369a1';
    ctx.font = `bold ${14 * (renderScale / 10)}px sans-serif`;
    ctx.fillText('Bürokomplex B', bld2X + 8, bld2Y + 16 * (renderScale / 10));

    // 7. Offizielle Referenz-Messstrecke (unten links, genau 20.0 m zum Kalibrieren!)
    const refX = 20 * renderScale;
    const refY = 175 * renderScale;
    const refLenMeters = 20;
    const refW = refLenMeters * renderScale;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    // Hauptlinie
    ctx.beginPath();
    ctx.moveTo(refX, refY);
    ctx.lineTo(refX + refW, refY);
    ctx.stroke();

    // Endstriche
    ctx.beginPath();
    ctx.moveTo(refX, refY - 12);
    ctx.lineTo(refX, refY + 12);
    ctx.moveTo(refX + refW, refY - 12);
    ctx.lineTo(refX + refW, refY + 12);
    ctx.stroke();

    // Text & Pfeile
    ctx.fillStyle = '#b91c1c';
    ctx.font = `bold ${14 * (renderScale / 10)}px sans-serif`;
    ctx.fillText(`◄── REFERENZSTRECKE: GENAU ${refLenMeters}.00 METER ──►`, refX + 10, refY - 16);
    ctx.font = `${11 * (renderScale / 10)}px sans-serif`;
    ctx.fillText(`(Perfekt zum Testen des Maßbands oder der 2-Punkte-Kalibrierung)`, refX + 10, refY + 24);

    // 8. Planstempel / Infokasten unten rechts
    const boxW = 45 * renderScale;
    const boxH = 22 * renderScale;
    const boxX = w - boxW - 10 * renderScale;
    const boxY = h - boxH - 10 * renderScale;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${13 * (renderScale / 10)}px sans-serif`;
    ctx.fillText('LAGE- & BEBAUUNGSPLAN', boxX + 10, boxY + 18);
    ctx.font = `${10 * (renderScale / 10)}px sans-serif`;
    ctx.fillStyle = '#475569';
    ctx.fillText(`Gesamtfläche: ${widthMeters} m × ${heightMeters} m (4,0 ha)`, boxX + 10, boxY + 36);
    ctx.fillText(`Referenzmaßstab im Bild: ${renderScale} px = 1.0 m`, boxX + 10, boxY + 52);
    ctx.fillText(`Bildauflösung: ${w} × ${h} Pixel`, boxX + 10, boxY + 68);

    // Nordpfeil
    const northX = w - 25 * renderScale;
    const northY = 35 * renderScale;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(northX, northY - 20);
    ctx.lineTo(northX - 8, northY + 12);
    ctx.lineTo(northX, northY + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(northX, northY - 20);
    ctx.lineTo(northX + 8, northY + 12);
    ctx.lineTo(northX, northY + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', northX, northY - 24);
    ctx.textAlign = 'start';

    return {
        dataUrl: canvas.toDataURL('image/png'),
        width: w,
        height: h,
        naturalScale: renderScale // 20 px pro Meter für diesen generierten Plan
    };
}
