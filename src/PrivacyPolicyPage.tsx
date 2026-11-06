import { Header, Footer } from './App';
import { content } from './content';

export interface PrivacyPolicy {
  status: string;
  publicationDate: string;
  controllerName: string;
  controllerAddress: string;
  storageAndRetention: string;
  serviceProviders: string;
  securityMeasures: string;
  internationalProcessing: string;
  verificationReference: string;
}

export function PrivacyPolicyPage({ policy }: { policy: PrivacyPolicy }) {
  const draft = policy.status !== 'approved';
  const fact = (value: string, label: string) => value || `Awaiting owner verification: ${label}.`;
  const contact = <a href="mailto:contact@rsdsoftware.eu">contact@rsdsoftware.eu</a>;
  return <><Header page={content.en} language="en" homeNavigation />
    <main className="container privacy-policy"><article aria-labelledby="policy-heading">
      {draft && <aside className="privacy-draft" role="note"><strong>Local review draft — not published.</strong> Required publication details remain unresolved. This draft must not be submitted to Meta or published as a final policy.</aside>}
      <h1 id="policy-heading">Privacy Policy</h1><p className="privacy-subtitle">RSD Software EU</p>
      <p>Last updated: {policy.publicationDate || 'Not published'}</p>
      <section aria-labelledby="policy-about"><h2 id="policy-about">1. About this policy</h2>
        <p>This Privacy Policy concerns “RSD Software EU”, a planned integration with Meta’s Facebook Pages API. The integration has not been implemented or activated.</p>
        <p>Its intended purpose is one owner-operated workflow for authorized administrators to manage and publish content on our own Facebook Page, <a href="https://www.facebook.com/profile.php?id=61596025359717" rel="noreferrer">RSD Software EU</a>. It is not offered as a service for managing other businesses’ Facebook Pages. This policy does not cover website SSO login providers or other RSD Software services.</p>
        <p>The organization responsible for this processing is:</p>
        <address>{fact(policy.controllerName, 'legal business name')}<br />{fact(policy.controllerAddress, 'business contact address')}<br />Contact: {contact}</address>
      </section>
      <section aria-labelledby="policy-information"><h2 id="policy-information">2. Information accessed</h2>
        <p>The integration does not currently access Facebook information. Depending on the permissions granted and features implemented, a future version may need access to the following categories. Actual access will be documented before activation:</p>
        <ul><li>The Facebook account identifier and basic profile information needed to authorize an administrator.</li><li>The names and identifiers of Facebook Pages that the administrator authorizes.</li><li>Page posts, photos, and associated engagement information permitted by Meta.</li><li>Content supplied by an administrator for publication, including text, images, and links.</li><li>Access tokens needed to authenticate requests to Meta.</li></ul>
        <p>The integration does not request your Facebook password.</p>
      </section>
      <section aria-labelledby="policy-use"><h2 id="policy-use">3. How information is used</h2>
        <p>No information is currently processed through the integration. Its planned purposes are:</p><ul><li>Authenticate authorized administrators and identify the authorized Page.</li><li>Create, read, edit, and delete Page content when instructed by an authorized administrator.</li><li>Confirm the status of publishing operations.</li><li>Diagnose errors and maintain the integration’s security and operation.</li></ul>
        <p>Posts will be written manually by the owner and may be enhanced by an AI agent before publication. The agent may use the integration’s access token through the owner’s authorized workflow to carry out instructed Page operations. AI assistance does not make this a service for managing other businesses’ Pages.</p>
        <p>Before activating these operations, RSD Software will identify the applicable legal basis for each purpose and update this policy. No consent or other legal basis for future processing is assumed by this pre-launch policy.</p>
      </section>
      <section aria-labelledby="policy-storage"><h2 id="policy-storage">4. Storage and retention</h2>
        <p>{fact(policy.storageAndRetention, 'token, Facebook data, publishing content and log storage, access and retention')}</p>
        <p>Published posts and comments are stored by Meta and remain subject to Meta’s controls and retention practices. Disconnecting this integration does not automatically delete content already published on Facebook.</p>
      </section>
      <section aria-labelledby="policy-sharing"><h2 id="policy-sharing">5. Sharing and service providers</h2>
        <p>If activated, the integration would send publishing content and authenticated API requests to Meta to perform the requested operations. It does not currently send these requests.</p>
        <p>{fact(policy.serviceProviders, 'hosting, logging, automation, AI and other providers and their purposes')}</p>
        <p>We do not sell personal information obtained through this integration.</p>
        <p>Meta processes information under its own <a href="https://www.facebook.com/privacy/policy/" rel="noreferrer">privacy policy</a>.</p>
      </section>
      <section aria-labelledby="policy-security"><h2 id="policy-security">6. Security</h2>
        <p>{fact(policy.securityMeasures, 'implemented security measures')}</p>
      </section>
      <section aria-labelledby="policy-rights"><h2 id="policy-rights">7. Your choices and rights</h2>
        <p>Administrators can revoke the integration’s permissions through Facebook’s Business Integrations settings or other applicable Meta account controls.</p>
        <p>Depending on applicable law, individuals may have rights to request access, correction, deletion, restriction, portability, or to object to certain processing. Where processing relies on consent, that consent may be withdrawn without affecting prior lawful processing.</p>
        <p>Requests can be sent to {contact}. Individuals may also lodge a complaint with their competent data-protection supervisory authority.</p>
      </section>
      <section aria-labelledby="policy-deletion"><h2 id="policy-deletion">8. Data deletion requests</h2>
        <p>To request deletion of personal information held by RSD Software through this integration, email {contact} with the subject: <strong>Facebook integration data deletion request</strong>.</p>
        <p>Describe your connection to the Page or integration and provide only the information necessary to identify the relevant records. Do not send passwords or access tokens.</p>
        <p>We may request proportionate information to verify the request. We will delete relevant information that we control unless retention is necessary for a legal obligation or another applicable legal exception, and respond within the period required by applicable law.</p>
        <p>Requests concerning information held independently by Meta must also be directed to Meta. Deleting integration data does not automatically remove public Facebook posts or other people’s comments.</p>
      </section>
      <section aria-labelledby="policy-international"><h2 id="policy-international">9. International processing</h2>
        <p>Meta and any service providers identified above may process information in countries outside your country of residence.</p>
        <p>{fact(policy.internationalProcessing, 'international transfers and applicable safeguards')}</p>
      </section>
      <section aria-labelledby="policy-changes"><h2 id="policy-changes">10. Changes and contact</h2>
        <p>We may update this policy to reflect changes in the integration or our practices. The latest version will be published on this page with an updated date.</p>
        <p>Questions and privacy requests: {contact}</p>
      </section>
    </article></main><Footer page={content.en} privacyPolicyAvailable /></>;
}
