import { X, Copy } from 'lucide-react';

export default function TemplateCard({ template, onClose }) {
  return (
    <div className="bg-white rounded-[8px] border border-indigo-300 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-stone-900 font-serif">{template.name}</h3>
        <button onClick={onClose}><X className="w-4 h-4 text-stone-400 hover:text-stone-600" /></button>
      </div>
      <div className="mb-4 p-3 bg-stone-50 border border-stone-200 rounded-[5px] text-xs font-mono text-stone-500">
        Subject: {template.subject}
      </div>
      <div className="space-y-3">
        {Object.entries(template)
          .filter(([k]) => !['name', 'subject'].includes(k))
          .map(([tone, content]) => (
            <div key={tone} className="border border-stone-200 rounded-[5px] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="gravity-label">{tone}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(content)}
                  className="flex items-center text-xs font-mono font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />Copy
                </button>
              </div>
              <div className="text-sm text-stone-600 whitespace-pre-wrap font-mono">{content}</div>
            </div>
          ))}
      </div>
    </div>
  );
}
