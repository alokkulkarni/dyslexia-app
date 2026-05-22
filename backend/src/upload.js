const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const { requestHandler } = require("./httpConfig");

// P1: reuse TCP connections; P2: module-level constants
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-west-2', requestHandler });
const BUCKET_NAME = process.env.DOCUMENT_BUCKET;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// CVE-3: only allow safe document types
const ALLOWED_EXTENSIONS = new Set(['pdf', 'txt']);
const CONTENT_TYPES = { pdf: 'application/pdf', txt: 'text/plain' };

// P2: module-level — not recreated on every request
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

function corsHeaders(requestOrigin) {
    const origin = (requestOrigin === ALLOWED_ORIGIN || DEV_ORIGINS.includes(requestOrigin))
        ? requestOrigin : ALLOWED_ORIGIN;
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
    };
}

/** CVE-1: extract verified email from Cognito JWT claims (set by API GW authorizer). */
function getCallerEmail(event) {
    return event.requestContext?.authorizer?.claims?.email || null;
}

exports.handler = async (event) => {
    const requestOrigin = event.headers?.Origin || event.headers?.origin || '';
    const headers = corsHeaders(requestOrigin);

    try {
        const callerEmail = getCallerEmail(event);
        if (!callerEmail) {
            return { statusCode: 401, headers, body: JSON.stringify({ message: "Unauthorized" }) };
        }

        // P5: explicit null check before JSON.parse to return 400 not 500
        if (!event.body) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: "Request body is required" }) };
        }
        let body;
        try {
            body = JSON.parse(event.body);
        } catch {
            return { statusCode: 400, headers, body: JSON.stringify({ message: "Invalid JSON in request body" }) };
        }

        const { fileContent, fileName } = body;

        if (!fileContent) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: "Missing fileContent" }) };
        }

        // CVE-3: whitelist file extensions
        const ext = fileName ? fileName.split('.').pop().toLowerCase() : 'pdf';
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: "Only PDF and TXT files are allowed" }) };
        }

        const buffer = Buffer.from(fileContent, 'base64');
        if (buffer.length > 10 * 1024 * 1024) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: "File exceeds 10 MB limit" }) };
        }

        // Store under authenticated user's prefix — no cross-user access possible
        const safeUserId = callerEmail.replace(/[^a-zA-Z0-9@._-]/g, '_');
        const objectKey = `uploads/${safeUserId}/${crypto.randomUUID()}.${ext}`;

        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
            Body: buffer,
            ContentType: CONTENT_TYPES[ext]
        }));

        return { statusCode: 200, headers, body: JSON.stringify({ message: "Upload successful", objectKey }) };

    } catch (error) {
        // CVE-11: never expose internal details
        console.error("Upload Error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ message: "Internal server error" }) };
    }
};
