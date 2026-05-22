const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { requestHandler } = require("./httpConfig");

// Module-level constants — evaluated once on cold start, reused across invocations.
const client = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'eu-west-2',
    requestHandler,   // P1: reuse TCP connections via keep-alive
});
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// P2: module-level constant — not recreated on every request
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

function corsHeaders(requestOrigin) {
    const origin = (requestOrigin === ALLOWED_ORIGIN || DEV_ORIGINS.includes(requestOrigin))
        ? requestOrigin : ALLOWED_ORIGIN;
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
    };
}

exports.handler = async (event) => {
    const requestOrigin = event.headers?.Origin || event.headers?.origin || '';
    const headers = corsHeaders(requestOrigin);

    // P5: return 400 for missing/malformed body rather than letting JSON.parse throw
    if (!event.body) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Request body is required" }) };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Invalid JSON in request body" }) };
    }

    try {
        const path = event.path || event.requestContext?.http?.path;

        if (path.includes("/signup")) {
            const command = new SignUpCommand({
                ClientId: CLIENT_ID,
                Username: body.email,
                Password: body.password,
                UserAttributes: [{ Name: "email", Value: body.email }]
            });
            await client.send(command);
            return { statusCode: 200, headers, body: JSON.stringify({ message: "Sign up successful. Please check your email to confirm your account." }) };
        }

        if (path.includes("/confirm")) {
            const command = new ConfirmSignUpCommand({
                ClientId: CLIENT_ID,
                Username: body.email,
                ConfirmationCode: body.code
            });
            await client.send(command);
            return { statusCode: 200, headers, body: JSON.stringify({ message: "Confirmation successful." }) };
        }

        if (path.includes("/login")) {
            const command = new InitiateAuthCommand({
                AuthFlow: "USER_PASSWORD_AUTH",
                ClientId: CLIENT_ID,
                AuthParameters: {
                    USERNAME: body.email,
                    PASSWORD: body.password
                }
            });
            const response = await client.send(command);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    accessToken: response.AuthenticationResult.AccessToken,
                    idToken: response.AuthenticationResult.IdToken,
                    refreshToken: response.AuthenticationResult.RefreshToken
                })
            };
        }

        return { statusCode: 404, headers, body: JSON.stringify({ message: "Not found" }) };

    } catch (error) {
        console.error("Auth Error:", error);
        // CVE-11: map Cognito error codes to generic messages to prevent username enumeration
        const code = error.name || error.__type || '';
        let message = "Authentication failed. Please check your details and try again.";
        if (code === 'CodeMismatchException' || code === 'ExpiredCodeException') {
            message = "Invalid or expired confirmation code.";
        } else if (code === 'InvalidPasswordException' || code === 'InvalidParameterException') {
            message = "Password does not meet requirements.";
        } else if (code === 'LimitExceededException' || code === 'TooManyRequestsException') {
            message = "Too many attempts. Please wait and try again.";
        }
        return { statusCode: 400, headers, body: JSON.stringify({ message }) };
    }
};
