import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing React root');
const app = <App language={document.documentElement.lang === 'pl' ? 'pl' : 'en'} />;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
