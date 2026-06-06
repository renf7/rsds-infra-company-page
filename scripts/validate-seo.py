#!/usr/bin/env python3
"""Validate the static site's search-engine-facing contract."""

import json
import struct
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BASE_URL = "https://www.rsdsoftware.eu"
ORGANIZATION_ID = f"{BASE_URL}/#organization"
WEBSITE_ID = f"{BASE_URL}/#website"
LOGO_URL = f"{BASE_URL}/logo.png"
EMAIL = "contact@rsdsoftware.eu"
ALTERNATES = {
    "en": f"{BASE_URL}/",
    "pl": f"{BASE_URL}/pl/",
    "x-default": f"{BASE_URL}/",
}
PAGES = {
    PUBLIC / "index.html": {
        "lang": "en",
        "canonical": f"{BASE_URL}/",
        "title": "Java Software Development with AI Support | RSD Software",
        "description": (
            "RSD Software delivers robust Java software with AI-powered support, "
            "led by experienced software professionals."
        ),
        "h1": "Professional Java Software Development with AI-Powered Support",
        "og_locale": "en_US",
        "alternate_locale": "pl_PL",
        "language_script": "language.js",
        "website_json_ld": True,
    },
    PUBLIC / "pl" / "index.html": {
        "lang": "pl",
        "canonical": f"{BASE_URL}/pl/",
        "title": "Tworzenie oprogramowania Java ze wsparciem AI | RSD Software",
        "description": (
            "RSD Software tworzy niezawodne oprogramowanie Java ze wsparciem AI, "
            "dostarczane przez doświadczonych programistów."
        ),
        "h1": "Profesjonalne tworzenie oprogramowania Java ze wsparciem AI",
        "og_locale": "pl_PL",
        "alternate_locale": "en_US",
        "language_script": "../language.js",
        "website_json_ld": False,
    },
}


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.html_lang = None
        self.links = []
        self.metas = []
        self.images = []
        self.scripts = []
        self.anchors = []
        self.ids = []
        self.h1s = []
        self.h2s = []
        self.titles = []
        self.language_nav_depth = 0
        self.language_nav_links = []
        self._capture = None
        self._buffer = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "a":
            self.anchors.append(attrs)

        if tag == "html":
            self.html_lang = attrs.get("lang")
        elif tag == "link":
            self.links.append(attrs)
        elif tag == "meta":
            self.metas.append(attrs)
        elif tag == "img":
            self.images.append(attrs)
        elif tag == "script":
            self.scripts.append({"attrs": attrs, "content": ""})
            if attrs.get("type") == "application/ld+json":
                self._capture = "script"
                self._buffer = []
        elif tag in {"h1", "h2", "title"}:
            self._capture = tag
            self._buffer = []
        elif tag == "nav" and "language-nav" in attrs.get("class", "").split():
            self.language_nav_depth += 1
        elif tag == "a" and self.language_nav_depth:
            self.language_nav_links.append(attrs)

    def handle_endtag(self, tag):
        if tag == "nav" and self.language_nav_depth:
            self.language_nav_depth -= 1
        if self._capture != tag:
            return

        value = " ".join("".join(self._buffer).split())
        if tag == "h1":
            self.h1s.append(value)
        elif tag == "h2":
            self.h2s.append(value)
        elif tag == "title":
            self.titles.append(value)
        elif tag == "script":
            self.scripts[-1]["content"] = value
        self._capture = None
        self._buffer = []

    def handle_data(self, data):
        if self._capture:
            self._buffer.append(data)


errors = []


def check(condition, message):
    if not condition:
        errors.append(message)


def attributes_by_key(items, key, label):
    result = {}
    for item in items:
        name = item.get(key)
        if not name:
            continue
        check(name not in result, f"{label}: duplicate {key}={name!r}")
        result[name] = item.get("content", "")
    return result


def local_path_for_reference(page_path, reference):
    if not reference or reference.startswith(("#", "mailto:", "tel:", "data:")):
        return None

    parsed = urlparse(reference)
    if parsed.scheme or parsed.netloc:
        if parsed.scheme != "https" or parsed.netloc != "www.rsdsoftware.eu":
            return None
        path = PUBLIC / parsed.path.lstrip("/")
    elif parsed.path.startswith("/"):
        path = PUBLIC / parsed.path.lstrip("/")
    else:
        path = page_path.parent / parsed.path

    if parsed.path.endswith("/"):
        path /= "index.html"

    try:
        resolved = path.resolve()
        resolved.relative_to(PUBLIC.resolve())
    except ValueError:
        return None
    return resolved


def png_dimensions(path):
    with path.open("rb") as image:
        header = image.read(24)
    if header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", header[16:24])


