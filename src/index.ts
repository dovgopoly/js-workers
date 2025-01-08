import { spawn, Pool, Worker } from "threads"
import { generateKeyPair } from "./kangaroo";

(async () => {
    const balance = Array.from({ length: 4 }).map(_ => ({
        ...generateKeyPair(48),
        decrypted: undefined,
        tasks: [] as any[],
    }));

    console.log("Balance:", balance);

    let resolveAllTasks: any;
    const allTasksCompleted = new Promise((resolve) => {
        resolveAllTasks = resolve;
    });

    const pool = Pool(() => spawn(new Worker("./worker")), {
       size: 4
    });

    const startMainTime = performance.now();

    pool.events().subscribe(event => {
        if (event.type === "taskQueueDrained") {
            let idx = -1;

            balance.forEach((chunk, i) => {
                if (
                    chunk.decrypted === undefined &&
                    (idx === -1 || chunk.tasks.length < balance[idx].tasks.length)
                ) {
                    idx = i;
                }
            });

            if (idx === -1) {
                resolveAllTasks(true);
                return;
            }

            const task = pool.queue(async worker => {
                const sk = await worker.solve(balance[idx].publicKey);

                if (sk !== undefined) {
                    balance[idx].decrypted = sk;

                    for (const t of balance[idx].tasks) {
                        await t.cancel();
                    }
                }
            });

            balance[idx].tasks.push(task);
        }
    });

    balance.forEach(({ publicKey }, idx) => {
        const task = pool.queue(async worker => {
            const sk = await worker.solve(publicKey);

            if (sk !== undefined) {
                balance[idx].decrypted = sk;

                for (const t of balance[idx].tasks) {
                    await t.cancel();
                }
            }
        });

        balance[idx].tasks.push(task);
    });

    await allTasksCompleted;
    await pool.terminate(true);

    const elapsedMainTime = performance.now() - startMainTime;

    console.log(`Main time: ${elapsedMainTime / 1000} seconds`);

    console.log(balance);
})();
