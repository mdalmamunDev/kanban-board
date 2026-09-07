import { Router } from "express";
import { update, remove, move } from "../controllers/task.controller";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import { idParamSchema } from "../schemas/board.schema";
import { moveTaskSchema, updateTaskSchema } from "../schemas/task.schema";

const router = Router();
router.use(requireAuth);

// PATCH /api/tasks/:id
router.patch("/:id", validate(idParamSchema, "params"), validate(updateTaskSchema), update);

// DELETE /api/tasks/:id
router.delete("/:id", validate(idParamSchema, "params"), remove);

// PATCH /api/tasks/:id/move - { toColumnId, toIndex }
router.patch(
  "/:id/move",
  validate(idParamSchema, "params"),
  validate(moveTaskSchema),
  move
);

export default router;