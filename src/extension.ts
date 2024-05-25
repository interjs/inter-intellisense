import * as vscode from "vscode";

const extensionVersion: string = "1.0.0";

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage(`
	Inter HTML intellisense is now activated, have a nice coding section!
	`);

  const disp = vscode.commands.registerCommand("inter.version", () => {
    vscode.window.showInformationMessage(
      `You're using version ${extensionVersion} of the extension.`
    );
  });


  context.subscriptions.push(disp);
}

export function deactivate() {
  vscode.window.showWarningMessage(`Inter HTML intellisense was deactivated.`);
}
