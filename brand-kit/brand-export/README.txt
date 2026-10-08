OOTYBITES — BRAND ASSETS
========================
Everything here is GENERATED. Do not hand-edit: run
    node frontend/scripts/build-brand.mjs
which rebuilds every file from logo/source/.

TAGLINE
-------
The correct tagline is "FROM OOTY TO HOME".
The supplied black artwork (logo/source/bw-horizontal-chennai.png) reads
"FROM CHENNAI TO HOME" and is WRONG. The build drops that line and splices in
the correct one lifted from the colour artwork, so the real brand typography and
letter-spacing are preserved rather than faked with a lookalike font.
Do not use the raw source file anywhere.

WEB (frontend/public/brand/ — wired into the app)
-------------------------------------------------
wordmark.png / @2x        colour leaf + "Ootybites" + wave. THE UI LOCKUP.
wordmark-white.png        white knockout, for the deep-green navbar and footer.
wordmark-black.png/.svg   single-colour wordmark.
logo.png / @2x / @3x      full colour lockup INCLUDING the tagline.
logo-black.png/.svg       full lockup, black, correct tagline.
logo-white.png/.svg       full lockup, white knockout.
badge.png / badge.svg     circular packaging badge (black).
badge-white.svg           circular badge, white knockout.
icon-32/48.png            favicon tiles: white sprout on deep green (#12402a).
icon-180/192/512.png      app icons from the badge.
apple-touch-icon.png      opaque 180px tile (iOS ignores transparency).

PRINT / PACKAGING (this folder)
-------------------------------
ootybites-logo-colour.png      2400px wide, full colour lockup
ootybites-logo-black.png       2400px wide
ootybites-logo-white.png       2400px wide (place on dark only)
ootybites-badge-black-3000.png 3000px circular badge — use this on packaging
ootybites-logo-black.svg       vector
ootybites-badge.svg            vector
ootybites-wordmark-black.svg   vector

WHICH ONE DO I USE?
-------------------
Website header/footer ... wordmark (the full lockup's tagline is illegible
                          under ~80px tall).
Packaging / stickers .... the circular badge.
Anything printed ........ the SVGs, or the 2400px+ PNGs.
Dark background ......... the -white variants.

VECTOR STATUS — READ THIS
-------------------------
The .svg files are REAL traced outlines (potrace), not a PNG wrapped in <svg>,
so they scale cleanly to any size. They are single-colour only.
There is NO true colour vector: the colour artwork was supplied as raster.
For large colour print, ask the designer for the original AI/EPS/PDF.

KNOWN SOURCE DEFECT
-------------------
The colour circular badge in logo/source/colour-pair.png is CLIPPED at the right
edge of that image, so no colour badge is produced here — only the black one,
whose source is complete. Supply a clean colour badge export to add it.
