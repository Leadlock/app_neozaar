"use client";
import { cleanHTML, containsHTML } from "./productUtils";

export function HTMLContent({ html, className = "" }) {
  if (!html) return null;
  return (
    <div
      className={`html-content ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHTML(html) }}
    />
  );
}

export function FormattedContent({ data, emptyMessage = "No content available." }) {
  if (!data) return <p className="text-gray-400 italic text-sm">{emptyMessage}</p>;

  // Normalize non-string data to string
  const str = typeof data === "string" ? data : JSON.stringify(data);

  if (containsHTML(str)) return <HTMLContent html={str} className="prose-content" />;

  const hasListMarkers = /^[-*•]\s|\d+\.\s/m.test(str);
  if (hasListMarkers) {
    const items = [];
    for (const line of str.split("\n").filter((l) => l.trim())) {
      const t = line.trim();
      const bullet = t.match(/^[-*•]\s+(.*)$/);
      const num = t.match(/^\d+\.\s+(.*)$/);
      if (bullet || num) {
        items.push({ type: "list", content: bullet ? bullet[1] : num[1] });
      } else if (items.length > 0 && items[items.length - 1].type === "list") {
        items[items.length - 1].content += " " + t;
      } else if (t) {
        items.push({ type: "paragraph", content: t });
      }
    }
    return (
      <div className="space-y-2">
        {items.map((item, idx) =>
          item.type === "list" ? (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5 flex-shrink-0 text-sm">•</span>
              <span className="text-gray-600 text-sm leading-relaxed">{item.content}</span>
            </div>
          ) : (
            <p key={idx} className="text-gray-600 text-sm leading-relaxed">{item.content}</p>
          )
        )}
      </div>
    );
  }

  return (
    <>
      {str
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((block, i) => {
          const lines = block.split("\n").filter((l) => l.trim());
          if (!lines.length) return null;
          const [first, ...rest] = lines;
          if (rest.length > 0) {
            return (
              <div key={i} className="mb-3">
                <p className="font-semibold text-gray-800 text-sm">{first}</p>
                {rest.map((l, j) => (
                  <p key={j} className="text-gray-600 text-sm leading-relaxed">{l}</p>
                ))}
              </div>
            );
          }
          return <p key={i} className="text-gray-600 text-sm leading-relaxed mb-2">{first}</p>;
        })}
    </>
  );
}
