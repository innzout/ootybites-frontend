"use client";

// Last-resort boundary. Catches failures in the root layout itself (font
// loading, providers), where no other error.tsx can run — so it must render its
// own <html>/<body>. Deliberately dependency-free and inline-styled: if the
// stylesheet or a shared component is what broke, this page must still render.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          color: "#14301f",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#5b6b60", margin: "0 0 20px", lineHeight: 1.6 }}>
            Ootybites hit an unexpected error. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "11px 22px",
              background: "#22ab5f",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {/* The digest is the only handle support has on a production error —
              the message itself is redacted by Next on the server. */}
          {error.digest && (
            <p style={{ fontSize: 11, color: "#9aa8a0", marginTop: 20 }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