def validate_json_ld(parser, expected, label):
    structured_data = []
    for script in parser.scripts:
        if script["attrs"].get("type") != "application/ld+json":
            continue
        try:
            item = json.loads(script["content"])
        except json.JSONDecodeError as exc:
            errors.append(f"{label}: invalid JSON-LD: {exc}")
            continue
        check(isinstance(item, dict), f"{label}: JSON-LD top level must be an object")
        if isinstance(item, dict):
            structured_data.append(item)

    organizations = [item for item in structured_data if item.get("@type") == "Organization"]
    check(len(organizations) == 1, f"{label}: expected one Organization JSON-LD node")
    if organizations:
        organization = organizations[0]
        check(organization.get("@context") == "https://schema.org", f"{label}: invalid schema context")
        check(organization.get("@id") == ORGANIZATION_ID, f"{label}: inconsistent organization ID")
        check(organization.get("name") == "RSD Software", f"{label}: inconsistent organization name")
        check(organization.get("url") == ALTERNATES["en"], f"{label}: inconsistent organization URL")
        check(organization.get("email") == EMAIL, f"{label}: inconsistent organization email")
        check(bool(organization.get("description")), f"{label}: missing organization description")

        logo = organization.get("logo", {})
        check(isinstance(logo, dict), f"{label}: organization logo must be an ImageObject")
        if isinstance(logo, dict):
            check(logo.get("@type") == "ImageObject", f"{label}: organization logo must be an ImageObject")
            check(logo.get("url") == LOGO_URL, f"{label}: inconsistent organization logo URL")
            check(logo.get("width") == 600 and logo.get("height") == 600, f"{label}: incorrect logo dimensions")

    websites = [item for item in structured_data if item.get("@type") == "WebSite"]
    if expected["website_json_ld"]:
        check(len(websites) == 1, f"{label}: expected one WebSite JSON-LD node")
        if websites:
            website = websites[0]
            check(website.get("@context") == "https://schema.org", f"{label}: invalid WebSite schema context")
            check(website.get("@id") == WEBSITE_ID, f"{label}: inconsistent website ID")
            check(website.get("url") == ALTERNATES["en"], f"{label}: inconsistent website URL")
            check(website.get("name") == "RSD Software", f"{label}: inconsistent website name")
            check(website.get("alternateName") == "RSD", f"{label}: missing website alternate name")
            publisher = website.get("publisher", {})
            check(isinstance(publisher, dict), f"{label}: website publisher must reference an entity")
            if isinstance(publisher, dict):
                check(publisher.get("@id") == ORGANIZATION_ID, f"{label}: invalid website publisher")
    else:
        check(not websites, f"{label}: WebSite JSON-LD belongs only on the home page")


