type s = string;

export interface attrsI<T> {
    name: T,
    value: T,
    nameStart: number,
    nameEnd: number,
    valueSart: number,
    valueEnd: number

}

export interface htmlStructureI {
    type: "Tag" | "Text" | null
    tag: s,
    tagStart: number,
    tagEnd: number,
    attrs: attrsI<s>[]

}

export interface parserSettingI {
    tagName: s,
    attrName: s,
    attrValue: s,
    nowLookingAtValue: boolean,
    parsingTag: boolean,
    parsingAttrs: boolean,
    parsingNested: boolean
}