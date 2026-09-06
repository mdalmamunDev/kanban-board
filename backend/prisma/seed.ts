import "dotenv/config";
import { PrismaClient, Priority, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Idempotent seed - safe to run on every container start.
 * Mirrors frontend/lib/mock-data.ts so wiring the UI to this API looks identical.
 */
async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  // ---------------- Users (same ids as frontend mock-data) ----------------
  const users = [
    { id: "u1", name: "Mamun Rashid", email: "mamun@company.io", color: "#5750F1", initials: "MR" },
    { id: "u2", name: "Priya Nair", email: "priya@company.io", color: "#C97B1D", initials: "PN" },
    { id: "u3", name: "Diego Ferreira", email: "diego@company.io", color: "#2F9E5B", initials: "DF" },
    { id: "u4", name: "Amina Yusuf", email: "amina@company.io", color: "#D64545", initials: "AY" },
    { id: "u5", name: "Sora Kim", email: "sora@company.io", color: "#3B82C4", initials: "SK" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { name: u.name, email: u.email, color: u.color, initials: u.initials },
      create: { ...u, passwordHash },
    });
  }

  // ---------------- Boards (my + shared, per the new data model) ----------------
  const boards = [
    {
      id: "b1",
      name: "Billing & Payments",
      description: "Subscription billing, invoicing, and payment provider work",
      color: "#5750F1",
      ownerId: "u1",
      keyPrefix: "BIL",
      keySequence: 151, // next key = BIL-152
    },
    {
      id: "b2",
      name: "Design System",
      description: "Shared component library and design tokens",
      color: "#3B82C4",
      ownerId: "u5",
      keyPrefix: "DS",
      keySequence: 44, // next key = DS-45
    },
  ];
  for (const b of boards) {
    await prisma.board.upsert({
      where: { id: b.id },
      update: { name: b.name, description: b.description, color: b.color, ownerId: b.ownerId },
      create: b,
    });
  }

  // ---------------- Memberships ----------------
  const members: Array<{ boardId: string; userId: string; role: Role }> = [
    { boardId: "b1", userId: "u1", role: "owner" },
    { boardId: "b1", userId: "u2", role: "editor" },
    { boardId: "b1", userId: "u3", role: "editor" },
    { boardId: "b1", userId: "u4", role: "viewer" },
    { boardId: "b2", userId: "u5", role: "owner" },
    { boardId: "b2", userId: "u1", role: "editor" },
  ];
  for (const m of members) {
    await prisma.boardMember.upsert({
      where: { boardId_userId: { boardId: m.boardId, userId: m.userId } },
      update: { role: m.role },
      create: m,
    });
  }

  console.log("Seed stage 1 complete (users, boards, members).");

  // ---------------- Columns ----------------
  const columns = [
    { id: "c1", boardId: "b1", title: "Backlog", order: 0, color: "#8F8F98" },
    { id: "c2", boardId: "b1", title: "In Progress", order: 1, color: "#5750F1", wipLimit: 4 },
    { id: "c3", boardId: "b1", title: "In Review", order: 2, color: "#C97B1D" },
    { id: "c4", boardId: "b1", title: "Done", order: 3, color: "#2F9E5B" },
    { id: "c5", boardId: "b2", title: "To Do", order: 0, color: "#8F8F98" },
    { id: "c6", boardId: "b2", title: "In Progress", order: 1, color: "#3B82C4" },
    { id: "c7", boardId: "b2", title: "Shipped", order: 2, color: "#2F9E5B" },
  ];
  for (const c of columns) {
    const { wipLimit, ...rest } = c;
    await prisma.column.upsert({
      where: { id: c.id },
      update: { ...rest, wipLimit },
      create: c as never,
    });
  }

  // ---------------- Labels ----------------
  const labels = [
    { id: "l1", boardId: "b1", name: "Backend", color: "#5750F1" },
    { id: "l2", boardId: "b1", name: "Frontend", color: "#2F9E5B" },
    { id: "l3", boardId: "b1", name: "Billing", color: "#C97B1D" },
    { id: "l4", boardId: "b1", name: "Bug", color: "#D64545" },
    { id: "l5", boardId: "b1", name: "Design", color: "#3B82C4" },
    { id: "l6", boardId: "b1", name: "Infra", color: "#8B5CF6" },
    { id: "ds1", boardId: "b2", name: "Design", color: "#3B82C4" },
    { id: "ds2", boardId: "b2", name: "Frontend", color: "#2F9E5B" },
  ];
  for (const l of labels) {
    await prisma.label.upsert({ where: { id: l.id }, update: l, create: l });
  }

  console.log("Seed stage 2 complete (columns, labels).");

  // ---------------- Tasks ----------------
  const tasks = [
    {
      id: "t1", boardId: "b1", columnId: "c2", key: "BIL-142",
      title: "Add proration support for mid-cycle plan upgrades",
      description: "When a customer upgrades plans mid-cycle, calculate the prorated charge for the remainder of the billing period.",
      order: 0, priority: "high", dueDate: "2026-09-12", subtasksDone: 2, subtasksTotal: 5, commentCount: 3,
      labelIds: ["l1", "l3"], assigneeIds: ["u1"],
    },
    {
      id: "t2", boardId: "b1", columnId: "c2", key: "BIL-138",
      title: "Retry failed card payments with exponential backoff",
      order: 1, priority: "urgent", dueDate: "2026-09-08", subtasksDone: 1, subtasksTotal: 3, commentCount: 5,
      labelIds: ["l1", "l3"], assigneeIds: ["u3"],
    },
    {
      id: "t3", boardId: "b1", columnId: "c2", key: "BIL-151",
      title: "Show upcoming invoice preview on the billing settings page",
      order: 2, priority: "medium", subtasksDone: 0, subtasksTotal: 4,
      labelIds: ["l2"], assigneeIds: ["u2"],
    },
    {
      id: "t4", boardId: "b1", columnId: "c3", key: "BIL-119",
      title: "Reconcile Stripe webhook events with local ledger",
      order: 0, priority: "high", dueDate: "2026-09-06", commentCount: 8,
      labelIds: ["l1", "l6"], assigneeIds: ["u3", "u1"],
    },
    {
      id: "t5", boardId: "b1", columnId: "c3", key: "BIL-127",
      title: "Fix currency rounding error on annual invoices",
      order: 1, priority: "urgent", dueDate: "2026-09-07", commentCount: 2,
      labelIds: ["l4", "l3"], assigneeIds: ["u1"],
    },
    {
      id: "t6", boardId: "b1", columnId: "c1", key: "BIL-98",
      title: "Add dunning email sequence for expired cards",
      order: 0, priority: "medium", subtasksTotal: 6,
      labelIds: ["l3"], assigneeIds: [],
    },
    {
      id: "t7", boardId: "b1", columnId: "c1", key: "BIL-103",
      title: "Support multi-currency pricing tables",
      order: 1, priority: "low",
      labelIds: ["l1", "l3"], assigneeIds: ["u2"],
    },
    {
      id: "t8", boardId: "b1", columnId: "c1", key: "BIL-110",
      title: "Research usage-based billing providers",
      order: 2, priority: "low",
      labelIds: ["l3"], assigneeIds: [],
    },
    {
      id: "t9", boardId: "b1", columnId: "c1", key: "BIL-95",
      title: "Migrate legacy invoices table to new schema",
      order: 3, priority: "medium", dueDate: "2026-09-20",
      labelIds: ["l1", "l6"], assigneeIds: ["u3"],
    },
    {
      id: "t10", boardId: "b1", columnId: "c4", key: "BIL-87",
      title: "Launch self-serve plan downgrade flow",
      order: 0, priority: "medium", subtasksDone: 6, subtasksTotal: 6, commentCount: 4,
      labelIds: ["l2", "l3"], assigneeIds: ["u2", "u4"],
    },
    {
      id: "t11", boardId: "b1", columnId: "c4", key: "BIL-82",
      title: "Add tax rate lookup by billing address",
      order: 1, priority: "high", subtasksDone: 4, subtasksTotal: 4,
      labelIds: ["l1"], assigneeIds: ["u1"],
    },
    {
      id: "t12", boardId: "b2", columnId: "c5", key: "DS-41",
      title: "Define elevation and shadow scale",
      order: 0, priority: "low",
      labelIds: ["ds1"], assigneeIds: ["u5"],
    },
    {
      id: "t13", boardId: "b2", columnId: "c6", key: "DS-44",
      title: "Build accessible Combobox component",
      order: 0, priority: "medium", subtasksDone: 3, subtasksTotal: 5,
      labelIds: ["ds2", "ds1"], assigneeIds: ["u1"],
    },
    {
      id: "t14", boardId: "b2", columnId: "c7", key: "DS-39",
      title: "Ship dark theme tokens v2",
      order: 0, priority: "medium", commentCount: 1,
      labelIds: ["ds1"], assigneeIds: ["u5"],
    },
  ] as const;

  for (const t of tasks) {
    const { labelIds, assigneeIds, dueDate, ...taskData } = t;
    await prisma.task.upsert({
      where: { boardId_key: { boardId: t.boardId, key: t.key } },
      update: {
        title: t.title,
        description: t.description ?? null,
        order: t.order,
        priority: t.priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        subtasksDone: t.subtasksDone ?? 0,
        subtasksTotal: t.subtasksTotal ?? 0,
        commentCount: t.commentCount ?? 0,
        columnId: t.columnId,
      },
      create: {
        ...taskData,
        dueDate: dueDate ? new Date(dueDate) : null,
        subtasksDone: t.subtasksDone ?? 0,
        subtasksTotal: t.subtasksTotal ?? 0,
        commentCount: t.commentCount ?? 0,
      },
    });

    for (const labelId of labelIds) {
      await prisma.taskLabel.upsert({
        where: { taskId_labelId: { taskId: t.id, labelId } },
        update: {},
        create: { taskId: t.id, labelId },
      });
    }
    for (const userId of assigneeIds) {
      await prisma.taskAssignee.upsert({
        where: { taskId_userId: { taskId: t.id, userId } },
        update: {},
        create: { taskId: t.id, userId },
      });
    }
  }

  console.log("Seed complete: users, boards, columns, labels, tasks.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });