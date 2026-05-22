const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const pdfParse = require("pdf-parse");
const { requestHandler } = require("./httpConfig");

const region = process.env.AWS_REGION || 'eu-west-2';

// P1: all three clients share the same keep-alive connection pool
const bedrockClient = new BedrockRuntimeClient({ region, requestHandler });
const ddbClient = new DynamoDBClient({ region, requestHandler });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region, requestHandler });

const BUCKET_NAME = process.env.DOCUMENT_BUCKET;
const TABLE_NAME = process.env.TABLE_NAME;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'txt']);
const MAX_CARD_COUNT = 100;
const MIN_CARD_COUNT = 3;

// P2: module-level — not recreated on every request
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

// P3: cache TextDecoder — constructing it on every Bedrock response is wasteful
const textDecoder = new TextDecoder();

// ── Helpers ────────────────────────────────────────────────────────────────

function corsHeaders(requestOrigin) {
    const origin = (requestOrigin === ALLOWED_ORIGIN || DEV_ORIGINS.includes(requestOrigin))
        ? requestOrigin
        : ALLOWED_ORIGIN;
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
    };
}

/** Extract the verified email claim from the Cognito JWT (via API GW authorizer). */
function getCallerEmail(event) {
    return event.requestContext?.authorizer?.claims?.email || null;
}

function buildPrompt(ageGroup, numCards, text) {
    if (ageGroup === "6-10") {
        return `You are a specialized AI assistant for children with dyslexia. Read the following text and create exactly ${numCards} simple, easy-to-read flashcards. Each flashcard should have a 'front' (a simple word or concept) and a 'back' (a short, clear definition using easy words). Format the output strictly as a JSON array of objects with 'front' and 'back' properties. Do not include any other text.\n\nText: ${text}`;
    }
    return `You are a specialized AI assistant for students with dyslexia. Read the following text and create exactly ${numCards} educational flashcards. Each flashcard should have a 'front' (a key concept or term) and a 'back' (a clear, concise definition or explanation). Format the output strictly as a JSON array of objects with 'front' and 'back' properties. Do not include any other text.\n\nText: ${text}`;
}

const streamToBuffer = (stream) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
});

// ── Handler ────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
    const requestOrigin = event.headers?.Origin || event.headers?.origin || '';
    const headers = corsHeaders(requestOrigin);

    try {
        // CVE-1: extract userId from verified JWT claims — never trust client-supplied userId
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

        const { objectKey, ageGroup, rawText, cardCount, fileName } = body;

        // CVE-2: validate objectKey belongs to the authenticated user (prevent path traversal)
        if (objectKey) {
            const safeUserId = callerEmail.replace(/[^a-zA-Z0-9@._-]/g, '_');
            const expectedPrefix = `uploads/${safeUserId}/`;
            if (objectKey.includes('..') || !objectKey.startsWith(expectedPrefix)) {
                return { statusCode: 403, headers, body: JSON.stringify({ message: "Access denied" }) };
            }
            // CVE-3: whitelist allowed extensions
            const ext = objectKey.split('.').pop().toLowerCase();
            if (!ALLOWED_EXTENSIONS.has(ext)) {
                return { statusCode: 400, headers, body: JSON.stringify({ message: "Unsupported file type" }) };
            }
        }

        // CVE-7: enforce card count range server-side (UI max is 100)
        const numCards = Math.min(Math.max(parseInt(cardCount) || 5, MIN_CARD_COUNT), MAX_CARD_COUNT);

        let textToProcess = rawText || "";

        if (objectKey) {
            const s3Resp = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey }));
            const s3BodyBuffer = await streamToBuffer(s3Resp.Body);
            textToProcess = objectKey.endsWith(".pdf")
                ? (await pdfParse(s3BodyBuffer)).text
                : s3BodyBuffer.toString('utf-8');
        }

        if (!textToProcess) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: "No text found to process" }) };
        }

        textToProcess = textToProcess.substring(0, 50000);

        // CVE-8: scale max_tokens proportionally — ~80 tokens/card + 300 buffer
        const maxTokens = Math.min(numCards * 80 + 300, 4096);

        const input = {
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: maxTokens,
                messages: [{ role: "user", content: buildPrompt(ageGroup, numCards, textToProcess) }]
            })
        };

        const response = await bedrockClient.send(new InvokeModelCommand(input));
        const responseBody = JSON.parse(textDecoder.decode(response.body));

        let flashcards = [];
        try {
            const textResponse = responseBody.content[0].text;
            const jsonStart = textResponse.indexOf('[');
            const jsonEnd = textResponse.lastIndexOf(']') + 1;
            flashcards = JSON.parse(textResponse.slice(jsonStart, jsonEnd));
        } catch (e) {
            console.error("Failed to parse flashcards JSON", e);
            throw new Error("AI response could not be parsed.");
        }

        const deckId = crypto.randomUUID();

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                userId: callerEmail,
                deckId,
                fileName: fileName || 'Document',
                createdAt: new Date().toISOString(),
                flashcards
            }
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: "Flashcards generated successfully", deckId, flashcards })
        };

    } catch (error) {
        // CVE-11: never expose internal error details to clients
        console.error("Generate Error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ message: "Internal server error" }) };
    }
};
