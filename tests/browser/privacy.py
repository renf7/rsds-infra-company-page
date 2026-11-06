"""Public privacy route: real nginx, logged out, scripts disabled, desktop/mobile."""
import json
import hashlib
import re
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

base = os.environ['CANDIDATE_URL'].rstrip('/')
output = Path('/artifacts')
output.mkdir(exist_ok=True)
results = []

def check_brand(page):
    assert re.search(r'\bRSD Software\b(?!\s+EU\b)', page.content(), re.IGNORECASE) is None, 'All page and metadata branding must include EU'
    image = page.locator('.brand-logo')
    assert image.evaluate('image => image.naturalWidth === 256 && image.naturalHeight === 256')
    assert image.get_attribute('alt'), 'Brand logo must retain accessible alternative text'
    box = image.bounding_box()
    assert box['width'] == 56 and box['height'] == 56, 'Preserve existing header dimensions'
    response = page.request.get(image.evaluate('image => image.src'))
    assert response.status == 200
    assert hashlib.sha256(response.body()).hexdigest() == '61f3ae0742b7b902dd7a56dc4426c6f802afea7b2863756aa0372abef5b8e48a', 'Serve the exact owner-supplied RSD Software EU PNG'
    social = page.request.get(base + '/logo.png')
    assert social.status == 200 and hashlib.sha256(social.body()).hexdigest() == hashlib.sha256(response.body()).hexdigest(), 'Social logo must use the same approved EU branding'

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    for width in [320, 390, 1440]:
        context = browser.new_context(viewport={'width': width, 'height': 900}, java_script_enabled=False)
        page = context.new_page()
        requests = []
        page.on('request', lambda request: requests.append(request.url))
        response = page.goto(base + '/facebook-privacy-policy', wait_until='networkidle')
        assert response.status == 200
        assert page.request.get(base + '/privacy-policy').status == 404, 'Retired route must not serve a stale policy'
        assert page.url == base + '/facebook-privacy-policy', 'Exact route must not redirect'
        assert page.title() == 'Privacy Policy | RSD Software EU'
        assert page.locator('html').get_attribute('lang') == 'en'
        expect(page.get_by_role('heading', level=1, name='Privacy Policy', exact=True)).to_be_visible()
        assert page.get_by_role('heading', level=2).count() == 10
        assert page.locator('script, iframe, form').count() == 0
        assert page.locator('article').inner_text().find('integration has not been implemented or activated') >= 0
        assert 'Awaiting owner verification' not in page.locator('article').inner_text()
        check_brand(page)
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        assert context.cookies() == [], 'Policy reading must not require authentication or set cookies'
        assert all(url.startswith(base + '/') for url in requests), 'No external analytics/tracking requests'
        page.screenshot(path=str(output / f'privacy-{width}.png'), full_page=True)
        page.locator('.site-header').screenshot(path=str(output / f'brand-privacy-{width}.png'))
        for route in ['/', '/pl/']:
            page.goto(base + route, wait_until='networkidle')
            check_brand(page)
            page.locator('.site-header').screenshot(path=str(output / f'brand-{width}-{"pl" if route == "/pl/" else "en"}.png'))
            expect(page.get_by_role('link', name='Privacy Policy', exact=True)).to_have_attribute('href', '/facebook-privacy-policy')
        results.append({'width': width, 'exactRoute200': True, 'loggedOut': True, 'noJavascript': True, 'noTrackingRequests': True, 'footerLinks': True, 'ownerBrandAsset': True})
        context.close()
    browser.close()
(output / 'privacy-results.json').write_text(json.dumps({'passed': True, 'cases': results}, indent=2), encoding='utf-8')
print('Privacy route: exact HTTP200, no login/redirect/scripts/tracking, EN/PL footer links and 320/390/1440px layouts passed')
