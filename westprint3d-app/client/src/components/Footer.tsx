import { content } from "@/data/content";
import { logo } from "@/data/media";

export default function Footer() {
  const t = content.footer;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#1D2124]">
      <div className="container py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5">
          <img src={logo} alt="WestPrint3D" className="h-6 w-auto" />
        </div>
        <p className="text-[#9BA39C] text-sm text-center sm:text-right">
          {t.tagline}
          <br />
          © {year} {t.rights}
        </p>
      </div>
    </footer>
  );
}
