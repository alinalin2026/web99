import type { SiteLogo, SiteTheme } from "@/lib/site-schema";
import TextLogo from "./TextLogo";

export default function Logo({
  name,
  logo,
  theme,
  size = 22,
}: {
  name: string;
  logo: SiteLogo;
  theme: SiteTheme;
  size?: number;
}) {
  if (logo.type === "upload" && logo.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo.url} alt={name} style={{ height: size * 1.6, width: "auto" }} />;
  }
  return <TextLogo name={name} theme={theme} size={size} />;
}
