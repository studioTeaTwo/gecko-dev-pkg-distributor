// ref: https://github.com/joule-labs/joule-extension/blob/develop/src/content_script/shouldInject.ts

// Checks the doctype of the current document if it exists
function doctypeCheck() {
  if (window && window.document && window.document.doctype) {
    return window.document.doctype.name === "html"
  }
  return true
}

// Returns whether or not the extension (suffix) of the current document is prohibited
function suffixCheck() {
  const prohibitedTypes = [/\.xml$/, /\.pdf$/]
  const currentUrl = window.location.pathname
  for (const type of prohibitedTypes) {
    if (type.test(currentUrl)) {
      return false
    }
  }
  return true
}

// Checks the documentElement of the current document
function documentElementCheck() {
  // todo: correct?
  if (!document || !document.documentElement) {
    return false
  }
  const docNode = document.documentElement.nodeName
  if (docNode) {
    return docNode.toLowerCase() === "html"
  }
  return true
}

export function shouldInject() {
  const isHTML = doctypeCheck()
  const noProhibitedType = suffixCheck()
  const hasDocumentElement = documentElementCheck()

  return isHTML && noProhibitedType && hasDocumentElement
}
