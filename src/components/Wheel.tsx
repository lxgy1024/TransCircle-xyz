import { useEffect, useRef } from "react";
import { WHEEL_SLOTS, SEGMENT_COLORS } from "../constants";
import styles from "./Wheel.module.css";

const CX = 200;
const CY = 200;
const R = 190;
const SEG_COUNT = WHEEL_SLOTS.length;
const DEG_PER_SEG = 360 / SEG_COUNT; // 36

interface WheelProps {
  isSpinning: boolean;
  onSpinEnd: () => void;
  /** 外部触发旋转: slotId */
  spinTrigger: { slotId: number } | null;
}

/** 扇形路径 */
function describeSector(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const sa = ((startDeg - 90) * Math.PI) / 180;
  const ea = ((endDeg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(sa);
  const y1 = cy + r * Math.sin(sa);
  const x2 = cx + r * Math.cos(ea);
  const y2 = cy + r * Math.sin(ea);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
}

const Wheel: React.FC<WheelProps> = ({ isSpinning, onSpinEnd, spinTrigger }) => {
  const rotationRef = useRef(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  // 当 spinTrigger 变化时执行旋转
  useEffect(() => {
    if (spinTrigger === null) return;

    const targetSegment = spinTrigger.slotId;
    const slotCenter = targetSegment * DEG_PER_SEG + DEG_PER_SEG / 2;
    // 随机偏移 (±14° 在格内)
    const randomOffset = (Math.random() - 0.5) * 28;
    // 计算目标余角: 需要该格中心停在指针 (12 点方向)
    const targetRemainder =
      ((360 - (slotCenter + randomOffset)) % 360 + 360) % 360;

    const current = rotationRef.current;
    const extraSpins = 5 + Math.floor(Math.random() * 4); // 5-8 圈
    const delta =
      ((targetRemainder - (current % 360) + 720) % 360) + extraSpins * 360;
    const newRotation = current + delta;
    rotationRef.current = newRotation;

    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${newRotation}deg)`;
      wheelRef.current.style.transition =
        "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)";
    }

    timeoutRef.current = setTimeout(() => {
      onSpinEnd();
    }, 4400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [spinTrigger, onSpinEnd]);

  // 生成扇形
  const sectors = WHEEL_SLOTS.map((slot, i) => {
    const startDeg = i * DEG_PER_SEG;
    const endDeg = (i + 1) * DEG_PER_SEG;
    const path = describeSector(CX, CY, R, startDeg, endDeg);

    // 文字位置: 沿平分线
    const midDeg = startDeg + DEG_PER_SEG / 2;
    const textR = R * 0.62;
    const tRad = ((midDeg - 90) * Math.PI) / 180;
    const tx = CX + textR * Math.cos(tRad);
    const ty = CY + textR * Math.sin(tRad);

    return (
      <g key={slot.id}>
        <path d={path} fill={SEGMENT_COLORS[i]} stroke="#fff" strokeWidth="1.5" />
        <text
          x={tx}
          y={ty}
          transform={`rotate(${midDeg}, ${tx}, ${ty})`}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fontWeight="600"
          fill="#333"
          style={{ fontFamily: "inherit", pointerEvents: "none", userSelect: "none" }}
        >
          {slot.name}
        </text>
      </g>
    );
  });

  return (
    <div className={`${styles.container} ${isSpinning ? styles.spinning : ""}`}>
      <div className={styles.pointer} />
      <div ref={wheelRef} className={styles.wheel}>
        <svg viewBox="0 0 400 400" aria-label="转盘">
          {sectors}
        </svg>
      </div>
      <div className={styles.hub}>TSC</div>
    </div>
  );
};

export default Wheel;
