// ******************************************************
// BUILD POSTMAN COLLECTION — from OpenAPI spec (swagger-jsdoc)
// ******************************************************

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const Converter = require('openapi-to-postmanv2');
const { getSwaggerSpec } = require('../src/docs/swagger');

const convertOpenApi = promisify(Converter.convert).bind(Converter);

const outDir = path.join(__dirname, '../postman');
const openapiPath = path.join(outDir, 'openapi.json');
const collectionPath = path.join(outDir, 'api.postman_collection.json');
const environmentPath = path.join(
  outDir,
  'api.local.postman_environment.json',
);
const productionEnvironmentPath = path.join(
  outDir,
  'api.production.postman_environment.json',
);

const productionBaseUrl =
  process.env.API_PUBLIC_URL || 'https://feed-app-server.onrender.com';

async function buildPostmanAssets() {
  const port = process.env.PORT || 3000;

  fs.mkdirSync(outDir, { recursive: true });

  // 1. Export OpenAPI JSON (same content as GET /api-docs.json)
  fs.writeFileSync(openapiPath, JSON.stringify(getSwaggerSpec(), null, 2));

  // 2. Convert OpenAPI → Postman Collection v2.1
  const result = await convertOpenApi(
    { type: 'json', data: getSwaggerSpec() },
    {},
  );

  if (!result.result) {
    throw new Error(`Postman conversion failed: ${result.reason}`);
  }

  fs.writeFileSync(
    collectionPath,
    JSON.stringify(result.output[0].data, null, 2),
  );

  // 3. Postman environments (local + production)
  const tokenVariable = {
    key: 'token',
    value: '',
    type: 'secret',
    enabled: true,
  };

  const localEnvironment = {
    name: 'API Local',
    values: [
      {
        key: 'baseUrl',
        value: `http://localhost:${port}`,
        type: 'default',
        enabled: true,
      },
      tokenVariable,
    ],
    _postman_variable_scope: 'environment',
  };

  const productionEnvironment = {
    name: 'API Production (Render)',
    values: [
      {
        key: 'baseUrl',
        value: productionBaseUrl,
        type: 'default',
        enabled: true,
      },
      tokenVariable,
    ],
    _postman_variable_scope: 'environment',
  };

  fs.writeFileSync(environmentPath, JSON.stringify(localEnvironment, null, 2));
  fs.writeFileSync(
    productionEnvironmentPath,
    JSON.stringify(productionEnvironment, null, 2),
  );

  console.log('Postman assets generated:');
  console.log(`  ${openapiPath}`);
  console.log(`  ${collectionPath}`);
  console.log(`  ${environmentPath}`);
  console.log(`  ${productionEnvironmentPath}`);
}

buildPostmanAssets().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
