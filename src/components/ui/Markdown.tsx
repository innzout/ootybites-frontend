import { Fragment, type ReactNode } from "react";

// Markdown is a tiny, safe renderer for CMS page bodies. It supports a bounded
// subset — # / ## headings, - bullet lists, **bold** inline, and blank-line
// paragraphs — and never injects raw HTML, so authored content can't XSS.

function renderInline(text: string): ReactNode[] {
  // Split on **bold** spans; even indices are plain, odd indices are bold.
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export function Markdown({ body }: { body: string }) {
  // Split into blocks on blank lines.
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h3 key={i} className="font-display text-lg font-bold text-ink">
              {renderInline(block.slice(3))}
            </h3>
          );
        }
        if (block.startsWith("# ")) {
          return (
            <h2 key={i} className="font-display text-xl font-bold text-ink">
              {renderInline(block.slice(2))}
            </h2>
          );
        }
        // A block where every line is a bullet → unordered list.
        const lines = block.split("\n");
        if (lines.every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 text-muted">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        // Paragraph (single-newlines become line breaks).
        return (
          <p key={i} className="leading-relaxed text-muted">
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
