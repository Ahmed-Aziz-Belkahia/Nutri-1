const fs = require('fs');

let content = fs.readFileSync('client/src/pages/Progress.tsx', 'utf8');

// 1. Remove PullToRefresh import
content = content.replace(
  /import PullToRefresh from '@\/components\/PullToRefresh';\n/,
  ''
);

// 2. Replace the return statement wrapper
const oldReturn = `  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen relative overflow-hidden pb-32">
        {/* Subtle emerald blobs background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-emerald-600/20 blur-3xl" />
        </div>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 w-full bg-white/20 backdrop-blur-xl z-10 border-b border-white/30 shadow-sm"
      >
        <div className="w-full max-w-[500px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-start sm:items-center justify-between gap-4">`;

const newReturn = `  return (
    <BaseLayout onRefresh={handleRefresh}>
      <div className="space-y-6">`;

content = content.replace(oldReturn, newReturn);

// 3. Remove the header closing and its content - find and remove from opening header to </motion.header>
const headerPattern = /      <motion\.header[\s\S]*?<\/motion\.header>\n\n      {\/\* Main Content - Carousel \*\/}\n  /;
content = content.replace(headerPattern, '        ');

// 4. Replace closing tags
content = content.replace(
  /      <Navbar \/>\n      <\/div>\n    <\/PullToRefresh>/,
  '      </div>\n    </BaseLayout>'
);

// 5. Remove unused variables
content = content.replace(
  /  const \[isDropdownOpen, setIsDropdownOpen\] = useState\(false\);\n/,
  ''
);

content = content.replace(
  /  const dropdownRef = useRef<HTMLDivElement>\(null\);\n/,
  ''
);

// 6. Remove dropdown useEffect
content = content.replace(
  /  useEffect\(\(\) => \{\n    function handleClickOutside\(event: MouseEvent\) \{[\s\S]*?  \}, \[\]\);\n\n\n\n/,
  ''
);

// 7. Remove userInitial
content = content.replace(
  /  const userInitial = user\?\.email \? user\.email\[0\]\.toUpperCase\(\) : "U";\n\n/,
  ''
);

fs.writeFileSync('client/src/pages/Progress.tsx', content);
console.log('Progress.tsx refactored successfully!');
