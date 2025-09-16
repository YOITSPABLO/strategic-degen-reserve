// DOM Elements
const terminalOutput = document.getElementById('terminalOutput');
const countdownElement = document.querySelector('.countdown');
const solTallyElement = document.querySelector('.sol-tally');

// Global vars
let totalSolDistributed = 0;
let walletIndex = 0;
const wallets = ['Wallet1', 'Wallet2', 'Wallet3']; // Mock wallets for demo scanning
const BACKEND_URL = 'https://solrewards-1x9y6amxi-pablos-projects-26cc46ce.vercel.app'; // Use the latest URL
const BYPASS_TOKEN = '0QuZG5vQsYHZvaaGsOeNwoDS'; // Replace with your token

// Fetch backend status
async function fetchStatus() {
    try {
        const response = await fetch(`${BACKEND_URL}/status?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${BYPASS_TOKEN}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        terminalOutput.innerHTML += `<p>[${new Date().toLocaleTimeString()}] Backend status: ${data.message}</p>`;
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    } catch (err) {
        terminalOutput.innerHTML += `<p>[${new Date().toLocaleTimeString()}] Backend error: ${err.message}</p>`;
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
}

// Trigger refund distribution
async function distributeRefunds() {
    try {
        const response = await fetch(`${BACKEND_URL}/distribute?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${BYPASS_TOKEN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (data.success) {
            totalSolDistributed += parseFloat(data.distributed);
            solTallyElement.textContent = `Total SOL Distributed: ${totalSolDistributed.toFixed(2)} SOL`;
            terminalOutput.innerHTML += `<p>[${new Date().toLocaleTimeString()}] Distributed: ${data.distributed} SOL. Tx: ${data.signature || 'Pending'}</p>`;
        } else {
            terminalOutput.innerHTML += `<p>[${new Date().toLocaleTimeString()}] Distribution failed: ${data.error}</p>`;
        }
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    } catch (err) {
        terminalOutput.innerHTML += `<p>[${new Date().toLocaleTimeString()}] Distribution error: ${err.message}</p>`;
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
}

// Update countdown and trigger distribution on cycle end
function updateCountdown() {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const msUntilNextCycle = (30 - (minutes % 30)) * 60 * 1000 - (seconds * 1000);
    const minutesRemaining = Math.floor(msUntilNextCycle / (1000 * 60));
    const secondsRemaining = Math.floor((msUntilNextCycle % (1000 * 60)) / 1000);
    countdownElement.textContent = `Next Refund Cycle: ${minutesRemaining}m ${secondsRemaining}s`;
    if (msUntilNextCycle <= 0) {
        distributeRefunds(); // Trigger distribution when cycle ends
    }
}

// Mock wallet scanning (remove or enhance with real data later)
function processWallet() {
    if (walletIndex >= wallets.length) walletIndex = 0;
    terminalOutput.innerHTML += `<p>[${new Date().toLocaleTimeString()}] Scanning ${wallets[walletIndex]}...</p>`;
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
    walletIndex++;
    setTimeout(processWallet, 4000); // 4-second interval
}

// Initialize
fetchStatus(); // Check backend status on load
setInterval(updateCountdown, 1000); // Update countdown every second
updateCountdown(); // Initial countdown
processWallet(); // Start mock scanning