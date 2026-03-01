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
````

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