def validate_page(page_path, expected):
    label = page_path.relative_to(ROOT)
    parser = PageParser()
    parser.feed(page_path.read_text(encoding="utf-8"))
    parser.close()

    check(parser.html_lang == expected["lang"], f"{label}: expected lang={expected['lang']!r}")
    check(len(parser.ids) == len(set(parser.ids)), f"{label}: duplicate HTML IDs")
    check(len(parser.titles) == 1, f"{label}: expected exactly one title")
    check(parser.titles == [expected["title"]], f"{label}: unexpected title")
    check(30 <= len(expected["title"]) <= 65, f"{label}: title should be 30-65 characters")
    check(len(parser.h1s) == 1, f"{label}: expected exactly one h1")
    check(parser.h1s == [expected["h1"]], f"{label}: unexpected h1")
    check(len(parser.h2s) >= 4, f"{label}: expected clear section headings")

    meta_by_name = attributes_by_key(parser.metas, "name", label)
    meta_by_property = attributes_by_key(parser.metas, "property", label)
    check(any(meta.get("charset", "").lower() == "utf-8" for meta in parser.metas), f"{label}: missing UTF-8 charset")
    check("viewport" in meta_by_name, f"{label}: missing viewport metadata")
    check("keywords" not in meta_by_name, f"{label}: obsolete keywords metadata should not be used")
    check(meta_by_name.get("description") == expected["description"], f"{label}: unexpected meta description")
    check(70 <= len(expected["description"]) <= 160, f"{label}: description should be 70-160 characters")
    robots = {value.strip() for value in meta_by_name.get("robots", "").split(",")}
    check({"index", "follow", "max-image-preview:large"} <= robots, f"{label}: incomplete robots metadata")

    canonical = [link.get("href") for link in parser.links if link.get("rel") == "canonical"]
    check(canonical == [expected["canonical"]], f"{label}: expected self-referencing canonical")
    alternate_links = [link for link in parser.links if link.get("rel") == "alternate"]
    alternates = {
        link.get("hreflang"): link.get("href")
        for link in alternate_links
    }
    check(len(alternate_links) == len(ALTERNATES), f"{label}: expected exactly three hreflang links")
    check(alternates == ALTERNATES, f"{label}: incomplete or inconsistent hreflang links")

    check(meta_by_property.get("og:type") == "website", f"{label}: invalid Open Graph type")
    check(meta_by_property.get("og:site_name") == "RSD Software", f"{label}: invalid Open Graph site name")
    check(meta_by_property.get("og:locale") == expected["og_locale"], f"{label}: invalid Open Graph locale")
    check(
        meta_by_property.get("og:locale:alternate") == expected["alternate_locale"],
        f"{label}: invalid alternate Open Graph locale",
    )
    check(meta_by_property.get("og:title") == expected["title"], f"{label}: Open Graph title differs from title")
    check(
        meta_by_property.get("og:description") == expected["description"],
        f"{label}: Open Graph description differs from description",
    )
    check(meta_by_property.get("og:url") == expected["canonical"], f"{label}: Open Graph URL differs from canonical")
    check(meta_by_property.get("og:image") == LOGO_URL, f"{label}: invalid Open Graph image")
    check(meta_by_property.get("og:image:width") == "600", f"{label}: invalid Open Graph image width")
    check(meta_by_property.get("og:image:height") == "600", f"{label}: invalid Open Graph image height")
    check(bool(meta_by_property.get("og:image:alt")), f"{label}: missing Open Graph image alt text")

    check(meta_by_name.get("twitter:card") == "summary", f"{label}: invalid Twitter card")
    check(meta_by_name.get("twitter:title") == expected["title"], f"{label}: Twitter title differs from title")
    check(
        meta_by_name.get("twitter:description") == expected["description"],
        f"{label}: Twitter description differs from description",
    )
    check(meta_by_name.get("twitter:image") == LOGO_URL, f"{label}: invalid Twitter image")
    check(bool(meta_by_name.get("twitter:image:alt")), f"{label}: missing Twitter image alt text")

    language_links = {link.get("hreflang"): link for link in parser.language_nav_links}
    check(set(language_links) == {"en", "pl"}, f"{label}: expected visible EN/PL navigation")
    for language, href in {"en": "/", "pl": "/pl/"}.items():
        link = language_links.get(language, {})
        check(link.get("href") == href, f"{label}: invalid visible {language} language link")
        check(link.get("lang") == language, f"{label}: invalid language declaration on {language} link")
        check(link.get("data-language-choice") == language, f"{label}: {language} link must save explicit choice")
        expected_current = "page" if language == expected["lang"] else None
        check(link.get("aria-current") == expected_current, f"{label}: invalid current-language marker for {language}")

    source_scripts = [script["attrs"] for script in parser.scripts if script["attrs"].get("src")]
    check(len(source_scripts) == 1, f"{label}: expected exactly one executable script")
    if source_scripts:
        check(source_scripts[0].get("src") == expected["language_script"], f"{label}: invalid language script path")
        check("defer" in source_scripts[0], f"{label}: language script must be deferred")

    for image in parser.images:
        check(bool(image.get("alt")), f"{label}: image is missing descriptive alt text")
        check(bool(image.get("width")) and bool(image.get("height")), f"{label}: image is missing dimensions")
        image_path = local_path_for_reference(page_path, image.get("src"))
        check(bool(image_path and image_path.is_file()), f"{label}: image source does not exist")

    for link in parser.links:
        if link.get("rel") not in {"stylesheet", "icon"}:
            continue
        asset_path = local_path_for_reference(page_path, link.get("href"))
        check(bool(asset_path and asset_path.is_file()), f"{label}: linked asset does not exist")

    icons = [link for link in parser.links if link.get("rel") == "icon"]
    check(len(icons) == 1, f"{label}: expected exactly one favicon")
    if icons:
        check(icons[0].get("href") == "/logo-icon.png", f"{label}: favicon URL must be stable")
        check(icons[0].get("type") == "image/png", f"{label}: invalid favicon type")
        check(icons[0].get("sizes") == "256x256", f"{label}: invalid favicon size declaration")

    for script in source_scripts:
        script_path = local_path_for_reference(page_path, script.get("src"))
        check(bool(script_path and script_path.is_file()), f"{label}: script source does not exist")

    known_ids = set(parser.ids)
    for anchor in parser.anchors:
        href = anchor.get("href", "")
        if href.startswith("#"):
            check(href[1:] in known_ids, f"{label}: link points to missing section {href}")
        elif href.startswith("/"):
            target_path = local_path_for_reference(page_path, href)
            check(bool(target_path and target_path.is_file()), f"{label}: internal link target does not exist: {href}")

    validate_json_ld(parser, expected, label)
    return expected["title"], expected["description"], expected["h1"]


