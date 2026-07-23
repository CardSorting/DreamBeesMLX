import { executeSubstrateGeneration } from "#substrate/client";

const ENDPOINT = "https://mariecoderinc--sdxl-multi-model-rtx6000-omniinferencertx-dad1ae.modal.run";

async function run() {
    const body = {
        prompt: "A cute cat",
        model: "wai-illustrious",
        negative_prompt: "",
        steps: 30,
        width: 1024,
        height: 1024,
        scheduler: "DPM++ 2M Karras"
    };

    console.log("Submitting request...");
    const buffer = await executeSubstrateGeneration(ENDPOINT, body, {
        pollIntervalMs: 4000,
        onPending: (poll) => console.log(`Poll attempt ${poll + 1}... still processing`)
    });

    console.log(`Success! Received image buffer (${buffer.length} bytes).`);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
