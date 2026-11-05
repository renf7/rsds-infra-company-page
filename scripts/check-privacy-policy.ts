import { readPrivacyPolicy, requireApprovedPolicy } from './privacy-policy';
requireApprovedPolicy(readPrivacyPolicy());
process.stdout.write('Privacy-policy publication fields are complete. Reconfirm their accuracy and the actual publication date before release.\n');
