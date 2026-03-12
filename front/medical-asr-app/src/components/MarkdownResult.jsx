import React from "react";

/**
 * A robust minimal markdown renderer for medical reports.
 * Handles headers, bold text, lists, and tables.
 */
export default function MarkdownResult({ text }) {
  if (!text) return null;
  
  // Clean LLM output (strip code blocks and common chatter)
  let cleanText = text.replace(/```markdown|```/g, "").trim();
  cleanText = cleanText.replace(/^(Refined:|SOAP Note:)\s*/i, "");

  const lines = cleanText.split("\n");
  return (
    <div className="text-sm text-slate-700 leading-relaxed font-sans">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        
        // Blank line
        if (!trimmed) return <div key={i} className="h-2" />;

        // Horizontal rule
        if (trimmed === "---" || trimmed === "***") {
          return <hr key={i} className="my-4 border-slate-200" />;
        }

        // Blockquote
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote key={i} className="border-l-4 border-slate-200 pl-4 py-1 my-2 text-slate-500 italic bg-slate-50/50 rounded-r-lg">
              {renderInline(trimmed.slice(2))}
            </blockquote>
          );
        }

        // Headers (more flexible space check)
        const headerMatch = trimmed.match(/^(#{1,6})\s*(.*)/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const content = headerMatch[2];
          const classes = [
            "font-extrabold text-slate-900 mt-8 mb-4 text-xl tracking-tight", // h1
            "font-bold text-slate-900 mt-6 mb-3 text-lg border-b border-slate-100 pb-1", // h2
            "font-bold text-slate-800 mt-5 mb-2 text-base", // h3
            "font-semibold text-slate-800 mt-4 mb-1 text-sm", // h4
          ];
          const Tag = `h${Math.min(level, 4)}`;
          return (
            <Tag key={i} className={classes[Math.min(level - 1, 3)]}>
              {renderInline(content)}
            </Tag>
          );
        }
        
        // Lists
        const bulletMatch = trimmed.match(/^([-*])\s/);
        if (bulletMatch) {
          return (
            <div key={i} className="flex items-start gap-2 ml-1 my-1">
              <span className="text-blue-500 mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" />
              <div className="flex-1">{renderInline(trimmed.slice(bulletMatch[0].length))}</div>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s/);
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-2 ml-1 my-1">
              <span className="text-slate-400 font-mono text-xs mt-0.5 w-4 shrink-0 text-right">{numMatch[1]}.</span>
              <div className="flex-1">{renderInline(trimmed.slice(numMatch[0].length))}</div>
            </div>
          );
        }

        // Table row (basic detection)
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
          return (
            <div key={i} className="font-mono text-[10px] bg-slate-50 px-3 py-1 border-x border-slate-100 last:border-b first:border-t first:rounded-t-md last:rounded-b-md overflow-x-auto whitespace-nowrap">
              {trimmed}
            </div>
          );
        }

        // Default paragraph
        return (
          <p key={i} className="mb-2">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text) {
  if (!text) return "";
  
  // Handle bold (**text**)
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return (
    <>
      {parts.map((p, j) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={j} className="font-bold text-slate-900">
              {p.slice(2, -2)}
            </strong>
          );
        }
        return p;
      })}
    </>
  );
}
