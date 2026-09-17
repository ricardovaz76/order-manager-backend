import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

interface BackendSecrets {
  SUPABASE_SERVICE_ROLE_KEY: string;
  DB_WEBHOOK_SECRET: string;
}

const client = new SecretsManagerClient({});

let cachedSecrets: BackendSecrets | null = null;

export async function getSecrets(): Promise<BackendSecrets> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: process.env.BACKEND_SECRETS_ARN }),
  );

  if (!response.SecretString) {
    throw new Error("Secret value is missing SecretString");
  }

  cachedSecrets = JSON.parse(response.SecretString) as BackendSecrets;
  return cachedSecrets;
}