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

function isReferenceSuggestionRequest(
  textLine: string,
  cursorPosition: number
): boolean {
  let result: boolean = false;

  for (let i = cursorPosition; i > -1; i--) {
    const token = textLine[i];

    if (token == "{") {
      result = true;
      break;
    }
  }

  return result;
}

function arrayToString(arr: string[]): string {
  const stringifiedArray = arr.toString().replace(/,/g, "");

  return stringifiedArray;
}

function isConditionalPropSuggestionRequest(
  textLine: string,
  cursorPosition: number
): boolean {
  let result: boolean = false;
  const conditionalAttrRegExp = /_if=|_elseIf=|_ifNot=/g;
  const attrRegExp = /(:?[A-Z]+)=/i;
  let body: string[] = [];
  let breakTheLoop: boolean = false;

  for (let index = cursorPosition; index > -1; index--) {
    const token = textLine[index];
    if (/\s/.test(token)) {
      if (attrRegExp.test(arrayToString(body))) breakTheLoop = true;
      else if (conditionalAttrRegExp.test(arrayToString(body))) {
        result = true;
        breakTheLoop = true;
      }
    }
    if (breakTheLoop) break;
    body.unshift(token);
  }

  return result;
}

function insertParserComments(
  completionArray: vscode.CompletionItem[],
  position: vscode.Position
): vscode.CompletionItem[] {
  const startPoint = new vscode.Position(position.line, position.character - 1);
  const endPoint = new vscode.Position(position.line, position.character);

  const refSuggestion: vscode.CompletionItem = {
    label: "Reference identifier",
    detail: "HTML comment",
    documentation:
      "It appends an HTML comments used by Internal parser for reference suggestions.",
    kind: vscode.CompletionItemKind.Struct,
    insertText: "<!--ref = -->",
  };

  const conditionalSuggestion: vscode.CompletionItem = {
    label: "Conditional rendering identifier",
    detail: "HTML comment",
    documentation:
      "It appends an HTML comments used by Internal parser for conditional properties suggestions.",
    kind: vscode.CompletionItemKind.Struct,
    insertText: "<!--conditional = -->",
  };

  completionArray.push(refSuggestion, conditionalSuggestion);

  return completionArray;
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
    const triggerCharacter = context.triggerCharacter;

    console.log(triggerCharacter);
    if (token.isCancellationRequested) return;
    else if (triggerCharacter == "!")
      insertParserComments(completionArray, position);
    else if (triggerCharacter == void 0) {
      const textLine = document.lineAt(position).text;
      const cursorPosition = position.character;
      const reference = isReferenceSuggestionRequest(textLine, cursorPosition);
      const conditionalProp = isConditionalPropSuggestionRequest(
        textLine,
        cursorPosition
      );
      if (reference)
        runReferenceCompletionProvider(completionArray, completionInfo);
      else if (conditionalProp)
        runConditionlRenderingCompletionProvider(
          completionArray,
          completionInfo
        );
    }
    if (triggerCharacter == "{") {
      const canCheckCompletion: boolean = !outOfCompletionArea(
        document,
        position
      );
      if (canCheckCompletion)
        runReferenceCompletionProvider(completionArray, completionInfo);
    } else if (triggerCharacter == '"') {
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
    ...["{", '"', "!", '""']
  );

  context.subscriptions.push(disp, disp2);
}
