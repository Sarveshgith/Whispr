import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const getConfigPath = () => {
    const configDir = path.join(os.homedir(), '.whispr');
    const configFile = path.join(configDir, 'config.json');
    return { configDir, configFile };
};

export const saveApiKey = (key) => {
    const { configDir, configFile } = getConfigPath();

    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    let config = {};
    if (fs.existsSync(configFile)) {
        config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    }

    config.apiKey = key;

    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    console.log(chalk.green('✓ API key saved successfully!'));
    console.log(chalk.dim(`Config location: ${configFile}`));
};

export const getApiKey = () => {
    const { configFile } = getConfigPath();

    if (!fs.existsSync(configFile)) {
        return null;
    }

    try {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        return config.apiKey || null;
    } catch (error) {
        return null;
    }
};

export const hasApiKey = () => {
    return getApiKey() !== null;
};

export const checkApiKey = () => {
    if (!hasApiKey()) {
        console.error(chalk.red('✗ No API key found!'));
        console.log(chalk.yellow('\nPlease set your Gemini API key first:'));
        console.log(chalk.cyan('  whispr set api-key YOUR_GEMINI_API_KEY'));
        console.log(chalk.dim('\nGet your API key from: https://aistudio.google.com/app/api-keys'));
        process.exit(1);
    }
};