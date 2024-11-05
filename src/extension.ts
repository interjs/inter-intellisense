import * as vscode from "vscode";
import { commentsParser, parserInfoInterface } from "./htmlcommentsparser";
import { parseHTML } from "./hop/index"
import { runHasNoreThanOneConditionalAttrsError, runIllegalValueError, runInvalidConditionalAttrNameError, runInvalidElseValueWarning, runInvalidTagForConditionalRendering, runUnregisteredConditionalPropError, runUnregisteredRefName } from "./errors"

const extensionVersion: string = "1.3.1";
const openTagRegExp = /<(:?[A-Z]+)>/gi;
interface configI {

  start: number;
  end: number;
  justWarning?: boolean;
  type: registeredT;
  errorMessage: string
}

type registeredT = "ref" | "conditional";

function getRegistered(
  document: string,
  type: registeredT
): parserInfoInterface | undefined {
  const registered = new commentsParser().parse(document);


  let returnValue;
  if (registered[0]?.type == type) returnValue = registered[0];
  else if (registered[1]?.type == type) returnValue = registered[1];
  return returnValue;
}

function findUnregisteredRef(
  documentContent: string,
  document: vscode.TextDocument
): configI[] | undefined {
  const refReg = /\{(:?\s+)*(:?[A-Z]+)(:?\s+)*\}/gi;
  const allRefs = documentContent.match(refReg) || [];
  const unregistered = [];
  const registered = getRegistered(documentContent, "ref");

  if (!registered) return;

  for (const ref of allRefs) {
    const text = ref.replace("{", "").replace("}", "").trim();
    const start = documentContent.indexOf(ref) + 1;
    const position = document.positionAt(start);


    const refSet = new Set(registered ? registered.content : []);

    if (refSet.has(text)) continue;
    else if (outOfCompletionArea(document, position)) continue;

    const config: configI = {

      start: start,
      end: documentContent.indexOf(ref) + ref.length,
      justWarning: true,
      type: "ref",
      errorMessage: runUnregisteredRefName(text)
    };

    unregistered.push(config);
  }

  return unregistered;
}



function generateConditionalConfig(start: number, end: number, error: string, warning?: boolean): configI {

  return {
    type: "conditional",
    start: start,
    end: end,
    errorMessage: error,
    justWarning: warning
  }

}

function findErrorInConditionalRendering(documentContent: string): configI[] {

  const domLikeObject = parseHTML(documentContent);
  const registeredC = getRegistered(documentContent, "conditional")
  const conditionalProps = new Set(registeredC ? registeredC.content : []);
  const conditionalAttrsNames = new Set(["_if", "_elseIf", "_else", "_ifNot"])
  const errorsCollection = []

  for (const element of domLikeObject) {

    let conditionalAttrsCounter = 0;


    if (Array.isArray(element.attrs) && element.attrs.length > 0) {

      if (conditionalProps.size == 0) break;

      for (const attr of element.attrs) {

        const { name, nameStart, nameEnd, value, valueSart, valueEnd } = attr
        const { tag, tagStart, tagEnd } = element;
        const refReg = /\{(:?\s+)*(:?[A-Z]+)(:?\s+)*\}/gi;
        //The content of these tags is non-visual
        //So, why on earth someone would use the conditional rendering attributes on them?
        //If that is the case we must warn the developer.
        const nonVisualTags: Set<string> = new Set(["script", "style"]);


        if (conditionalAttrsNames.has(name)) {
          conditionalAttrsCounter++;

          if (nonVisualTags.has(tag)) {

            errorsCollection.push(
              generateConditionalConfig(tagStart, tagEnd, runInvalidTagForConditionalRendering(tag))
            )
            break;

          }

          else if (conditionalAttrsCounter > 1) {
            errorsCollection.push(
              generateConditionalConfig(tagStart, tagEnd, runHasNoreThanOneConditionalAttrsError(tag))
            )
            break
          }
          else if (name !== "_else" && refReg.test(value)) {
            const refName = value.replace("{", "").replace("}", "").trim();
            errorsCollection.push(generateConditionalConfig(valueSart, valueEnd, runIllegalValueError(refName)));
            break;

          }
          else if (name == "_else" && value.trim().length > 0) {
            errorsCollection.push(generateConditionalConfig(valueSart, valueEnd, runInvalidElseValueWarning(value), true));
            break;
          }
          else if (name !== "_else" && value.trim().length == 0) {
            errorsCollection.push(generateConditionalConfig(nameStart, nameEnd, runInvalidConditionalAttrNameError(name)));
            break;
          }
          else if (!conditionalProps.has(value)) {
            errorsCollection.push(generateConditionalConfig(valueSart, valueEnd, runUnregisteredConditionalPropError(value)));
            break

          }

        }



      }

    }




  }

  return errorsCollection;




}


