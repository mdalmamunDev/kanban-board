# Database Design (ER Diagram)

PostgreSQL schema for the Kanban backend, defined in [`prisma/schema.prisma`](prisma/schema.prisma).
The diagram below is a [Mermaid](https://mermaid.js.org/) ER diagram — GitHub renders it natively.

```mermaid
erDiagram
    USER ||--o{ BOARD : "owns"
    USER ||--o{ BOARD_MEMBER : "membership"
    BOARD ||--o{ BOARD_MEMBER : "has"
    BOARD ||--o{ COLUMN : "contains"
    BOARD ||--o{ LABEL : "defines"
    BOARD ||--o{ TASK : "tracks"
    COLUMN ||--o{ TASK : "groups"
    TASK ||--o{ TASK_LABEL : "tagged"
    LABEL ||--o{ TASK_LABEL : "applied to"
    TASK ||--o{ TASK_ASSIGNEE : "assigned"
    USER ||--o{ TASK_ASSIGNEE : "works on"

    USER {
        string id PK "cuid"
        string email UK "unique - login lookup"
        string name
        string initials "avatar initials"
        string color "avatar color, default #5750F1"
        string passwordHash "bcrypt"
        datetime createdAt
        datetime updatedAt
    }

    BOARD {
        string id PK "cuid"
        string name
        string description "nullable"
        string color "default #5750F1"
        string keyPrefix "task keys e.g. BIL -> BIL-142"
        int keySequence "atomic next-key counter"
        string ownerId FK "owner user - delete: Restrict"
        datetime createdAt
        datetime updatedAt
    }

    BOARD_MEMBER {
        string boardId PK "composite PK, FK - delete: Cascade"
        string userId PK "composite PK, FK - delete: Cascade"
        enum role "owner | editor | viewer, default editor"
        datetime createdAt
    }

    COLUMN {
        string id PK "cuid"
        string boardId FK "delete: Cascade"
        string title
        int order "sort position"
        string color "accent stripe, default #8F8F98"
        int wipLimit "nullable max tasks"
    }

    TASK {
        string id PK "cuid"
        string key "e.g. BIL-142, unique per board"
        string boardId FK "delete: Cascade"
        string columnId FK "delete: Cascade"
        string title
        string description "nullable"
        int order "sort position"
        enum priority "low | medium | high | urgent, default medium"
        datetime dueDate "nullable"
        int subtasksDone "default 0"
        int subtasksTotal "default 0"
        int commentCount "default 0"
        datetime createdAt
        datetime updatedAt
    }

    LABEL {
        string id PK "cuid"
        string boardId FK "delete: Cascade"
        string name "unique per board"
        string color "hex pill color"
    }

    TASK_LABEL {
        string taskId PK "composite PK, FK - delete: Cascade"
        string labelId PK "composite PK, FK - delete: Cascade"
    }

    TASK_ASSIGNEE {
        string taskId PK "composite PK, FK - delete: Cascade"
        string userId PK "composite PK, FK - delete: Cascade"
    }
```

## Enums

| Enum | Values |
| --- | --- |
| `Role` | `owner` · `editor` · `viewer` |
| `Priority` | `low` · `medium` · `high` · `urgent` |

## Relationships & delete behavior

| Relationship | Cardinality | On delete |
| --- | --- | --- |
| User → Board (owner) | 1 : N | **Restrict** (can't delete a user who owns a board) |
| User ↔ Board (membership) | N : M via `BoardMember` | Cascade |
| Board → Column | 1 : N | Cascade |
| Board → Label | 1 : N | Cascade |
| Board → Task | 1 : N | Cascade |
| Column → Task | 1 : N | Cascade |
| Task ↔ Label | N : M via `TaskLabel` | Cascade |
| Task ↔ User (assignee) | N : M via `TaskAssignee` | Cascade |

## Performance notes (hot query paths)

Indexes are placed exactly where the app reads/writes most:

| Index | Model | Drives |
| --- | --- | --- |
| `email @unique` | User | Login / lookup |
| `(ownerId)` | Board | `GET /boards/mine` |
| `(userId)` | BoardMember | `GET /boards/shared` |
| `(boardId, order)` | Column | Board load + column ordering |
| `(boardId, key) @unique` | Task | Human task keys (`BIL-142`) |
| `(columnId, order)` | Task | Column render + move/reorder |
| `(boardId, name) @unique` | Label | Duplicate label names |
| `(userId)` | TaskAssignee | "Tasks assigned to me" |
