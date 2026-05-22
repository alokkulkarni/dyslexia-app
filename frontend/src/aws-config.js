// This file should be updated with the outputs from the AWS SAM deployment
const awsConfig = {
    Auth: {
        Cognito: {
            userPoolId: import.meta.env.VITE_USER_POOL_ID || 'us-east-1_xxxxxxxxx',
            userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || 'xxxxxxxxxxxxxxxxx'
        }
    },
    API: {
        REST: {
            DyslexiaAPI: {
                endpoint: import.meta.env.VITE_API_ENDPOINT || 'https://xxxxxx.execute-api.us-east-1.amazonaws.com/Prod',
                region: import.meta.env.VITE_AWS_REGION || 'us-east-1'
            }
        }
    }
};

export default awsConfig;