function getHoveredToken(cursorPosition: number, lineText: string): string {
  let body: string = "";

  for (let index = cursorPosition; index > -1; index--) {
    const token = lineText[index];

    if (/\s|{|"/.test(token)) {
      cursorPosition = index + 1;
      break;
    }
  }

  // something

  for (let index = cursorPosition; lineText.length > index; index++) {
    const token = lineText[index];

    if (/\s|}|"/.test(token)) break;
    else body += token;
  }

  return body;
}
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
          documentation: `${refName} is a reference's name`,
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
  const conditionalAttrRegExp = /_if=|_elseIf=|_ifNot/g;
  const attrRegExp = /(:?[A-Z]+)=/i;
  let body: string[] = [];
  let breakTheLoop: boolean = false;

  for (let index = cursorPosition; index > -1; index--) {
    const token = textLine[index];
    if (/\s/.test(token)) {
      const stringifiedBody = arrayToString(body);
      if (
        attrRegExp.test(stringifiedBody) &&
        conditionalAttrRegExp.test(stringifiedBody) == false
      ) {
        breakTheLoop = true;
      } else if (attrRegExp.test(stringifiedBody)) {
        result = true;
        breakTheLoop = true;
      }
    }

    if (breakTheLoop) break;
    body.unshift(token);
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
    const triggerCharacter = context.triggerCharacter;
    const textLine = document.lineAt(position).text;
    const cursorPosition = position.character;
    if (token.isCancellationRequested) return;
    else if (triggerCharacter == void 0) {
      const reference = isReferenceSuggestionRequest(textLine, cursorPosition);
      const conditionalProp = isConditionalPropSuggestionRequest(
        textLine,
        cursorPosition
      );
      const canCheckCompletion = !outOfCompletionArea(document, position);
      if (reference && canCheckCompletion)
        runReferenceCompletionProvider(completionArray, completionInfo);
      else if (conditionalProp && canCheckCompletion)
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
      const canCheckCompletion = isConditionalPropSuggestionRequest(
        textLine,
        cursorPosition
      );
      if (canCheckCompletion)
        runConditionlRenderingCompletionProvider(
          completionArray,
          completionInfo
        );
    }

    return completionArray;
  }
}

class onhoverInformation implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    positon: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    if (token.isCancellationRequested) return;

    type setOfString = Set<string>;
    const htmlContent = document.getText();
    const parserInfo = new commentsParser().parse(htmlContent);
    let ref: setOfString = new Set();
    let conditional: setOfString = new Set();
    const lineText = document.lineAt(positon).text;
    const hoverContent = getHoveredToken(positon.character, lineText);
    const refReg: RegExp = new RegExp(
      `{(:?\\s+)*${hoverContent}(:?\\s+)*}`,
      "g"
    );
    const conditionalRef: RegExp = new RegExp(
      `_if="${hoverContent}"|_ifNot="${hoverContent}"|_elseIf="${hoverContent}"|_if='${hoverContent}'|_ifNot='${hoverContent}'|_elseIf='${hoverContent}'`
    );
    const isRef: boolean = refReg.test(lineText);
    const isConditional: boolean = conditionalRef.test(
      lineText.replace(/\s/g, "")
    );
    const noHoverInfo = outOfCompletionArea(document, positon);

    for (const parser of parserInfo) {
      if (parser.type == "ref") ref = new Set(parser.content);
      else if (parser.type == "conditional")
        conditional = new Set(parser.content);
    }

    let message: string = "";
    const refDescription = `
    ${hoverContent} is a registered reference's name and
    its value will replace all { ${hoverContent} } under the same
    root element.
    
   `;
    const conditionalDescription = `
    ${hoverContent} is a registered conditional property.
    If ${hoverContent} is set to true, the element whose its
    conditional property is ${hoverContent} will be rendered.
    
   `;

    if (!noHoverInfo) {
      if (ref.has(hoverContent) && isRef) message = refDescription;
      else if (conditional.has(hoverContent) && isConditional)
        message = conditionalDescription;
    }

    const info: vscode.Hover = new vscode.Hover(
      new vscode.MarkdownString(message)
    );

    return info;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const diagnosticCollecction =
    vscode.languages.createDiagnosticCollection("InterError");

  function runDiagnosticLoop(
    unregisteredCollection: configI[],
    diagnostics: vscode.Diagnostic[],
    toPosition: Function
  ) {
    for (const prop of unregisteredCollection) {
      const start = toPosition(prop.start);
      const end = toPosition(prop.end);
      const diagnosticSeverity = vscode.DiagnosticSeverity;


      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(start, end),
        prop.errorMessage,
        prop.justWarning ? diagnosticSeverity.Warning : diagnosticSeverity.Error
      );

      diagnostics.push(diagnostic);
    }
  }

  function runDiagnosticCode(document: vscode.TextDocument) {
    const documentContent = document.getText();
    const toPosition = (offset: number) => document.positionAt(offset);
    const diagnostics: vscode.Diagnostic[] = [];
    const unregisteredConditional = findErrorInConditionalRendering(documentContent);
    const unregisteredRef = findUnregisteredRef(documentContent, document);

    if (unregisteredConditional) runDiagnosticLoop(unregisteredConditional, diagnostics, toPosition);
    if (unregisteredRef) runDiagnosticLoop(unregisteredRef, diagnostics, toPosition);

    diagnosticCollecction.set(document.uri, diagnostics);
  }

  vscode.workspace.onDidOpenTextDocument((document) => {
    runDiagnosticCode(document);
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    runDiagnosticCode(event.document);
  });

  vscode.window.onDidChangeActiveTextEditor(() => {
    console.log("Here!");
  });

  vscode.window.showInformationMessage(`
	Inter HTML intellisense is now activated, have a nice coding section!
	`);

  const disp = vscode.commands.registerCommand("inter.version", () => {
    vscode.window.showInformationMessage(
      `You're using Interjs HTML intellisense version: ${extensionVersion} .`
    );
  });

  const disp2 = vscode.languages.registerCompletionItemProvider(
    "html",
    new InterjsHTMLIntellisense(),
    ...["{", '"']
  );

  const disp3 = vscode.languages.registerHoverProvider(
    "html",
    new onhoverInformation()
  );

  context.subscriptions.push(disp, disp2, disp3, diagnosticCollecction);
}
