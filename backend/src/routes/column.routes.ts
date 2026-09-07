import { Router } from "express";
import { update, remove } from "../controllers/column.controller";
import { create as createTask } from "../controllers/task.controller";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import { idParamSchema } from "../schemas/board.schema";
import { updateColumnSchema } from "../schemas/column.schema";
import { createTaskSchema } from "../schemas/task.schema";

const router = Router();
router.use(requireAuth);

// POST /api/columns/:id/tasks - create a task at the bottom of this column
router.post("/:id/tasks", validate(idParamSchema, "params"), validate(createTaskSchema), createTask);

// PATCH /api/columns/:id
router.patch("/:id", validate(idParamSchema, "params"), validate(updateColumnSchema), update);

// DELETE /api/columns/:id
router.delete("/:id", validate(idParamSchema, "params"), remove);

export default router;