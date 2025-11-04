const fs = require('fs');

let content = fs.readFileSync('client/src/pages/Progress.tsx', 'utf8');

console.log('Original file length:', content.length);

// Simple replacements first
content = content.replace('import PullToRefresh from '@/components/PullToRefresh';', '');
content = content.replace('import Navbar from '@/components/Navbar';', '');

// Replace the opening
content = content.replace(
  '  return (\n    <PullToRefresh onRefresh={handleRefresh}>',
  '  return (\n    <BaseLayout onRefresh={handleRefresh}>'
);

// Replace the wrapper div
content = content.replace(
  '      <div className="min-h-screen relative overflow-hidden pb-32">',
  '      <div className="space-y-6">'
);

// Remove background blobs
content = content.replace(
  '        {/* Subtle emerald blobs background */}\n        <div className="pointer-events-none absolute inset-0 -z-10">\n          <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />\n          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-emerald-600/20 blur-3xl" />\n        </div>\n',
  ''
);

// Replace closing
content = content.replace('      <Navbar />\n      </div>\n    </PullToRefresh>', '      </div>\n    </BaseLayout>');

console.log('Modified file length:', content.length);

fs.writeFileSync('client/src/pages/Progress.tsx', content);
console.log('Done!');
