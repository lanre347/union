const { exec } = require('child_process');

// Scripts organized by batches
const scriptBatches = {
    ethereum: [
        'Holesky-Babylon.js',
        'Holesky-Sepolia.js',
        'Holesky-Xion.js',
        'Sepolia-Babylon.js',
        'Sepolia-Holesky.js',
    ],
    other: [
        'BSC-Babylon.js',
        'Corn-Sei.js',
        'SEI-BSC.js',
    ]
};

// Function to run a single script
function runScript(script) {
    return new Promise((resolve) => {
        console.log(`Starting script: ${script}`);
        const process = exec(`node ${script}`);

        process.stdout.on('data', (data) => {
            console.log(`[${script}] ${data.trim()}`);
        });

        process.stderr.on('data', (data) => {
            console.error(`[${script} ERROR] ${data.trim()}`);
        });

        process.on('close', (code) => {
            console.log(`[${script}] exited with code ${code}`);
            resolve(code);
        });
    });
}

// Function to run scripts in a batch sequentially
async function runBatch(batchName, scripts) {
    console.log(`\n=========== STARTING BATCH: ${batchName.toUpperCase()} ===========\n`);

    for (const script of scripts) {
        try {
            await runScript(script);
        } catch (error) {
            console.error(`Error running ${script}: ${error.message}`);
        }
    }

    console.log(`\n=========== COMPLETED BATCH: ${batchName.toUpperCase()} ===========\n`);
}

// Main function to run all batches
async function main() {
    // Get batch from command line arguments or run all batches
    const requestedBatch = process.argv[2];

    if (requestedBatch && scriptBatches[requestedBatch]) {
        // Run specific batch if specified
        await runBatch(requestedBatch, scriptBatches[requestedBatch]);
    } else if (requestedBatch === 'all') {
        // Run all batches sequentially
        for (const [batchName, scripts] of Object.entries(scriptBatches)) {
            await runBatch(batchName, scripts);
        }
    } else {
        // Show usage information if batch not found
        console.log('Available batches:');
        Object.keys(scriptBatches).forEach(batch => {
            console.log(`- ${batch} (${scriptBatches[batch].length} scripts)`);
        });
        console.log('- all (run all batches)');
        console.log('\nUsage: node index.js [batch-name]');
    }
}

// Start the execution
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
