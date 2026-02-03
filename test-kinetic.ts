import {KineticClient} from './src/KineticClient.js';

async function main() {
    /* 1. Initialize */
    const ksql = await KineticClient.create({
        connectionString: process.env.DATABASE_URL!,
        realtimeEnabled: true,
    });

    console.log("🚀 Kinetic Client Initialized");

    /* 2. Realtime Subscription */
    const sub = await ksql.subscribe('daily_journal', (event) => {
        console.log(`⚡ Update on Journal:`, event.action);
        console.log(event.data);
    });

    /* 3. RPC Call (Calling the function we wrote earlier) */
    console.log("Calling RPC...");
    const {error} = await ksql.rpc('replace_dynamic_todos', {
        p_date: '2026-02-02',
        p_user_id: 'your-uuid-here',
        p_new_tasks: JSON.stringify([{id: 1, task: "Build Kinetic SQL"}])
    });

    if (error) console.error("RPC Error:", error);

}

main().then(() => console.log(`Kinetic SQL initialized successfully.`));
