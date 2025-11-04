import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';
import prompt from '../utils/genPrompts.js';

config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function main() {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const testDiff = `
        diff --git a/src/utils/helpers.js b/src/utils/helpers.js
        index 23a4b17..d9f5b21 100644
        --- a/src/utils/helpers.js
        +++ b/src/utils/helpers.js
        @@ -10,7 +10,12 @@ export function formatDate(date) {
        const d = new Date(date);
        -  return d.toLocaleDateString();
        +  return d.toLocaleString('en-IN', {
        +    day: '2-digit',
        +    month: 'short',
        +    year: 'numeric',
        +    hour: '2-digit',
        +    minute: '2-digit'
        +  });
        }
        `;

    try {

        const diffToAnalyze = testDiff;

        const promptText = prompt.replace('${diff}', diffToAnalyze);
        const result = await model.generateContent(promptText);
        console.log(result.response.text());
    } catch (error) {
        console.error('Error:', error.message);
        const promptText = prompt.replace('${diff}', testDiff);
        const result = await model.generateContent(promptText);
        console.log('Using test diff:', result.response.text());
    }
}

main().catch(console.error);
