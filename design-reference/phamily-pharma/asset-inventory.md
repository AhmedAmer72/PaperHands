# Phamily Pharma asset inventory

These files were downloaded from public URLs on https://phamilypharma.com/ for visual analysis. They are not licensed for reuse. The PAPERHANDS app does not import this directory.

Phamily Pharma's logo, hand illustrations, photographs, and page copy stay theirs. PAPERHANDS uses original artwork and SIL Open Font License copies of Anton and Poppins from Fontsource.

| Local file | Source URL | Format | Dimensions | Bytes | Where it appears | Role | License |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `svg/hands-fingers-revert.svg` | https://phamilypharma.com/assets/images/hands-fingers-revert.svg | SVG | viewBox 0 0 298.96 460 | 9168 | Hero, both sides | Essential identity illustration | Copyrighted. Analysis only. |
| `svg/hands-ok.svg` | https://phamilypharma.com/assets/images/hands-ok.svg | SVG | viewBox 0 0 175 184 | 11052 | Content cards | Decorative hand | Copyrighted. Analysis only. |
| `svg/hands-heart.svg` | https://phamilypharma.com/assets/images/hands-heart.svg | SVG | viewBox 0 0 196 200 | 12413 | Content cards | Decorative hand | Copyrighted. Analysis only. |
| `svg/hands-clac.svg` | https://phamilypharma.com/assets/images/hands-clac.svg | SVG | viewBox 0 0 141 181 | 15887 | Content cards | Decorative hand | Copyrighted. Analysis only. |
| `svg/hands-hello.svg` | https://phamilypharma.com/assets/images/hands-hello.svg | SVG | viewBox 0 0 175 181 | 10704 | Content cards | Decorative hand | Copyrighted. Analysis only. |
| `svg/hands-no.svg` | https://phamilypharma.com/assets/images/hands-no.svg | SVG | viewBox 0 0 106 198 | 14774 | Content cards | Decorative hand | Copyrighted. Analysis only. |
| `svg/hands-check.svg` | https://phamilypharma.com/assets/images/hands-check.svg | SVG | viewBox 0 0 246 211 | 27977 | Content cards | Decorative hand | Copyrighted. Analysis only. |
| `svg/logo-sprite.svg` | https://phamilypharma.com/assets/images/logo-sprite.svg | SVG | viewBox 0 0 38 434 | 2198 | Header wordmark | Brand logo | Copyrighted. Analysis only. |
| `svg/logo-sprite-white.svg` | https://phamilypharma.com/assets/images/logo-sprite-white.svg | SVG | viewBox 0 0 38 434 | 1756 | Footer wordmark | Brand logo | Copyrighted. Analysis only. |
| `images/favicon-32x32.png` | https://phamilypharma.com/favicon-32x32.png | PNG | 32×32 | 1065 | Browser tab | Brand mark | Copyrighted. Analysis only. |
| `images/apple-touch-icon.png` | https://phamilypharma.com/apple-touch-icon.png | PNG | 180×180 | 1433 | Home-screen icon | Brand mark | Copyrighted. Analysis only. |
| `images/phamily-og.jpg` | https://phamilypharma.com/assets/images/phamily-og.jpg | JPEG | 1200×630 RGB | 126118 | Social preview | Brand photograph | Copyrighted. Analysis only. |
| `fonts/Anton-Regular.woff2` | https://phamilypharma.com/assets/fonts/Anton-Regular.woff2 | WOFF2 | — | 29148 | Display headlines | Type | The face is SIL OFL. This binary is their copy and is not shipped. |
| `fonts/Poppins-Regular.woff2` | https://phamilypharma.com/assets/fonts/Poppins-Regular.woff2 | WOFF2 | — | 48800 | Body | Type | SIL OFL face. Their binary is not shipped. |
| `fonts/Poppins-SemiBold.woff2` | https://phamilypharma.com/assets/fonts/Poppins-SemiBold.woff2 | WOFF2 | — | 48476 | Buttons and labels | Type | SIL OFL face. Their binary is not shipped. |
| `backgrounds/site.Cuo4rdYi.css` | https://phamilypharma.com/assets/site.Cuo4rdYi.css | CSS | — | 73932 | Whole page | Design system source | Their stylesheet. Used to read colors and motion. |
| `images/screenshots/*.jpg` | Captured in a browser from the public page | JPEG | 1440×900, 1920×1080, 768×1024, 390×844 | 20–92 KB | Full landing page at several scroll positions | Layout evidence | Screenshot of their page. Analysis only. |

`animations/` is empty. The motion on the reference site is CSS (`cubic-bezier(.17,.67,.3,1.1)` scale-ins, 0.3s color transitions, opacity reveals). No Lottie or video file was required to understand it.

## PAPERHANDS production assets

These are original or SIL OFL files. They are the ones the app loads.

| Local file | Format | Dimensions | Bytes | Role |
| --- | --- | --- | --- | --- |
| `frontend/public/assets/paperhands/paper-hand/hero.webp` | WebP RGBA | 539×802, transparent background | 94274 | Origami paper hand. Hero and the paper-hands comparison card. |
| `frontend/public/assets/paperhands/diamond-hand/hero.webp` | WebP RGBA | 711×994, transparent background | 113552 | Crystal diamond hand. Hero and the diamond comparison card. |
| `frontend/public/fonts/Anton-Regular.woff2` | WOFF2 | — | 18796 | Display face. Fontsource build, SIL Open Font License. |
| `frontend/public/fonts/Poppins-Regular.woff2` | WOFF2 | — | 7884 | Body 400. Fontsource build, SIL OFL. |
| `frontend/public/fonts/Poppins-SemiBold.woff2` | WOFF2 | — | 8000 | Body 600. Fontsource build, SIL OFL. |

The other folders under `frontend/public/assets/paperhands/` (`branding`, `mascot`, `illustrations`, `backgrounds`, `icons`, `animations`) were reserved and left empty. The two hero images cover the states the page actually shows. Extra states (early exit, committed, success) were not drawn.
