# Reference design audit

Source: https://phamilypharma.com/, inspected in headless Chrome at 1440×900, 1920×1080, 768×1024, and 390×844, including scrolled positions. Colors and motion below were read from the public stylesheet `design-reference/phamily-pharma/backgrounds/site.Cuo4rdYi.css` (73,932 bytes) and from those screenshots. This is a visual system audit. PAPERHANDS does not reuse the pharmacy copy, logo, or hand drawings.

## What the page actually does

The page is a cream field with one large forest-green rounded panel as the hero. Navigation sits in that green on desktop. On a phone, a cream "Menu" pill overlaps the green card and the links collapse. The headline is enormous, condensed, and uppercase. One phrase sits on a pink marker with brown text. Two flat, two-tone hands (cream `#fffdf7` and ink `#1e1e1e`) overlap the card from the sides and scale in. Below, white cards with a very soft shadow stagger across the cream page. A sticky text column sits beside a stack of steps. Number tags are pink discs. The footer is two green push cards, a link row, and a giant wordmark.

## Colors found in the stylesheet

| Role on their site | Value |
| --- | --- |
| Page cream | `#fffdf7` |
| Primary green | `#09543d` |
| Deeper green | `#04261c` |
| Body brown | `#461e10` |
| Pink marker and buttons | `#ffa9e9` |
| Ink used inside the hand SVGs | `#1e1e1e` |
| Other hues in the same file | `#3d3ef3`, `#ccf337`, `#ffc200`, `#f45c24`, `#dc3f81`, `#6d0596` |
| Card shadow | `0 0 100px #0000001a` |
| Muted gray | `#b1b1b1` |
| White cards | `#fff` |

PAPERHANDS keeps this set for the interface: cream is paper, forest is the commitment surface, pink is the marker and the primary action, orange `#f45c24` is the warning, violet `#6d0596` stays available for badges, charcoal `#1e1e1e` is the burn-reserve panel, and lime `#ccf337` is the small hero eyebrow. The saved stylesheet does not contain a cyan hex. The original diamond illustration uses `#40c6fb` as the crystal color so the diamond hand reads as a different material from the paper hand. That cyan is not used on buttons.

## Typography

The saved stylesheet sets one family: `Poppins, Helvetica Neue, Helvetica, Arial, sans-serif`. Buttons are Poppins 600 at `1.4rem`, padding `1.6rem 3rem`, radius `10rem`. A title rule uses `line-height: .93`, `letter-spacing: -.046rem`, and `text-transform: uppercase`.

The rendered headlines are a much more condensed uppercase face than Poppins. The site also serves `https://phamilypharma.com/assets/fonts/Anton-Regular.woff2`. That file was downloaded for comparison. The production app does not use their binary. It loads Fontsource builds of Anton and Poppins, both SIL Open Font License.

## Layout

- Cards use a large radius, on the order of 2–3rem, and the soft shadow above.
- Content stacks in a single column on a phone and opens into a staggered two-column editorial layout on desktop.
- Hands are absolutely positioned and cropped by the hero's rounded corners.
- Steps use a sticky title column beside the cards.
- The widest measured content cap in the stylesheet is `max-width: 142.8rem`. PAPERHANDS uses a tighter 1100–1200px cap so the protocol copy stays readable.

## Motion

All of it is CSS. No GSAP, Lottie, or video was required.

- Hands scale in with `cubic-bezier(.17,.67,.3,1.1)`.
- Links use `cubic-bezier(.23,1,.32,1)`.
- Buttons transition background and color over `0.3s`.
- Overlay and loader keyframes exist (`enter-popin`, `lds-roller`, `lds-ellipsis`) for UI chrome, not for the hero story.

PAPERHANDS copies the hand scale-in and the 0.3s button color swap, and it turns both off under `prefers-reduced-motion`.

## Responsive behavior observed

- 1440 and 1920: green hero, side hands, full nav, pink marker on the key phrase.
- 768: the hero card still dominates; type and hands scale down; the menu starts to matter.
- 390: the headline stays huge, the hands sit at the sides of the card, and navigation is a Menu control. The supporting sentence remains readable.

Screenshots of their page are in `design-reference/phamily-pharma/images/screenshots/`.
