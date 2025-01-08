import { spawn, Pool, Worker } from "threads"
import { generateKeyPair } from "./kangaroo";

const WORKERS = 4;
const MAX_TIME = 1500n;

(async () => {
    const balance = Array.from({ length: 4 }).map(_ => ({
        ...generateKeyPair(48),
        decrypted: undefined,
        taskCount: 0,
    }));

    console.log("Balance:", balance);

    let resolveAllTasks: any;
    const allTasksCompleted = new Promise((resolve) => {
        resolveAllTasks = resolve;
    });

    const pool = Pool(() => spawn(new Worker("./worker")), {
       size: WORKERS,
    });

    const startMainTime = performance.now();

    const task = () => {
        let idx = -1;

        balance.forEach((chunk, i) => {
            if (
                chunk.decrypted === undefined &&
                (idx === -1 || chunk.taskCount < balance[idx].taskCount)
            ) {
                idx = i;
            }
        });

        if (idx === -1) {
            resolveAllTasks(true);
            return;
        }

        console.log(`Calling ${idx} at ${performance.now() - startMainTime}ms`);

        ++balance[idx].taskCount;

        pool.queue(async worker => {
            const sk = await worker.solve(balance[idx].publicKey, MAX_TIME);

            --balance[idx].taskCount;

            if (sk !== undefined) {
                balance[idx].decrypted = sk;

                console.log(`Decrypted ${idx} at ${performance.now() - startMainTime}ms`);
            } else {
                console.log(`Failed ${idx} at ${performance.now() - startMainTime}ms`);
            }
        });
    }

    pool.events().subscribe(event => {
        if (event.type === "taskFailed") {
            console.error(event.error);
        }

        if (event.type === "taskCompleted" || event.type == "taskQueueDrained") {
            task();
        }
    });

    for (let i = 0; i < WORKERS; ++i) {
        task();
    }

    await allTasksCompleted;
    await pool.terminate(true);

    const elapsedMainTime = performance.now() - startMainTime;

    console.log(`Main time: ${elapsedMainTime / 1000} seconds`);

    console.log(balance);
})();
