<p align="center">
  <img src="docs/logo.svg" width="96" height="96" alt="Salary Blur Guard">
</p>

<h1 align="center">Salary Blur Guard</h1>

Open your payroll dashboard in a café and your number is just sitting there. This extension blurs currency amounts on the sites you choose. Click one to read it; it hides again the moment you look away.

## Features

- **Blurs amounts on sight** — anything shaped like money is hidden before you can read it, in both layouts: `JOD 899.00` and `899.00 JOD`.
- **Survives dynamic pages** — a `MutationObserver` catches amounts rendered after load, so React dashboards like Rippling don't leak through.
- **Handles split markup** — when a site renders `<span>JOD</span><span>899.00</span>`, neither half looks like money on its own. The extension falls back to the smallest element whose combined text does.
- **Reveal on demand** — click or press <kbd>Enter</kbd> on an amount. It re-blurs when you click elsewhere, switch tabs, or the window loses focus.
- **Your sites, your currencies** — both lists are editable in the popup.
- **No network, no accounts, no telemetry** — everything runs locally. The extension has no code path that sends data anywhere.

## Install

Not on the Chrome Web Store. Load it unpacked:

1. `git clone https://github.com/<your-username>/salary-blur-guard.git`
2. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the **`src`** folder.

Works on any Chromium browser: Chrome, Edge, Brave, Opera, Vivaldi.

## Settings

| Setting | What it does |
| --- | --- |
| **Blur amounts** | Global on/off. |
| **Sites** | *Listed sites only* (default) or *Every site*. "Add this site" adds the current tab's domain. A domain covers its subdomains, so `rippling.com` also covers `app.rippling.com`. |
| **Currencies** | Symbols and codes that trigger a blur. The matching pattern is rebuilt from this list. |
| **Restore defaults** | Resets everything. |

Default sites: `rippling.com`, `deel.com`, `remote.com`, `gusto.com`, `workday.com`, `myworkday.com`, `adp.com`, `bamboohr.com`, `wise.com`, `payoneer.com`, `paypal.com`, `revolut.com`, `stripe.com`, `upwork.com`, `fiverr.com`.

Default currencies: `US$`, `USD`, `$`, `EUR`, `€`, `GBP`, `£`, `JOD`, `AED`, `SAR`, `EGP`, `KWD`, `QAR`, `BHD`, `OMR`, `TRY`, `₺`, `CHF`, `CAD`, `AUD`, `INR`, `₹`, `JPY`, `¥`.

## What gets detected

Western (`0-9`) and Eastern Arabic (`٠-٩`) digits, both orders, any spacing:

| Layout | Example | Caught |
| --- | --- | --- |
| Currency then number | `JOD 899.00`, `US$ ٣٥٠٫٠٤` | yes |
| Number then currency | `899.00 JOD`, `١٬٣٠٠٫٠٠ US$` | yes |
| No space | `JOD899.00` | yes |
| Extra spaces or line breaks | `JOD   899.00` | yes |
| Split across elements | `<span>JOD</span><span>899.00</span>` | yes |
| Not money | `INV_06/26/2026_3`, `Pending approval` | left alone |

## How it works

Two passes, run on load and again on every DOM mutation:

1. **Text nodes** — any text node matching the currency pattern is wrapped in a `<span class="sbg-blur">`. Precise: surrounding labels stay readable.
2. **Elements** — for amounts split across elements, the smallest element whose combined text matches gets blurred directly. Capped at 60 characters so a stray amount can't blur a whole paragraph.

Revealing is a CSS class toggle; `blur`, `visibilitychange`, and outside-click listeners strip it again.

## Development

```
src/            the extension itself — this is what you load unpacked
├─ manifest.json
├─ defaults.js    default lists, regex builder, host matcher (shared)
├─ content.js     two-pass detection and blurring
├─ content.css
├─ popup.*        settings panel
└─ icons/
docs/           logo
```

