import type { Metadata } from 'next';
import { connection } from 'next/server';

import DeveloperDocs from '../components/docs/DeveloperDocs';
import { FLUXEL_API_URL } from '../lib/server/config';

/**
 * `/docs` — the developer docs, opened in a new tab from Developers in the
 * console. Public: nothing here needs a session, so it works for anyone
 * the link is shared with.
 */

export const metadata: Metadata = {
  title: 'Developer docs',
  description: 'Build on Fluxel: collect Naira and crypto, pay out to banks, and handle webhooks.',
};

export default async function DocsPage() {
  // Read FLUXEL_API_URL per request rather than freezing it into a build-time
  // prerender, so the code samples follow the deployment's real API host.
  await connection();
  return <DeveloperDocs apiBase={FLUXEL_API_URL} />;
}
