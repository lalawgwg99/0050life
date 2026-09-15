import { useEffect, useMemo, useRef, useState } from "react";
import { formatCompactMoney, formatMoney } from "../lib/format";

interface BalancePoint {
  age: number;
  assets: number;
}

export function BalanceChart({ data }: { data: BalancePoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const height = 280;
  const margin = { top: 18, right: 18, bottom: 36, left: width < 500 ? 52 : 68 };
  const innerWidth = Math.max(1, width - margin.left - margin.right);
  const innerHeight = height - margin.top - margin.bottom;
  const maxAssets = Math.max(1, ...data.map((point) => point.assets));
  const minAge = data[0]?.age ?? 0;
  const maxAge = data.at(-1)?.age ?? minAge + 1;
  const x = (age: number) => margin.left + ((age - minAge) / Math.max(1, maxAge - minAge)) * innerWidth;
  const y = (assets: number) => margin.top + innerHeight - (assets / maxAssets) * innerHeight;
  const path = data.map((point, index) => `${index === 0 ? "M" : "L"}${x(point.age).toFixed(2)},${y(point.assets).toFixed(2)}`).join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * maxAssets);
  const xTicks = useMemo(() => {
    const count = width < 500 ? 4 : 6;
    return Array.from({ length: count }, (_, index) => minAge + ((maxAge - minAge) * index) / (count - 1));
  }, [maxAge, minAge, width]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="chart-wrap">
      <svg className="balance-chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="balance-chart-title balance-chart-desc">
        <title id="balance-chart-title">退休後投資資產變化</title>
        <desc id="balance-chart-desc">從 {minAge.toFixed(0)} 歲的 {formatMoney(data[0]?.assets ?? 0)}，到 {maxAge.toFixed(0)} 歲的 {formatMoney(data.at(-1)?.assets ?? 0)}。</desc>
        {yTicks.map((tick) => <g key={tick}><line className="chart-grid" x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} /><text className="chart-label" x={margin.left - 8} y={y(tick) + 4} textAnchor="end">{formatCompactMoney(tick)}</text></g>)}
        {xTicks.map((tick) => <text key={tick} className="chart-label" x={x(tick)} y={height - 10} textAnchor={tick === minAge ? "start" : tick === maxAge ? "end" : "middle"}>{tick.toFixed(0)} 歲</text>)}
        <path className="chart-line" d={path} />
        {data.filter((_, index) => index % Math.max(1, Math.floor(data.length / 8)) === 0 || index === data.length - 1).map((point) => (
          <circle key={point.age} className="chart-point" cx={x(point.age)} cy={y(point.assets)} r="4"><title>{point.age.toFixed(0)} 歲：{formatMoney(point.assets)}</title></circle>
        ))}
      </svg>
    </div>
  );
}
