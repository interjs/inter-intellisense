type arrayOfStrings = string[];
export interface parserInfoInterface {
  type: string;
  content: arrayOfStrings;
}

interface commentsParserInterface {
  parse(html: string): parserInfoInterface[];
}

export class commentsParser implements commentsParserInterface {
  parse(html: string) {
    const filteredComments = getTheComments(html);
    const parserInfo = parseTheComments(filteredComments);
    return parserInfo;
  }
}

function getTheComments(html: string): arrayOfStrings {
  //We have to skip the non-content comments, just in case.
  const htmlCommentsRegExp: RegExp =
    /<!--(:?\s+)*(:?[A-Z]+)(:?\s+)*=(:?\s+)* (:?[A-Z\s]+)(:?\s+)*-->/gi;
  let filteredComments: arrayOfStrings = [];

  if (htmlCommentsRegExp.test(html)) {
    html = html.replace(htmlCommentsRegExp, (comment) => {
      comment = comment.replace(/<!--/g, "").replace(/-->/g, "");
      filteredComments.push(comment);
      return "";
    });
  }

  return filteredComments;
}

function parseTheComments(comments: arrayOfStrings): parserInfoInterface[] {
  let parserInfo: parserInfoInterface[] = new Array();
  const types: Set<string> = new Set();

  for (const comment of comments) {
    const info = walkThroughTheComment(comment);
    if (info.type && !types.has(info.type)) parserInfo.push(info);
  }

  return parserInfo;
}

function walkThroughTheComment(comment: string): parserInfoInterface {
  const commentsTokens: arrayOfStrings = comment.split(/\s+/);
  const concepts: Set<string> = new Set(["ref", "conditional"]);
  let foundConcept: boolean = false;
  const info: parserInfoInterface = { type: "", content: [] };

  for (const token of commentsTokens) {
    if (concepts.has(token)) {
      foundConcept = true;
      info.type = token;
    } else if (token == "=") continue;
    else if (foundConcept) {
      info.content.push(token);
    }
  }

  return info;
}
