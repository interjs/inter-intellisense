import { isASpace, isACharacter, mergeAttr, resetElementProps } from "./helpers"
import type { attrsI, htmlStructureI, parserSettingI } from "./types"

function runParsing(token: string, element: htmlStructureI, attribute: attrsI<string>, parserSetting: parserSettingI, html: htmlStructureI[], index: number) {
    const {
        tagName,
        attrName,
        attrValue,
        parsingTag,
        parsingAttrs,
        nowLookingAtValue,
    } = parserSetting

    if (!parsingTag && token == "<") {
        parserSetting.parsingTag = true;
        element.tagStart = index;
        if (parserSetting.tagName) parserSetting.tagName = "";
        
    }

    else if (parsingTag && tagName.trim().length == 0 && isACharacter(token)) {


        if (isACharacter(token)) parserSetting.tagName += token;

    }

    else if (parsingAttrs && token == ">") {
        if (parserSetting.attrName && !attribute.name) {
            attribute.name = attrName;
            parserSetting.attrName = "";
        }

        if (attribute.name) {
            mergeAttr(attribute, element, attrValue)
            parserSetting.attrValue = "";
            parserSetting.attrName = "";
            parserSetting.nowLookingAtValue = false;
            parserSetting.parsingAttrs = false;
        }

        element.tagEnd = index;

        html.push(
            Object.assign({}, element)
        );

        resetElementProps(element)

        parserSetting.parsingAttrs = false;

    }

    else if (parsingTag && token == ">") {


        if (parserSetting.tagName && !element.tag) {
            element.type = "Tag";
            element.tag = tagName;
            parserSetting.parsingTag = false;
        }

        element.tagEnd = index;

        html.push(
            Object.assign({}, element)
        );

        resetElementProps(element)


        parserSetting.parsingAttrs = false;

    }


    else if (parsingAttrs && attrName.trim().length > 0 && isASpace(token) && !nowLookingAtValue) {
        //It's not necessary to have the = to be considered
        // as a valid attribute
        // for instance <input type="text" _else>


        attribute.name = attrName;
        attribute.nameEnd = index;
        mergeAttr(attribute, element, "");

        parserSetting.attrName = "";


    }

    else if (parsingTag && tagName && isACharacter(token)) {
        parserSetting.tagName += token;

    }

    else if (parsingTag && tagName && isASpace(token)) {
        // Okay, we have found the complete tag's name

        parserSetting.parsingTag = false;
        parserSetting.parsingAttrs = true;
        element.tag = tagName;
        element.type = "Tag";
        parserSetting.tagName = "";
    }
    else if (parsingAttrs && !attrName && token.trim().length > 0 && !nowLookingAtValue || parsingAttrs && attrName && token && token !== "=") {
        parserSetting.attrName += token
        if (!attrName) attribute.nameStart = index;
    }


    else if (parsingAttrs && attrName && token == "=") {
        //Okay now we have the attribute's name.

        attribute.name = attrName;
        attribute.nameEnd = index;
        parserSetting.attrName = "";
        parserSetting.nowLookingAtValue = true;

    }

    else if (parsingAttrs && nowLookingAtValue && !attrValue && (token == "'" || token == '"')) {
        // Okay we have to skip the attribute's value opening
        return;

    }

    else if (parsingAttrs && nowLookingAtValue && attrValue && (token == "'" || token == '"')) {
        attribute.valueEnd = index;
        mergeAttr(attribute, element, attrValue)
        parserSetting.attrValue = "";
        parserSetting.nowLookingAtValue = false;

    }

    else if (parsingAttrs && nowLookingAtValue && !attrValue && token || parsingAttrs && nowLookingAtValue && attrValue && token) {
        if (!attrValue) attribute.valueSart = index;
        parserSetting.attrValue += token;

    }

}

export function parseHTML(content: string): htmlStructureI[] {


    const html: htmlStructureI[] = [];
    const element: htmlStructureI = {
        type: null,
        tag: "",
        tagStart: 0,
        tagEnd: 0,
        attrs: []

    }

    const attribute: attrsI<string> = {
        name: "",
        value: "",
        nameStart: 0,
        nameEnd: 0,
        valueSart: 0,
        valueEnd: 0
    }


    const parserSetting: parserSettingI = {
        tagName: "",
        attrName: "",
        attrValue: "",
        nowLookingAtValue: false,
        parsingTag: false,
        parsingAttrs: false,
        parsingNested: false
    }

    for (let i = 0; i < content.length; i++) {
        const token = content[i];
        const nextToken = content[i + 1];

        if (token == "<" && (nextToken == "/" || nextToken == "!")) continue;


        runParsing(token, element, attribute, parserSetting, html, i);


    }

    return html;

}