def validate_language_detection():
    language_script = PUBLIC / "language.js"
    check(language_script.is_file(), "language.js must exist")
    if not language_script.is_file():
        return

    source = language_script.read_text(encoding="utf-8")
    required_markers = [
        'window.location.pathname === "/"',
        'window.location.pathname === "/index.html"',
        'if (!isEnglishEntry)',
        'readStorage("localStorage", PREFERENCE_KEY)',
        'writeStorage("localStorage", PREFERENCE_KEY',
        'readStorage("sessionStorage", COUNTRY_KEY)',
        'fetch("https://api.country.is/"',
        'credentials: "omit"',
        'referrerPolicy: "no-referrer"',
        'normalizedCountry === "PL"',
        'readStorage("localStorage", PREFERENCE_KEY) !== "en"',
        "window.location.replace(",
    ]
    for marker in required_markers:
        check(marker in source, f"language.js: missing safety marker {marker!r}")
    check("navigator.language" not in source, "language.js must not redirect solely from browser language")
    check("navigator.languages" not in source, "language.js must not redirect solely from browser languages")


def validate_sitemap():
    sitemap_path = PUBLIC / "sitemap.xml"
    check(sitemap_path.is_file(), "sitemap.xml must exist")
    if not sitemap_path.is_file():
        return

    try:
        sitemap = ET.parse(sitemap_path)
    except ET.ParseError as exc:
        errors.append(f"sitemap.xml: invalid XML: {exc}")
        return

    ns = {
        "sitemap": "http://www.sitemaps.org/schemas/sitemap/0.9",
        "xhtml": "http://www.w3.org/1999/xhtml",
    }
    sitemap_urls = {}
    for url in sitemap.findall("sitemap:url", ns):
        loc = url.findtext("sitemap:loc", namespaces=ns)
        check(loc not in sitemap_urls, f"sitemap.xml: duplicate URL {loc}")
        alternate_links = url.findall("xhtml:link", ns)
        check(len(alternate_links) == len(ALTERNATES), f"sitemap.xml: expected three hreflang links for {loc}")
        sitemap_urls[loc] = {
            link.get("hreflang"): link.get("href")
            for link in alternate_links
        }

    expected_urls = {page["canonical"] for page in PAGES.values()}
    check(set(sitemap_urls) == expected_urls, "sitemap.xml: URL set is incorrect")
    for loc, alternates in sitemap_urls.items():
        check(alternates == ALTERNATES, f"sitemap.xml: incomplete hreflang links for {loc}")


def validate_robots():
    robots_path = PUBLIC / "robots.txt"
    check(robots_path.is_file(), "robots.txt must exist")
    if not robots_path.is_file():
        return

    lines = {
        line.strip()
        for line in robots_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }
    check("User-agent: *" in lines, "robots.txt: missing global user agent")
    check("Allow: /" in lines, "robots.txt: crawling is not explicitly allowed")
    check("Disallow: /" not in lines, "robots.txt: site is blocked from crawling")
    check(f"Sitemap: {BASE_URL}/sitemap.xml" in lines, "robots.txt: sitemap is not advertised")


def main():
    for required_file in [PUBLIC / "logo.png", PUBLIC / "logo-icon.png", PUBLIC / "styles.css"]:
        check(required_file.is_file(), f"Required asset is missing: {required_file.relative_to(ROOT)}")

    logo_path = PUBLIC / "logo.png"
    if logo_path.is_file():
        check(png_dimensions(logo_path) == (600, 600), "logo.png must be a 600x600 PNG")

    favicon_path = PUBLIC / "logo-icon.png"
    if favicon_path.is_file():
        width, height = png_dimensions(favicon_path) or (0, 0)
        check(width == height and width >= 48, "logo-icon.png must be a square PNG at least 48x48")

    titles = set()
    descriptions = set()
    h1s = set()
    for page_path, expected in PAGES.items():
        check(page_path.is_file(), f"Required page is missing: {page_path.relative_to(ROOT)}")
        if page_path.is_file():
            title, description, h1 = validate_page(page_path, expected)
            titles.add(title)
            descriptions.add(description)
            h1s.add(h1)

    check(len(titles) == len(PAGES), "Page titles must be unique")
    check(len(descriptions) == len(PAGES), "Meta descriptions must be unique")
    check(len(h1s) == len(PAGES), "Page h1 headings must be unique")

    validate_language_detection()
    validate_sitemap()
    validate_robots()

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("SEO validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
