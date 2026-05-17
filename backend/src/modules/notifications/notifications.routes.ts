import { Router } from "express";
import { authenticate, AuthRequest } from "../../middleware/auth";
import * as NotificationService from "./notifications.service";

const router = Router();

router.use(authenticate);

// Get my notifications
router.get("/", async (req: AuthRequest, res) => {
  try {
    const notifications = await NotificationService.getMyNotifications(req.user!.userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark one as read
router.put("/:id/read", async (req: AuthRequest, res) => {
  try {
    await NotificationService.markAsRead(req.params.id as string);
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// Mark all as read
router.put("/read-all", async (req: AuthRequest, res) => {
  try {
    await NotificationService.markAllAsRead(req.user!.userId);
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

export default router;
