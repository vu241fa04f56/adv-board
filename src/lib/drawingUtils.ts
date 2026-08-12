import {
  Annotation,
  Point,
  PaperTemplate,
  ShapeType,
  StrokeAnnotation,
  ShapeAnnotation,
  TextAnnotation,
  ImageAnnotation,
  TableAnnotation,
} from '../types';

/**
 * Draw paper template background grid / lines / dots / music staves
 */
export function drawPaperBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: PaperTemplate,
  paperDarkness: number = 0,
  lineDarkness: number = 40
) {
  ctx.save();

  // User-controlled paper background brightness
  const isDark = paperDarkness >= 50;
  if (isDark) {
    // Dark paper mode
    const v = Math.round(255 - (paperDarkness / 100) * 240); // 255 -> 15
    ctx.fillStyle = `rgb(${v}, ${Math.round(v * 1.1)}, ${Math.round(v * 1.3)})`;
  } else {
    // Light paper mode (100% white at 0, slightly warmer cream as paperDarkness increases)
    const val = Math.round(255 - (paperDarkness / 50) * 25);
    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
  }
  ctx.fillRect(0, 0, width, height);

  const opacity = Math.max(0.08, Math.min(1.0, lineDarkness / 100));
  const lineColor = isDark
    ? `rgba(255, 255, 255, ${opacity})`
    : `rgba(37, 99, 235, ${opacity})`;
  const marginColor = isDark
    ? `rgba(239, 68, 68, ${Math.min(1.0, opacity * 1.2)})`
    : `rgba(220, 38, 38, ${Math.min(1.0, opacity * 1.2)})`;

  if (template === 'ruled') {
    // Left red margin line
    ctx.strokeStyle = marginColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(80, 0);
    ctx.lineTo(80, height);
    ctx.stroke();

    // Horizontal ruled lines
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.25;
    const lineSpacing = 32;
    const topOffset = 80;

    for (let y = topOffset; y < height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (template === 'grid') {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    const gridSize = 28;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (template === 'dotted') {
    ctx.fillStyle = isDark
      ? `rgba(255, 255, 255, ${opacity})`
      : `rgba(71, 85, 105, ${opacity})`;
    const dotSpacing = 28;

    for (let x = dotSpacing; x < width; x += dotSpacing) {
      for (let y = dotSpacing; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (template === 'music') {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    const staffSpacing = 110;
    const lineGap = 12;
    const startY = 80;

    for (let sY = startY; sY < height - 50; sY += staffSpacing) {
      for (let i = 0; i < 5; i++) {
        const y = sY + i * lineGap;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(width - 50, y);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

/**
 * Render a stroke annotation (Pen or Highlighter) smoothly
 */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokeAnnotation) {
  if (!stroke.points || stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = stroke.opacity || 0.45;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = stroke.opacity || 1.0;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
  }

  const points = stroke.points;

  if (points.length === 1 || stroke.isStraightLine) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    const end = points[points.length - 1];
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Smooth quadratic curve interpolation for natural freehand writing
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    // Curve to the last point
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Render shape annotation
 */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeAnnotation | {
    shapeType: ShapeType;
    color: string;
    fillColor?: string;
    width: number;
    opacity: number;
    startPoint: Point;
    endPoint: Point;
    isDashed?: boolean;
    rotation?: number;
  }
) {
  ctx.save();
  ctx.globalAlpha = shape.opacity || 1.0;
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.fillColor || 'transparent';
  ctx.lineWidth = shape.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const { startPoint: p1, endPoint: p2, shapeType } = shape;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Handle Rotation if specified
  if ('rotation' in shape && shape.rotation) {
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    ctx.translate(cx, cy);
    ctx.rotate((shape.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  if (shape.isDashed) {
    ctx.setLineDash([8, 6]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.beginPath();

  switch (shapeType) {
    case 'line':
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      break;

    case 'arrow': {
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Arrow head calculation
      const angle = Math.atan2(dy, dx);
      const headLength = Math.max(12, shape.width * 3);
      
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.fillStyle = shape.color;
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(
        p2.x - headLength * Math.cos(angle - Math.PI / 6),
        p2.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        p2.x - headLength * Math.cos(angle + Math.PI / 6),
        p2.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'rectangle': {
      const left = Math.min(p1.x, p2.x);
      const top = Math.min(p1.y, p2.y);
      const width = Math.abs(dx);
      const height = Math.abs(dy);

      if (shape.fillColor && shape.fillColor !== 'transparent') {
        ctx.fillRect(left, top, width, height);
      }
      ctx.strokeRect(left, top, width, height);
      break;
    }

    case 'circle': {
      const rx = Math.abs(dx) / 2;
      const ry = Math.abs(dy) / 2;
      const cx = Math.min(p1.x, p2.x) + rx;
      const cy = Math.min(p1.y, p2.y) + ry;

      ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
      if (shape.fillColor && shape.fillColor !== 'transparent') {
        ctx.fill();
      }
      ctx.stroke();
      break;
    }

    case 'triangle': {
      ctx.moveTo(p1.x + dx / 2, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p1.x, p2.y);
      ctx.closePath();
      if (shape.fillColor && shape.fillColor !== 'transparent') {
        ctx.fill();
      }
      ctx.stroke();
      break;
    }

    case 'star': {
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const outerRadius = Math.min(Math.abs(dx), Math.abs(dy)) / 2;
      const innerRadius = outerRadius * 0.4;
      const points = 5;

      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const a = (i * Math.PI) / points - Math.PI / 2;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      if (shape.fillColor && shape.fillColor !== 'transparent') {
        ctx.fill();
      }
      ctx.stroke();
      break;
    }

    case 'axis': {
      // Coordinate System Axis (X & Y arrows)
      ctx.setLineDash([]);
      // X-Axis
      ctx.moveTo(p1.x, p2.y);
      ctx.lineTo(p2.x, p2.y);
      // Y-Axis
      ctx.moveTo(p1.x, p2.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      // Arrowheads
      ctx.fillStyle = shape.color;
      // Y-axis arrow
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p1.x - 6, p1.y + 10);
      ctx.lineTo(p1.x + 6, p1.y + 10);
      ctx.closePath();
      ctx.fill();

      // X-axis arrow
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x - 10, p2.y - 6);
      ctx.lineTo(p2.x - 10, p2.y + 6);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  // Draw Text centered inside Shape if present
  if ('text' in shape && shape.text) {
    ctx.save();
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const fontSize = (shape as any).fontSize || 16;
    ctx.font = `600 ${fontSize}px sans-serif`;
    ctx.fillStyle = (shape as any).textColor || shape.color || '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = shape.text.split('\n');
    const lineHeight = fontSize * 1.25;
    const startY = cy - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, idx) => {
      ctx.fillText(line, cx, startY + idx * lineHeight);
    });
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draw Text Annotation
 */
export function drawText(ctx: CanvasRenderingContext2D, textAnno: TextAnnotation) {
  ctx.save();
  ctx.font = `${textAnno.fontSize || 18}px ${textAnno.fontFamily || 'sans-serif'}`;
  ctx.fillStyle = textAnno.color || '#000000';
  ctx.textBaseline = 'top';

  const lines = textAnno.text.split('\n');
  const lineHeight = (textAnno.fontSize || 18) * 1.25;

  lines.forEach((line, idx) => {
    ctx.fillText(line, textAnno.x, textAnno.y + idx * lineHeight);
  });

  ctx.restore();
}

const imageCache = new Map<string, HTMLImageElement>();

/**
 * Draw Image Annotation onto canvas
 */
export function drawImageAnno(ctx: CanvasRenderingContext2D, imgAnno: ImageAnnotation) {
  let img = imageCache.get(imgAnno.dataUrl);
  if (!img) {
    img = new Image();
    img.src = imgAnno.dataUrl;
    imageCache.set(imgAnno.dataUrl, img);
  }

  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.drawImage(img, imgAnno.x, imgAnno.y, imgAnno.width, imgAnno.height);
    ctx.restore();
  }
}

/**
 * Draw Table Annotation onto canvas
 */
export function drawTableAnno(ctx: CanvasRenderingContext2D, tableAnno: TableAnnotation) {
  ctx.save();
  ctx.strokeStyle = tableAnno.color || '#334155';
  ctx.lineWidth = tableAnno.strokeWidth || 1.5;

  const {
    x,
    y,
    width,
    height,
    rows,
    cols,
    rowHeights,
    colWidths,
    cellsData,
    cellFills,
    fillColor,
    borderStyle,
    showCellBorders = true,
    rotation,
  } = tableAnno;

  // Handle Rotation if specified
  if (rotation) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  // Set line dash for borders
  if (borderStyle === 'dashed') {
    ctx.setLineDash([6, 4]);
  } else if (borderStyle === 'dotted') {
    ctx.setLineDash([2, 3]);
  } else {
    ctx.setLineDash([]);
  }

  // Table overall background - transparent by default unless explicitly filled
  if (fillColor && fillColor !== 'transparent') {
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, width, height);
  }

  // Draw individual cell fills if present
  if (cellFills) {
    let rY = y;
    for (let r = 0; r < rows; r++) {
      const rH = rowHeights[r] || height / rows;
      let cX = x;
      for (let c = 0; c < cols; c++) {
        const cW = colWidths[c] || width / cols;
        const key = `${r}_${c}`;
        const cFill = cellFills[key];
        if (cFill && cFill !== 'transparent') {
          ctx.fillStyle = cFill;
          ctx.fillRect(cX, rY, cW, rH);
        }
        cX += cW;
      }
      rY += rH;
    }
  }

  // Draw table outer border unless borderStyle === 'none'
  if (borderStyle !== 'none') {
    ctx.strokeRect(x, y, width, height);
  }

  // Draw inner grid lines if showCellBorders is enabled and borderStyle !== 'none'
  if (showCellBorders && borderStyle !== 'none') {
    // Draw row grid lines
    let currentY = y;
    for (let r = 0; r < rows - 1; r++) {
      currentY += rowHeights[r] || height / rows;
      ctx.beginPath();
      ctx.moveTo(x, currentY);
      ctx.lineTo(x + width, currentY);
      ctx.stroke();
    }

    // Draw column grid lines
    let currentX = x;
    for (let c = 0; c < cols - 1; c++) {
      currentX += colWidths[c] || width / cols;
      ctx.beginPath();
      ctx.moveTo(currentX, y);
      ctx.lineTo(currentX, y + height);
      ctx.stroke();
    }
  }

  // Render cell text if any
  if (cellsData) {
    ctx.fillStyle = '#0f172a';
    ctx.font = '13px sans-serif';
    ctx.textBaseline = 'top';

    let rY = y;
    for (let r = 0; r < rows; r++) {
      const rH = rowHeights[r] || height / rows;
      let cX = x;
      for (let c = 0; c < cols; c++) {
        const cW = colWidths[c] || width / cols;
        const key = `${r}_${c}`;
        const val = cellsData[key];
        if (val) {
          ctx.fillText(val, cX + 6, rY + 6);
        }
        cX += cW;
      }
      rY += rH;
    }
  }

  ctx.restore();
}

/**
 * Check if point is inside a table and return row and column index
 */
export function getTableCellAtPoint(
  point: Point,
  table: TableAnnotation
): { row: number; col: number } | null {
  if (
    point.x < table.x ||
    point.x > table.x + table.width ||
    point.y < table.y ||
    point.y > table.y + table.height
  ) {
    return null;
  }

  let rY = table.y;
  let targetRow = -1;
  for (let r = 0; r < table.rows; r++) {
    const rH = table.rowHeights[r] || table.height / table.rows;
    if (point.y >= rY && point.y <= rY + rH) {
      targetRow = r;
      break;
    }
    rY += rH;
  }

  let cX = table.x;
  let targetCol = -1;
  for (let c = 0; c < table.cols; c++) {
    const cW = table.colWidths[c] || table.width / table.cols;
    if (point.x >= cX && point.x <= cX + cW) {
      targetCol = c;
      break;
    }
    cX += cW;
  }

  if (targetRow !== -1 && targetCol !== -1) {
    return { row: targetRow, col: targetCol };
  }
  return null;
}

/**
 * Check if a point (eraser) intersects or is near a stroke point
 */
export function isPointNearStroke(
  point: Point,
  stroke: StrokeAnnotation,
  threshold: number = 15
): boolean {
  const points = stroke.points;
  const radius = threshold + stroke.width / 2;

  for (let i = 0; i < points.length; i++) {
    const distSq = (point.x - points[i].x) ** 2 + (point.y - points[i].y) ** 2;
    if (distSq <= radius ** 2) {
      return true;
    }
  }
  return false;
}

/**
 * Check if point is near a shape boundary
 */
export function isPointNearShape(
  point: Point,
  shape: ShapeAnnotation,
  threshold: number = 15
): boolean {
  const minX = Math.min(shape.startPoint.x, shape.endPoint.x) - threshold;
  const maxX = Math.max(shape.startPoint.x, shape.endPoint.x) + threshold;
  const minY = Math.min(shape.startPoint.y, shape.endPoint.y) - threshold;
  const maxY = Math.max(shape.startPoint.y, shape.endPoint.y) + threshold;

  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
}

/**
 * Distance formula
 */
export function distanceBetween(p1: Point, p2: Point): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * Perform MS Paint style pixel flood fill on canvas
 */
export function performCanvasFloodFill(
  canvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  fillColorHex: string
): string | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Convert fill color hex to RGBA
  const temp = document.createElement('canvas');
  temp.width = 1;
  temp.height = 1;
  const tCtx = temp.getContext('2d');
  if (!tCtx) return null;
  tCtx.fillStyle = fillColorHex;
  tCtx.fillRect(0, 0, 1, 1);
  const fillRgb = tCtx.getImageData(0, 0, 1, 1).data;

  const startPxX = Math.round(startX);
  const startPxY = Math.round(startY);

  if (startPxX < 0 || startPxX >= width || startPxY < 0 || startPxY >= height) return null;

  const startIndex = (startPxY * width + startPxX) * 4;
  const targetR = data[startIndex];
  const targetG = data[startIndex + 1];
  const targetB = data[startIndex + 2];
  const targetA = data[startIndex + 3];

  // If already target color, return
  if (
    Math.abs(targetR - fillRgb[0]) < 10 &&
    Math.abs(targetG - fillRgb[1]) < 10 &&
    Math.abs(targetB - fillRgb[2]) < 10 &&
    Math.abs(targetA - fillRgb[3]) < 10
  ) {
    return null;
  }

  // Color match tolerance
  const matchTarget = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    return (
      Math.abs(r - targetR) <= 32 &&
      Math.abs(g - targetG) <= 32 &&
      Math.abs(b - targetB) <= 32 &&
      Math.abs(a - targetA) <= 32
    );
  };

  const queue: number[] = [startPxX, startPxY];
  const visited = new Uint8Array(width * height);

  while (queue.length > 0) {
    const cy = queue.pop()!;
    const cx = queue.pop()!;

    const idx = (cy * width + cx) * 4;
    const bitIdx = cy * width + cx;

    if (visited[bitIdx]) continue;
    visited[bitIdx] = 1;

    if (!matchTarget(idx)) continue;

    data[idx] = fillRgb[0];
    data[idx + 1] = fillRgb[1];
    data[idx + 2] = fillRgb[2];
    data[idx + 3] = fillRgb[3];

    if (cx > 0) queue.push(cx - 1, cy);
    if (cx < width - 1) queue.push(cx + 1, cy);
    if (cy > 0) queue.push(cx, cy - 1);
    if (cy < height - 1) queue.push(cx, cy + 1);
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}
export function isPointInsideShape(point: Point, shape: ShapeAnnotation): boolean {
  const p1 = shape.startPoint;
  const p2 = shape.endPoint;
  const left = Math.min(p1.x, p2.x);
  const right = Math.max(p1.x, p2.x);
  const top = Math.min(p1.y, p2.y);
  const bottom = Math.max(p1.y, p2.y);
  const width = right - left;
  const height = bottom - top;

  if (shape.shapeType === 'rectangle') {
    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
  }

  if (shape.shapeType === 'circle') {
    const rx = width / 2;
    const ry = height / 2;
    const cx = left + rx;
    const cy = top + ry;
    if (rx <= 0 || ry <= 0) return false;
    const normX = (point.x - cx) / rx;
    const normY = (point.y - cy) / ry;
    return normX * normX + normY * normY <= 1.0;
  }

  if (shape.shapeType === 'triangle') {
    const ax = left + width / 2, ay = top;
    const bx = right, by = bottom;
    const cx = left, cy = bottom;

    const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (denominator === 0) return false;
    const a = ((by - cy) * (point.x - cx) + (cx - bx) * (point.y - cy)) / denominator;
    const b = ((cy - ay) * (point.x - cx) + (ax - cx) * (point.y - cy)) / denominator;
    const c = 1 - a - b;

    return a >= 0 && b >= 0 && c >= 0;
  }

  if (shape.shapeType === 'star') {
    const rx = width / 2;
    const ry = height / 2;
    const cx = left + rx;
    const cy = top + ry;
    const maxR = Math.max(rx, ry);
    const dist = Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2);
    return dist <= maxR;
  }

  return isPointNearShape(point, shape, 20);
}
