
import * as vscode from 'vscode';

const extensionVersion: string = "1.0.0";

export function activate(context: vscode.ExtensionContext) {

	vscode.window.showInformationMessage(`
	Inter intellisense is now activated, Have a nice coding section!
	`)
	
	
	const disp1 = vscode.commands.registerCommand("inter.version", ()=> {
	vscode.window.showInformationMessage(`You're using version ${extensionVersion} of the extension`)
	
	});

	const disp2 = vscode.commands.registerCommand("inter.exit", () => {
		deactivate();

	})

	
	
	context.subscriptions.push(disp1, disp2);

}

export function deactivate() {

	vscode.window.showWarningMessage(`Inter intellisense was deactivated`)

}
