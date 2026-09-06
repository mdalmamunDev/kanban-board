import { Router } from "express";
import {
  addMember,
  create,
  getOne,
  listMine,
  listShared,
  remove,
  removeMember,
  reorderColumns,
  update,
  updateMember,
} from "../controllers/board.controller";
import { create as createColumn } from "../controllers/column.controller";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import {
  addMemberSchema,
  boardIdParamSchema,
  boardMemberParamsSchema,
  createBoardSchema,
  idParamSchema,
  reorderSchema,
  updateBoardSchema,
  updateMemberSchema,
} from "../schemas/board.schema";
import { createColumnSchema } from "../schemas/column.schema";

const router = Router();
router.use(requireAuth);

// Separated lists for the two sidebar sections.
router.get("/mine", listMine);
router.get("/shared", listShared);

// Board CRUD.
router.post("/", validate(createBoardSchema), create);
router.get("/:id", validate(idParamSchema, "params"), getOne);
router.patch("/:id", validate(idParamSchema, "params"), validate(updateBoardSchema), update);
router.delete("/:id", validate(idParamSchema, "params"), remove);

// Members.
router.post("/:id/members", validate(idParamSchema, "params"), validate(addMemberSchema), addMember);
router.patch(
  "/:id/members/:userId",
  validate(boardMemberParamsSchema, "params"),
  validate(updateMemberSchema),
  updateMember
);
router.delete("/:id/members/:userId", validate(boardMemberParamsSchema, "params"), removeMember);

// Columns (nested) + reorder.
router.post(
  "/:id/columns",
  validate(boardIdParamSchema, "params"),
  validate(createColumnSchema),
  createColumn
);
router.patch(
  "/:id/columns/reorder",
  validate(idParamSchema, "params"),
  validate(reorderSchema),
  reorderColumns
);

export default router;