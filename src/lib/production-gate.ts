export function productionConfigHtml(title: string, detail: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #f6f4f0; color: #111; margin: 0; padding: 48px 20px; }
      main { max-width: 44rem; margin: 0 auto; background: #fff; border: 1px solid #ddd; border-radius: 12px; padding: 28px; }
      h1 { font-size: 1.5rem; margin: 0 0 12px; }
      p, li { line-height: 1.55; color: #444; }
      code { background: #f6f4f0; padding: 2px 6px; border-radius: 4px; }
      ol { padding-left: 1.25rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${detail}</p>
      <ol>
        <li>Open <strong>Site configuration → Environment variables</strong> in Netlify for this site.</li>
        <li>Add <code>APP_ACCESS_PASSWORD</code>, <code>SESSION_SECRET</code>, <code>SQUARE_ACCESS_TOKEN</code>, and <code>SQUARE_ENVIRONMENT=production</code>.</li>
        <li>Set <code>DATABASE_URL</code> to <code>file:/tmp/life-etc.db</code> for the hosted build.</li>
        <li>Save, then run <strong>Deploys → Clear cache and deploy site</strong>.</li>
      </ol>
      <p>From this Mac you can also link the site and run <code>npm run netlify:env</code> after <code>netlify link</code>.</p>
    </main>
  </body>
</html>`;
}
