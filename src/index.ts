import { spawn, Pool, Worker } from "threads"
import { generateKeyPair } from "./kangaroo";

const CHUNK_COUNT = 2;
const WORKERS = 6;
const MAX_TIME = 3000n;
const SECRET_COUNT = 200;

(async () => {
    let time = 0
    let highestTime = 0
    let lowestTime = 9999999999999;

    for (let i = 0; i < SECRET_COUNT; ++i) {
        const startMainTime = performance.now();

        await test();

        const endMainTime = performance.now();

        const elapsedMainTime = endMainTime - startMainTime;

        time += elapsedMainTime / 1000

        if (elapsedMainTime > highestTime) {
            highestTime = elapsedMainTime
        }

        if (elapsedMainTime < lowestTime) {
            lowestTime = elapsedMainTime
        }

        console.log(`Main time: ${elapsedMainTime/1000} seconds`);
        console.log("Processed " + (i + 1) + " / " + SECRET_COUNT + " secrets")
        console.log("Mean time: " + time / (i+1) + " seconds")
        console.log("----\n")
    }

    console.log("Highest time: " + highestTime/1000 + " seconds")
    console.log("Lowest time: " + lowestTime/1000 + " seconds")
    console.log("Mean time: " + time / SECRET_COUNT + " seconds");
})();

async function test() {
    const balance = Array.from({ length: CHUNK_COUNT }).map(_ => ({
        ...generateKeyPair(48),
        decrypted: undefined,
        taskCount: 0,
    }));

    // console.log("Balance:", balance);

    let resolveAllTasks: any;
    const allTasksCompleted = new Promise((resolve) => {
        resolveAllTasks = resolve;
    });

    const pool = Pool(() => spawn(new Worker("./worker")), {
       size: WORKERS,
    });

    // const startMainTime = performance.now();

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

        //console.log(`Calling ${idx} at ${performance.now() - startMainTime}ms`);

        ++balance[idx].taskCount;

        pool.queue(async worker => {
            const sk = await worker.solve(balance[idx].publicKey, MAX_TIME);

            --balance[idx].taskCount;

            if (sk !== undefined) {
                balance[idx].decrypted = sk;

                //console.log(`Decrypted ${idx} at ${performance.now() - startMainTime}ms`);
            } else {
                //console.log(`Failed ${idx} at ${performance.now() - startMainTime}ms`);
            }
        });
    }

    pool.events().subscribe(event => {
        if (event.type === "taskFailed") {
            console.error(event.error);
        }

        if (event.type === "taskCompleted") {
            task();
        }
    });

    for (let i = 0; i < WORKERS; ++i) {
        task();
    }

    await allTasksCompleted;
    await pool.terminate(true);

    // const elapsedMainTime = performance.now() - startMainTime;

    //console.log(`Main time: ${elapsedMainTime / 1000} seconds`);

    //console.log(balance);
}
