import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { languageNames, languages } from "@/i18n";
import { cn } from "@/lib/utils";

export default function LanguagePill() {
  const { lang, setLang, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t.common.language}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border",
            "bg-white/80 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-foreground",
            "hover:border-[#E8704A] hover:text-[#E8704A] transition-colors duration-200 cursor-pointer"
          )}
        >
          <Globe size={14} className="shrink-0" />
          <span className="uppercase tracking-wide">{lang}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {languages.map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => setLang(code)}
            className={cn(
              "cursor-pointer",
              code === lang && "font-semibold text-[#E8704A]"
            )}
          >
            {languageNames[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
