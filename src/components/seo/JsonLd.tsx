// Renders one or more schema.org JSON-LD objects into a <script> tag. Server-safe
// (no client JS) — drop it into any server component alongside the page content.

/**
 * Serialises data for embedding inside a <script> element.
 *
 * JSON.stringify alone is NOT safe here: it leaves "<" untouched, and the HTML
 * parser ends a script element at the first "</script" it sees, regardless of
 * JSON quoting. Product names and descriptions are admin-entered and flow into
 * this JSON-LD, so a description containing
 * "</script><script>…</script>" would have run as script on every visitor's
 * product page - a stored XSS reachable by any admin, including the
 * lower-privileged manager role.
 *
 * Escaping <, > and & as \u-sequences keeps the JSON identical to a parser
 * while giving the HTML parser nothing to act on. U+2028/2029 are escaped too:
 * valid in JSON, but historically line terminators in JavaScript.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }}
        />
      ))}
    </>
  );
}
