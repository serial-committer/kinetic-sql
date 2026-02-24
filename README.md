# ⚡ Kinetic SQL

>**The Type-Safe, Real-Time SQL Client for Node.js. The "Tailwind" of Database Clients.**
## Zero Config. Full Autocomplete. Realtime by default.

Kinetic SQL is a next-gen Node.js client that wraps **PostgreSQL**, **MySQL** & **SQLite** with a developer experience similar to Supabase, but for your own backend.

---

## 📜 Features

Kinetic SQL turns your database into a reactive extension of your code.
- **✨ RPC Wrapper:** Call your stored procedures and database functions just like native JavaScript methods.
- **⚡ Real-Time Subscriptions:** Listen to `INSERT`, `UPDATE`, and `DELETE` events instantly.
- **🌍 Universal Fit:** Built for `Express`, `Fastify`, and `Vanilla JS`, with a dedicated module for seamless NestJS integration out of the box.
- **🚀 NestJS Native:** Drop-in `KineticModule` for zero-config integration with NestJS Framework.
- **🤖 Automatic Type Generation:** It reads your schema and auto-generates type safety. You never have to manually write a TypeScript interface again.
- **🛡️ Type Safety:** Full TypeScript support for schemas and configurations.
- **♻️️ Connection Pooling:** Built-in management for high-scale apps.

---

## 🚀 Quick Start

### 1. <u>Install</u>

```bash
# For PostgreSQL:
npm install kinetic-sql drizzle-orm postgres

# For MySQL:
npm install kinetic-sql drizzle-orm mysql2 @rodrigogs/mysql-events

# For SQLite (Local Dev / Edge):
npm install kinetic-sql better-sqlite3
```

### 2. <u>Initialize</u>

```typescript
import { KineticClient } from 'kinetic-sql';

/* PostgreSQL/MySQL Example */
/* Connects using your DATABASE_URL env var by default */
const db = await KineticClient.create({
type: 'pg', // or 'mysql'
connectionString: process.env.DATABASE_URL,
realtimeEnabled: true
});

/* SQLite Example */
const db = await KineticClient.create({
  type: 'sqlite',
  filename: './dev.db'
});
```

### 3. <u>Generate Types (The Magic)</u>

Run this command in your terminal. It reads your DB and patches the library automatically.

```bash
# PostgreSQL (Default)
npx k-sql gen --connection "postgres://..."
OR
npx k-sql gen --type pg --host localhost --user postgres --db mydb

# MySQL
npx k-sql gen --type mysql --host localhost --user root --db mydb

# SQLite
npx k-sql gen --type sqlite --db ./dev.db
```

---

## 📚 Usage

## 🚀 <u>NestJS Integration</u>

Kinetic SQL exports a native NestJS module for zero-config setup. Using the library in your NestJS app is as simple as:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { KineticModule } from 'kinetic-sql/nestjs';

@Module({
imports: [KineticModule.forRoot({
    type: 'sqlite', // or 'pg' | 'mysql'
    filename: './dev.db',
    debug: true, // 👈 Enable colorful logs
  }),],
})
export class AppModule {}
```

## ⚡<u>Realtime Subscriptions</u>

#### Listen to database events without setting up WebSockets. 
#### Use the `subscribe` method to listen to any changes to the table you want to monitor. In the example below, we listen to changes on the `tasks` table.

```typescript
/* 'tasks' is auto-completed! */
const sub = await db.subscribe('tasks', (event) => {
console.log(event.action); // 'INSERT' | 'UPDATE' | 'DELETE'
console.log(event.data.title); // Typed Reference!
});

// If you want to stop listening to the events, you can simply call:
await sub.unsubscribe();
```

## 🧠 <u>RPC Wrapper: The Robust Magic Bridge</u> ✨

### Extend SQL with JavaScript `OR` Call stored procedures as native JS methods bridging the gap between your Backend and the Database.

#### <u>EXAMPLES:</u>
**&nbsp;<u>Extend SQL with JavaScript</u>:**
Why write complex SQL logic when you can just write JavaScript? Define a function in your Node.js app and call it *inside* your SQL queries. 😊

```typescript
/* Define a function in your app */
client.raw.function('calculate_tax', (price, taxRate) => {
  return price * (1 + taxRate);
});

/* Use it directly in SQL! */
const result = client.raw.prepare(`
  SELECT 
    symbol, 
    price, 
    calculate_tax(price, 0.18) as final_price 
  FROM stocks
`).all();

console.log(result);
/* Output: [{ symbol: 'KINETIC-AI', price: 150, final_price: 177 }, ...] */
```
<br/>

**&nbsp;<u>Call Stored Procedures</u>:**
Invoke complex database logic without writing raw SQL strings (Using Postgres for the examples below) ✨

#### &nbsp;&nbsp;Example 1:
```typescript
/* Calls the 'create_user' stored procedure safely along with auto-completion and type-safety! */
const { data, error } = await client.rpc('create_user', {
  username: 'kapil',
  role: 'admin'
});
```

#### &nbsp;&nbsp;Example 2:
```typescript
/* Calls the stored procedure 'add_todo' (Auto-completed!) */
const { data, error } = await db.rpc('add_todo',
    /* Param names are checked! */
    { title: "Build cool app",  user_id: 123 }
);
```

---
### <u>Standard Queries (via Drizzle)</u> ✨

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

### SQLite
```typescript
const db = await KineticClient.create({
  type: 'sqlite',
  filename: './dev.db' // Path to your file
});
```

## ⚠️ Requirements

- **Node.js:** 18+
- **PostgreSQL:** 12+ (Native `LISTEN/NOTIFY` used)
- **MySQL:** 5.7+ (Requires Binary Logging Enabled i.e. ` log_bin = ON ` for Realtime features)
- **SQLite:** 3+ (Bundled with `better-sqlite3`)

## 📄 License

MIT
