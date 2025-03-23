// Script to start ngrok tunnel and update .env file with the tunnel URL.
import ngrok from 'ngrok';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const ENV_PATH = path.resolve(process.cwd(), '.env');

async function updateEnvWithNgrok() {
  try {
    const port = process.env.PORT || 3000;

    const url = await ngrok.connect({ addr: port });
    console.log(`🌐 Ngrok Tunnel Started at: ${url}`);

    const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    const newLine = `BACKEND_URL=${url}`;

    let updatedEnv;

    if (envContent.includes('BACKEND_URL=')) {
      updatedEnv = envContent.replace(/BACKEND_URL=.*/g, newLine);
    } else {
      updatedEnv = envContent.trim() + `\n${newLine}`;
    }

    fs.writeFileSync(ENV_PATH, updatedEnv, 'utf-8');
    console.log('✅ .env file updated with BACKEND_URL');
  } catch (err) {
    console.error('❌ Failed to update .env with ngrok URL:', err.message);
  }
}

updateEnvWithNgrok();
