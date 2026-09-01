# ⚡ Kinetic SQL

>**A lightweight, type-safe, real-time SQL Engine for Node.js. The "Tailwind" of Database Clients.**

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/kinetic-sql.svg)](https://www.npmjs.com/package/kinetic-sql)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-blue.svg)](https://github.com/serial-committer/kinetic-sql)

Kinetic SQL is a next-gen Node.js client that wraps **PostgreSQL**, **MySQL** & **SQLite** with features that enable the developer to interact with databases seamlessly.

🚀 **[Experience the Live Demo: Real-Time Stock Simulator](https://live-stock-simulator.vercel.app/)**

---

## 📜 Features

Kinetic SQL turns your database into a reactive extension of your code.
- **✨ RPC Wrapper:** Call your stored procedures and database functions just like native JavaScript methods.
- **⚡ Real-Time Subscriptions:** Listen to `INSERT`, `UPDATE`, and `DELETE` events instantly.
- **🔒 Transactions with Propagation:** Atomic blocks with `Spring Boot` style propagation, savepoints for partial rollbacks, isolation levels, and automatic retries on deadlocks.
- **🌍 Universal Fit:** Built for `Express`, `Fastify`, and `Vanilla JS`, with a dedicated module for seamless `NestJS` integration out of the box.
- **🚀 NestJS Native:** Drop-in `KineticModule` for zero-config integration with NestJS Framework.
- **🤖 Automatic Type Generation:** It reads your schema and auto-generates type safety. You never have to manually write a TypeScript interface again.
- **🛡️ Type Safety:** Full TypeScript support for schemas and configurations.
- **♻️️ Connection Pooling:** Built-in management for high-scale apps.
- **🔌 Easily Pluggable using Middleware API:** The Engine exposes a Middleware API for easy plugin of hooks and custom logic around the execution of queries.

---

## 📈 The Proof: Live Demo

To stress-test the real-time event mapping and zero-bloat architecture, we built a high-frequency **Live Stock Market Simulator**. It runs on a Vercel frontend and Render backend, handling hundreds of database ticks a minute with a 0-second cold start.

👉 **[View the Live Stock Simulator](https://live-stock-simulator.vercel.app/)**

---

## 🚀 Quick Start

### 1. <ins>Install</ins>

```bash
# For PostgreSQL:
npm install kinetic-sql drizzle-orm postgres

# For MySQL:
npm install kinetic-sql drizzle-orm mysql2 @rodrigogs/mysql-events

# For SQLite (Local Dev / Edge):
npm install kinetic-sql better-sqlite3
```

### 2. <ins>Initialize</ins>

```typescript
import { KineticClient } from 'kinetic-sql';

/* PostgreSQL/MySQL Example */
/* Connects using your DATABASE_URL env var by default */
const client = await KineticClient.create({
  type: 'pg', // or 'mysql'
  connectionString: process.env.DATABASE_URL,
  realtimeEnabled: true
});

/* SQLite Example */
const client = await KineticClient.create({
  type: 'sqlite',
  filename: './dev.db'
});
```

### 3. <ins>Generate Types</ins> (The Magic)

Run this command in your terminal. It reads your DB and patches the library automatically.

```bash
# PostgreSQL (Default)
npx k-sql gen --connection "postgres://..."
# OR
npx k-sql gen --type pg --host localhost --user postgres --db mydb

# MySQL
npx k-sql gen --type mysql --host localhost --user root --db mydb

# SQLite
npx k-sql gen --type sqlite --db ./dev.db
```

---

## 📚 Usage 

## NestJS Integration 🚀

Kinetic SQL exports a native NestJS module for zero-config setup. Using the library in your NestJS app is as simple as:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { KineticModule } from 'kinetic-sql/nestjs';

@Module({
imports: [
    KineticModule.forRoot({
      type: 'sqlite', // or 'pg' | 'mysql'
      filename: './dev.db',
      debug: true, // 👈 Enable colorful logs
    })
  ],
})
export class AppModule {}
```
---

## Realtime Subscriptions ⚡

Listen to database events without setting up WebSockets. 

Use the `subscribe` method to listen to any changes to the table you want to monitor. In the example below, we listen to changes on the `tasks` table.

```typescript
/* 'tasks' is auto-completed! */
const sub = await client.subscribe('tasks', (event) => {
console.log(event.action); // 'INSERT' | 'UPDATE' | 'DELETE'
console.log(event.data.title); // Typed Reference!
});

// If you want to stop listening to the events, you can simply call:
await sub.unsubscribe();
```

**<ins>Several listeners, one table</ins>:** You can subscribe to the same table as many times as you like — every listener gets every event, and `unsubscribe()` only removes the one you called it on. Handy when different parts of your app care about the same data for different reasons.

```typescript
const badge = await client.subscribe('tasks', (e) => updateBadgeCount(e));
const feed  = await client.subscribe('tasks', (e) => appendToActivityFeed(e));

await badge.unsubscribe(); /* The activity feed keeps working 👍 */
```

> 💡 On **PostgreSQL**, all of your subscriptions share a **single** listening connection, no matter how many tables you watch. Your pool stays free for actual queries.

---

## RPC Wrapper: The Robust Magic Bridge ✨

Extend SQL with JavaScript `OR` Call stored procedures as native JS methods bridging the gap between your Backend and the Database.

**<ins>Extend SQL with JavaScript</ins>:**
Why write complex SQL logic when you can just write JavaScript? Define a function in your Node.js app and call it ***inside*** your SQL queries. 😊

#### &nbsp;&nbsp;<ins>Example</ins>:

```typescript
/* Define a function in your app */
client.native.function('calculate_tax', (price, taxRate) => {
  return price * (1 + taxRate);
});

/* Use it directly in SQL! */
const result = client.native.prepare(`
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

**<ins>Call Stored Procedures</ins>:** Invoke complex database logic without writing raw SQL strings (Using Postgres for the examples below) ✨

#### &nbsp;&nbsp;<ins>Example 1</ins>:

```typescript
/* Calls the 'create_user' stored procedure safely along with auto-completion and type-safety! */
const { data, error } = await client.rpc('create_user', {
  username: 'kapil',
  role: 'admin'
});
```

#### &nbsp;&nbsp;<ins>Example 2</ins>:

```typescript
/* Calls the stored procedure 'add_todo' (Auto-completed!) */
const { data, error } = await client.rpc('add_todo',
    /* Param names are checked! */
    { title: "Build cool app",  user_id: 123 }
);
```

---

## Transactions: Atomic Boundaries 🔒

Wrap any unit of work in a transaction. It **commits** when your block returns and **rolls back** when it throws. You never have to remember to do either yourself.

Here's the part that makes it different: queries made *anywhere inside the block* join the transaction **automatically**. You don't have to thread a `tx` object through every function in your service layer. 😊

```typescript
await client.transaction(async (tx) => {
  /* This joins the transaction */
  await client.raw('UPDATE accounts SET balance = balance - 100 WHERE id = ?', [1]);

  /* So does every query made inside here. Nothing was passed in! */
  await ledgerService.record(1, -100);

  /* Or use the handle explicitly, if you prefer being obvious */
  await tx.raw('UPDATE accounts SET balance = balance + 100 WHERE id = ?', [2]);
});

/* Committed. If anything above had thrown an error, all three would have rolled back. */
```

---

### <ins>Propagation</ins>: What happens when transactions meet ❓

Just like `Spring Boot`, you can control how a block behaves when another transaction is *already* running. Pass a `propagation` option:

```typescript
import { Propagation } from 'kinetic-sql';

await client.transaction({ propagation: Propagation.NESTED }, async (tx) => {
  await client.raw('INSERT INTO audit_log (event) VALUES (?)', ['risky-step']);
});
```

| Propagation | What it does                                                                                                                  |
|---|-------------------------------------------------------------------------------------------------------------------------------|
| `REQUIRED` *(default)* | Joins the running transaction, or starts one if there isn't any.                                                              |
| `REQUIRES_NEW` | Runs in its **own** transaction on a separate connection. Commits even if the outer one rolls back.                           |
| `NESTED` | Runs inside a `SAVEPOINT`. If it fails, only the work inside *its* boundary is rolled back. The outer transaction carries on. |
| `MANDATORY` | Throws if there is no transaction already running.                                                                            |
| `NEVER` | Throws if a transaction **is** running.                                                                                       |
| `SUPPORTS` | Joins one if it exists, otherwise just runs normally.                                                                         |
| `NOT_SUPPORTED` | Suspends the running transaction and runs outside it.                                                                         |

---

### <ins>Partial Rollbacks</ins>: Savepoints ⏪

This is very useful when one step is allowed to fail without sinking everything around it. Use `tx.savepoint()` (or `Propagation.NESTED`, they do the same thing):

```typescript
await client.transaction(async (tx) => {
  await client.raw('INSERT INTO orders (id, total) VALUES (?, ?)', [1, 500]);

  try {
    /* Optional step: nice to have, not worth losing the order over */
    await tx.savepoint(async () => {
      await client.raw('INSERT INTO loyalty_points (order_id, points) VALUES (?, ?)', [1, 50]);
      throw new Error('Loyalty service is down!');
    });
  } catch {
    console.warn('Skipped loyalty points, order is still fine 👍');
  }
});

/* The order was saved. Only the loyalty points were rolled back. */
```

Savepoints can be nested inside savepoints, as deep as you like.

> ⚠️ **Careful with `REQUIRED`:** if an inner block *joins* the outer transaction (the default) and then fails, the whole transaction is marked **rollback-only** even if you catch the error. That is deliberate: committing work that a failed step left behind is how data goes bad. If you want the failure contained, use `NESTED`.

---

### <ins>Automatic Retries</ins>: Deadlocks handled for you 🔁

Under high concurrency (especially at `SERIALIZABLE`), databases abort transactions to break deadlocks and serialization conflicts. Postgres' own documentation says applications **must** be ready to retry these.

**Kinetic SQL** does it for you. **Retries are on by default** - no annotation, no wrapper, no extra config:

```typescript
/* Retried automatically on a deadlock or serialization failure */
await client.transaction(async () => {
  await client.raw('UPDATE inventory SET stock = stock - 1 WHERE id = ?', [42]);
});
```

Only genuinely transient errors are retried (Postgres `40001`/`40P01`, MySQL `1213`/`1205`, SQLite `SQLITE_BUSY`). Your application errors are **never** replayed. Retries use an exponential backoff with jitter so retrying peers don't collide all over again.

**<ins>Opting out with `noRetry`</ins>:**

Because a retry re-runs your block, anything in it that *isn't* just a database call would happen twice. If your block sends an email or charges a card, opt out with `noRetry`:

```typescript
await client.transaction({ noRetry: true }, async () => {
  await client.raw('INSERT INTO payments (amount) VALUES (?)', [999]);
  await stripe.charges.create({ /* ... */ }); /* 👈 must not run twice! */
});

/* You can also tune the attempts (default is 3) */
await client.transaction({ maxRetries: 5 }, async () => { /* ... */ });
```

---

### <ins>Isolation, Read-Only & Timeouts</ins> ⚙️

```typescript
import { Isolation } from 'kinetic-sql';

await client.transaction({
  isolation: Isolation.SERIALIZABLE, /* READ_UNCOMMITTED | READ_COMMITTED | REPEATABLE_READ | SERIALIZABLE */
  readOnly: true,                    /* Lets the engine optimise, and blocks accidental writes */
  timeout: 5000                      /* Give up after 5 seconds */
}, async () => {
  return client.raw('SELECT * FROM heavy_report_view');
});
```

---

### <ins>Deciding what counts as a rollback</ins> 🎯

Everything rolls back by default. When you need an exception to that, `noRollbackFor` keeps the work and still throws the error at you:

```typescript
class ValidationError extends Error {}

await client.transaction({ noRollbackFor: [ValidationError] }, async () => {
  await client.raw('INSERT INTO signup_attempts (email) VALUES (?)', ['a@b.com']);

  /* The attempt above is still recorded, and this error still reaches your catch block */
  throw new ValidationError('Email already taken');
});
```

`rollbackFor` takes priority over `noRollbackFor`, so you can carve out an exception to your exception. You can match on an error class, an error `code` string, or your own function.

Need to block a commit without throwing? Use `tx.setRollbackOnly()`:

```typescript
await client.transaction(async (tx) => {
  const rows = await client.raw('SELECT stock FROM inventory WHERE id = ?', [42]);
    /* Block carries on, but nothing will be committed */
  if (rows[0].stock < 1) tx.setRollbackOnly(); 
});
```

---

### <ins>The Spring Boot Way</ins>: `@Transactional` 🍃

If you'd rather declare it than wrap it, use the decorator. Every call to the method runs in a transaction, and queries inside it join automatically — exactly like `Spring Boot`:

```typescript
import { Transactional, Propagation } from 'kinetic-sql';
/* In a NestJS app, you can import it from 'kinetic-sql/nestjs' instead */

@Injectable()
export class OrderService {
  constructor(@InjectDB() private db: KineticClient) {}

  @Transactional()
  async placeOrder(userId: number, total: number) {
    await this.db.raw('INSERT INTO orders (user_id, total) VALUES (?, ?)', [userId, total]);
    await this.chargeWallet(userId, total); /* Joins the same transaction */
  }

  @Transactional({ propagation: Propagation.REQUIRES_NEW })
  async writeAuditLog(event: string) {
    /* Commits on its own, even if the caller rolls back */
    await this.db.raw('INSERT INTO audit (event) VALUES (?)', [event]);
  }
}
```

It takes every option `client.transaction()` does, and works with both legacy and standard TypeScript decorators. No additional `tsconfig` changes needed. The decorator uses the first client you created; if your app has several, point it at the right one with `setDefaultClient(client)`.

---

### <ins>Manual Control</ins> 🔧

For the rare case where the boundary can't fit inside one block (spanning multiple HTTP requests, for example):

```typescript
const tx = await client.beginTransaction();

try {
  await tx.raw('INSERT INTO drafts (body) VALUES (?)', ['hello']);
  await tx.commit();
} catch (err) {
  await tx.rollback();
}
```

⚠️ You own the connection until you settle it, so always `commit()` or `rollback()` ⚠️  
A forgotten transaction holds a pooled connection open. Automatic retries don't apply here, because there's no block to replay.

---

### <ins>Watching Transactions from a Plugin</ins> 🔌

Transactions show up in the `Middleware API` too. Every `QueryContext` carries a `txId`, so you can group queries by the transaction they belonged to, and there are three lifecycle hooks:

```typescript
import { KineticMiddleware } from 'kinetic-sql';

export const TransactionLogger: KineticMiddleware = {
  name: 'TransactionLogger',

  onTransactionBegin: (info) => console.log(`🟢 ${info.id} started (attempt ${info.attempt})`),
  onTransactionCommit: (info) => console.log(`✅ ${info.id} committed`),
  onTransactionRollback: (info, error) => console.error(`↩️ ${info.id} rolled back:`, error?.message),

  /* Now you can tell which transaction a query belonged to */
  afterQuery: (ctx) => console.log(`  [${ctx.txId ?? 'no-tx'}] ${ctx.sqlOrName}`)
};
```

---

### <ins>Engine Notes</ins> 📌

A few honest details about what each database can actually do:

- **PostgreSQL:** everything is fully supported. `timeout` is also enforced on the server-side via `statement_timeout`.
- **MySQL:** everything is supported. `timeout` is enforced in Node, and on the server-side but only for `SELECT` statements (that's a `MySQL` limitation, not `Kinetic SQL`).
- **SQLite:** `better-sqlite3` gives one synchronous connection, so overlapping transactions are **queued** rather than run in parallel. There won't be any lost updates, but no concurrency either. `REQUIRES_NEW` opens a second connection to your database file, which means it needs a **file-backed** database (an in-memory SQLite instance will tell you so clearly), and because SQLite allows only one writer at a time it works best when the outer transaction is `readOnly`. `NOT_SUPPORTED` can't fully suspend on a single connection.
- **`timeout` everywhere:** it stops *waiting* for a slow block and rolls it back. It cannot cancel a query that is already executing.

---

## Plugins: Middleware API 🔌

**Kinetic SQL** is engineered with a strict, lightweight core to guarantee `sub-4 ms` query latency. There are instances where developers might need to execute pre and post query logic. To keep the core engine blazingly fast, all non-essential features (like custom logging, APM tracing, or data masking) can be easily plugged into the core using the exposed hooks **OR** if that feature is required across multiple projects, you can also build your own **Official Plugins** using the `Middleware API`.


### <ins>Example: Building a Custom Logger Plugin</ins>:

Creating a plugin is as simple as defining a `KineticMiddleware` object that taps into the query lifecycle hooks.

```typescript
import {KineticMiddleware} from 'kinetic-sql';

export const PerformanceLogger: KineticMiddleware = {
  name: 'PerformanceLogger',

  /* Captures the latency by calculating the diff from ctx.startTime */
  afterQuery: (ctx, result) => {
      const durationMs = Number(process.hrtime.bigint() - ctx.startTime) / 1e6;

      if (durationMs > 5) {
          console.warn(`⚠️ SLOW QUERY [${durationMs.toFixed(2)}ms]: ${ctx.sqlOrName}`);
      } else {
          console.log(`✅ [${durationMs.toFixed(2)}ms]: ${ctx.sqlOrName}`);
      }
  },

  /* Captures and logs driver-level exceptions safely */
  onError: (ctx, error) => {
      console.error(`❌ FAILED: ${ctx.sqlOrName}`, error.message);
  }
};
```

### <ins>HOW TO: Registering Middleware</ins> (Express/Vanilla Node)❓:

Chain the `.use()` method immediately after creating your client instance.
```typescript
import { KineticClient } from 'kinetic-sql';
import { PerformanceLogger } from './plugins/PerformanceLogger';

const client = await KineticClient.create({
  type: 'sqlite',
  filename: './dev.db'
});

/* Register the plugin */
client.use(PerformanceLogger);

/* The plugin will now intercept all raw() and rpc() calls */
await client.raw('SELECT * FROM users');
```

### <ins>HOW TO: Registering Middleware</ins> (NestJS) ❓:

If you are using the official KineticModule for NestJS, you can easily register your middleware plugins during the asynchronous module initialization.
```typescript
import {Module} from '@nestjs/common';
import {KineticModule} from 'kinetic-sql/nestjs';
import {PerformanceLogger} from './plugins/PerformanceLogger';

@Module({
  imports: [
    KineticModule.forRootAsync({
      useFactory: () => {
        return {
          config: {type: 'postgres', connectionString: process.env.DATABASE_URL},
          /* Register your plugins right in the factory */
          middlewares: [PerformanceLogger]
        };
      },
    }),
  ],
})
export class AppModule {
}
```
---

## Executing Raw Queries ⚡

If you need to execute complex, custom SQL strings, use the `.raw()` method.  
**Bonus:** All queries executed through `.raw()` automatically pass through your custom Middleware pipeline!

```typescript
/* Executes safely and triggers any attached loggers or APM tracers */
const users = await client.raw('SELECT * FROM users WHERE age > ?', [21]);
```

---

## Prepared Statements (Optimized & Tracked) 🚀

When you need to execute the same query hundreds of times (like bulk inserts or high-frequency updates), parsing the SQL string on every call is a waste of CPU cycles.

**Kinetic SQL** provides a universal `.prepare()` method that pre-compiles the query engine-side for maximum performance, while **still** routing every execution through your custom Middleware pipeline!

```typescript
/* Pre-compile the SQL once */
const insertUser = client.prepare('INSERT INTO users (name, age) VALUES (?, ?)');

/* Execute it hundreds of times lightning fast! */
/* PerformanceLogger middleware will track every single call */
await insertUser.execute(['Alice', 28]);
await insertUser.execute(['Bob', 34]);
await insertUser.execute(['Charlie', 22]);
```

---

## Standard Queries (via Drizzle) ✨

Kinetic SQL is designed to work alongside your favorite query builders. If you need to hand off the connection to Drizzle ORM, you can use the `.native` escape hatch, which exposes the underlying database driver (`postgres.js`, `mysql2`, or `better-sqlite3`).

```typescript
import {drizzle} from 'drizzle-orm/postgres-js';
import {KineticClient} from 'kinetic-sql';

const client = await KineticClient.create({type: 'pg', /* ... */});

/* Pass the native driver instance to Drizzle */
const db = drizzle(client.native);
```

---

## Shutting Down Cleanly 🧹

Call `.end()` to close the connection pool and stop any realtime watchers. Handy in tests, scripts, and graceful shutdown hooks. Without it, an open pool will keep your process alive.

```typescript
process.on('SIGTERM', async () => {
  await client.end();
  process.exit(0);
});
```

---

## ⚙️ Configuration

### PostgreSQL
```typescript
const client = await KineticClient.create({
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
const client = await KineticClient.create({
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
const client = await KineticClient.create({
  type: 'sqlite',
  filename: './dev.db' // Path to your file
});
```

### MSSQL
```
Support for MSSQL is currently in development and will be released soon 😊
```
---

## ⚠️ Requirements

- **Node.js:** 18+
- **PostgreSQL:** 12+ (Native `LISTEN/NOTIFY` used)
- **MySQL:** 5.7+ (Requires Binary Logging Enabled i.e. ` log_bin = ON ` for Realtime features)
- **SQLite:** 3+ (Bundled with `better-sqlite3`)

---

## 🤝 Contributing (Plugins vs. Core)

**Kinetic SQL** was designed to overcome the restrictions and bloating that other libraries come with. When building the Engine, I also wanted to make sure developers are not limited to the core features and can easily add any plugins or extensions to the library! 

If you want to add custom behaviors (APM tracing, logging, data masking, etc.), please build an **Official Plugin** using our <code><b>Middleware API</b></code> rather than modifying the core driver execution path.


This helps maintain the strict `< 4ms` query latency guarantee, the core execution engine comes with.

Please check out `CONTRIBUTING.md` to learn more about architectural philosophy and how you can contribute to the project.

---

## 📄 License

- #### MIT – See [LICENSE](https://github.com/serial-committer/kinetic-sql/blob/main/LICENSE) for details.

---

## 🐞 Bugs, Issues, and Feature Requests

**Kinetic SQL** is actively maintained. If you run into any issues, have feature requests, please feel free to open an issue on the GitHub repo:

👉 **[Kinetic SQL Feature Requests & Issue Tracker](https://github.com/serial-committer/kinetic-sql/issues)**

If you found this library helpful in escaping ORM bloat, a ⭐️ on the repository is greatly appreciated!
