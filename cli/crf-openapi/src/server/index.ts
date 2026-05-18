/**
 * OpenAPI Documentation Server
 *
 * Serves the generated REDCap OpenAPI specification with Swagger UI and Redoc.
 */

import { readFileSync, existsSync } from 'node:fs';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { parse } from 'yaml';

export interface ServerOptions {
  /** Path to the OpenAPI spec file */
  specPath: string;
  /** Port to listen on */
  port?: number;
  /** Callback when server starts */
  onStart?: (urls: ServerUrls) => void;
}

export interface ServerUrls {
  home: string;
  swagger: string;
  redoc: string;
  yaml: string;
  json: string;
}

function generateSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>REDCap API - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { font-size: 2em; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset
      ],
      layout: 'StandaloneLayout',
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: false
    });
  </script>
</body>
</html>`;
}

function generateRedocHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>REDCap API - Redoc</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
  </style>
</head>
<body>
  <redoc spec-url='/openapi.json'
         hide-download-button="false"
         theme='{
           "colors": { "primary": { "main": "#c83232" } },
           "typography": { "fontFamily": "Inter, sans-serif" },
           "sidebar": { "width": "300px" }
         }'>
  </redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>`;
}

function generateIndexHtml(spec: Record<string, unknown>): string {
  const info = spec.info as Record<string, unknown> | undefined;
  const paths = spec.paths as Record<string, unknown> | undefined;
  const tags = spec.tags as unknown[] | undefined;
  const components = spec.components as Record<string, unknown> | undefined;
  const schemas = components?.schemas as Record<string, unknown> | undefined;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>REDCap API Documentation</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 48px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-width: 600px;
      width: 90%;
    }
    h1 { color: #1a202c; font-size: 2.5rem; margin-bottom: 8px; }
    .version { color: #718096; font-size: 1rem; margin-bottom: 32px; }
    .description { color: #4a5568; line-height: 1.6; margin-bottom: 32px; }
    .links { display: grid; gap: 16px; }
    a {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 500;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    a:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.2);
    }
    .swagger { background: linear-gradient(135deg, #85ea2d 0%, #38b000 100%); color: white; }
    .redoc { background: linear-gradient(135deg, #c83232 0%, #8b0000 100%); color: white; }
    .yaml, .json { background: #f7fafc; color: #2d3748; border: 2px solid #e2e8f0; }
    .icon { width: 24px; height: 24px; margin-right: 12px; }
    .stats {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      text-align: center;
    }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: #667eea; }
    .stat-label { font-size: 0.875rem; color: #718096; }
  </style>
</head>
<body>
  <div class="container">
    <h1>REDCap API</h1>
    <p class="version">Version ${(info?.version as string) ?? '14.5.10'}</p>
    <p class="description">
      ${((info?.description as string) ?? 'OpenAPI specification for REDCap API').split('\n')[0]}
    </p>

    <div class="links">
      <a href="/swagger" class="swagger">
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
        Swagger UI
      </a>
      <a href="/redoc" class="redoc">
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
        Redoc
      </a>
      <a href="/openapi.yaml" class="yaml">
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
        </svg>
        OpenAPI YAML
      </a>
      <a href="/openapi.json" class="json">
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
        </svg>
        OpenAPI JSON
      </a>
    </div>

    <div class="stats">
      <div>
        <div class="stat-value">${Object.keys(paths ?? {}).length}</div>
        <div class="stat-label">Endpoints</div>
      </div>
      <div>
        <div class="stat-value">${(tags ?? []).length}</div>
        <div class="stat-label">Tags</div>
      </div>
      <div>
        <div class="stat-value">${Object.keys(schemas ?? {}).length}</div>
        <div class="stat-label">Schemas</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Create and start the documentation server
 */
export function serve(options: ServerOptions): Server {
  const { specPath, port = 3000, onStart } = options;

  if (!existsSync(specPath)) {
    throw new Error(`OpenAPI spec not found: ${specPath}`);
  }

  const yamlContent = readFileSync(specPath, 'utf8');
  const spec = parse(yamlContent) as Record<string, unknown>;
  const jsonContent = JSON.stringify(spec, null, 2);

  const swaggerHtml = generateSwaggerHtml();
  const redocHtml = generateRedocHtml();
  const indexHtml = generateIndexHtml(spec);

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? '/';

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    switch (url) {
      case '/':
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(indexHtml);
        break;

      case '/swagger':
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(swaggerHtml);
        break;

      case '/redoc':
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(redocHtml);
        break;

      case '/openapi.yaml':
        res.writeHead(200, {
          'Content-Type': 'text/yaml; charset=utf-8',
          'Content-Disposition': 'inline; filename="redcap-api.yaml"',
        });
        res.end(yamlContent);
        break;

      case '/openapi.json':
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'inline; filename="redcap-api.json"',
        });
        res.end(jsonContent);
        break;

      default:
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
  });

  server.listen(port, () => {
    const urls: ServerUrls = {
      home: `http://localhost:${port}/`,
      swagger: `http://localhost:${port}/swagger`,
      redoc: `http://localhost:${port}/redoc`,
      yaml: `http://localhost:${port}/openapi.yaml`,
      json: `http://localhost:${port}/openapi.json`,
    };
    onStart?.(urls);
  });

  return server;
}
