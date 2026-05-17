import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";

export const AZURE_CONFIG = {
  clientId:     process.env.AZURE_CLIENT_ID!,
  tenantId:     process.env.AZURE_TENANT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
  redirectUri:  process.env.AZURE_REDIRECT_URI
                || "http://localhost:5000/api/auth/azure/callback",
  scopes: ["openid", "profile", "email", "User.Read", "User.ReadBasic.All"],

  // Azure AD Group IDs → map to your app roles
  groupRoleMap: {
    [process.env.AZURE_GROUP_EMPLOYEES || ""]: "EMPLOYEE",
    [process.env.AZURE_GROUP_MANAGERS  || ""]: "MANAGER",
    [process.env.AZURE_GROUP_ADMINS    || ""]: "ADMIN",
  } as Record<string, string>,
};

const msalConfig: Configuration = {
  auth: {
    clientId:     AZURE_CONFIG.clientId,
    authority:    `https://login.microsoftonline.com/${AZURE_CONFIG.tenantId}`,
    clientSecret: AZURE_CONFIG.clientSecret,
  },
  system: {
    loggerOptions: {
      logLevel: 3,
      piiLoggingEnabled: false,
    },
  },
};

export const msalClient = new ConfidentialClientApplication(msalConfig);
