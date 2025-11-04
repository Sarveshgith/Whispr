import inquirer from 'inquirer';
import chalk from 'chalk';

export async function promptUser(message, defaultValue = true) {
    const response = await inquirer.prompt([{
        type: 'confirm',
        name: 'value',
        message: chalk.cyan(`${message}`),
        default: defaultValue
    }]);

    return response.value;
}

export async function promptChoice(choices, message = 'Choose an option:') {
    const response = await inquirer.prompt([
        {
            type: 'list',
            name: 'value',
            message: chalk.cyan(`${message}`),
            choices: choices.map((choice, i) => ({
                name: chalk.yellow(`[${i + 1}]`) + ` ${choice}`,
                value: i,
                short: choice
            }))
        }]);

    return response.value;
}

export async function promptMultiSelect(message, choices) {
    const response = await inquirer.prompt([{
        type: 'checkbox',
        name: 'value',
        message: chalk.cyan(`${message}`),
        choices: choices.map(c => ({
            name: c,
            value: c,
            checked: false
        })),
        validate: (answer) => {
            if (answer.length === 0) {
                return chalk.red('You must select at least one item.');
            }
            return true;
        }
    }]);

    return response.value;
}

export async function promptInput(message, defaultValue = '') {
    const response = await inquirer.prompt([{
        type: 'input',
        name: 'value',
        message: chalk.cyan(`${message}`),
        default: defaultValue,
        validate: (input) => {
            if (input.trim().length === 0 && !defaultValue) {
                return chalk.red('Input cannot be empty.');
            }
            return true;
        }
    }]);

    return response.value;
}

