import { Request, Response } from "express";
import {
  getAzureLoginUrl,
  exchangeCodeForTokens,
  getMicrosoftProfile,
  upsertAzureUser,
  generateJWT,
  syncOrgHierarchy,
} from "./azure.service";

// ── Redirect to Microsoft Login ───────────────────────────
export const azureLoginHandler = async (_req: Request, res: Response) => {
  try {
    const url = await getAzureLoginUrl();
    res.redirect(url);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate login URL", detail: err.message });
  }
};

// ── Handle callback from Microsoft ───────────────────────
export const azureCallbackHandler = async (req: Request, res: Response) => {
  const { code, error, error_description } = req.query;
  const FRONTEND_URL = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://atomberg-goal-portal.vercel.app';

  // Microsoft returned an error
  if (error) {
    console.error("Azure callback error:", error_description);
    return res.redirect(
      `${FRONTEND_URL}/login?error=${encodeURIComponent(String(error_description))}`
    );
  }

  if (!code) {
    return res.redirect(
      `${FRONTEND_URL}/login?error=No+auth+code+received`
    );
  }

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens(String(code));
    if (!tokenResponse?.accessToken) throw new Error("No access token");

    // 2. Get Microsoft profile + manager + groups
    const { profile, manager, groups } = await getMicrosoftProfile(
      tokenResponse.accessToken
    );

    // 3. Upsert user in our DB
    const user = await upsertAzureUser(profile, manager, groups);

    // 4. Generate our own JWT
    const token = generateJWT(user);

    // 4.5 Set auth cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // 5. Redirect to frontend with token
    res.redirect(
      `${FRONTEND_URL}/auth/callback?token=${token}&role=${user.role}`
    );
  } catch (err: any) {
    console.error("Azure callback failed:", err.message);
    res.redirect(
      `${FRONTEND_URL}/login?error=${encodeURIComponent("SSO login failed. Try again.")}`
    );
  }
};

// ── Admin: Sync org hierarchy ─────────────────────────────
export const azureSyncHandler = async (req: Request, res: Response) => {
  const accessToken = req.body.accessToken;
  try {
    const result = await syncOrgHierarchy(accessToken);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
