require('dotenv').config();
const express = require('express');
const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } = require('@solana/spl-token');
const bs58 = require('bs58');
const app = express();
app.use(express.json());

// Configuration
const connection = new Connection(process.env.RPC_ENDPOINT, 'confirmed');
const TOKEN_MINT_ADDRESS = new PublicKey(process.env.TOKEN_MINT_ADDRESS);
const DEV_FEE_WALLET = new PublicKey(process.env.DEV_FEE_WALLET);
const TOTAL_SUPPLY = 1000000000 * 1e6; // 1B tokens with 6 decimals
const payer = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY));

// Fetch all token holders
async function fetchHolders() {
    const tokenAccounts = await connection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID,
        {
            filters: [
                { dataSize: 165 },
                { memcmp: { offset: 0, bytes: TOKEN_MINT_ADDRESS.toBase58() } }
            ]
        }
    );
    const holders = new Map();
    let totalHeld = 0;
    for (const account of tokenAccounts) {
        const balance = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
        const owner = account.account.data.parsed.info.owner;
        if (balance > 0) {
            totalHeld += balance;
            holders.set(owner, balance);
        }
    }
    return { holders, totalHeld };
}

// Distribute SOL based on holdings
async function distributeRefunds() {
    const { holders, totalHeld } = await fetchHolders();
    const feeSol = await connection.getBalance(DEV_FEE_WALLET) / LAMPORTS_PER_SOL;
    let distributed = 0;
    const transaction = new Transaction();
    for (const [owner, balance] of holders) {
        const percentage = (balance / totalHeld) * 100;
        const share = (percentage / 100) * feeSol;
        if (share > 0) {
            const recipientATA = await getAssociatedTokenAddress(TOKEN_MINT_ADDRESS, new PublicKey(owner));
            transaction.add(
                createTransferInstruction(
                    DEV_FEE_WALLET,
                    recipientATA,
                    payer.publicKey,
                    Math.floor(share * LAMPORTS_PER_SOL),
                    [],
                    TOKEN_PROGRAM_ID
                )
            );
            distributed += share;
        }
    }
    if (distributed > 0) {
        transaction.feePayer = payer.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.sign(payer);
        const signature = await connection.sendRawTransaction(transaction.serialize());
        await connection.confirmTransaction(signature);
        return { distributed, signature };
    }
    return { distributed: 0, signature: null };
}

// API Endpoints
app.get('/status', (req, res) => {
    res.json({ message: 'Backend running', time: new Date().toISOString() });
});

app.post('/distribute', async (req, res) => {
    try {
        const { distributed, signature } = await distributeRefunds();
        res.json({ distributed: distributed.toFixed(4), signature, success: true });
    } catch (err) {
        console.error('Distribution error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));