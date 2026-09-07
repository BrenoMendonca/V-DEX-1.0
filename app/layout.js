import { Oxanium } from "next/font/google";
import PokedexShell from "@/components/PokedexShell";
import "./globals.css";

const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Pokedex",
  description: "Pokedex mobile-first com busca na PokeAPI",
};

const THEME_INIT_SCRIPT = `
try {
  var theme = localStorage.getItem("vbox-theme");
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  }
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br" className={oxanium.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <PokedexShell>{children}</PokedexShell>
      </body>
    </html>
  );
}
