const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { requestHandler } = require("./httpConfig");

// P1: reuse TCP connections; P2: module-level constants
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-2', requestHandler });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = process.env.TABLE_NAME;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// P2: module-level — not recreated on every request
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

// P4: cap total items per user to prevent runaway memory consumption
const MAX_ITEMS = 500;

function corsHeaders(requestOrigin) {
    const origin = (requestOrigin === ALLOWED_ORIGIN || DEV_ORIGINS.includes(requestOrigin))
        ? requestOrigin : ALLOWED_ORIGIN;
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,GET"
    };
}

/** CVE-1: extract verified email from Cognito JWT claims. */
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

        // P4: paginate through all DynamoDB pages (1 MB limit per page) up to MAX_ITEMS
        // P8: collect all items then sort newest-first by createdAt
        let allItems = [];
        let lastKey;

        do {
            const params = {
                TableName: TABLE_NAME,
                KeyConditionExpression: "userId = :uid",
                ExpressionAttributeValues: { ":uid": callerEmail },
                ...(lastKey && { ExclusiveStartKey: lastKey }),
            };
            const response = await docClient.send(new QueryCommand(params));
            allItems = allItems.concat(response.Items || []);
            lastKey = response.LastEvaluatedKey;
        } while (lastKey && allItems.length < MAX_ITEMS);

        // P8: sort by createdAt descending so newest decks appear first
        allItems.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt.localeCompare(a.createdAt);
        });

        return { statusCode: 200, headers, body: JSON.stringify({ decks: allItems }) };

    } catch (error) {
        // CVE-11: never expose internal details
        console.error("Get Flashcards Error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ message: "Internal server error" }) };
    }
};
