/**
 * OBJECT INDEX DESIGN NOTE: The cube-tab mark is a small catalogue device—bright,
 * precise, and graphic—rather than an industrial badge.
 */
import logoMark from "@/assets/westprint3d-object-index-logo.png";

type BrandMarkProps = { className?: string; label?: boolean };

export default function BrandMark({ className = "", label = true }: BrandMarkProps) {
  return (
    <div className={`brand-lockup ${className}`}>
      <img className="brand-mark" src={logoMark} alt="WestPrint3D cube-tab logo mark" />
      {label && <div className="brand-type"><span>WESTPRINT</span><sup>3D</sup></div>}
    </div>
  );
}
