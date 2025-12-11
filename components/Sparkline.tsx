
import React, { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  chartId: string;
}

const Sparkline: React.FC<SparklineProps> = ({ 
  data, 
  color = '#10b981', 
  width = 200, 
  height = 60,
  fill = true,
  chartId
}) => {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) return '';

    let min = Math.min(...data);
    let max = Math.max(...data);
    let range = max - min;

    // FIX: Adjusted sensitivity. 
    // Reduced from 0.2% to 0.05% to show more detail for stable assets like BTC/ETH
    // while still filtering out pure micro-noise.
    const minRange = Math.max(min * 0.0005, 0.01); 

    if (range < minRange) {
        const diff = minRange - range;
        min -= diff / 2;
        max += diff / 2;
        range = max - min;
    }

    // Add vertical padding (10%) so line doesn't touch edges
    const padding = height * 0.1;
    const availableHeight = height - (padding * 2);
    
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const normalizedVal = (val - min) / range;
      // Invert Y because SVG 0 is top
      const y = height - padding - (normalizedVal * availableHeight);
      return [x, y] as [number, number];
    });

    // Generate smooth bezier curve
    let d = `M ${points[0][0]},${points[0][1]}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      
      const midX = (x0 + x1) / 2;
      
      d += ` C ${midX},${y0} ${midX},${y1} ${x1},${y1}`;
    }

    return { path: d, points };
  }, [data, width, height]);

  if (!pathData) return null;

  const { path, points } = pathData;
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  
  // Close the path for fill
  const fillPath = fill 
    ? `${path} L ${lastPoint[0]},${height} L ${firstPoint[0]},${height} Z` 
    : '';

  // Use chartId to generate a stable ID for the gradient
  const gradientId = `gradient-${chartId.replace(/[^a-zA-Z0-9]/g, '-')}`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={fillPath} fill={`url(#${gradientId})`} stroke="none" />}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export default Sparkline;
