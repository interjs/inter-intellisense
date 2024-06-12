import * as vscode from "vscode";
import { commentsParser, parserInfoInterface } from "./htmlcommentsparser";

const extensionVersion: string = "1.2.0";
const openTagRegExp = /<(:?[A-Z]+)>/gi;
function runReferenceCompletionProvider(
  completionArray: vscode.CompletionItem[],
  completionInfo: parserInfoInterface[]
): void {
  for (const item of completionInfo) {
    if (item.type == "ref") {
      for (const refName of item.content) {
        const item: vscode.CompletionItem = {
          label: refName,
          detail: "string|number",
          documentation: `${refName} is a reference name`,
          kind: vscode.CompletionItemKind.Variable,
        };
        completionArray.push(item);
      }
    }
  }
}

function runConditionlRenderingCompletionProvider(
  completionArray: vscode.CompletionItem[],
  completionInfo: parserInfoInterface[]
): void {
  for (const item of completionInfo) {
    if (item.type == "conditional") {
      for (const propName of item.content) {
        const item: vscode.CompletionItem = {
          label: propName,
          detail: "boolean",
          documentation: `${propName} is a conditional property.`,
          kind: vscode.CompletionItemKind.Variable,
        };
        completionArray.push(item);
      }
    }
  }
}

function outOfCompletionArea(
  document: vscode.TextDocument,
  position: vscode.Position
): boolean {
  let noCompletion: boolean = false;

  for (let line = position.line; line > -1; line--) {
    const forbiddenTagsForCompletionRegExp = /<script>|<style>|<noscript>/gi;
    const lineText = document.lineAt(line).text;

    if (openTagRegExp.test(lineText)) {
      if (forbiddenTagsForCompletionRegExp.test(lineText)) {
        noCompletion = true;
        break;
      } else break;
    }
  }

  return noCompletion;
}

function isConditionalAttr(
  document: vscode.TextDocument,
  position: vscode.Position
): boolean {
  const lineText = document.lineAt(position).text;
  const conditionalAttrRegExp = /_if=""|_elseIf=""|_ifNot=""/g;
  let result: boolean = false;
  const tagWithAttrsRegExp = /<(?:[\s\S]+)>/g;

  if (tagWithAttrsRegExp.test(lineText)) {
    if (conditionalAttrRegExp.test(lineText)) result = true;
  }

  return result;
}

class InterjsHTMLIntellisense implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const htmlContent = document.getText();
    const completionInfo = new commentsParser().parse(htmlContent);
    const completionArray: vscode.CompletionItem[] = [];

    if (token.isCancellationRequested) return;
    if (context.triggerCharacter == "{") {
      const canCheckCompletion: boolean = !outOfCompletionArea(
        document,
        position
      );
      if (canCheckCompletion)
        runReferenceCompletionProvider(completionArray, completionInfo);
    } else if (context.triggerCharacter == '"') {
      const canCheckCompletion = isConditionalAttr(document, position);
      if (canCheckCompletion)
        runConditionlRenderingCompletionProvider(
          completionArray,
          completionInfo
        );
    }

    return completionArray;
  }
}

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage(`
	Inter HTML intellisense is now activated, have a nice coding section!
	`);

  const disp = vscode.commands.registerCommand("inter.version", () => {
    vscode.window.showInformationMessage(
      `You're using version ${extensionVersion} of the extension.`
    );
  });

  const disp2 = vscode.languages.registerCompletionItemProvider(
    "html",
    new InterjsHTMLIntellisense(),
    ...["{", '"']
  );

  context.subscriptions.push(disp, disp2);
}
