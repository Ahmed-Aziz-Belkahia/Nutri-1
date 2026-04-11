const fs = require('fs');
let c = fs.readFileSync('client/src/pages/Progress.tsx', 'utf8');
c = c.replace('import PullToRefresh from', '// REMOVED import PullToRefresh from');
c = c.replace('import { usePullToRefresh }', '// REMOVED import { usePullToRefresh }');
c = c.replace('<PullToRefresh onRefresh={handleRefresh}>', '<BaseLayout onRefresh={handleRefresh}>');
c = c.replace('</PullToRefresh>', '</BaseLayout>');
c = c.replace('<Navbar />', '');
fs.writeFileSync('client/src/pages/Progress.tsx', c);
console.log('Done!');
