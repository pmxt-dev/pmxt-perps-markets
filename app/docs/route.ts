// Self-hosted API reference, generated live from the OpenAPI spec via Scalar.
// Full-screen (its own layout, like every API doc site). Nav links here.
const HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PMXT Perps API — reference</title>
</head>
<body>
  <script id="api-reference" data-url="/api/openapi"></script>
  <script>
    var cfg = { theme: 'purple', hideDownloadButton: false, metaData: { title: 'PMXT Perps API' } };
    document.getElementById('api-reference').dataset.configuration = JSON.stringify(cfg);
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`

export async function GET() {
  return new Response(HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
