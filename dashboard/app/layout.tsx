import type { ReactNode } from "react";

export const metadata = {
  title: "Web99 — orders",
  description: "The build queue.",
  icons: { icon: "/brand/favicon-32.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IE">
      <body>
        <style>{`
          :root{--violet:#5b3fe8;--violet-deep:#4429c7;--ink:#141033;--muted:#6b6790;
            --lav:#efebfe;--line:#ded5fb;--amber:#ffb020;--red:#c0392b;--green:#1e8e5a;}
          *{box-sizing:border-box}
          body{margin:0;background:#faf8ff;color:var(--ink);
            font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
          a{color:var(--violet)}
          .wrap{max-width:1080px;margin:0 auto;padding:26px 20px 80px}
          h1{font-size:25px;letter-spacing:-.5px;margin:0 0 4px}
          h2{font-size:17px;margin:28px 0 10px}
          .sub{color:var(--muted);margin:0 0 22px;font-size:14px}
          .card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:14px}
          table{width:100%;border-collapse:collapse;background:#fff;
            border:1px solid var(--line);border-radius:12px;overflow:hidden}
          th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.06em;
            color:var(--muted);padding:11px 14px;background:var(--lav)}
          td{padding:12px 14px;border-top:1px solid var(--line);vertical-align:top}
          tr:hover td{background:#fcfbff}
          .pill{display:inline-block;padding:3px 10px;border-radius:999px;
            font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
          .s-collecting{background:#eee;color:#555}
          .s-ready,.s-analysing,.s-generating{background:#fff3d6;color:#8a5a00}
          .s-review{background:var(--violet);color:#fff}
          .s-live{background:#d9f2e6;color:var(--green)}
          .s-sent{background:#d9e8f2;color:#1e5f8e}
          .s-won{background:var(--green);color:#fff}
          .s-lost{background:#eee;color:#888}
          .s-failed{background:#fadbd8;color:var(--red)}
          .btn{display:inline-block;background:var(--violet);color:#fff;border:0;
            padding:11px 20px;border-radius:999px;font-size:15px;font-weight:700;
            cursor:pointer;text-decoration:none;font-family:inherit}
          .btn:hover{background:var(--violet-deep)}
          .btn--ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
          .btn--ghost:hover{background:var(--lav)}
          .btn--danger{background:#fff;color:var(--red);border:1px solid #f0c8c4}
          .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
          .muted{color:var(--muted)}
          .warn{background:#fff8e6;border:1px solid #ffe0a3;border-radius:10px;
            padding:13px 15px;margin:0 0 14px}
          .warn ul{margin:8px 0 0;padding-left:18px}
          pre{background:#faf8ff;border:1px solid var(--line);border-radius:10px;
            padding:14px;overflow:auto;font-size:12.5px;line-height:1.5;max-height:420px}
          .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
          .stat{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px}
          .stat b{display:block;font-size:24px;letter-spacing:-.5px}
          .stat span{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
          label{display:block;font-size:13px;font-weight:600;margin:0 0 6px}
          textarea,input[type=password]{width:100%;padding:11px 13px;border:1px solid var(--line);
            border-radius:10px;font:inherit;font-size:14px}
          iframe{width:100%;height:660px;border:1px solid var(--line);border-radius:12px;background:#fff}
        `}</style>
        {children}
      </body>
    </html>
  );
}
