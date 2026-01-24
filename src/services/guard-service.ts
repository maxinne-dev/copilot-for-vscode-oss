import * as vscode from 'vscode';
import * as os from 'os';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class GuardService {
    private readonly restrictedTerms = [
        'boticario',
        'cea',
        'vtex',
        'aliare',
        'vistra',
        'siagri',
        'tahto'
    ];

    public async validateEnvironment(): Promise<{ allowed: boolean; reason?: string }> {
        // 1. Check User Home Directory
        const userHome = os.homedir();
        if (this.containsRestrictedTerm(userHome)) {
            return { allowed: false, reason: 'User home directory contains restricted terms.' };
        }

        // 2. Check Workspace Folders (Current Directory)
        const workspaceFolders = vscode.workspace.workspaceFolders;
        console.log('[GuardService] Checking workspace folders:', workspaceFolders?.map(f => f.uri.fsPath));

        if (workspaceFolders) {
            for (const folder of workspaceFolders) {
                console.log('[GuardService] Checking folder:', folder.uri.fsPath);
                if (this.containsRestrictedTerm(folder.uri.fsPath)) {
                    console.log('[GuardService] Blocked by folder path:', folder.uri.fsPath);
                    return { allowed: false, reason: 'Workspace path contains restricted terms.' };
                }

                // 4. Check package.json in workspace root
                const packageJsonPath = path.join(folder.uri.fsPath, 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                    try {
                        const content = fs.readFileSync(packageJsonPath, 'utf-8');
                        if (this.containsRestrictedTerm(content)) {
                            return { allowed: false, reason: 'package.json contains restricted terms.' };
                        }
                    } catch (e) {
                        console.error('Error reading package.json', e);
                    }
                }
            }
        }

        // 3. Check Git Email
        try {
            const gitEmail = await this.getGitEmail();
            if (gitEmail && this.containsRestrictedTerm(gitEmail)) {
                return { allowed: false, reason: 'Git email contains restricted terms.' };
            }
        } catch (error) {
            // Ignore if git is not configured or fails
            console.warn('Failed to get git email', error);
        }

        return { allowed: true };
    }

    private containsRestrictedTerm(text: string): boolean {
        const lowerText = text.toLowerCase();
        return this.restrictedTerms.some(term => lowerText.includes(term));
    }

    private getGitEmail(): Promise<string | null> {
        return new Promise((resolve) => {
            cp.exec('git config user.email', { cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir() }, (err, stdout) => {
                if (err) {
                    resolve(null);
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }
}
