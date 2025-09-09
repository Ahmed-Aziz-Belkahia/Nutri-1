import React, { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { NUTRITION_SOURCES, CALCULATION_METHODS } from '@/lib/nutrition';
import { Card } from '@/components/ui/card';

export const SourcesDisclaimer: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4 rounded-2xl bg-white/60 backdrop-blur border border-gray-200/60">
      <button className="flex items-center justify-between w-full" onClick={() => setOpen(o=>!o)}>
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700"><BookOpen className="w-4 h-4"/> Sources & Methods</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-xs text-gray-600">
          <div className="space-y-1">
            <div className="font-semibold text-gray-700">Primary References</div>
            <ul className="list-disc pl-4 space-y-1">
              {NUTRITION_SOURCES.map(s => (
                <li key={s.url} className="leading-snug">
                  <span className="font-medium">{s.organization}:</span> {s.title}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-gray-700">Formulas</div>
            <ul className="list-disc pl-4 space-y-1">
              {CALCULATION_METHODS.map(m => (
                <li key={m.method} className="leading-snug">
                  <span className="font-medium">{m.method}:</span> {m.formula.split('\n')[0]}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[10px] leading-snug text-gray-500">Educational use only. Not a medical diagnosis. Consult a healthcare professional for personalized advice.</p>
        </div>
      )}
    </Card>
  );
};
