import fs from 'node:fs';
import path from 'node:path';
import Header from '@/app/layouts/Header';
import Footer from '@/app/layouts/Footer';
import StartupAdvisoryContent from './StartupAdvisoryContent';

export const metadata = {
  title: 'Startup Advisory | NeoZaar',
  description: 'Free expert sessions for technology startups preparing for enterprise opportunities.',
};

function loadAdvisoryPage() {
  const sourcePath = path.join(process.cwd(), 'public', 'Startup Advisory', 'index.html');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const styles = source.match(/<style>([\s\S]*?)<\/style>/i)?.[1] || '';
  let markup = source.match(/<body>([\s\S]*?)<\/body>/i)?.[1] || '';

  // Neozaar supplies the outer page chrome. Keep only the advisory content and CTA.
  markup = markup
    .replace(/<header\b[\s\S]*?<\/header>/i, '')
    .replace(/<footer\b[\s\S]*?<\/footer>/i, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '');

  return { markup, styles };
}

export default function StartupAdvisoryPage() {
  const { markup, styles } = loadAdvisoryPage();

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <StartupAdvisoryContent markup={markup} styles={styles} />
      <Footer />
    </div>
  );
}
