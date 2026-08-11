import { MessageCircle } from "lucide-react";

export default function FloatingContact() {
  return (
    <a
      href="#custom"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#8AFF3C] text-[#08090A] font-semibold px-5 py-3 shadow-[0_0_24px_rgba(138,255,60,0.35)] hover:shadow-[0_0_32px_rgba(138,255,60,0.55)] transition-shadow duration-200"
    >
      <MessageCircle size={18} />
      <span className="hidden sm:inline">Ask about a custom print</span>
    </a>
  );
}
