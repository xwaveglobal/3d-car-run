# v1.0.5: crisp coin-bar plate for screen headers (the cut-out of the key art looked dented when scaled)
# renders an SVG in Chromium at 3x, saves src/assets/images/ui/wallet.webp (744 x 261 = 248 x 87 @3x)
import asyncio, io, sys
from PIL import Image
from playwright.async_api import async_playwright

W, H = 248, 87
SVG = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
 <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9c48a"/><stop offset=".45" stop-color="#a8743e"/><stop offset="1" stop-color="#5a3414"/></linearGradient>
 <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4426"/><stop offset=".5" stop-color="#4d2f18"/><stop offset="1" stop-color="#2e1a0b"/></linearGradient>
 <radialGradient id="coin" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff0b0"/><stop offset=".45" stop-color="#f3b844"/><stop offset="1" stop-color="#a86414"/></radialGradient>
 <radialGradient id="plus" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#a6e07a"/><stop offset=".5" stop-color="#4f9a34"/><stop offset="1" stop-color="#245a16"/></radialGradient>
 <pattern id="grain" width="248" height="10" patternUnits="userSpaceOnUse">
  <path d="M0 2.5 C60 1.5 120 3.8 248 2.2 M0 7.2 C80 8.4 150 6.2 248 7.6" stroke="#1e0f05" stroke-opacity=".35" stroke-width=".8" fill="none"/>
 </pattern>
 <filter id="ds" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="1.2" stdDeviation="1" flood-color="#000" flood-opacity=".5"/></filter>
</defs>
<path d="M18 4 H230 L244 18 V69 L230 83 H18 L4 69 V18 Z" fill="#2a1406"/>
<path d="M19 6.5 H229 L241.5 19 V68 L229 80.5 H19 L6.5 68 V19 Z" fill="url(#rim)"/>
<path d="M21 11 H227 L237 21 V66 L227 76 H21 L11 66 V21 Z" fill="url(#wood)" stroke="#2a1406" stroke-width="1.6"/>
<path d="M21 11 H227 L237 21 V66 L227 76 H21 L11 66 V21 Z" fill="url(#grain)"/>
<path d="M22 13.5 H226" stroke="#c89a62" stroke-opacity=".35" stroke-width="1"/>
<g filter="url(#ds)">
 <circle cx="44" cy="43.5" r="25" fill="#5a3008"/>
 <circle cx="44" cy="43.5" r="23" fill="url(#coin)"/>
 <circle cx="44" cy="43.5" r="17.5" fill="none" stroke="#9a5a10" stroke-width="1.6"/>
 <path d="M44 30.5 l3.9 8 8.8 1.2 -6.4 6.1 1.6 8.7 -7.9 -4.2 -7.9 4.2 1.6 -8.7 -6.4 -6.1 8.8 -1.2z" fill="#ffe08a" stroke="#9a5a10" stroke-width="1.3" stroke-linejoin="round"/>
</g>
<g filter="url(#ds)">
 <circle cx="205" cy="43.5" r="22" fill="#1c3a0c"/>
 <circle cx="205" cy="43.5" r="20" fill="url(#plus)"/>
 <path d="M205 33 v21 M194.5 43.5 h21" stroke="#183a0a" stroke-width="7.5" stroke-linecap="round"/>
 <path d="M205 33 v21 M194.5 43.5 h21" stroke="#f6f0d8" stroke-width="4.6" stroke-linecap="round"/>
</g>
</svg>'''

async def main(out):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(device_scale_factor=3, viewport={'width': W, 'height': H})
        await pg.set_content(f'<html><body style="margin:0;background:transparent">{SVG}</body></html>')
        png = await pg.screenshot(omit_background=True, clip={'x': 0, 'y': 0, 'width': W, 'height': H})
        await b.close()
    Image.open(io.BytesIO(png)).save(out, 'WEBP', quality=92, method=6)
    print('wrote', out)

asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'src/assets/images/ui/wallet.webp'))
