"""Verify recognizable local provider icons and accessible labels in real dialogs."""
import json
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

base = os.environ['CANDIDATE_URL'].rstrip('/')
output = Path('/artifacts')
output.mkdir(exist_ok=True)
results = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    for width in [320, 390, 1440]:
        for language, route in [('en', '/'), ('pl', '/pl/')]:
            context = browser.new_context(viewport={'width': width, 'height': 900})
            context.route('https://api.country.is/**', lambda request: request.fulfill(json={'country': 'US'}))
            # This static frontend visual test has no auth backend. Supply only
            # discovery data; full OAuth/JWT tests live in rsds-infra-local.
            context.route('**/api/auth/providers', lambda request: request.fulfill(json=[
                {'id': provider, 'enabled': True, 'visible': True}
                for provider in ['facebook', 'microsoft', 'google', 'github']
            ]))
            page = context.new_page()
            page.goto(base + route, wait_until='networkidle')
            page.get_by_role('button', name='Log in' if language == 'en' else 'Zaloguj się', exact=True).click()
            dialog = page.get_by_role('dialog')
            expect(dialog).to_be_visible()
            rows = []
            expect(dialog.get_by_text('Apple', exact=False)).to_have_count(0)
            expect(dialog.locator('img[src="/provider-icons/apple.svg"]')).to_have_count(0)
            for provider, label in [('facebook', 'Facebook'), ('microsoft', 'Microsoft'), ('google', 'Google'), ('github', 'GitHub')]:
                option = dialog.get_by_text(('Continue with ' if language == 'en' else 'Kontynuuj z ') + label, exact=True).locator('..')
                image = option.locator('img')
                expect(image).to_have_attribute('src', f'/provider-icons/{provider}.svg')
                expect(image).to_have_attribute('alt', '')
                page.wait_for_function('(provider) => document.querySelector(`img[src="/provider-icons/${provider}.svg"]`).naturalWidth > 0', arg=provider)
                badge = option.locator('.provider-badge')
                assert badge.evaluate('element => getComputedStyle(element).borderRadius') == '50%'
                assert image.bounding_box()['x'] < option.locator('span').last.bounding_box()['x'], 'Icon must precede label'
                rows.append(option.bounding_box())
            assert max(row['width'] for row in rows) - min(row['width'] for row in rows) <= 1, 'Enabled and disabled provider rows must have equal width'
            assert all(rows[index + 1]['y'] - (rows[index]['y'] + rows[index]['height']) >= 8 for index in range(len(rows) - 1)), 'Provider rows must retain clear vertical spacing'
            assert page.evaluate('document.documentElement.scrollWidth') <= width
            page.screenshot(path=str(output / f'provider-icons-{language}-{width}.png'))
            results.append({'language': language, 'width': width, 'fourLocalIconsLoaded': True, 'appleAbsent': True, 'circular': True, 'beforeLabels': True})
            context.close()
    browser.close()
(output / 'provider-icons-results.json').write_text(json.dumps({'passed': True, 'cases': results}, indent=2))
print('Four circular provider icons; Apple absent: EN/PL, 320/390/1440px passed')
