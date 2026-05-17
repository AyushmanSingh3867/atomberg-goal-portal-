import axios               from "axios";
import jwt                 from "jsonwebtoken";
import { msalClient, AZURE_CONFIG } from "../../config/azure.config";
import prisma              from "../../lib/prisma";

// ─── Step 1: Generate Microsoft Login URL ─────────────────
export const getAzureLoginUrl = async (): Promise<string> => {
  const authCodeUrlParams = {
    scopes:      AZURE_CONFIG.scopes,
    redirectUri: AZURE_CONFIG.redirectUri,
    responseMode:"query" as const,
    prompt:      "select_account",
  };

  return msalClient.getAuthCodeUrl(authCodeUrlParams);
};

// ─── Step 2: Exchange auth code for tokens ────────────────
export const exchangeCodeForTokens = async (code: string) => {
  const tokenRequest = {
    code,
    scopes:      AZURE_CONFIG.scopes,
    redirectUri: AZURE_CONFIG.redirectUri,
  };

  return msalClient.acquireTokenByCode(tokenRequest);
};

// ─── Step 3: Get user profile from Microsoft Graph ────────
export const getMicrosoftProfile = async (accessToken: string) => {
  const { data: profile } = await axios.get(
    "https://graph.microsoft.com/v1.0/me",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  // Also get manager info from Graph
  let manager = null;
  try {
    const { data: mgr } = await axios.get(
      "https://graph.microsoft.com/v1.0/me/manager",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    manager = mgr;
  } catch {
    // No manager found (top-level user)
  }

  // Get group memberships for role mapping
  const { data: groups } = await axios.get(
    "https://graph.microsoft.com/v1.0/me/memberOf",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  return { profile, manager, groups: groups.value ?? [] };
};

// ─── Step 4: Map Azure groups to app role ─────────────────
const mapGroupsToRole = (
  groups: { id: string }[]
): "EMPLOYEE" | "MANAGER" | "ADMIN" => {
  const groupIds = groups.map(g => g.id);
  
  // 1. Get Group IDs from configuration
  const adminGroup = Object.keys(AZURE_CONFIG.groupRoleMap).find(
    key => AZURE_CONFIG.groupRoleMap[key] === "ADMIN"
  );
  const managerGroup = Object.keys(AZURE_CONFIG.groupRoleMap).find(
    key => AZURE_CONFIG.groupRoleMap[key] === "MANAGER"
  );
  const employeeGroup = Object.keys(AZURE_CONFIG.groupRoleMap).find(
    key => AZURE_CONFIG.groupRoleMap[key] === "EMPLOYEE"
  );

  // 2. Prioritize: ADMIN > MANAGER > EMPLOYEE
  if (adminGroup && groupIds.includes(adminGroup)) return "ADMIN";
  if (managerGroup && groupIds.includes(managerGroup)) return "MANAGER";
  if (employeeGroup && groupIds.includes(employeeGroup)) return "EMPLOYEE";

  return "EMPLOYEE"; // Default role
};

// ─── Step 5: Upsert user in DB from Azure profile ─────────
export const upsertAzureUser = async (
  profile: any,
  manager: any,
  groups:  any[]
) => {
  const role       = mapGroupsToRole(groups);
  const azureEmail = profile.mail || profile.userPrincipalName;

  // Find or create manager in DB
  let managerId: string | undefined;
  if (manager) {
    const managerEmail = manager.mail || manager.userPrincipalName;
    const dbManager    = await prisma.user.findUnique({
      where: { email: managerEmail },
    });
    if (dbManager) managerId = dbManager.id;
  }

  // Upsert user (create if not exists, update if exists)
  const user = await prisma.user.upsert({
    where:  { email: azureEmail },
    update: {
      name:       profile.displayName,
      role,
      manager_id: managerId ?? null,
      // Don't update password for SSO users
    },
    create: {
      name:       profile.displayName,
      email:      azureEmail,
      password:   "AZURE_SSO_NO_PASSWORD", // SSO users have no local password
      role,
      manager_id: managerId ?? null,
    },
  });

  return user;
};

// ─── Step 6: Generate app JWT for the user ────────────────
export const generateJWT = (user: {
  id: string; email: string; role: string; name: string;
}) => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "7d" }
  );
};

// ─── Full Sync: Org hierarchy from Azure ─────────────────
export const syncOrgHierarchy = async (providedToken?: string) => {
  let accessToken = providedToken;

  if (!accessToken || accessToken.startsWith("ey")) {
    try {
      const tokenResponse = await msalClient.acquireTokenByClientCredential({
        scopes: ["https://graph.microsoft.com/.default"],
      });
      accessToken = tokenResponse?.accessToken ?? undefined;
    } catch (err: any) {
      console.warn("⚠️ Client Credential flow failed (probably requires admin consent):", err.message);
    }
  }

  if (!accessToken) {
    throw new Error("Access token required for Graph API sync");
  }

  console.log("🔄 Syncing org hierarchy from Azure AD...");

  let azureUsers = [];
  try {
    // Get all users from Azure
    const { data } = await axios.get(
      "https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    azureUsers = data.value ?? [];
  } catch (err: any) {
    console.error("❌ Graph API directory fetch failed:", err.message);
    throw new Error(
      "Microsoft Graph Directory Sync requires Tenant Admin Consent (User.Read.All Application Permission) which is restricted on institutional student domains."
    );
  }

  let synced = 0;

  for (const azureUser of azureUsers) {
    const email = azureUser.mail || azureUser.userPrincipalName;
    if (!email) continue;

    // Get their manager
    let managerEmail: string | null = null;
    try {
      const { data: mgr } = await axios.get(
        `https://graph.microsoft.com/v1.0/users/${azureUser.id}/manager`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      managerEmail = mgr.mail || mgr.userPrincipalName;
    } catch {}

    // Find both in DB and update manager_id
    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser) continue;

    if (managerEmail) {
      const dbManager = await prisma.user.findUnique({
        where: { email: managerEmail },
      });
      if (dbManager && dbUser.manager_id !== dbManager.id) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data:  { manager_id: dbManager.id },
        });
        synced++;
      }
    }
  }

  console.log(`✅ Org hierarchy synced — ${synced} users updated`);
  return { synced };
};
