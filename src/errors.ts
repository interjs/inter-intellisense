export function runUnregisteredConditionalPropError(prop: string): string {

    return ` ${prop} is not a registered conditional property. Register it like:

            <!--conditional = ${prop}-->
    `

}

export function runIllegalValueError(value: string): string {

    return `${value} seems to be a reference's name, avoid this please!`

}

export function runHasNoreThanOneConditionalAttrsError(tagName: string | undefined): string {


    return ` This ${tagName} tag has more than one conditional attribute, it's forbidden.`

}

export function runInvalidConditionalAttrNameError(attr: string): string {

    return ` Attribute ${attr} is invalid here, because it has an empty value, assign a value to it.`

}

export function runInvalidElseValueWarning(value: string): string {

    return ` Remove ${value}, _else is not supposed to have a value.`


}

export function runUnregisteredRefName(refName: string): string {

    return `${refName} is an unregistered reference's name. Register it like this:

         <!--ref = ${refName}--> 
         `

}