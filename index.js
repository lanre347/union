const { exec } = require('child_process');
const { cron } = require('node-cron');

const scripts = [
    'GA_Holesky-Babylon.js',
    'GA_Holesky-Sepolia.js',
    'GA_Holesky-Xion.js',
    'GA_Sepolia-Babylon.js',
    'GA_Sepolia-Holesky.js',
];

function runScript(script) {
    const process = exec(`node ${script}`);

    process.stdout.on('data', (data) => {
        console.log(`[${script}] ${data.trim()}`);
    });

    process.stderr.on('data', (data) => {
        console.error(`[${script} ERROR] ${data.trim()}`);
    });

    process.on('close', (code) => {
        console.log(`[${script}] exited with code ${code}`);
    });
}

// Jalankan semua script secara paralel
cron.schedule('0 */12 * * *', () => {
    scripts.forEach(runScript);
});
