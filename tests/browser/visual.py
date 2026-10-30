"""Capture and compare the pinned static baseline and React using the same browser."""
import base64
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

OUTPUT = Path('/artifacts')
OUTPUT.mkdir(exist_ok=True)
BASELINE = os.environ['BASELINE_URL'].rstrip('/')
CANDIDATE = os.environ.get('CANDIDATE_URL', '').rstrip('/')

COMPARE = """async ({left,right}) => {
  const images = await Promise.all([left,right].map(async data => {
    const image = new Image(); image.src = 'data:image/png;base64,' + data;
    await image.decode(); return image;
  }));
  const [a,b] = images;
  if (a.width !== b.width || a.height !== b.height) return {match:false,reason:'dimensions',baseline:[a.width,a.height],candidate:[b.width,b.height]};
  const pixels = images.map(image => {
    const canvas = document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
    const context=canvas.getContext('2d'); context.drawImage(image,0,0);
    return context.getImageData(0,0,image.width,image.height).data;
  });
  let differentPixels=0;
  for(let i=0;i<pixels[0].length;i+=4) {
    if(pixels[0][i]!==pixels[1][i] || pixels[0][i+1]!==pixels[1][i+1] || pixels[0][i+2]!==pixels[1][i+2] || pixels[0][i+3]!==pixels[1][i+3]) differentPixels++;
  }
  return {match:differentPixels===0,differentPixels,width:a.width,height:a.height};
}"""

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    comparison = browser.new_page()
    results = []
    if CANDIDATE:
        context = browser.new_context(java_script_enabled=False)
        for language, route in [('en', '/'), ('en', '/index.html'), ('pl', '/pl/'), ('pl', '/pl/index.html')]:
            page = context.new_page()
            response = page.goto(CANDIDATE + route, wait_until='networkidle')
            assert response.status == 200, f'Unreachable direct route: {route}'
            assert page.locator('html').get_attribute('lang') == language
            assert page.locator('h1').count() == 1, f'Missing pre-rendered content: {route}'
            assert page.locator('a[href="mailto:contact@rsdsoftware.eu"]').count() == 1
            assert page.locator('link[rel="canonical"]').get_attribute('href') == 'https://www.rsdsoftware.eu' + ('/pl/' if language == 'pl' else '/')
            page.reload(wait_until='networkidle')
            assert page.locator('#services h2').is_visible()
            page.close()
        context.close()
        print('Four direct/refresh routes preserve indexable content with JavaScript disabled')
    for device, viewport in [('desktop', {'width': 1440, 'height': 1000}), ('mobile', {'width': 390, 'height': 844})]:
        for language, route in [('en', '/'), ('pl', '/pl/')]:
            captures = {}
            for version, url in [('baseline', BASELINE), ('candidate', CANDIDATE)]:
                if not url:
                    continue
                context = browser.new_context(viewport=viewport, locale='en-US')
                context.route('https://api.country.is/**', lambda request: request.fulfill(status=200, content_type='application/json', body='{"country":"US"}'))
                page = context.new_page()
                page.goto(url + route, wait_until='networkidle')
                page.evaluate('document.fonts.ready')
                # Header controls are the explicitly approved SSO addition. The existing
                # header DOM remains contract-tested; responsive/focus behavior is E2E-tested.
                # Keep strict pixel parity for all unchanged marketing content and footer.
                page.locator('header').evaluate("element => { element.style.visibility = 'hidden'; }")
                captures[version] = {}
                for region in ['main', 'footer']:
                    captures[version][region] = page.locator(region).screenshot(path=str(OUTPUT / f'{version}-{device}-{language}-{region}.png'), animations='disabled')
                context.close()
            if CANDIDATE:
                for region in ['main', 'footer']:
                    result = comparison.evaluate(COMPARE, {key: base64.b64encode(value).decode() for key, value in [('left', captures['baseline'][region]), ('right', captures['candidate'][region])]})
                    results.append({'device': device, 'language': language, 'region': region, **result})
    browser.close()
    (OUTPUT / 'visual-results.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
    print(json.dumps(results, indent=2))
    if CANDIDATE and not all(result['match'] for result in results):
        raise SystemExit('Visual regression: React differs from the pinned static baseline')
