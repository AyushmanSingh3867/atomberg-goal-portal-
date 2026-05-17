import { Router }        from "express";
import { authenticate }  from "../../middleware/auth";
import { requireRole }   from "../../middleware/auth";
import {
  azureLoginHandler,
  azureCallbackHandler,
  azureSyncHandler,
} from "./azure.controller";

const router = Router();

// 1. Redirect user to Microsoft login
router.get("/login",    azureLoginHandler);

// 2. Microsoft redirects back here with code
router.get("/callback", azureCallbackHandler);

// 3. Admin manually syncs org hierarchy
router.post(
  "/sync-org",
  authenticate,
  requireRole("ADMIN"),
  azureSyncHandler
);

export default router;
