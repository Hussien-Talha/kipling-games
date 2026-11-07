// Print-ready QR codes for the newspaper games page. Run: npm run qr
// The QR points at the games home page, which always shows the current game,
// so the same code can be printed in every issue.
import QRCode from "qrcode";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://hussien-talha.github.io/kipling-games/";
const OUT = new URL("../print/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const opts = { errorCorrectionLevel: "Q", margin: 4, color: { dark: "#000000", light: "#ffffff" } };

// Vector version: best for the newspaper layout software (scales to any size).
writeFileSync(new URL("kipling-games-qr.svg", OUT), await QRCode.toString(SITE_URL, { ...opts, type: "svg" }));

// High-resolution PNG: 2400px ≈ 8 cm at 760 dpi, plenty for print.
await QRCode.toFile(fileURLToPath(new URL("kipling-games-qr.png", OUT)), SITE_URL, { ...opts, width: 2400 });

console.log(`QR codes for ${SITE_URL} written to print/`);
