import { X, Copy } from 'lucide-react';

export default function TemplateCard({ template, onClose }) {
  return (
    <div className="bg-white rounded-xl border-2 border-teal-500 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">{template.name}</h3>
        <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-gray-700" /></button>
      </div>
      <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm font-mono text-gray-700">
        Subject: {template.subject}
      </div>
      <div className="space-y-3">
        {Object.entries(template)
          .filter(([k]) => !['name', 'subject'].includes(k))
          .map(([tone, content]) => (
            <div key={tone} className="border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">{tone}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(content)}
                  className="flex items-center text-sm font-semibold text-teal-600 hover:text-teal-700"
                >
                  <Copy className="w-4 h-4 mr-1" />Copy
                </button>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{content}</div>
            </div>
          ))}
      </div>
    </div>
  );
}
