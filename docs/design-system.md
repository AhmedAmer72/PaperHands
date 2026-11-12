# PAPERHANDS design system

Tokens are declared in `frontend/app/globals.css`. Tailwind 4 reads the `@theme` block. Component classes live in `@layer components` so utilities such as `lg:hidden` still win.

## Color

| Token | Value | Job |
| --- | --- | --- |
| `--color-cream` / `--color-paper` | `#fffdf7` | Page background |
| `--color-forest` | `#09543d` | Hero, primary buttons, diamond card |
| `--color-forest-deep` | `#04261c` | Hero stat chips, button hover |
| `--color-ink` | `#461e10` | Body text and headline brown |
| `--color-pink` | `#ffa9e9` | Marker, primary action, number discs |
| `--color-cyan` | `#40c6fb` | Diamond material in the illustration |
| `--color-orange` | `#f45c24` | Early-exit and error |
| `--color-violet` | `#6d0596` | Reserved accent |
| `--color-charcoal` | `#1e1e1e` | Burn-reserve panel |
| `--color-lime` | `#ccf337` | Small eyebrow on the green hero |
| `--color-blue` | `#3d3ef3` | Present in the reference palette, unused on the landing page |

Selection is pink on brown.

## Type

| Token | Family | Use |
| --- | --- | --- |
| `--font-display` | Anton, then Arial Narrow, Impact | Headlines, uppercase, line-height 0.92, tracking about -0.04em |
| `--font-sans` | Poppins 400 and 600 | Body, buttons, navigation |

`.display` is `clamp(3.4rem, 8vw, 7.6rem)` and drops to `clamp(2.7rem, 12vw, 4rem)` under 900px. `.display-md` is `clamp(2.6rem, 5vw, 4.8rem)`. `.marker` paints a pink band behind the phrase and keeps the brown text.

## Space, radius, shadow

- Page sections are `mt-20` or `mt-24` inside a 1100px column. The hero is 1200px.
- Horizontal padding is 12px on small screens and 20px from the `md` breakpoint.
- Cards are radius 2rem. The hero is 2.4rem. Buttons and the nav are full pills.
- Card shadow is `0 0 100px #0000001a`, the same softness as the reference.
- Sections use `scroll-margin-top: 5.5rem` so anchor jumps clear the sticky nav.

## Motion

| Name | Value |
| --- | --- |
| Hand entrance | 0.7s `cubic-bezier(0.17, 0.67, 0.3, 1.1)`, delayed 0.12s and 0.32s |
| Buttons | background, color, and a 1px lift over 0.3s |
| Page scroll | `scroll-behavior: smooth` |
| Reduced motion | hands do not animate, buttons do not move, scroll is instant |

No animation library was added.

## Breakpoints

Tailwind defaults. The full link row appears at `lg` (1024px). Below that, a Menu button opens the same links. Under 900px the hero hands leave the absolute side layout and sit in a row under the buttons, at 11.5rem tall, so they stay visible and stop covering the headline.

## Components

| Class | What it is |
| --- | --- |
| `.btn`, `.btn-pink`, `.btn-green`, `.btn-cream` | Pill buttons. Disabled buttons stay at opacity 0.45. |
| `.card`, `.card.forest` | White editorial card, or the forest diamond card. |
| `.num` | Pink numbered disc. |
| `.hero-card`, `.hero-hands`, `.hand` | Layered hero. |
| `.toggle` | Cream pill with a pink primary half. |
| `details.faq` | Question list. |
| `HeroStat`, `Metric`, `Rule` | In `components/HomeExperience.tsx`. |
| `Report` | Transaction result. Green when the RPC returned SuccessValue, orange otherwise. |
