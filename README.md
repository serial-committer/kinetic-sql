# ⚡ Kinetic SQL (`k-sql`)

> **The "Tailwind" of Database Clients.** 
> Zero Config. Full Autocomplete. Realtime by default.

Kinetic SQL is a next-gen Node.js client that wraps **PostgreSQL** and **MySQL** with a developer experience similar to Supabase, but for your own backend.

![Kinetic Demo](https://placehold.co/600x200?text=Imagine+Autocomplete+GIF+Here)
## ✨ Features

- **🔮 Invisible Type Safety:** Run `npx k-sql gen` and your entire database schema is auto-injected into your client. No manual interfaces.
- **⚡ Realtime Subscriptions:** Listen to table changes (`INSERT`, `UPDATE`) with one line of code.
- **🛡️ RPC Wrapper:** Call Stored Procedures as native JavaScript functions.
- **🔌 Connection Pooling:** Built-in management for high-scale apps.

---

## 🚀 Quick Start

### 1. Install

```bash

# For PostgreSQL

npm install kinetic-sql drizzle-orm postgres

# For MySQL

npm install kinetic-sql drizzle-orm mysql2 @rodrigogs/mysql-events
```

### 2. Initialize

```typescript
import { KineticClient } from 'kinetic-sql';

// Connects using your DATABASE_URL env var by default
const db = await KineticClient.create({
type: 'pg', // or 'mysql'
connectionString: process.env.DATABASE_URL,
realtimeEnabled: true
});
```

### 3. Generate Types (The Magic)

Run this command in your terminal. It reads your DB and patches the library automatically.

```bash

# PostgreSQL (Default)

npx k-sql gen --connection "postgres://..."

# MySQL

npx k-sql gen --type mysql --host localhost --user root --db mydb
```

---

## 📚 Usage

### Realtime Subscriptions ✨

#### Listen to database events without setting up WebSockets.

```typescript
// 'tasks' is auto-completed!
const sub = await db.subscribe('tasks', (event) => {
console.log(event.action); // 'INSERT' | 'UPDATE'
console.log(event.data.title); // Typed!
});

// Later...
await sub.unsubscribe();
```

### Calling RPC Functions ✨

#### Call stored procedures as native JS methods.

```typescript
// 'add_todo' is auto-completed!
const { data, error } = await db.rpc('add_todo', {
p_title: "Build cool app", // Param names are checked!
p_user_id: 123
});
```

### Standard Queries (via Drizzle) ✨

#### We expose the full power of Drizzle ORM under the hood.

```typescript
import { sql, eq } from 'kinetic-sql';

const users = await db.orm
.select()
.from(sql`users`)
.where(eq(sql`id`, 1));
```

---

## ⚙️ Configuration

### PostgreSQL

```typescript
const db = await KineticClient.create({
type: 'pg',
host: 'localhost',
port: 5432,
user: 'postgres',
password: 'password',
database: 'mydb',
realtimeEnabled: true
});
```

### MySQL

```typescript
const db = await KineticClient.create({
type: 'mysql',
host: 'localhost',
port: 3306,
user: 'root',
password: 'password',
database: 'mydb',
realtimeEnabled: true // Requires Binary Logging enabled on server
});
```

## ⚠️ Requirements

- **Node.js:** 18+
- **PostgreSQL:** 12+ (Native `LISTEN/NOTIFY` used)
- **MySQL:** 5.7+
    - *Note:* For Realtime features, your MySQL server must have **Binary Logging** enabled (`log_bin = ON`).

## 📄 License

MIT
