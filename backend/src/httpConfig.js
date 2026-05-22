/**
 * Shared HTTPS agent for AWS SDK v3 clients.
 *
 * AWS Lambda containers are reused across invocations (warm starts).
 * By default Node.js HTTPS does NOT reuse TCP connections (keepAlive:false),
 * which means every AWS SDK call pays a new TLS handshake cost (~30-100 ms).
 *
 * This module creates ONE agent and ONE NodeHttpHandler per container.
 * Every SDK client in the function that imports this will share the same
 * connection pool, dramatically reducing per-call latency on warm invocations.
 *
 * Reference: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-reusing-connections.html
 */
const https = require('https');
const { NodeHttpHandler } = require('@smithy/node-http-handler');

const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 60_000,   // send a keep-alive probe every 60 s
    maxSockets: 50,            // per-host socket pool
    maxFreeSockets: 10,        // idle sockets to hold open
});

exports.requestHandler = new NodeHttpHandler({ httpsAgent });
