# Meta Pages privacy policy — RSDSINFRA-29

Public route: https://www.rsdsoftware.eu/facebook-privacy-policy . This is the English policy for **RSD Software EU** and its own RSD Software EU Facebook Page. It does not cover website SSO or other products. No Pages API client/backend is implemented by this change.

## Verified scope and factual source

On 5 November 2026 the owner provided the business name **Rafal Szymon Duda Software**, the postal address **Kalinowa 6, Chotmów 05-123, Poland** (spelling retained exactly as supplied), and Page https://www.facebook.com/profile.php?id=61596025359717 . The owner explicitly confirmed that the separate integration **is not implemented yet**. These are owner-supplied business facts, not an independent registry audit or a claim that an operational integration was inspected.

The attachment's present-tense operational wording was therefore amended. The policy states that the integration is unimplemented/inactive, distinguishes intended future data categories and uses from current processing, and does not claim implemented token storage, retention, encryption, audits, AI processing or international-transfer safeguards. Current no-processing statements are limited to this unimplemented integration, not the website or all business activities. Meta's independent processing and already-public posts are distinguished. The legal-basis paragraph does not invent a basis for processing that has not begun.

## Publication controls

`meta-pages-policy.json` contains owner-reviewed business facts and fact-verification notes. `approved` means the publication fields pass the documented fact check; it does not imply legal certification or Meta approval. Run `npm run privacy:verify` before release and reconfirm the actual publication date. The initial policy was prepared on 2026-11-05; if first publication occurs later, update `publicationDate` to that actual date before deployment.

An incomplete `draft` is excluded from ordinary builds, including its footer link. An `approved` configuration with missing fields, unresolved instructions or an invalid date fails the build. Explicit `PRIVACY_POLICY_PREVIEW=true npm run build` can render a clearly labelled, noindex local draft; Docker supports the equivalent build argument. Never use a draft preview as a public policy or submit it to Meta.

Before activating any actual Pages integration, replace the pre-launch statements with verified implementation details: actual permissions/features; token, downloaded-data, content and log storage/access/retention; hosting, automation, AI and other recipients; security controls; legal bases and international transfer arrangements. Recheck the entire document, not just the variable fields, and update the date. Do not infer any of this from the separate SSO authentication service.

## Serving and tests

The English document is pre-rendered as static HTML and served by nginx at the exact extensionless `/facebook-privacy-policy` route with HTTP200. It works without JavaScript/login and adds no scripts, forms, cookies or page-specific analytics. Existing responsive branding/CSS are reused and the footer link appears on English and Polish homepages. The page's canonical URL and title are explicit. Production HTTPS is supplied by the existing website ingress; local HTTPS may terminate in a separate preview container.

Unit/build tests check the content scope, release gate, metadata and draft exclusion. `tests/browser/privacy.py` checks real nginx at 320/390/1440px with JavaScript disabled, exact URL/status, anonymous access, footer links, branding, overflow and no external tracking requests. The pre-migration pixel comparison removes only the newly approved footer link, which the separate privacy assertions cover; all pre-existing marketing content remains pixel-compared. Existing security checks and thresholds remain unchanged.

Production publication is a separate deployment step: after review/merge/release, verify the actual public HTTPS URL returns200 without redirection or login. A working local preview or passing PR does not establish public deployment or guarantee Meta approval. The email deletion-request section is not a machine-readable Meta data-deletion callback endpoint.


## Owner review update — 6 November 2026

The public app name is **RSD Software EU**, without the former API-access suffix. The exact target is `/facebook-privacy-policy`; the retired `/privacy-policy` route and stale HTML artifact must not serve a second copy. This policy still concerns the separate own-Page integration, not website SSO. Posts will be written manually with AI enhancement; the token is planned to remain in local credential storage and be used by the agent for authorized operations. Agent conversation history may serve as the operational record, without a separate log service. This does not establish local-only AI processing: the actual service, data access, conversation retention and transfer arrangements must be verified before activating the workflow. Never put real credentials in this repository or review comments. The last-updated date is 2026-11-06; reconfirm on release if publication occurs later.
