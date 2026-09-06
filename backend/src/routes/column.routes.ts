import { Router } from "express";
import { update, remove } from "../controllers/column.controller";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import { idParamSchema } from "../schemas/board.schema";
import { updateColumnSchema } from "../schemas/column.schema";

const router = Router();
router.use(requireAuth);

// PATCH /api/columns/:id
router.patch("/:id", validate(idParamSchema, "params"), validate(updateColumnSchema), update);

// DELETE /api/columns/:id
router.delete("/:id", validate(idParamSchema, "params"), remove);

export default router;