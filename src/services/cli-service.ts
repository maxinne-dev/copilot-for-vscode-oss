import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Service for interacting with the Copilot CLI.
 * Handles command execution and output parsing.
 */
export class CliService {
    private static readonly MODEL_ERROR_PREFIX = "error: option '--model <model>' argument 'list' is invalid. Allowed choices are ";
    private static readonly MODEL_ERROR_SUFFIX = ".";

    /**
     * Retrieves the list of available models by parsing the error output
     * from the `copilot --model list` command.
     * 
     * @returns Promise<string[]> Array of available model IDs
     * @throws Error if copilot CLI is not installed or returns unexpected format
     */
    async getAvailableModels(): Promise<string[]> {
        try {
            // Run the command - this will fail with an error listing available models
            const result = await execAsync('copilot --model list');
            console.log('[CliService] Command stdout:', result.stdout);
            console.log('[CliService] Command stderr:', result.stderr);

            // If we get here, the command succeeded unexpectedly
            throw new Error('Unexpected: copilot --model list succeeded. Expected an error with model list.');
        } catch (error: unknown) {
            // The command should fail with an error containing the model list
            const execError = error as { stderr?: string; stdout?: string; message?: string };
            console.log('[CliService] Caught error:', JSON.stringify({
                stderr: execError.stderr,
                stdout: (execError as any).stdout,
                message: execError.message
            }, null, 2));

            const errorOutput = execError.stderr || execError.message || '';
            console.log('[CliService] Using errorOutput:', errorOutput);

            return this.parseModelListFromError(errorOutput);
        }
    }

    /**
     * Parses the model list from the CLI error output.
     * 
     * Expected format:
     * "error: option '--model <model>' argument 'list' is invalid. Allowed choices are model1, model2, model3."
     * 
     * @param errorOutput The stderr output from the copilot command
     * @returns Array of model IDs
     * @throws Error if the format is unexpected or copilot is not installed
     */
    private parseModelListFromError(errorOutput: string): string[] {
        // Check if copilot command was not found
        if (errorOutput.includes('is not recognized') ||
            errorOutput.includes('command not found') ||
            errorOutput.includes('ENOENT')) {
            throw new Error(
                'Copilot CLI is not installed or not in PATH. ' +
                'Please install the Copilot CLI and ensure it is accessible.'
            );
        }

        // Find the expected error message format
        const prefixIndex = errorOutput.indexOf(CliService.MODEL_ERROR_PREFIX);
        if (prefixIndex === -1) {
            throw new Error(
                'Unexpected error format from Copilot CLI. ' +
                `Expected error containing model list, got: ${errorOutput.substring(0, 200)}`
            );
        }

        // Extract the model list portion
        const startIndex = prefixIndex + CliService.MODEL_ERROR_PREFIX.length;

        // Find the LAST period (the one ending the sentence, not periods in version numbers like "4.5")
        let endIndex = errorOutput.lastIndexOf(CliService.MODEL_ERROR_SUFFIX);

        // If no trailing period found or it's before our start, use end of string
        if (endIndex === -1 || endIndex < startIndex) {
            endIndex = errorOutput.length;
        }

        const modelListString = errorOutput.substring(startIndex, endIndex).trim();
        console.log('[CliService] Extracted model list string:', modelListString);

        if (!modelListString) {
            throw new Error('No models found in Copilot CLI output.');
        }

        // Split by "," to get individual model names
        const models = modelListString.split(',').map(model => model.trim()).filter(Boolean);
        console.log('[CliService] Parsed models:', models);

        if (models.length === 0) {
            throw new Error('Failed to parse model list from Copilot CLI output.');
        }

        return models;
    }
}
