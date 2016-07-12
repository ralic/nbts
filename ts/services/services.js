// This file has been modified from the original for netbeanstypescript.
// Portions Copyrighted 2015 Everlaw
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="..\compiler\program.ts"/>
/// <reference path='breakpoints.ts' />
/// <reference path='outliningElementsCollector.ts' />
/// <reference path='navigateTo.ts' />
/// <reference path='navigationBar.ts' />
/// <reference path='patternMatcher.ts' />
/// <reference path='signatureHelp.ts' />
/// <reference path='utilities.ts' />
/// <reference path='formatting\formatting.ts' />
/// <reference path='formatting\smartIndenter.ts' />
var ts;
(function (ts) {
    /** The version of the language service API */
    ts.servicesVersion = "0.4";
    var ScriptSnapshot;
    (function (ScriptSnapshot) {
        var StringScriptSnapshot = (function () {
            function StringScriptSnapshot(text) {
                this.text = text;
            }
            StringScriptSnapshot.prototype.getText = function (start, end) {
                return this.text.substring(start, end);
            };
            StringScriptSnapshot.prototype.getLength = function () {
                return this.text.length;
            };
            StringScriptSnapshot.prototype.getChangeRange = function (oldSnapshot) {
                // Text-based snapshots do not support incremental parsing. Return undefined
                // to signal that to the caller.
                return undefined;
            };
            return StringScriptSnapshot;
        }());
        function fromString(text) {
            return new StringScriptSnapshot(text);
        }
        ScriptSnapshot.fromString = fromString;
    })(ScriptSnapshot = ts.ScriptSnapshot || (ts.ScriptSnapshot = {}));
    var scanner = ts.createScanner(2 /* Latest */, /*skipTrivia*/ true);
    var emptyArray = [];
    var jsDocTagNames = [
        "augments",
        "author",
        "argument",
        "borrows",
        "class",
        "constant",
        "constructor",
        "constructs",
        "default",
        "deprecated",
        "description",
        "event",
        "example",
        "extends",
        "field",
        "fileOverview",
        "function",
        "ignore",
        "inner",
        "lends",
        "link",
        "memberOf",
        "name",
        "namespace",
        "param",
        "private",
        "property",
        "public",
        "requires",
        "returns",
        "see",
        "since",
        "static",
        "throws",
        "type",
        "version"
    ];
    var jsDocCompletionEntries;
    function createNode(kind, pos, end, flags, parent) {
        var node = new NodeObject(kind, pos, end);
        node.flags = flags;
        node.parent = parent;
        return node;
    }
    var NodeObject = (function () {
        function NodeObject(kind, pos, end) {
            this.kind = kind;
            this.pos = pos;
            this.end = end;
            this.flags = 0 /* None */;
            this.parent = undefined;
        }
        NodeObject.prototype.getSourceFile = function () {
            return ts.getSourceFileOfNode(this);
        };
        NodeObject.prototype.getStart = function (sourceFile) {
            return ts.getTokenPosOfNode(this, sourceFile);
        };
        NodeObject.prototype.getFullStart = function () {
            return this.pos;
        };
        NodeObject.prototype.getEnd = function () {
            return this.end;
        };
        NodeObject.prototype.getWidth = function (sourceFile) {
            return this.getEnd() - this.getStart(sourceFile);
        };
        NodeObject.prototype.getFullWidth = function () {
            return this.end - this.pos;
        };
        NodeObject.prototype.getLeadingTriviaWidth = function (sourceFile) {
            return this.getStart(sourceFile) - this.pos;
        };
        NodeObject.prototype.getFullText = function (sourceFile) {
            return (sourceFile || this.getSourceFile()).text.substring(this.pos, this.end);
        };
        NodeObject.prototype.getText = function (sourceFile) {
            return (sourceFile || this.getSourceFile()).text.substring(this.getStart(), this.getEnd());
        };
        NodeObject.prototype.addSyntheticNodes = function (nodes, pos, end) {
            scanner.setTextPos(pos);
            while (pos < end) {
                var token = scanner.scan();
                var textPos = scanner.getTextPos();
                nodes.push(createNode(token, pos, textPos, 2048 /* Synthetic */, this));
                pos = textPos;
            }
            return pos;
        };
        NodeObject.prototype.createSyntaxList = function (nodes) {
            var list = createNode(274 /* SyntaxList */, nodes.pos, nodes.end, 2048 /* Synthetic */, this);
            list._children = [];
            var pos = nodes.pos;
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var node = nodes_1[_i];
                if (pos < node.pos) {
                    pos = this.addSyntheticNodes(list._children, pos, node.pos);
                }
                list._children.push(node);
                pos = node.end;
            }
            if (pos < nodes.end) {
                this.addSyntheticNodes(list._children, pos, nodes.end);
            }
            return list;
        };
        NodeObject.prototype.createChildren = function (sourceFile) {
            var _this = this;
            var children;
            if (this.kind >= 136 /* FirstNode */) {
                scanner.setText((sourceFile || this.getSourceFile()).text);
                children = [];
                var pos_1 = this.pos;
                var processNode = function (node) {
                    if (pos_1 < node.pos) {
                        pos_1 = _this.addSyntheticNodes(children, pos_1, node.pos);
                    }
                    children.push(node);
                    pos_1 = node.end;
                };
                var processNodes = function (nodes) {
                    if (pos_1 < nodes.pos) {
                        pos_1 = _this.addSyntheticNodes(children, pos_1, nodes.pos);
                    }
                    children.push(_this.createSyntaxList(nodes));
                    pos_1 = nodes.end;
                };
                ts.forEachChild(this, processNode, processNodes);
                if (pos_1 < this.end) {
                    this.addSyntheticNodes(children, pos_1, this.end);
                }
                scanner.setText(undefined);
            }
            this._children = children || emptyArray;
        };
        NodeObject.prototype.getChildCount = function (sourceFile) {
            if (!this._children)
                this.createChildren(sourceFile);
            return this._children.length;
        };
        NodeObject.prototype.getChildAt = function (index, sourceFile) {
            if (!this._children)
                this.createChildren(sourceFile);
            return this._children[index];
        };
        NodeObject.prototype.getChildren = function (sourceFile) {
            if (!this._children)
                this.createChildren(sourceFile);
            return this._children;
        };
        NodeObject.prototype.getFirstToken = function (sourceFile) {
            var children = this.getChildren(sourceFile);
            if (!children.length) {
                return undefined;
            }
            var child = children[0];
            return child.kind < 136 /* FirstNode */ ? child : child.getFirstToken(sourceFile);
        };
        NodeObject.prototype.getLastToken = function (sourceFile) {
            var children = this.getChildren(sourceFile);
            var child = ts.lastOrUndefined(children);
            if (!child) {
                return undefined;
            }
            return child.kind < 136 /* FirstNode */ ? child : child.getLastToken(sourceFile);
        };
        return NodeObject;
    }());
    var SymbolObject = (function () {
        function SymbolObject(flags, name) {
            this.flags = flags;
            this.name = name;
        }
        SymbolObject.prototype.getFlags = function () {
            return this.flags;
        };
        SymbolObject.prototype.getName = function () {
            return this.name;
        };
        SymbolObject.prototype.getDeclarations = function () {
            return this.declarations;
        };
        SymbolObject.prototype.getDocumentationComment = function () {
            if (this.documentationComment === undefined) {
                this.documentationComment = getJsDocCommentsFromDeclarations(this.declarations, this.name, !(this.flags & 4 /* Property */));
            }
            return this.documentationComment;
        };
        return SymbolObject;
    }());
    function getJsDocCommentsFromDeclarations(declarations, name, canUseParsedParamTagComments) {
        var documentationComment = [];
        var docComments = getJsDocCommentsSeparatedByNewLines();
        ts.forEach(docComments, function (docComment) {
            if (documentationComment.length) {
                documentationComment.push(ts.lineBreakPart());
            }
            documentationComment.push(docComment);
        });
        return documentationComment;
        function getJsDocCommentsSeparatedByNewLines() {
            var paramTag = "@param";
            var jsDocCommentParts = [];
            ts.forEach(declarations, function (declaration, indexOfDeclaration) {
                // Make sure we are collecting doc comment from declaration once,
                // In case of union property there might be same declaration multiple times
                // which only varies in type parameter
                // Eg. const a: Array<string> | Array<number>; a.length
                // The property length will have two declarations of property length coming
                // from Array<T> - Array<string> and Array<number>
                if (ts.indexOf(declarations, declaration) === indexOfDeclaration) {
                    var sourceFileOfDeclaration_1 = ts.getSourceFileOfNode(declaration);
                    // If it is parameter - try and get the jsDoc comment with @param tag from function declaration's jsDoc comments
                    if (canUseParsedParamTagComments && declaration.kind === 139 /* Parameter */) {
                        ts.forEach(getJsDocCommentTextRange(declaration.parent, sourceFileOfDeclaration_1), function (jsDocCommentTextRange) {
                            var cleanedParamJsDocComment = getCleanedParamJsDocComment(jsDocCommentTextRange.pos, jsDocCommentTextRange.end, sourceFileOfDeclaration_1);
                            if (cleanedParamJsDocComment) {
                                ts.addRange(jsDocCommentParts, cleanedParamJsDocComment);
                            }
                        });
                    }
                    // If this is left side of dotted module declaration, there is no doc comments associated with this node
                    if (declaration.kind === 221 /* ModuleDeclaration */ && declaration.body.kind === 221 /* ModuleDeclaration */) {
                        return;
                    }
                    // If this is dotted module name, get the doc comments from the parent
                    while (declaration.kind === 221 /* ModuleDeclaration */ && declaration.parent.kind === 221 /* ModuleDeclaration */) {
                        declaration = declaration.parent;
                    }
                    // Get the cleaned js doc comment text from the declaration
                    ts.forEach(getJsDocCommentTextRange(declaration.kind === 214 /* VariableDeclaration */ ? declaration.parent.parent : declaration, sourceFileOfDeclaration_1), function (jsDocCommentTextRange) {
                        var cleanedJsDocComment = getCleanedJsDocComment(jsDocCommentTextRange.pos, jsDocCommentTextRange.end, sourceFileOfDeclaration_1);
                        if (cleanedJsDocComment) {
                            ts.addRange(jsDocCommentParts, cleanedJsDocComment);
                        }
                    });
                }
            });
            return jsDocCommentParts;
            function getJsDocCommentTextRange(node, sourceFile) {
                return ts.map(ts.getJsDocComments(node, sourceFile), function (jsDocComment) {
                    return {
                        pos: jsDocComment.pos + "/*".length,
                        end: jsDocComment.end - "*/".length // Trim off comment end indicator
                    };
                });
            }
            function consumeWhiteSpacesOnTheLine(pos, end, sourceFile, maxSpacesToRemove) {
                if (maxSpacesToRemove !== undefined) {
                    end = Math.min(end, pos + maxSpacesToRemove);
                }
                for (; pos < end; pos++) {
                    var ch = sourceFile.text.charCodeAt(pos);
                    if (!ts.isWhiteSpace(ch) || ts.isLineBreak(ch)) {
                        // Either found lineBreak or non whiteSpace
                        return pos;
                    }
                }
                return end;
            }
            function consumeLineBreaks(pos, end, sourceFile) {
                while (pos < end && ts.isLineBreak(sourceFile.text.charCodeAt(pos))) {
                    pos++;
                }
                return pos;
            }
            function isName(pos, end, sourceFile, name) {
                return pos + name.length < end &&
                    sourceFile.text.substr(pos, name.length) === name &&
                    (ts.isWhiteSpace(sourceFile.text.charCodeAt(pos + name.length)) ||
                        ts.isLineBreak(sourceFile.text.charCodeAt(pos + name.length)));
            }
            function isParamTag(pos, end, sourceFile) {
                // If it is @param tag
                return isName(pos, end, sourceFile, paramTag);
            }
            function pushDocCommentLineText(docComments, text, blankLineCount) {
                // Add the empty lines in between texts
                while (blankLineCount) {
                    blankLineCount--;
                    docComments.push(ts.textPart(""));
                }
                docComments.push(ts.textPart(text));
            }
            function getCleanedJsDocComment(pos, end, sourceFile) {
                var spacesToRemoveAfterAsterisk;
                var docComments = [];
                var blankLineCount = 0;
                var isInParamTag = false;
                while (pos < end) {
                    var docCommentTextOfLine = "";
                    // First consume leading white space
                    pos = consumeWhiteSpacesOnTheLine(pos, end, sourceFile);
                    // If the comment starts with '*' consume the spaces on this line
                    if (pos < end && sourceFile.text.charCodeAt(pos) === 42 /* asterisk */) {
                        var lineStartPos = pos + 1;
                        pos = consumeWhiteSpacesOnTheLine(pos + 1, end, sourceFile, spacesToRemoveAfterAsterisk);
                        // Set the spaces to remove after asterisk as margin if not already set
                        if (spacesToRemoveAfterAsterisk === undefined && pos < end && !ts.isLineBreak(sourceFile.text.charCodeAt(pos))) {
                            spacesToRemoveAfterAsterisk = pos - lineStartPos;
                        }
                    }
                    else if (spacesToRemoveAfterAsterisk === undefined) {
                        spacesToRemoveAfterAsterisk = 0;
                    }
                    // Analyse text on this line
                    while (pos < end && !ts.isLineBreak(sourceFile.text.charCodeAt(pos))) {
                        var ch = sourceFile.text.charAt(pos);
                        if (ch === "@") {
                            // If it is @param tag
                            if (isParamTag(pos, end, sourceFile)) {
                                isInParamTag = true;
                                pos += paramTag.length;
                                continue;
                            }
                            else {
                                isInParamTag = false;
                            }
                        }
                        // Add the ch to doc text if we arent in param tag
                        if (!isInParamTag) {
                            docCommentTextOfLine += ch;
                        }
                        // Scan next character
                        pos++;
                    }
                    // Continue with next line
                    pos = consumeLineBreaks(pos, end, sourceFile);
                    if (docCommentTextOfLine) {
                        pushDocCommentLineText(docComments, docCommentTextOfLine, blankLineCount);
                        blankLineCount = 0;
                    }
                    else if (!isInParamTag && docComments.length) {
                        // This is blank line when there is text already parsed
                        blankLineCount++;
                    }
                }
                return docComments;
            }
            function getCleanedParamJsDocComment(pos, end, sourceFile) {
                var paramHelpStringMargin;
                var paramDocComments = [];
                while (pos < end) {
                    if (isParamTag(pos, end, sourceFile)) {
                        var blankLineCount = 0;
                        var recordedParamTag = false;
                        // Consume leading spaces
                        pos = consumeWhiteSpaces(pos + paramTag.length);
                        if (pos >= end) {
                            break;
                        }
                        // Ignore type expression
                        if (sourceFile.text.charCodeAt(pos) === 123 /* openBrace */) {
                            pos++;
                            for (var curlies = 1; pos < end; pos++) {
                                var charCode = sourceFile.text.charCodeAt(pos);
                                // { character means we need to find another } to match the found one
                                if (charCode === 123 /* openBrace */) {
                                    curlies++;
                                    continue;
                                }
                                // } char
                                if (charCode === 125 /* closeBrace */) {
                                    curlies--;
                                    if (curlies === 0) {
                                        // We do not have any more } to match the type expression is ignored completely
                                        pos++;
                                        break;
                                    }
                                    else {
                                        // there are more { to be matched with }
                                        continue;
                                    }
                                }
                                // Found start of another tag
                                if (charCode === 64 /* at */) {
                                    break;
                                }
                            }
                            // Consume white spaces
                            pos = consumeWhiteSpaces(pos);
                            if (pos >= end) {
                                break;
                            }
                        }
                        // Parameter name
                        if (isName(pos, end, sourceFile, name)) {
                            // Found the parameter we are looking for consume white spaces
                            pos = consumeWhiteSpaces(pos + name.length);
                            if (pos >= end) {
                                break;
                            }
                            var paramHelpString = "";
                            var firstLineParamHelpStringPos = pos;
                            while (pos < end) {
                                var ch = sourceFile.text.charCodeAt(pos);
                                // at line break, set this comment line text and go to next line
                                if (ts.isLineBreak(ch)) {
                                    if (paramHelpString) {
                                        pushDocCommentLineText(paramDocComments, paramHelpString, blankLineCount);
                                        paramHelpString = "";
                                        blankLineCount = 0;
                                        recordedParamTag = true;
                                    }
                                    else if (recordedParamTag) {
                                        blankLineCount++;
                                    }
                                    // Get the pos after cleaning start of the line
                                    setPosForParamHelpStringOnNextLine(firstLineParamHelpStringPos);
                                    continue;
                                }
                                // Done scanning param help string - next tag found
                                if (ch === 64 /* at */) {
                                    break;
                                }
                                paramHelpString += sourceFile.text.charAt(pos);
                                // Go to next character
                                pos++;
                            }
                            // If there is param help text, add it top the doc comments
                            if (paramHelpString) {
                                pushDocCommentLineText(paramDocComments, paramHelpString, blankLineCount);
                            }
                            paramHelpStringMargin = undefined;
                        }
                        // If this is the start of another tag, continue with the loop in seach of param tag with symbol name
                        if (sourceFile.text.charCodeAt(pos) === 64 /* at */) {
                            continue;
                        }
                    }
                    // Next character
                    pos++;
                }
                return paramDocComments;
                function consumeWhiteSpaces(pos) {
                    while (pos < end && ts.isWhiteSpace(sourceFile.text.charCodeAt(pos))) {
                        pos++;
                    }
                    return pos;
                }
                function setPosForParamHelpStringOnNextLine(firstLineParamHelpStringPos) {
                    // Get the pos after consuming line breaks
                    pos = consumeLineBreaks(pos, end, sourceFile);
                    if (pos >= end) {
                        return;
                    }
                    if (paramHelpStringMargin === undefined) {
                        paramHelpStringMargin = sourceFile.getLineAndCharacterOfPosition(firstLineParamHelpStringPos).character;
                    }
                    // Now consume white spaces max
                    var startOfLinePos = pos;
                    pos = consumeWhiteSpacesOnTheLine(pos, end, sourceFile, paramHelpStringMargin);
                    if (pos >= end) {
                        return;
                    }
                    var consumedSpaces = pos - startOfLinePos;
                    if (consumedSpaces < paramHelpStringMargin) {
                        var ch = sourceFile.text.charCodeAt(pos);
                        if (ch === 42 /* asterisk */) {
                            // Consume more spaces after asterisk
                            pos = consumeWhiteSpacesOnTheLine(pos + 1, end, sourceFile, paramHelpStringMargin - consumedSpaces - 1);
                        }
                    }
                }
            }
        }
    }
    var TypeObject = (function () {
        function TypeObject(checker, flags) {
            this.checker = checker;
            this.flags = flags;
        }
        TypeObject.prototype.getFlags = function () {
            return this.flags;
        };
        TypeObject.prototype.getSymbol = function () {
            return this.symbol;
        };
        TypeObject.prototype.getProperties = function () {
            return this.checker.getPropertiesOfType(this);
        };
        TypeObject.prototype.getProperty = function (propertyName) {
            return this.checker.getPropertyOfType(this, propertyName);
        };
        TypeObject.prototype.getApparentProperties = function () {
            return this.checker.getAugmentedPropertiesOfType(this);
        };
        TypeObject.prototype.getCallSignatures = function () {
            return this.checker.getSignaturesOfType(this, 0 /* Call */);
        };
        TypeObject.prototype.getConstructSignatures = function () {
            return this.checker.getSignaturesOfType(this, 1 /* Construct */);
        };
        TypeObject.prototype.getStringIndexType = function () {
            return this.checker.getIndexTypeOfType(this, 0 /* String */);
        };
        TypeObject.prototype.getNumberIndexType = function () {
            return this.checker.getIndexTypeOfType(this, 1 /* Number */);
        };
        TypeObject.prototype.getBaseTypes = function () {
            return this.flags & (1024 /* Class */ | 2048 /* Interface */)
                ? this.checker.getBaseTypes(this)
                : undefined;
        };
        return TypeObject;
    }());
    var SignatureObject = (function () {
        function SignatureObject(checker) {
            this.checker = checker;
        }
        SignatureObject.prototype.getDeclaration = function () {
            return this.declaration;
        };
        SignatureObject.prototype.getTypeParameters = function () {
            return this.typeParameters;
        };
        SignatureObject.prototype.getParameters = function () {
            return this.parameters;
        };
        SignatureObject.prototype.getReturnType = function () {
            return this.checker.getReturnTypeOfSignature(this);
        };
        SignatureObject.prototype.getDocumentationComment = function () {
            if (this.documentationComment === undefined) {
                this.documentationComment = this.declaration ? getJsDocCommentsFromDeclarations([this.declaration], 
                /*name*/ undefined, 
                /*canUseParsedParamTagComments*/ false) : [];
            }
            return this.documentationComment;
        };
        return SignatureObject;
    }());
    var SourceFileObject = (function (_super) {
        __extends(SourceFileObject, _super);
        function SourceFileObject(kind, pos, end) {
            _super.call(this, kind, pos, end);
        }
        SourceFileObject.prototype.update = function (newText, textChangeRange) {
            return ts.updateSourceFile(this, newText, textChangeRange);
        };
        SourceFileObject.prototype.getLineAndCharacterOfPosition = function (position) {
            return ts.getLineAndCharacterOfPosition(this, position);
        };
        SourceFileObject.prototype.getLineStarts = function () {
            return ts.getLineStarts(this);
        };
        SourceFileObject.prototype.getPositionOfLineAndCharacter = function (line, character) {
            return ts.getPositionOfLineAndCharacter(this, line, character);
        };
        SourceFileObject.prototype.getNamedDeclarations = function () {
            if (!this.namedDeclarations) {
                this.namedDeclarations = this.computeNamedDeclarations();
            }
            return this.namedDeclarations;
        };
        SourceFileObject.prototype.computeNamedDeclarations = function () {
            var result = {};
            ts.forEachChild(this, visit);
            return result;
            function addDeclaration(declaration) {
                var name = getDeclarationName(declaration);
                if (name) {
                    var declarations = getDeclarations(name);
                    declarations.push(declaration);
                }
            }
            function getDeclarations(name) {
                return ts.getProperty(result, name) || (result[name] = []);
            }
            function getDeclarationName(declaration) {
                if (declaration.name) {
                    var result_1 = getTextOfIdentifierOrLiteral(declaration.name);
                    if (result_1 !== undefined) {
                        return result_1;
                    }
                    if (declaration.name.kind === 137 /* ComputedPropertyName */) {
                        var expr = declaration.name.expression;
                        if (expr.kind === 169 /* PropertyAccessExpression */) {
                            return expr.name.text;
                        }
                        return getTextOfIdentifierOrLiteral(expr);
                    }
                }
                return undefined;
            }
            function getTextOfIdentifierOrLiteral(node) {
                if (node) {
                    if (node.kind === 69 /* Identifier */ ||
                        node.kind === 9 /* StringLiteral */ ||
                        node.kind === 8 /* NumericLiteral */) {
                        return node.text;
                    }
                }
                return undefined;
            }
            function visit(node) {
                switch (node.kind) {
                    case 216 /* FunctionDeclaration */:
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                        var functionDeclaration = node;
                        var declarationName = getDeclarationName(functionDeclaration);
                        if (declarationName) {
                            var declarations = getDeclarations(declarationName);
                            var lastDeclaration = ts.lastOrUndefined(declarations);
                            // Check whether this declaration belongs to an "overload group".
                            if (lastDeclaration && functionDeclaration.parent === lastDeclaration.parent && functionDeclaration.symbol === lastDeclaration.symbol) {
                                // Overwrite the last declaration if it was an overload
                                // and this one is an implementation.
                                if (functionDeclaration.body && !lastDeclaration.body) {
                                    declarations[declarations.length - 1] = functionDeclaration;
                                }
                            }
                            else {
                                declarations.push(functionDeclaration);
                            }
                            ts.forEachChild(node, visit);
                        }
                        break;
                    case 217 /* ClassDeclaration */:
                    case 218 /* InterfaceDeclaration */:
                    case 219 /* TypeAliasDeclaration */:
                    case 220 /* EnumDeclaration */:
                    case 221 /* ModuleDeclaration */:
                    case 224 /* ImportEqualsDeclaration */:
                    case 233 /* ExportSpecifier */:
                    case 229 /* ImportSpecifier */:
                    case 224 /* ImportEqualsDeclaration */:
                    case 226 /* ImportClause */:
                    case 227 /* NamespaceImport */:
                    case 146 /* GetAccessor */:
                    case 147 /* SetAccessor */:
                    case 156 /* TypeLiteral */:
                        addDeclaration(node);
                    // fall through
                    case 145 /* Constructor */:
                    case 196 /* VariableStatement */:
                    case 215 /* VariableDeclarationList */:
                    case 164 /* ObjectBindingPattern */:
                    case 165 /* ArrayBindingPattern */:
                    case 222 /* ModuleBlock */:
                        ts.forEachChild(node, visit);
                        break;
                    case 195 /* Block */:
                        if (ts.isFunctionBlock(node)) {
                            ts.forEachChild(node, visit);
                        }
                        break;
                    case 139 /* Parameter */:
                        // Only consider properties defined as constructor parameters
                        if (!(node.flags & 56 /* AccessibilityModifier */)) {
                            break;
                        }
                    // fall through
                    case 214 /* VariableDeclaration */:
                    case 166 /* BindingElement */:
                        if (ts.isBindingPattern(node.name)) {
                            ts.forEachChild(node.name, visit);
                            break;
                        }
                    case 250 /* EnumMember */:
                    case 142 /* PropertyDeclaration */:
                    case 141 /* PropertySignature */:
                        addDeclaration(node);
                        break;
                    case 231 /* ExportDeclaration */:
                        // Handle named exports case e.g.:
                        //    export {a, b as B} from "mod";
                        if (node.exportClause) {
                            ts.forEach(node.exportClause.elements, visit);
                        }
                        break;
                    case 225 /* ImportDeclaration */:
                        var importClause = node.importClause;
                        if (importClause) {
                            // Handle default import case e.g.:
                            //    import d from "mod";
                            if (importClause.name) {
                                addDeclaration(importClause);
                            }
                            // Handle named bindings in imports e.g.:
                            //    import * as NS from "mod";
                            //    import {a, b as B} from "mod";
                            if (importClause.namedBindings) {
                                if (importClause.namedBindings.kind === 227 /* NamespaceImport */) {
                                    addDeclaration(importClause.namedBindings);
                                }
                                else {
                                    ts.forEach(importClause.namedBindings.elements, visit);
                                }
                            }
                        }
                        break;
                }
            }
        };
        return SourceFileObject;
    }(NodeObject));
    var TextChange = (function () {
        function TextChange() {
        }
        return TextChange;
    }());
    ts.TextChange = TextChange;
    var HighlightSpanKind;
    (function (HighlightSpanKind) {
        HighlightSpanKind.none = "none";
        HighlightSpanKind.definition = "definition";
        HighlightSpanKind.reference = "reference";
        HighlightSpanKind.writtenReference = "writtenReference";
    })(HighlightSpanKind = ts.HighlightSpanKind || (ts.HighlightSpanKind = {}));
    (function (IndentStyle) {
        IndentStyle[IndentStyle["None"] = 0] = "None";
        IndentStyle[IndentStyle["Block"] = 1] = "Block";
        IndentStyle[IndentStyle["Smart"] = 2] = "Smart";
    })(ts.IndentStyle || (ts.IndentStyle = {}));
    var IndentStyle = ts.IndentStyle;
    (function (SymbolDisplayPartKind) {
        SymbolDisplayPartKind[SymbolDisplayPartKind["aliasName"] = 0] = "aliasName";
        SymbolDisplayPartKind[SymbolDisplayPartKind["className"] = 1] = "className";
        SymbolDisplayPartKind[SymbolDisplayPartKind["enumName"] = 2] = "enumName";
        SymbolDisplayPartKind[SymbolDisplayPartKind["fieldName"] = 3] = "fieldName";
        SymbolDisplayPartKind[SymbolDisplayPartKind["interfaceName"] = 4] = "interfaceName";
        SymbolDisplayPartKind[SymbolDisplayPartKind["keyword"] = 5] = "keyword";
        SymbolDisplayPartKind[SymbolDisplayPartKind["lineBreak"] = 6] = "lineBreak";
        SymbolDisplayPartKind[SymbolDisplayPartKind["numericLiteral"] = 7] = "numericLiteral";
        SymbolDisplayPartKind[SymbolDisplayPartKind["stringLiteral"] = 8] = "stringLiteral";
        SymbolDisplayPartKind[SymbolDisplayPartKind["localName"] = 9] = "localName";
        SymbolDisplayPartKind[SymbolDisplayPartKind["methodName"] = 10] = "methodName";
        SymbolDisplayPartKind[SymbolDisplayPartKind["moduleName"] = 11] = "moduleName";
        SymbolDisplayPartKind[SymbolDisplayPartKind["operator"] = 12] = "operator";
        SymbolDisplayPartKind[SymbolDisplayPartKind["parameterName"] = 13] = "parameterName";
        SymbolDisplayPartKind[SymbolDisplayPartKind["propertyName"] = 14] = "propertyName";
        SymbolDisplayPartKind[SymbolDisplayPartKind["punctuation"] = 15] = "punctuation";
        SymbolDisplayPartKind[SymbolDisplayPartKind["space"] = 16] = "space";
        SymbolDisplayPartKind[SymbolDisplayPartKind["text"] = 17] = "text";
        SymbolDisplayPartKind[SymbolDisplayPartKind["typeParameterName"] = 18] = "typeParameterName";
        SymbolDisplayPartKind[SymbolDisplayPartKind["enumMemberName"] = 19] = "enumMemberName";
        SymbolDisplayPartKind[SymbolDisplayPartKind["functionName"] = 20] = "functionName";
        SymbolDisplayPartKind[SymbolDisplayPartKind["regularExpressionLiteral"] = 21] = "regularExpressionLiteral";
    })(ts.SymbolDisplayPartKind || (ts.SymbolDisplayPartKind = {}));
    var SymbolDisplayPartKind = ts.SymbolDisplayPartKind;
    (function (TokenClass) {
        TokenClass[TokenClass["Punctuation"] = 0] = "Punctuation";
        TokenClass[TokenClass["Keyword"] = 1] = "Keyword";
        TokenClass[TokenClass["Operator"] = 2] = "Operator";
        TokenClass[TokenClass["Comment"] = 3] = "Comment";
        TokenClass[TokenClass["Whitespace"] = 4] = "Whitespace";
        TokenClass[TokenClass["Identifier"] = 5] = "Identifier";
        TokenClass[TokenClass["NumberLiteral"] = 6] = "NumberLiteral";
        TokenClass[TokenClass["StringLiteral"] = 7] = "StringLiteral";
        TokenClass[TokenClass["RegExpLiteral"] = 8] = "RegExpLiteral";
    })(ts.TokenClass || (ts.TokenClass = {}));
    var TokenClass = ts.TokenClass;
    // TODO: move these to enums
    var ScriptElementKind;
    (function (ScriptElementKind) {
        ScriptElementKind.unknown = "";
        ScriptElementKind.warning = "warning";
        // predefined type (void) or keyword (class)
        ScriptElementKind.keyword = "keyword";
        // top level script node
        ScriptElementKind.scriptElement = "script";
        // module foo {}
        ScriptElementKind.moduleElement = "module";
        // class X {}
        ScriptElementKind.classElement = "class";
        // var x = class X {}
        ScriptElementKind.localClassElement = "local class";
        // interface Y {}
        ScriptElementKind.interfaceElement = "interface";
        // type T = ...
        ScriptElementKind.typeElement = "type";
        // enum E
        ScriptElementKind.enumElement = "enum";
        // Inside module and script only
        // const v = ..
        ScriptElementKind.variableElement = "var";
        // Inside function
        ScriptElementKind.localVariableElement = "local var";
        // Inside module and script only
        // function f() { }
        ScriptElementKind.functionElement = "function";
        // Inside function
        ScriptElementKind.localFunctionElement = "local function";
        // class X { [public|private]* foo() {} }
        ScriptElementKind.memberFunctionElement = "method";
        // class X { [public|private]* [get|set] foo:number; }
        ScriptElementKind.memberGetAccessorElement = "getter";
        ScriptElementKind.memberSetAccessorElement = "setter";
        // class X { [public|private]* foo:number; }
        // interface Y { foo:number; }
        ScriptElementKind.memberVariableElement = "property";
        // class X { constructor() { } }
        ScriptElementKind.constructorImplementationElement = "constructor";
        // interface Y { ():number; }
        ScriptElementKind.callSignatureElement = "call";
        // interface Y { []:number; }
        ScriptElementKind.indexSignatureElement = "index";
        // interface Y { new():Y; }
        ScriptElementKind.constructSignatureElement = "construct";
        // function foo(*Y*: string)
        ScriptElementKind.parameterElement = "parameter";
        ScriptElementKind.typeParameterElement = "type parameter";
        ScriptElementKind.primitiveType = "primitive type";
        ScriptElementKind.label = "label";
        ScriptElementKind.alias = "alias";
        ScriptElementKind.constElement = "const";
        ScriptElementKind.letElement = "let";
    })(ScriptElementKind = ts.ScriptElementKind || (ts.ScriptElementKind = {}));
    var ScriptElementKindModifier;
    (function (ScriptElementKindModifier) {
        ScriptElementKindModifier.none = "";
        ScriptElementKindModifier.publicMemberModifier = "public";
        ScriptElementKindModifier.privateMemberModifier = "private";
        ScriptElementKindModifier.protectedMemberModifier = "protected";
        ScriptElementKindModifier.exportedModifier = "export";
        ScriptElementKindModifier.ambientModifier = "declare";
        ScriptElementKindModifier.staticModifier = "static";
        ScriptElementKindModifier.abstractModifier = "abstract";
        ScriptElementKindModifier.deprecatedModifier = "deprecated";
    })(ScriptElementKindModifier = ts.ScriptElementKindModifier || (ts.ScriptElementKindModifier = {}));
    var ClassificationTypeNames = (function () {
        function ClassificationTypeNames() {
        }
        ClassificationTypeNames.comment = "comment";
        ClassificationTypeNames.identifier = "identifier";
        ClassificationTypeNames.keyword = "keyword";
        ClassificationTypeNames.numericLiteral = "number";
        ClassificationTypeNames.operator = "operator";
        ClassificationTypeNames.stringLiteral = "string";
        ClassificationTypeNames.whiteSpace = "whitespace";
        ClassificationTypeNames.text = "text";
        ClassificationTypeNames.punctuation = "punctuation";
        ClassificationTypeNames.className = "class name";
        ClassificationTypeNames.enumName = "enum name";
        ClassificationTypeNames.interfaceName = "interface name";
        ClassificationTypeNames.moduleName = "module name";
        ClassificationTypeNames.typeParameterName = "type parameter name";
        ClassificationTypeNames.typeAliasName = "type alias name";
        ClassificationTypeNames.parameterName = "parameter name";
        ClassificationTypeNames.docCommentTagName = "doc comment tag name";
        ClassificationTypeNames.jsxOpenTagName = "jsx open tag name";
        ClassificationTypeNames.jsxCloseTagName = "jsx close tag name";
        ClassificationTypeNames.jsxSelfClosingTagName = "jsx self closing tag name";
        ClassificationTypeNames.jsxAttribute = "jsx attribute";
        ClassificationTypeNames.jsxText = "jsx text";
        ClassificationTypeNames.jsxAttributeStringLiteralValue = "jsx attribute string literal value";
        return ClassificationTypeNames;
    }());
    ts.ClassificationTypeNames = ClassificationTypeNames;
    function displayPartsToString(displayParts) {
        if (displayParts) {
            return ts.map(displayParts, function (displayPart) { return displayPart.text; }).join("");
        }
        return "";
    }
    ts.displayPartsToString = displayPartsToString;
    function isLocalVariableOrFunction(symbol) {
        if (symbol.parent) {
            return false; // This is exported symbol
        }
        return ts.forEach(symbol.declarations, function (declaration) {
            // Function expressions are local
            if (declaration.kind === 176 /* FunctionExpression */) {
                return true;
            }
            if (declaration.kind !== 214 /* VariableDeclaration */ && declaration.kind !== 216 /* FunctionDeclaration */) {
                return false;
            }
            // If the parent is not sourceFile or module block it is local variable
            for (var parent_1 = declaration.parent; !ts.isFunctionBlock(parent_1); parent_1 = parent_1.parent) {
                // Reached source file or module block
                if (parent_1.kind === 251 /* SourceFile */ || parent_1.kind === 222 /* ModuleBlock */) {
                    return false;
                }
            }
            // parent is in function block
            return true;
        });
    }
    function getDefaultCompilerOptions() {
        // Always default to "ScriptTarget.ES5" for the language service
        return {
            target: 1 /* ES5 */,
            jsx: 1 /* Preserve */
        };
    }
    ts.getDefaultCompilerOptions = getDefaultCompilerOptions;
    // Cache host information about scrip Should be refreshed
    // at each language service public entry point, since we don't know when
    // set of scripts handled by the host changes.
    var HostCache = (function () {
        function HostCache(host, getCanonicalFileName) {
            this.host = host;
            this.getCanonicalFileName = getCanonicalFileName;
            // script id => script index
            this.currentDirectory = host.getCurrentDirectory();
            this.fileNameToEntry = ts.createFileMap();
            // Initialize the list with the root file names
            var rootFileNames = host.getScriptFileNames();
            for (var _i = 0, rootFileNames_1 = rootFileNames; _i < rootFileNames_1.length; _i++) {
                var fileName = rootFileNames_1[_i];
                this.createEntry(fileName, ts.toPath(fileName, this.currentDirectory, getCanonicalFileName));
            }
            // store the compilation settings
            this._compilationSettings = host.getCompilationSettings() || getDefaultCompilerOptions();
        }
        HostCache.prototype.compilationSettings = function () {
            return this._compilationSettings;
        };
        HostCache.prototype.createEntry = function (fileName, path) {
            var entry;
            var scriptSnapshot = this.host.getScriptSnapshot(fileName);
            if (scriptSnapshot) {
                entry = {
                    hostFileName: fileName,
                    version: this.host.getScriptVersion(fileName),
                    scriptSnapshot: scriptSnapshot
                };
            }
            this.fileNameToEntry.set(path, entry);
            return entry;
        };
        HostCache.prototype.getEntry = function (path) {
            return this.fileNameToEntry.get(path);
        };
        HostCache.prototype.contains = function (path) {
            return this.fileNameToEntry.contains(path);
        };
        HostCache.prototype.getOrCreateEntry = function (fileName) {
            var path = ts.toPath(fileName, this.currentDirectory, this.getCanonicalFileName);
            if (this.contains(path)) {
                return this.getEntry(path);
            }
            return this.createEntry(fileName, path);
        };
        HostCache.prototype.getRootFileNames = function () {
            var fileNames = [];
            this.fileNameToEntry.forEachValue(function (path, value) {
                if (value) {
                    fileNames.push(value.hostFileName);
                }
            });
            return fileNames;
        };
        HostCache.prototype.getVersion = function (path) {
            var file = this.getEntry(path);
            return file && file.version;
        };
        HostCache.prototype.getScriptSnapshot = function (path) {
            var file = this.getEntry(path);
            return file && file.scriptSnapshot;
        };
        return HostCache;
    }());
    var SyntaxTreeCache = (function () {
        function SyntaxTreeCache(host) {
            this.host = host;
        }
        SyntaxTreeCache.prototype.getCurrentSourceFile = function (fileName) {
            var scriptSnapshot = this.host.getScriptSnapshot(fileName);
            if (!scriptSnapshot) {
                // The host does not know about this file.
                throw new Error("Could not find file: '" + fileName + "'.");
            }
            var version = this.host.getScriptVersion(fileName);
            var sourceFile;
            if (this.currentFileName !== fileName) {
                // This is a new file, just parse it
                sourceFile = createLanguageServiceSourceFile(fileName, scriptSnapshot, 2 /* Latest */, version, /*setNodeParents*/ true);
            }
            else if (this.currentFileVersion !== version) {
                // This is the same file, just a newer version. Incrementally parse the file.
                var editRange = scriptSnapshot.getChangeRange(this.currentFileScriptSnapshot);
                sourceFile = updateLanguageServiceSourceFile(this.currentSourceFile, scriptSnapshot, version, editRange);
            }
            if (sourceFile) {
                // All done, ensure state is up to date
                this.currentFileVersion = version;
                this.currentFileName = fileName;
                this.currentFileScriptSnapshot = scriptSnapshot;
                this.currentSourceFile = sourceFile;
            }
            return this.currentSourceFile;
        };
        return SyntaxTreeCache;
    }());
    function setSourceFileFields(sourceFile, scriptSnapshot, version) {
        sourceFile.version = version;
        sourceFile.scriptSnapshot = scriptSnapshot;
    }
    /*
     * This function will compile source text from 'input' argument using specified compiler options.
     * If not options are provided - it will use a set of default compiler options.
     * Extra compiler options that will unconditionally be used by this function are:
     * - isolatedModules = true
     * - allowNonTsExtensions = true
     * - noLib = true
     * - noResolve = true
     */
    function transpileModule(input, transpileOptions) {
        var options = transpileOptions.compilerOptions ? ts.clone(transpileOptions.compilerOptions) : getDefaultCompilerOptions();
        options.isolatedModules = true;
        // transpileModule does not write anything to disk so there is no need to verify that there are no conflicts between input and output paths. 
        options.suppressOutputPathCheck = true;
        // Filename can be non-ts file.
        options.allowNonTsExtensions = true;
        // We are not returning a sourceFile for lib file when asked by the program,
        // so pass --noLib to avoid reporting a file not found error.
        options.noLib = true;
        // We are not doing a full typecheck, we are not resolving the whole context,
        // so pass --noResolve to avoid reporting missing file errors.
        options.noResolve = true;
        // if jsx is specified then treat file as .tsx
        var inputFileName = transpileOptions.fileName || (options.jsx ? "module.tsx" : "module.ts");
        var sourceFile = ts.createSourceFile(inputFileName, input, options.target);
        if (transpileOptions.moduleName) {
            sourceFile.moduleName = transpileOptions.moduleName;
        }
        sourceFile.renamedDependencies = transpileOptions.renamedDependencies;
        var newLine = ts.getNewLineCharacter(options);
        // Output
        var outputText;
        var sourceMapText;
        // Create a compilerHost object to allow the compiler to read and write files
        var compilerHost = {
            getSourceFile: function (fileName, target) { return fileName === ts.normalizeSlashes(inputFileName) ? sourceFile : undefined; },
            writeFile: function (name, text, writeByteOrderMark) {
                if (ts.fileExtensionIs(name, ".map")) {
                    ts.Debug.assert(sourceMapText === undefined, "Unexpected multiple source map outputs for the file '" + name + "'");
                    sourceMapText = text;
                }
                else {
                    ts.Debug.assert(outputText === undefined, "Unexpected multiple outputs for the file: '" + name + "'");
                    outputText = text;
                }
            },
            getDefaultLibFileName: function () { return "lib.d.ts"; },
            useCaseSensitiveFileNames: function () { return false; },
            getCanonicalFileName: function (fileName) { return fileName; },
            getCurrentDirectory: function () { return ""; },
            getNewLine: function () { return newLine; },
            fileExists: function (fileName) { return fileName === inputFileName; },
            readFile: function (fileName) { return ""; },
            directoryExists: function (directoryExists) { return true; }
        };
        var program = ts.createProgram([inputFileName], options, compilerHost);
        var diagnostics;
        if (transpileOptions.reportDiagnostics) {
            diagnostics = [];
            ts.addRange(/*to*/ diagnostics, /*from*/ program.getSyntacticDiagnostics(sourceFile));
            ts.addRange(/*to*/ diagnostics, /*from*/ program.getOptionsDiagnostics());
        }
        // Emit
        program.emit();
        ts.Debug.assert(outputText !== undefined, "Output generation failed");
        return { outputText: outputText, diagnostics: diagnostics, sourceMapText: sourceMapText };
    }
    ts.transpileModule = transpileModule;
    /*
     * This is a shortcut function for transpileModule - it accepts transpileOptions as parameters and returns only outputText part of the result.
     */
    function transpile(input, compilerOptions, fileName, diagnostics, moduleName) {
        var output = transpileModule(input, { compilerOptions: compilerOptions, fileName: fileName, reportDiagnostics: !!diagnostics, moduleName: moduleName });
        // addRange correctly handles cases when wither 'from' or 'to' argument is missing
        ts.addRange(diagnostics, output.diagnostics);
        return output.outputText;
    }
    ts.transpile = transpile;
    function createLanguageServiceSourceFile(fileName, scriptSnapshot, scriptTarget, version, setNodeParents) {
        var text = scriptSnapshot.getText(0, scriptSnapshot.getLength());
        var sourceFile = ts.createSourceFile(fileName, text, scriptTarget, setNodeParents);
        setSourceFileFields(sourceFile, scriptSnapshot, version);
        return sourceFile;
    }
    ts.createLanguageServiceSourceFile = createLanguageServiceSourceFile;
    ts.disableIncrementalParsing = false;
    function updateLanguageServiceSourceFile(sourceFile, scriptSnapshot, version, textChangeRange, aggressiveChecks) {
        // If we were given a text change range, and our version or open-ness changed, then
        // incrementally parse this file.
        if (textChangeRange) {
            if (version !== sourceFile.version) {
                // Once incremental parsing is ready, then just call into this function.
                if (!ts.disableIncrementalParsing) {
                    var newText = void 0;
                    // grab the fragment from the beginning of the original text to the beginning of the span
                    var prefix = textChangeRange.span.start !== 0
                        ? sourceFile.text.substr(0, textChangeRange.span.start)
                        : "";
                    // grab the fragment from the end of the span till the end of the original text
                    var suffix = ts.textSpanEnd(textChangeRange.span) !== sourceFile.text.length
                        ? sourceFile.text.substr(ts.textSpanEnd(textChangeRange.span))
                        : "";
                    if (textChangeRange.newLength === 0) {
                        // edit was a deletion - just combine prefix and suffix
                        newText = prefix && suffix ? prefix + suffix : prefix || suffix;
                    }
                    else {
                        // it was actual edit, fetch the fragment of new text that correspond to new span
                        var changedText = scriptSnapshot.getText(textChangeRange.span.start, textChangeRange.span.start + textChangeRange.newLength);
                        // combine prefix, changed text and suffix
                        newText = prefix && suffix
                            ? prefix + changedText + suffix
                            : prefix
                                ? (prefix + changedText)
                                : (changedText + suffix);
                    }
                    var newSourceFile = ts.updateSourceFile(sourceFile, newText, textChangeRange, aggressiveChecks);
                    setSourceFileFields(newSourceFile, scriptSnapshot, version);
                    // after incremental parsing nameTable might not be up-to-date
                    // drop it so it can be lazily recreated later
                    newSourceFile.nameTable = undefined;
                    // dispose all resources held by old script snapshot
                    if (sourceFile !== newSourceFile && sourceFile.scriptSnapshot) {
                        if (sourceFile.scriptSnapshot.dispose) {
                            sourceFile.scriptSnapshot.dispose();
                        }
                        sourceFile.scriptSnapshot = undefined;
                    }
                    return newSourceFile;
                }
            }
        }
        // Otherwise, just create a new source file.
        return createLanguageServiceSourceFile(sourceFile.fileName, scriptSnapshot, sourceFile.languageVersion, version, /*setNodeParents*/ true);
    }
    ts.updateLanguageServiceSourceFile = updateLanguageServiceSourceFile;
    function createDocumentRegistry(useCaseSensitiveFileNames, currentDirectory) {
        if (currentDirectory === void 0) { currentDirectory = ""; }
        // Maps from compiler setting target (ES3, ES5, etc.) to all the cached documents we have
        // for those settings.
        var buckets = {};
        var getCanonicalFileName = ts.createGetCanonicalFileName(!!useCaseSensitiveFileNames);
        function getKeyFromCompilationSettings(settings) {
            return "_" + settings.target + "|" + settings.module + "|" + settings.noResolve + "|" + settings.jsx + +"|" + settings.allowJs;
        }
        function getBucketForCompilationSettings(settings, createIfMissing) {
            var key = getKeyFromCompilationSettings(settings);
            var bucket = ts.lookUp(buckets, key);
            if (!bucket && createIfMissing) {
                buckets[key] = bucket = ts.createFileMap();
            }
            return bucket;
        }
        function reportStats() {
            var bucketInfoArray = Object.keys(buckets).filter(function (name) { return name && name.charAt(0) === "_"; }).map(function (name) {
                var entries = ts.lookUp(buckets, name);
                var sourceFiles = [];
                entries.forEachValue(function (key, entry) {
                    sourceFiles.push({
                        name: key,
                        refCount: entry.languageServiceRefCount,
                        references: entry.owners.slice(0)
                    });
                });
                sourceFiles.sort(function (x, y) { return y.refCount - x.refCount; });
                return {
                    bucket: name,
                    sourceFiles: sourceFiles
                };
            });
            return JSON.stringify(bucketInfoArray, undefined, 2);
        }
        function acquireDocument(fileName, compilationSettings, scriptSnapshot, version) {
            return acquireOrUpdateDocument(fileName, compilationSettings, scriptSnapshot, version, /*acquiring*/ true);
        }
        function updateDocument(fileName, compilationSettings, scriptSnapshot, version) {
            return acquireOrUpdateDocument(fileName, compilationSettings, scriptSnapshot, version, /*acquiring*/ false);
        }
        function acquireOrUpdateDocument(fileName, compilationSettings, scriptSnapshot, version, acquiring) {
            var bucket = getBucketForCompilationSettings(compilationSettings, /*createIfMissing*/ true);
            var path = ts.toPath(fileName, currentDirectory, getCanonicalFileName);
            var entry = bucket.get(path);
            if (!entry) {
                ts.Debug.assert(acquiring, "How could we be trying to update a document that the registry doesn't have?");
                // Have never seen this file with these settings.  Create a new source file for it.
                var sourceFile = createLanguageServiceSourceFile(fileName, scriptSnapshot, compilationSettings.target, version, /*setNodeParents*/ false);
                entry = {
                    sourceFile: sourceFile,
                    languageServiceRefCount: 0,
                    owners: []
                };
                bucket.set(path, entry);
            }
            else {
                // We have an entry for this file.  However, it may be for a different version of
                // the script snapshot.  If so, update it appropriately.  Otherwise, we can just
                // return it as is.
                if (entry.sourceFile.version !== version) {
                    entry.sourceFile = updateLanguageServiceSourceFile(entry.sourceFile, scriptSnapshot, version, scriptSnapshot.getChangeRange(entry.sourceFile.scriptSnapshot));
                }
            }
            // If we're acquiring, then this is the first time this LS is asking for this document.
            // Increase our ref count so we know there's another LS using the document.  If we're
            // not acquiring, then that means the LS is 'updating' the file instead, and that means
            // it has already acquired the document previously.  As such, we do not need to increase
            // the ref count.
            if (acquiring) {
                entry.languageServiceRefCount++;
            }
            return entry.sourceFile;
        }
        function releaseDocument(fileName, compilationSettings) {
            var bucket = getBucketForCompilationSettings(compilationSettings, /*createIfMissing*/ false);
            ts.Debug.assert(bucket !== undefined);
            var path = ts.toPath(fileName, currentDirectory, getCanonicalFileName);
            var entry = bucket.get(path);
            entry.languageServiceRefCount--;
            ts.Debug.assert(entry.languageServiceRefCount >= 0);
            if (entry.languageServiceRefCount === 0) {
                bucket.remove(path);
            }
        }
        return {
            acquireDocument: acquireDocument,
            updateDocument: updateDocument,
            releaseDocument: releaseDocument,
            reportStats: reportStats
        };
    }
    ts.createDocumentRegistry = createDocumentRegistry;
    function preProcessFile(sourceText, readImportFiles, detectJavaScriptImports) {
        if (readImportFiles === void 0) { readImportFiles = true; }
        if (detectJavaScriptImports === void 0) { detectJavaScriptImports = false; }
        var referencedFiles = [];
        var importedFiles = [];
        var ambientExternalModules;
        var isNoDefaultLib = false;
        function processTripleSlashDirectives() {
            var commentRanges = ts.getLeadingCommentRanges(sourceText, 0);
            ts.forEach(commentRanges, function (commentRange) {
                var comment = sourceText.substring(commentRange.pos, commentRange.end);
                var referencePathMatchResult = ts.getFileReferenceFromReferencePath(comment, commentRange);
                if (referencePathMatchResult) {
                    isNoDefaultLib = referencePathMatchResult.isNoDefaultLib;
                    var fileReference = referencePathMatchResult.fileReference;
                    if (fileReference) {
                        referencedFiles.push(fileReference);
                    }
                }
            });
        }
        function recordAmbientExternalModule() {
            if (!ambientExternalModules) {
                ambientExternalModules = [];
            }
            ambientExternalModules.push(scanner.getTokenValue());
        }
        function recordModuleName() {
            var importPath = scanner.getTokenValue();
            var pos = scanner.getTokenPos();
            importedFiles.push({
                fileName: importPath,
                pos: pos,
                end: pos + importPath.length
            });
        }
        /**
         * Returns true if at least one token was consumed from the stream
         */
        function tryConsumeDeclare() {
            var token = scanner.getToken();
            if (token === 122 /* DeclareKeyword */) {
                // declare module "mod"
                token = scanner.scan();
                if (token === 125 /* ModuleKeyword */) {
                    token = scanner.scan();
                    if (token === 9 /* StringLiteral */) {
                        recordAmbientExternalModule();
                    }
                }
                return true;
            }
            return false;
        }
        /**
         * Returns true if at least one token was consumed from the stream
         */
        function tryConsumeImport() {
            var token = scanner.getToken();
            if (token === 89 /* ImportKeyword */) {
                token = scanner.scan();
                if (token === 9 /* StringLiteral */) {
                    // import "mod";
                    recordModuleName();
                    return true;
                }
                else {
                    if (token === 69 /* Identifier */ || ts.isKeyword(token)) {
                        token = scanner.scan();
                        if (token === 133 /* FromKeyword */) {
                            token = scanner.scan();
                            if (token === 9 /* StringLiteral */) {
                                // import d from "mod";
                                recordModuleName();
                                return true;
                            }
                        }
                        else if (token === 56 /* EqualsToken */) {
                            if (tryConsumeRequireCall(/*skipCurrentToken*/ true)) {
                                return true;
                            }
                        }
                        else if (token === 24 /* CommaToken */) {
                            // consume comma and keep going
                            token = scanner.scan();
                        }
                        else {
                            // unknown syntax
                            return true;
                        }
                    }
                    if (token === 15 /* OpenBraceToken */) {
                        token = scanner.scan();
                        // consume "{ a as B, c, d as D}" clauses
                        // make sure that it stops on EOF
                        while (token !== 16 /* CloseBraceToken */ && token !== 1 /* EndOfFileToken */) {
                            token = scanner.scan();
                        }
                        if (token === 16 /* CloseBraceToken */) {
                            token = scanner.scan();
                            if (token === 133 /* FromKeyword */) {
                                token = scanner.scan();
                                if (token === 9 /* StringLiteral */) {
                                    // import {a as A} from "mod";
                                    // import d, {a, b as B} from "mod"
                                    recordModuleName();
                                }
                            }
                        }
                    }
                    else if (token === 37 /* AsteriskToken */) {
                        token = scanner.scan();
                        if (token === 116 /* AsKeyword */) {
                            token = scanner.scan();
                            if (token === 69 /* Identifier */ || ts.isKeyword(token)) {
                                token = scanner.scan();
                                if (token === 133 /* FromKeyword */) {
                                    token = scanner.scan();
                                    if (token === 9 /* StringLiteral */) {
                                        // import * as NS from "mod"
                                        // import d, * as NS from "mod"
                                        recordModuleName();
                                    }
                                }
                            }
                        }
                    }
                }
                return true;
            }
            return false;
        }
        function tryConsumeExport() {
            var token = scanner.getToken();
            if (token === 82 /* ExportKeyword */) {
                token = scanner.scan();
                if (token === 15 /* OpenBraceToken */) {
                    token = scanner.scan();
                    // consume "{ a as B, c, d as D}" clauses
                    // make sure it stops on EOF
                    while (token !== 16 /* CloseBraceToken */ && token !== 1 /* EndOfFileToken */) {
                        token = scanner.scan();
                    }
                    if (token === 16 /* CloseBraceToken */) {
                        token = scanner.scan();
                        if (token === 133 /* FromKeyword */) {
                            token = scanner.scan();
                            if (token === 9 /* StringLiteral */) {
                                // export {a as A} from "mod";
                                // export {a, b as B} from "mod"
                                recordModuleName();
                            }
                        }
                    }
                }
                else if (token === 37 /* AsteriskToken */) {
                    token = scanner.scan();
                    if (token === 133 /* FromKeyword */) {
                        token = scanner.scan();
                        if (token === 9 /* StringLiteral */) {
                            // export * from "mod"
                            recordModuleName();
                        }
                    }
                }
                else if (token === 89 /* ImportKeyword */) {
                    token = scanner.scan();
                    if (token === 69 /* Identifier */ || ts.isKeyword(token)) {
                        token = scanner.scan();
                        if (token === 56 /* EqualsToken */) {
                            if (tryConsumeRequireCall(/*skipCurrentToken*/ true)) {
                                return true;
                            }
                        }
                    }
                }
                return true;
            }
            return false;
        }
        function tryConsumeRequireCall(skipCurrentToken) {
            var token = skipCurrentToken ? scanner.scan() : scanner.getToken();
            if (token === 127 /* RequireKeyword */) {
                token = scanner.scan();
                if (token === 17 /* OpenParenToken */) {
                    token = scanner.scan();
                    if (token === 9 /* StringLiteral */) {
                        //  require("mod");
                        recordModuleName();
                    }
                }
                return true;
            }
            return false;
        }
        function tryConsumeDefine() {
            var token = scanner.getToken();
            if (token === 69 /* Identifier */ && scanner.getTokenValue() === "define") {
                token = scanner.scan();
                if (token !== 17 /* OpenParenToken */) {
                    return true;
                }
                token = scanner.scan();
                if (token === 9 /* StringLiteral */) {
                    // looks like define ("modname", ... - skip string literal and comma
                    token = scanner.scan();
                    if (token === 24 /* CommaToken */) {
                        token = scanner.scan();
                    }
                    else {
                        // unexpected token
                        return true;
                    }
                }
                // should be start of dependency list
                if (token !== 19 /* OpenBracketToken */) {
                    return true;
                }
                // skip open bracket
                token = scanner.scan();
                var i = 0;
                // scan until ']' or EOF
                while (token !== 20 /* CloseBracketToken */ && token !== 1 /* EndOfFileToken */) {
                    // record string literals as module names
                    if (token === 9 /* StringLiteral */) {
                        recordModuleName();
                        i++;
                    }
                    token = scanner.scan();
                }
                return true;
            }
            return false;
        }
        function processImports() {
            scanner.setText(sourceText);
            scanner.scan();
            // Look for:
            //    import "mod";
            //    import d from "mod"
            //    import {a as A } from "mod";
            //    import * as NS  from "mod"
            //    import d, {a, b as B} from "mod"
            //    import i = require("mod");
            //
            //    export * from "mod"
            //    export {a as b} from "mod"
            //    export import i = require("mod")
            //    (for JavaScript files) require("mod")
            while (true) {
                if (scanner.getToken() === 1 /* EndOfFileToken */) {
                    break;
                }
                // check if at least one of alternative have moved scanner forward
                if (tryConsumeDeclare() ||
                    tryConsumeImport() ||
                    tryConsumeExport() ||
                    (detectJavaScriptImports && (tryConsumeRequireCall(/*skipCurrentToken*/ false) || tryConsumeDefine()))) {
                    continue;
                }
                else {
                    scanner.scan();
                }
            }
            scanner.setText(undefined);
        }
        if (readImportFiles) {
            processImports();
        }
        processTripleSlashDirectives();
        return { referencedFiles: referencedFiles, importedFiles: importedFiles, isLibFile: isNoDefaultLib, ambientExternalModules: ambientExternalModules };
    }
    ts.preProcessFile = preProcessFile;
    /// Helpers
    function getTargetLabel(referenceNode, labelName) {
        while (referenceNode) {
            if (referenceNode.kind === 210 /* LabeledStatement */ && referenceNode.label.text === labelName) {
                return referenceNode.label;
            }
            referenceNode = referenceNode.parent;
        }
        return undefined;
    }
    function isJumpStatementTarget(node) {
        return node.kind === 69 /* Identifier */ &&
            (node.parent.kind === 206 /* BreakStatement */ || node.parent.kind === 205 /* ContinueStatement */) &&
            node.parent.label === node;
    }
    function isLabelOfLabeledStatement(node) {
        return node.kind === 69 /* Identifier */ &&
            node.parent.kind === 210 /* LabeledStatement */ &&
            node.parent.label === node;
    }
    /**
     * Whether or not a 'node' is preceded by a label of the given string.
     * Note: 'node' cannot be a SourceFile.
     */
    function isLabeledBy(node, labelName) {
        for (var owner = node.parent; owner.kind === 210 /* LabeledStatement */; owner = owner.parent) {
            if (owner.label.text === labelName) {
                return true;
            }
        }
        return false;
    }
    function isLabelName(node) {
        return isLabelOfLabeledStatement(node) || isJumpStatementTarget(node);
    }
    function isRightSideOfQualifiedName(node) {
        return node.parent.kind === 136 /* QualifiedName */ && node.parent.right === node;
    }
    function isRightSideOfPropertyAccess(node) {
        return node && node.parent && node.parent.kind === 169 /* PropertyAccessExpression */ && node.parent.name === node;
    }
    function isCallExpressionTarget(node) {
        if (isRightSideOfPropertyAccess(node)) {
            node = node.parent;
        }
        return node && node.parent && node.parent.kind === 171 /* CallExpression */ && node.parent.expression === node;
    }
    function isNewExpressionTarget(node) {
        if (isRightSideOfPropertyAccess(node)) {
            node = node.parent;
        }
        return node && node.parent && node.parent.kind === 172 /* NewExpression */ && node.parent.expression === node;
    }
    function isNameOfModuleDeclaration(node) {
        return node.parent.kind === 221 /* ModuleDeclaration */ && node.parent.name === node;
    }
    function isNameOfFunctionDeclaration(node) {
        return node.kind === 69 /* Identifier */ &&
            ts.isFunctionLike(node.parent) && node.parent.name === node;
    }
    /** Returns true if node is a name of an object literal property, e.g. "a" in x = { "a": 1 } */
    function isNameOfPropertyAssignment(node) {
        return (node.kind === 69 /* Identifier */ || node.kind === 9 /* StringLiteral */ || node.kind === 8 /* NumericLiteral */) &&
            (node.parent.kind === 248 /* PropertyAssignment */ || node.parent.kind === 249 /* ShorthandPropertyAssignment */) && node.parent.name === node;
    }
    function isLiteralNameOfPropertyDeclarationOrIndexAccess(node) {
        if (node.kind === 9 /* StringLiteral */ || node.kind === 8 /* NumericLiteral */) {
            switch (node.parent.kind) {
                case 142 /* PropertyDeclaration */:
                case 141 /* PropertySignature */:
                case 248 /* PropertyAssignment */:
                case 250 /* EnumMember */:
                case 144 /* MethodDeclaration */:
                case 143 /* MethodSignature */:
                case 146 /* GetAccessor */:
                case 147 /* SetAccessor */:
                case 221 /* ModuleDeclaration */:
                    return node.parent.name === node;
                case 170 /* ElementAccessExpression */:
                    return node.parent.argumentExpression === node;
            }
        }
        return false;
    }
    function isNameOfExternalModuleImportOrDeclaration(node) {
        if (node.kind === 9 /* StringLiteral */) {
            return isNameOfModuleDeclaration(node) ||
                (ts.isExternalModuleImportEqualsDeclaration(node.parent.parent) && ts.getExternalModuleImportEqualsDeclarationExpression(node.parent.parent) === node);
        }
        return false;
    }
    /** Returns true if the position is within a comment */
    function isInsideComment(sourceFile, token, position) {
        // The position has to be: 1. in the leading trivia (before token.getStart()), and 2. within a comment
        return position <= token.getStart(sourceFile) &&
            (isInsideCommentRange(ts.getTrailingCommentRanges(sourceFile.text, token.getFullStart())) ||
                isInsideCommentRange(ts.getLeadingCommentRanges(sourceFile.text, token.getFullStart())));
        function isInsideCommentRange(comments) {
            return ts.forEach(comments, function (comment) {
                // either we are 1. completely inside the comment, or 2. at the end of the comment
                if (comment.pos < position && position < comment.end) {
                    return true;
                }
                else if (position === comment.end) {
                    var text = sourceFile.text;
                    var width = comment.end - comment.pos;
                    // is single line comment or just /*
                    if (width <= 2 || text.charCodeAt(comment.pos + 1) === 47 /* slash */) {
                        return true;
                    }
                    else {
                        // is unterminated multi-line comment
                        return !(text.charCodeAt(comment.end - 1) === 47 /* slash */ &&
                            text.charCodeAt(comment.end - 2) === 42 /* asterisk */);
                    }
                }
                return false;
            });
        }
    }
    // A cache of completion entries for keywords, these do not change between sessions
    var keywordCompletions = [];
    for (var i = 70 /* FirstKeyword */; i <= 135 /* LastKeyword */; i++) {
        keywordCompletions.push({
            name: ts.tokenToString(i),
            kind: ScriptElementKind.keyword,
            kindModifiers: ScriptElementKindModifier.none,
            sortText: "0"
        });
    }
    /* @internal */ function getContainerNode(node) {
        while (true) {
            node = node.parent;
            if (!node) {
                return undefined;
            }
            switch (node.kind) {
                case 251 /* SourceFile */:
                case 144 /* MethodDeclaration */:
                case 143 /* MethodSignature */:
                case 216 /* FunctionDeclaration */:
                case 176 /* FunctionExpression */:
                case 146 /* GetAccessor */:
                case 147 /* SetAccessor */:
                case 217 /* ClassDeclaration */:
                case 218 /* InterfaceDeclaration */:
                case 220 /* EnumDeclaration */:
                case 221 /* ModuleDeclaration */:
                    return node;
            }
        }
    }
    ts.getContainerNode = getContainerNode;
    /* @internal */ function getNodeKind(node) {
        switch (node.kind) {
            case 221 /* ModuleDeclaration */: return ScriptElementKind.moduleElement;
            case 217 /* ClassDeclaration */: return ScriptElementKind.classElement;
            case 218 /* InterfaceDeclaration */: return ScriptElementKind.interfaceElement;
            case 219 /* TypeAliasDeclaration */: return ScriptElementKind.typeElement;
            case 220 /* EnumDeclaration */: return ScriptElementKind.enumElement;
            case 214 /* VariableDeclaration */:
                return ts.isConst(node)
                    ? ScriptElementKind.constElement
                    : ts.isLet(node)
                        ? ScriptElementKind.letElement
                        : ScriptElementKind.variableElement;
            case 216 /* FunctionDeclaration */: return ScriptElementKind.functionElement;
            case 146 /* GetAccessor */: return ScriptElementKind.memberGetAccessorElement;
            case 147 /* SetAccessor */: return ScriptElementKind.memberSetAccessorElement;
            case 144 /* MethodDeclaration */:
            case 143 /* MethodSignature */:
                return ScriptElementKind.memberFunctionElement;
            case 142 /* PropertyDeclaration */:
            case 141 /* PropertySignature */:
                return ScriptElementKind.memberVariableElement;
            case 150 /* IndexSignature */: return ScriptElementKind.indexSignatureElement;
            case 149 /* ConstructSignature */: return ScriptElementKind.constructSignatureElement;
            case 148 /* CallSignature */: return ScriptElementKind.callSignatureElement;
            case 145 /* Constructor */: return ScriptElementKind.constructorImplementationElement;
            case 138 /* TypeParameter */: return ScriptElementKind.typeParameterElement;
            case 250 /* EnumMember */: return ScriptElementKind.variableElement;
            case 139 /* Parameter */: return (node.flags & 56 /* AccessibilityModifier */) ? ScriptElementKind.memberVariableElement : ScriptElementKind.parameterElement;
            case 224 /* ImportEqualsDeclaration */:
            case 229 /* ImportSpecifier */:
            case 226 /* ImportClause */:
            case 233 /* ExportSpecifier */:
            case 227 /* NamespaceImport */:
                return ScriptElementKind.alias;
        }
        return ScriptElementKind.unknown;
    }
    ts.getNodeKind = getNodeKind;
    var CancellationTokenObject = (function () {
        function CancellationTokenObject(cancellationToken) {
            this.cancellationToken = cancellationToken;
        }
        CancellationTokenObject.prototype.isCancellationRequested = function () {
            return this.cancellationToken && this.cancellationToken.isCancellationRequested();
        };
        CancellationTokenObject.prototype.throwIfCancellationRequested = function () {
            if (this.isCancellationRequested()) {
                throw new ts.OperationCanceledException();
            }
        };
        return CancellationTokenObject;
    }());
    function createLanguageService(host, documentRegistry) {
        if (documentRegistry === void 0) { documentRegistry = createDocumentRegistry(host.useCaseSensitiveFileNames && host.useCaseSensitiveFileNames(), host.getCurrentDirectory()); }
        var syntaxTreeCache = new SyntaxTreeCache(host);
        var ruleProvider;
        var program;
        var lastProjectVersion;
        var useCaseSensitivefileNames = host.useCaseSensitiveFileNames ? host.useCaseSensitiveFileNames() : false;
        var cancellationToken = new CancellationTokenObject(host.getCancellationToken && host.getCancellationToken());
        var currentDirectory = host.getCurrentDirectory();
        // Check if the localized messages json is set, otherwise query the host for it
        if (!ts.localizedDiagnosticMessages && host.getLocalizedDiagnosticMessages) {
            ts.localizedDiagnosticMessages = host.getLocalizedDiagnosticMessages();
        }
        function log(message) {
            if (host.log) {
                host.log(message);
            }
        }
        var getCanonicalFileName = ts.createGetCanonicalFileName(useCaseSensitivefileNames);
        function getValidSourceFile(fileName) {
            var sourceFile = program.getSourceFile(fileName);
            if (!sourceFile) {
                throw new Error("Could not find file: '" + fileName + "'.");
            }
            return sourceFile;
        }
        function getRuleProvider(options) {
            // Ensure rules are initialized and up to date wrt to formatting options
            if (!ruleProvider) {
                ruleProvider = new ts.formatting.RulesProvider();
            }
            ruleProvider.ensureUpToDate(options);
            return ruleProvider;
        }
        function synchronizeHostData() {
            // perform fast check if host supports it
            if (host.getProjectVersion) {
                var hostProjectVersion = host.getProjectVersion();
                if (hostProjectVersion) {
                    if (lastProjectVersion === hostProjectVersion) {
                        return;
                    }
                    lastProjectVersion = hostProjectVersion;
                }
            }
            // Get a fresh cache of the host information
            var hostCache = new HostCache(host, getCanonicalFileName);
            // If the program is already up-to-date, we can reuse it
            if (programUpToDate()) {
                return;
            }
            // IMPORTANT - It is critical from this moment onward that we do not check
            // cancellation tokens.  We are about to mutate source files from a previous program
            // instance.  If we cancel midway through, we may end up in an inconsistent state where
            // the program points to old source files that have been invalidated because of
            // incremental parsing.
            var oldSettings = program && program.getCompilerOptions();
            var newSettings = hostCache.compilationSettings();
            var changesInCompilationSettingsAffectSyntax = oldSettings &&
                (oldSettings.target !== newSettings.target ||
                    oldSettings.module !== newSettings.module ||
                    oldSettings.noResolve !== newSettings.noResolve ||
                    oldSettings.jsx !== newSettings.jsx ||
                    oldSettings.allowJs !== newSettings.allowJs);
            // Now create a new compiler
            var compilerHost = {
                getSourceFile: getOrCreateSourceFile,
                getCancellationToken: function () { return cancellationToken; },
                getCanonicalFileName: getCanonicalFileName,
                useCaseSensitiveFileNames: function () { return useCaseSensitivefileNames; },
                getNewLine: function () { return ts.getNewLineOrDefaultFromHost(host); },
                getDefaultLibFileName: function (options) { return host.getDefaultLibFileName(options); },
                writeFile: function (fileName, data, writeByteOrderMark) { },
                getCurrentDirectory: function () { return currentDirectory; },
                fileExists: function (fileName) {
                    // stub missing host functionality
                    ts.Debug.assert(!host.resolveModuleNames);
                    return hostCache.getOrCreateEntry(fileName) !== undefined;
                },
                readFile: function (fileName) {
                    // stub missing host functionality
                    var entry = hostCache.getOrCreateEntry(fileName);
                    return entry && entry.scriptSnapshot.getText(0, entry.scriptSnapshot.getLength());
                },
                directoryExists: function (directoryName) {
                    ts.Debug.assert(!host.resolveModuleNames);
                    return ts.directoryProbablyExists(directoryName, host);
                }
            };
            if (host.resolveModuleNames) {
                compilerHost.resolveModuleNames = function (moduleNames, containingFile) { return host.resolveModuleNames(moduleNames, containingFile); };
            }
            var newProgram = ts.createProgram(hostCache.getRootFileNames(), newSettings, compilerHost, program);
            // Release any files we have acquired in the old program but are
            // not part of the new program.
            if (program) {
                var oldSourceFiles = program.getSourceFiles();
                for (var _i = 0, oldSourceFiles_1 = oldSourceFiles; _i < oldSourceFiles_1.length; _i++) {
                    var oldSourceFile = oldSourceFiles_1[_i];
                    if (!newProgram.getSourceFile(oldSourceFile.fileName) || changesInCompilationSettingsAffectSyntax) {
                        documentRegistry.releaseDocument(oldSourceFile.fileName, oldSettings);
                    }
                }
            }
            // hostCache is captured in the closure for 'getOrCreateSourceFile' but it should not be used past this point.
            // It needs to be cleared to allow all collected snapshots to be released
            hostCache = undefined;
            program = newProgram;
            // Make sure all the nodes in the program are both bound, and have their parent
            // pointers set property.
            program.getTypeChecker();
            return;
            function getOrCreateSourceFile(fileName) {
                ts.Debug.assert(hostCache !== undefined);
                // The program is asking for this file, check first if the host can locate it.
                // If the host can not locate the file, then it does not exist. return undefined
                // to the program to allow reporting of errors for missing files.
                var hostFileInformation = hostCache.getOrCreateEntry(fileName);
                if (!hostFileInformation) {
                    return undefined;
                }
                // Check if the language version has changed since we last created a program; if they are the same,
                // it is safe to reuse the souceFiles; if not, then the shape of the AST can change, and the oldSourceFile
                // can not be reused. we have to dump all syntax trees and create new ones.
                if (!changesInCompilationSettingsAffectSyntax) {
                    // Check if the old program had this file already
                    var oldSourceFile = program && program.getSourceFile(fileName);
                    if (oldSourceFile) {
                        // We already had a source file for this file name.  Go to the registry to
                        // ensure that we get the right up to date version of it.  We need this to
                        // address the following 'race'.  Specifically, say we have the following:
                        //
                        //      LS1
                        //          \
                        //           DocumentRegistry
                        //          /
                        //      LS2
                        //
                        // Each LS has a reference to file 'foo.ts' at version 1.  LS2 then updates
                        // it's version of 'foo.ts' to version 2.  This will cause LS2 and the
                        // DocumentRegistry to have version 2 of the document.  HOwever, LS1 will
                        // have version 1.  And *importantly* this source file will be *corrupt*.
                        // The act of creating version 2 of the file irrevocably damages the version
                        // 1 file.
                        //
                        // So, later when we call into LS1, we need to make sure that it doesn't use
                        // it's source file any more, and instead defers to DocumentRegistry to get
                        // either version 1, version 2 (or some other version) depending on what the
                        // host says should be used.
                        return documentRegistry.updateDocument(fileName, newSettings, hostFileInformation.scriptSnapshot, hostFileInformation.version);
                    }
                }
                // Could not find this file in the old program, create a new SourceFile for it.
                return documentRegistry.acquireDocument(fileName, newSettings, hostFileInformation.scriptSnapshot, hostFileInformation.version);
            }
            function sourceFileUpToDate(sourceFile) {
                if (!sourceFile) {
                    return false;
                }
                var path = sourceFile.path || ts.toPath(sourceFile.fileName, currentDirectory, getCanonicalFileName);
                return sourceFile.version === hostCache.getVersion(path);
            }
            function programUpToDate() {
                // If we haven't create a program yet, then it is not up-to-date
                if (!program) {
                    return false;
                }
                // If number of files in the program do not match, it is not up-to-date
                var rootFileNames = hostCache.getRootFileNames();
                if (program.getSourceFiles().length !== rootFileNames.length) {
                    return false;
                }
                // If any file is not up-to-date, then the whole program is not up-to-date
                for (var _i = 0, rootFileNames_2 = rootFileNames; _i < rootFileNames_2.length; _i++) {
                    var fileName = rootFileNames_2[_i];
                    if (!sourceFileUpToDate(program.getSourceFile(fileName))) {
                        return false;
                    }
                }
                // If the compilation settings do no match, then the program is not up-to-date
                return ts.compareDataObjects(program.getCompilerOptions(), hostCache.compilationSettings());
            }
        }
        function getProgram() {
            synchronizeHostData();
            return program;
        }
        function cleanupSemanticCache() {
            // TODO: Should we jettison the program (or it's type checker) here?
        }
        function dispose() {
            if (program) {
                ts.forEach(program.getSourceFiles(), function (f) {
                    return documentRegistry.releaseDocument(f.fileName, program.getCompilerOptions());
                });
            }
        }
        /// Diagnostics
        function getSyntacticDiagnostics(fileName) {
            synchronizeHostData();
            return program.getSyntacticDiagnostics(getValidSourceFile(fileName), cancellationToken);
        }
        /**
         * getSemanticDiagnostiscs return array of Diagnostics. If '-d' is not enabled, only report semantic errors
         * If '-d' enabled, report both semantic and emitter errors
         */
        function getSemanticDiagnostics(fileName) {
            synchronizeHostData();
            var targetSourceFile = getValidSourceFile(fileName);
            // Only perform the action per file regardless of '-out' flag as LanguageServiceHost is expected to call this function per file.
            // Therefore only get diagnostics for given file.
            var semanticDiagnostics = program.getSemanticDiagnostics(targetSourceFile, cancellationToken);
            if (!program.getCompilerOptions().declaration) {
                return semanticDiagnostics;
            }
            // If '-d' is enabled, check for emitter error. One example of emitter error is export class implements non-export interface
            var declarationDiagnostics = program.getDeclarationDiagnostics(targetSourceFile, cancellationToken);
            return ts.concatenate(semanticDiagnostics, declarationDiagnostics);
        }
        function getCompilerOptionsDiagnostics() {
            synchronizeHostData();
            return program.getOptionsDiagnostics(cancellationToken).concat(program.getGlobalDiagnostics(cancellationToken));
        }
        /**
         * Get the name to be display in completion from a given symbol.
         *
         * @return undefined if the name is of external module otherwise a name with striped of any quote
         */
        function getCompletionEntryDisplayNameForSymbol(symbol, target, performCharacterChecks, location) {
            var displayName = ts.getDeclaredName(program.getTypeChecker(), symbol, location);
            if (displayName) {
                var firstCharCode = displayName.charCodeAt(0);
                // First check of the displayName is not external module; if it is an external module, it is not valid entry
                if ((symbol.flags & 1536 /* Namespace */) && (firstCharCode === 39 /* singleQuote */ || firstCharCode === 34 /* doubleQuote */)) {
                    // If the symbol is external module, don't show it in the completion list
                    // (i.e declare module "http" { const x; } | // <= request completion here, "http" should not be there)
                    return undefined;
                }
            }
            return getCompletionEntryDisplayName(displayName, target, performCharacterChecks);
        }
        /**
         * Get a displayName from a given for completion list, performing any necessary quotes stripping
         * and checking whether the name is valid identifier name.
         */
        function getCompletionEntryDisplayName(name, target, performCharacterChecks) {
            if (!name) {
                return undefined;
            }
            name = ts.stripQuotes(name);
            if (!name) {
                return undefined;
            }
            // If the user entered name for the symbol was quoted, removing the quotes is not enough, as the name could be an
            // invalid identifier name. We need to check if whatever was inside the quotes is actually a valid identifier name.
            // e.g "b a" is valid quoted name but when we strip off the quotes, it is invalid.
            // We, thus, need to check if whatever was inside the quotes is actually a valid identifier name.
            if (performCharacterChecks) {
                if (!ts.isIdentifier(name, target)) {
                    return undefined;
                }
            }
            return name;
        }
        function getCompletionData(fileName, position) {
            var typeChecker = program.getTypeChecker();
            var sourceFile = getValidSourceFile(fileName);
            var isJavaScriptFile = ts.isSourceFileJavaScript(sourceFile);
            var isJsDocTagName = false;
            var start = new Date().getTime();
            var currentToken = ts.getTokenAtPosition(sourceFile, position);
            log("getCompletionData: Get current token: " + (new Date().getTime() - start));
            start = new Date().getTime();
            // Completion not allowed inside comments, bail out if this is the case
            var insideComment = isInsideComment(sourceFile, currentToken, position);
            log("getCompletionData: Is inside comment: " + (new Date().getTime() - start));
            if (insideComment) {
                // The current position is next to the '@' sign, when no tag name being provided yet.
                // Provide a full list of tag names
                if (ts.hasDocComment(sourceFile, position) && sourceFile.text.charCodeAt(position - 1) === 64 /* at */) {
                    isJsDocTagName = true;
                }
                // Completion should work inside certain JsDoc tags. For example:
                //     /** @type {number | string} */
                // Completion should work in the brackets
                var insideJsDocTagExpression = false;
                var tag = ts.getJsDocTagAtPosition(sourceFile, position);
                if (tag) {
                    if (tag.tagName.pos <= position && position <= tag.tagName.end) {
                        isJsDocTagName = true;
                    }
                    switch (tag.kind) {
                        case 272 /* JSDocTypeTag */:
                        case 270 /* JSDocParameterTag */:
                        case 271 /* JSDocReturnTag */:
                            var tagWithExpression = tag;
                            if (tagWithExpression.typeExpression) {
                                insideJsDocTagExpression = tagWithExpression.typeExpression.pos < position && position < tagWithExpression.typeExpression.end;
                            }
                            break;
                    }
                }
                if (isJsDocTagName) {
                    return { symbols: undefined, isMemberCompletion: false, isNewIdentifierLocation: false, location: undefined, isRightOfDot: false, isJsDocTagName: isJsDocTagName };
                }
                if (!insideJsDocTagExpression) {
                    // Proceed if the current position is in jsDoc tag expression; otherwise it is a normal
                    // comment or the plain text part of a jsDoc comment, so no completion should be available
                    log("Returning an empty list because completion was inside a regular comment or plain text part of a JsDoc comment.");
                    return undefined;
                }
            }
            start = new Date().getTime();
            var previousToken = ts.findPrecedingToken(position, sourceFile);
            log("getCompletionData: Get previous token 1: " + (new Date().getTime() - start));
            // The decision to provide completion depends on the contextToken, which is determined through the previousToken.
            // Note: 'previousToken' (and thus 'contextToken') can be undefined if we are the beginning of the file
            var contextToken = previousToken;
            // Check if the caret is at the end of an identifier; this is a partial identifier that we want to complete: e.g. a.toS|
            // Skip this partial identifier and adjust the contextToken to the token that precedes it.
            if (contextToken && position <= contextToken.end && ts.isWord(contextToken.kind)) {
                var start_1 = new Date().getTime();
                contextToken = ts.findPrecedingToken(contextToken.getFullStart(), sourceFile);
                log("getCompletionData: Get previous token 2: " + (new Date().getTime() - start_1));
            }
            // Find the node where completion is requested on.
            // Also determine whether we are trying to complete with members of that node
            // or attributes of a JSX tag.
            var node = currentToken;
            var isRightOfDot = false;
            var isRightOfOpenTag = false;
            var isStartingCloseTag = false;
            var location = ts.getTouchingPropertyName(sourceFile, position);
            if (contextToken) {
                // Bail out if this is a known invalid completion location
                if (isCompletionListBlocker(contextToken)) {
                    log("Returning an empty list because completion was requested in an invalid position.");
                    return undefined;
                }
                var parent_2 = contextToken.parent, kind = contextToken.kind;
                if (kind === 21 /* DotToken */) {
                    if (parent_2.kind === 169 /* PropertyAccessExpression */) {
                        node = contextToken.parent.expression;
                        isRightOfDot = true;
                    }
                    else if (parent_2.kind === 136 /* QualifiedName */) {
                        node = contextToken.parent.left;
                        isRightOfDot = true;
                    }
                    else {
                        // There is nothing that precedes the dot, so this likely just a stray character
                        // or leading into a '...' token. Just bail out instead.
                        return undefined;
                    }
                }
                else if (sourceFile.languageVariant === 1 /* JSX */) {
                    if (kind === 25 /* LessThanToken */) {
                        isRightOfOpenTag = true;
                        location = contextToken;
                    }
                    else if (kind === 39 /* SlashToken */ && contextToken.parent.kind === 240 /* JsxClosingElement */) {
                        isStartingCloseTag = true;
                        location = contextToken;
                    }
                }
            }
            var semanticStart = new Date().getTime();
            var isMemberCompletion;
            var isNewIdentifierLocation;
            var symbols = [];
            if (isRightOfDot) {
                getTypeScriptMemberSymbols();
            }
            else if (isRightOfOpenTag) {
                var tagSymbols = typeChecker.getJsxIntrinsicTagNames();
                if (tryGetGlobalSymbols()) {
                    symbols = tagSymbols.concat(symbols.filter(function (s) { return !!(s.flags & 107455 /* Value */); }));
                }
                else {
                    symbols = tagSymbols;
                }
                isMemberCompletion = true;
                isNewIdentifierLocation = false;
            }
            else if (isStartingCloseTag) {
                var tagName = contextToken.parent.parent.openingElement.tagName;
                var tagSymbol = typeChecker.getSymbolAtLocation(tagName);
                if (!typeChecker.isUnknownSymbol(tagSymbol)) {
                    symbols = [tagSymbol];
                }
                isMemberCompletion = true;
                isNewIdentifierLocation = false;
            }
            else {
                // For JavaScript or TypeScript, if we're not after a dot, then just try to get the
                // global symbols in scope.  These results should be valid for either language as
                // the set of symbols that can be referenced from this location.
                if (!tryGetGlobalSymbols()) {
                    return undefined;
                }
            }
            log("getCompletionData: Semantic work: " + (new Date().getTime() - semanticStart));
            return { symbols: symbols, isMemberCompletion: isMemberCompletion, isNewIdentifierLocation: isNewIdentifierLocation, location: location, isRightOfDot: (isRightOfDot || isRightOfOpenTag), isJsDocTagName: isJsDocTagName };
            function getTypeScriptMemberSymbols() {
                // Right of dot member completion list
                isMemberCompletion = true;
                isNewIdentifierLocation = false;
                if (node.kind === 69 /* Identifier */ || node.kind === 136 /* QualifiedName */ || node.kind === 169 /* PropertyAccessExpression */) {
                    var symbol = typeChecker.getSymbolAtLocation(node);
                    // This is an alias, follow what it aliases
                    if (symbol && symbol.flags & 8388608 /* Alias */) {
                        symbol = typeChecker.getAliasedSymbol(symbol);
                    }
                    if (symbol && symbol.flags & 1952 /* HasExports */) {
                        // Extract module or enum members
                        var exportedSymbols = typeChecker.getExportsOfModule(symbol);
                        ts.forEach(exportedSymbols, function (symbol) {
                            if (typeChecker.isValidPropertyAccess((node.parent), symbol.name)) {
                                symbols.push(symbol);
                            }
                        });
                    }
                }
                var type = typeChecker.getTypeAtLocation(node);
                addTypeProperties(type);
            }
            function addTypeProperties(type) {
                if (type) {
                    // Filter private properties
                    for (var _i = 0, _a = type.getApparentProperties(); _i < _a.length; _i++) {
                        var symbol = _a[_i];
                        if (typeChecker.isValidPropertyAccess((node.parent), symbol.name)) {
                            symbols.push(symbol);
                        }
                    }
                    if (isJavaScriptFile && type.flags & 16384 /* Union */) {
                        // In javascript files, for union types, we don't just get the members that
                        // the individual types have in common, we also include all the members that
                        // each individual type has.  This is because we're going to add all identifiers
                        // anyways.  So we might as well elevate the members that were at least part
                        // of the individual types to a higher status since we know what they are.
                        var unionType = type;
                        for (var _b = 0, _c = unionType.types; _b < _c.length; _b++) {
                            var elementType = _c[_b];
                            addTypeProperties(elementType);
                        }
                    }
                }
            }
            function tryGetGlobalSymbols() {
                var objectLikeContainer;
                var namedImportsOrExports;
                var jsxContainer;
                if (objectLikeContainer = tryGetObjectLikeCompletionContainer(contextToken)) {
                    return tryGetObjectLikeCompletionSymbols(objectLikeContainer);
                }
                if (namedImportsOrExports = tryGetNamedImportsOrExportsForCompletion(contextToken)) {
                    // cursor is in an import clause
                    // try to show exported member for imported module
                    return tryGetImportOrExportClauseCompletionSymbols(namedImportsOrExports);
                }
                if (jsxContainer = tryGetContainingJsxElement(contextToken)) {
                    var attrsType = void 0;
                    if ((jsxContainer.kind === 237 /* JsxSelfClosingElement */) || (jsxContainer.kind === 238 /* JsxOpeningElement */)) {
                        // Cursor is inside a JSX self-closing element or opening element
                        attrsType = typeChecker.getJsxElementAttributesType(jsxContainer);
                        if (attrsType) {
                            symbols = filterJsxAttributes(typeChecker.getPropertiesOfType(attrsType), jsxContainer.attributes);
                            isMemberCompletion = true;
                            isNewIdentifierLocation = false;
                            return true;
                        }
                    }
                }
                // Get all entities in the current scope.
                isMemberCompletion = false;
                isNewIdentifierLocation = isNewIdentifierDefinitionLocation(contextToken);
                if (previousToken !== contextToken) {
                    ts.Debug.assert(!!previousToken, "Expected 'contextToken' to be defined when different from 'previousToken'.");
                }
                // We need to find the node that will give us an appropriate scope to begin
                // aggregating completion candidates. This is achieved in 'getScopeNode'
                // by finding the first node that encompasses a position, accounting for whether a node
                // is "complete" to decide whether a position belongs to the node.
                //
                // However, at the end of an identifier, we are interested in the scope of the identifier
                // itself, but fall outside of the identifier. For instance:
                //
                //      xyz => x$
                //
                // the cursor is outside of both the 'x' and the arrow function 'xyz => x',
                // so 'xyz' is not returned in our results.
                //
                // We define 'adjustedPosition' so that we may appropriately account for
                // being at the end of an identifier. The intention is that if requesting completion
                // at the end of an identifier, it should be effectively equivalent to requesting completion
                // anywhere inside/at the beginning of the identifier. So in the previous case, the
                // 'adjustedPosition' will work as if requesting completion in the following:
                //
                //      xyz => $x
                //
                // If previousToken !== contextToken, then
                //   - 'contextToken' was adjusted to the token prior to 'previousToken'
                //      because we were at the end of an identifier.
                //   - 'previousToken' is defined.
                var adjustedPosition = previousToken !== contextToken ?
                    previousToken.getStart() :
                    position;
                var scopeNode = getScopeNode(contextToken, adjustedPosition, sourceFile) || sourceFile;
                /// TODO filter meaning based on the current context
                var symbolMeanings = 793056 /* Type */ | 107455 /* Value */ | 1536 /* Namespace */ | 8388608 /* Alias */;
                symbols = typeChecker.getSymbolsInScope(scopeNode, symbolMeanings);
                return true;
            }
            /**
             * Finds the first node that "embraces" the position, so that one may
             * accurately aggregate locals from the closest containing scope.
             */
            function getScopeNode(initialToken, position, sourceFile) {
                var scope = initialToken;
                while (scope && !ts.positionBelongsToNode(scope, position, sourceFile)) {
                    scope = scope.parent;
                }
                return scope;
            }
            function isCompletionListBlocker(contextToken) {
                var start = new Date().getTime();
                var result = isInStringOrRegularExpressionOrTemplateLiteral(contextToken) ||
                    isSolelyIdentifierDefinitionLocation(contextToken) ||
                    isDotOfNumericLiteral(contextToken) ||
                    isInJsxText(contextToken);
                log("getCompletionsAtPosition: isCompletionListBlocker: " + (new Date().getTime() - start));
                return result;
            }
            function isInJsxText(contextToken) {
                if (contextToken.kind === 239 /* JsxText */) {
                    return true;
                }
                if (contextToken.kind === 27 /* GreaterThanToken */ && contextToken.parent) {
                    if (contextToken.parent.kind === 238 /* JsxOpeningElement */) {
                        return true;
                    }
                    if (contextToken.parent.kind === 240 /* JsxClosingElement */ || contextToken.parent.kind === 237 /* JsxSelfClosingElement */) {
                        return contextToken.parent.parent && contextToken.parent.parent.kind === 236 /* JsxElement */;
                    }
                }
                return false;
            }
            function isNewIdentifierDefinitionLocation(previousToken) {
                if (previousToken) {
                    var containingNodeKind = previousToken.parent.kind;
                    switch (previousToken.kind) {
                        case 24 /* CommaToken */:
                            return containingNodeKind === 171 /* CallExpression */ // func( a, |
                                || containingNodeKind === 145 /* Constructor */ // constructor( a, |   /* public, protected, private keywords are allowed here, so show completion */
                                || containingNodeKind === 172 /* NewExpression */ // new C(a, |
                                || containingNodeKind === 167 /* ArrayLiteralExpression */ // [a, |
                                || containingNodeKind === 184 /* BinaryExpression */ // const x = (a, |
                                || containingNodeKind === 153 /* FunctionType */; // var x: (s: string, list|
                        case 17 /* OpenParenToken */:
                            return containingNodeKind === 171 /* CallExpression */ // func( |
                                || containingNodeKind === 145 /* Constructor */ // constructor( |
                                || containingNodeKind === 172 /* NewExpression */ // new C(a|
                                || containingNodeKind === 175 /* ParenthesizedExpression */ // const x = (a|
                                || containingNodeKind === 161 /* ParenthesizedType */; // function F(pred: (a| /* this can become an arrow function, where 'a' is the argument */
                        case 19 /* OpenBracketToken */:
                            return containingNodeKind === 167 /* ArrayLiteralExpression */ // [ |
                                || containingNodeKind === 150 /* IndexSignature */ // [ | : string ]
                                || containingNodeKind === 137 /* ComputedPropertyName */; // [ |    /* this can become an index signature */
                        case 125 /* ModuleKeyword */: // module |
                        case 126 /* NamespaceKeyword */:
                            return true;
                        case 21 /* DotToken */:
                            return containingNodeKind === 221 /* ModuleDeclaration */; // module A.|
                        case 15 /* OpenBraceToken */:
                            return containingNodeKind === 217 /* ClassDeclaration */; // class A{ |
                        case 56 /* EqualsToken */:
                            return containingNodeKind === 214 /* VariableDeclaration */ // const x = a|
                                || containingNodeKind === 184 /* BinaryExpression */; // x = a|
                        case 12 /* TemplateHead */:
                            return containingNodeKind === 186 /* TemplateExpression */; // `aa ${|
                        case 13 /* TemplateMiddle */:
                            return containingNodeKind === 193 /* TemplateSpan */; // `aa ${10} dd ${|
                        case 112 /* PublicKeyword */:
                        case 110 /* PrivateKeyword */:
                        case 111 /* ProtectedKeyword */:
                            return containingNodeKind === 142 /* PropertyDeclaration */; // class A{ public |
                    }
                    // Previous token may have been a keyword that was converted to an identifier.
                    switch (previousToken.getText()) {
                        case "public":
                        case "protected":
                        case "private":
                            return true;
                    }
                }
                return false;
            }
            function isInStringOrRegularExpressionOrTemplateLiteral(contextToken) {
                if (contextToken.kind === 9 /* StringLiteral */
                    || contextToken.kind === 163 /* StringLiteralType */
                    || contextToken.kind === 10 /* RegularExpressionLiteral */
                    || ts.isTemplateLiteralKind(contextToken.kind)) {
                    var start_2 = contextToken.getStart();
                    var end = contextToken.getEnd();
                    // To be "in" one of these literals, the position has to be:
                    //   1. entirely within the token text.
                    //   2. at the end position of an unterminated token.
                    //   3. at the end of a regular expression (due to trailing flags like '/foo/g').
                    if (start_2 < position && position < end) {
                        return true;
                    }
                    if (position === end) {
                        return !!contextToken.isUnterminated
                            || contextToken.kind === 10 /* RegularExpressionLiteral */;
                    }
                }
                return false;
            }
            /**
             * Aggregates relevant symbols for completion in object literals and object binding patterns.
             * Relevant symbols are stored in the captured 'symbols' variable.
             *
             * @returns true if 'symbols' was successfully populated; false otherwise.
             */
            function tryGetObjectLikeCompletionSymbols(objectLikeContainer) {
                // We're looking up possible property names from contextual/inferred/declared type.
                isMemberCompletion = true;
                var typeForObject;
                var existingMembers;
                if (objectLikeContainer.kind === 168 /* ObjectLiteralExpression */) {
                    // We are completing on contextual types, but may also include properties
                    // other than those within the declared type.
                    isNewIdentifierLocation = true;
                    typeForObject = typeChecker.getContextualType(objectLikeContainer);
                    existingMembers = objectLikeContainer.properties;
                }
                else if (objectLikeContainer.kind === 164 /* ObjectBindingPattern */) {
                    // We are *only* completing on properties from the type being destructured.
                    isNewIdentifierLocation = false;
                    var rootDeclaration = ts.getRootDeclaration(objectLikeContainer.parent);
                    if (ts.isVariableLike(rootDeclaration)) {
                        // We don't want to complete using the type acquired by the shape
                        // of the binding pattern; we are only interested in types acquired
                        // through type declaration or inference.
                        if (rootDeclaration.initializer || rootDeclaration.type) {
                            typeForObject = typeChecker.getTypeAtLocation(objectLikeContainer);
                            existingMembers = objectLikeContainer.elements;
                        }
                    }
                    else {
                        ts.Debug.fail("Root declaration is not variable-like.");
                    }
                }
                else {
                    ts.Debug.fail("Expected object literal or binding pattern, got " + objectLikeContainer.kind);
                }
                if (!typeForObject) {
                    return false;
                }
                var typeMembers = typeChecker.getPropertiesOfType(typeForObject);
                if (typeMembers && typeMembers.length > 0) {
                    // Add filtered items to the completion list
                    symbols = filterObjectMembersList(typeMembers, existingMembers);
                }
                return true;
            }
            /**
             * Aggregates relevant symbols for completion in import clauses and export clauses
             * whose declarations have a module specifier; for instance, symbols will be aggregated for
             *
             *      import { | } from "moduleName";
             *      export { a as foo, | } from "moduleName";
             *
             * but not for
             *
             *      export { | };
             *
             * Relevant symbols are stored in the captured 'symbols' variable.
             *
             * @returns true if 'symbols' was successfully populated; false otherwise.
             */
            function tryGetImportOrExportClauseCompletionSymbols(namedImportsOrExports) {
                var declarationKind = namedImportsOrExports.kind === 228 /* NamedImports */ ?
                    225 /* ImportDeclaration */ :
                    231 /* ExportDeclaration */;
                var importOrExportDeclaration = ts.getAncestor(namedImportsOrExports, declarationKind);
                var moduleSpecifier = importOrExportDeclaration.moduleSpecifier;
                if (!moduleSpecifier) {
                    return false;
                }
                isMemberCompletion = true;
                isNewIdentifierLocation = false;
                var exports;
                var moduleSpecifierSymbol = typeChecker.getSymbolAtLocation(importOrExportDeclaration.moduleSpecifier);
                if (moduleSpecifierSymbol) {
                    exports = typeChecker.getExportsOfModule(moduleSpecifierSymbol);
                }
                symbols = exports ? filterNamedImportOrExportCompletionItems(exports, namedImportsOrExports.elements) : emptyArray;
                return true;
            }
            /**
             * Returns the immediate owning object literal or binding pattern of a context token,
             * on the condition that one exists and that the context implies completion should be given.
             */
            function tryGetObjectLikeCompletionContainer(contextToken) {
                if (contextToken) {
                    switch (contextToken.kind) {
                        case 15 /* OpenBraceToken */: // const x = { |
                        case 24 /* CommaToken */:
                            var parent_3 = contextToken.parent;
                            if (parent_3 && (parent_3.kind === 168 /* ObjectLiteralExpression */ || parent_3.kind === 164 /* ObjectBindingPattern */)) {
                                return parent_3;
                            }
                            break;
                    }
                }
                return undefined;
            }
            /**
             * Returns the containing list of named imports or exports of a context token,
             * on the condition that one exists and that the context implies completion should be given.
             */
            function tryGetNamedImportsOrExportsForCompletion(contextToken) {
                if (contextToken) {
                    switch (contextToken.kind) {
                        case 15 /* OpenBraceToken */: // import { |
                        case 24 /* CommaToken */:
                            switch (contextToken.parent.kind) {
                                case 228 /* NamedImports */:
                                case 232 /* NamedExports */:
                                    return contextToken.parent;
                            }
                    }
                }
                return undefined;
            }
            function tryGetContainingJsxElement(contextToken) {
                if (contextToken) {
                    var parent_4 = contextToken.parent;
                    switch (contextToken.kind) {
                        case 26 /* LessThanSlashToken */:
                        case 39 /* SlashToken */:
                        case 69 /* Identifier */:
                        case 241 /* JsxAttribute */:
                        case 242 /* JsxSpreadAttribute */:
                            if (parent_4 && (parent_4.kind === 237 /* JsxSelfClosingElement */ || parent_4.kind === 238 /* JsxOpeningElement */)) {
                                return parent_4;
                            }
                            else if (parent_4.kind === 241 /* JsxAttribute */) {
                                return parent_4.parent;
                            }
                            break;
                        // The context token is the closing } or " of an attribute, which means
                        // its parent is a JsxExpression, whose parent is a JsxAttribute,
                        // whose parent is a JsxOpeningLikeElement
                        case 9 /* StringLiteral */:
                            if (parent_4 && ((parent_4.kind === 241 /* JsxAttribute */) || (parent_4.kind === 242 /* JsxSpreadAttribute */))) {
                                return parent_4.parent;
                            }
                            break;
                        case 16 /* CloseBraceToken */:
                            if (parent_4 &&
                                parent_4.kind === 243 /* JsxExpression */ &&
                                parent_4.parent &&
                                (parent_4.parent.kind === 241 /* JsxAttribute */)) {
                                return parent_4.parent.parent;
                            }
                            if (parent_4 && parent_4.kind === 242 /* JsxSpreadAttribute */) {
                                return parent_4.parent;
                            }
                            break;
                    }
                }
                return undefined;
            }
            function isFunction(kind) {
                switch (kind) {
                    case 176 /* FunctionExpression */:
                    case 177 /* ArrowFunction */:
                    case 216 /* FunctionDeclaration */:
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                    case 146 /* GetAccessor */:
                    case 147 /* SetAccessor */:
                    case 148 /* CallSignature */:
                    case 149 /* ConstructSignature */:
                    case 150 /* IndexSignature */:
                        return true;
                }
                return false;
            }
            /**
             * @returns true if we are certain that the currently edited location must define a new location; false otherwise.
             */
            function isSolelyIdentifierDefinitionLocation(contextToken) {
                var containingNodeKind = contextToken.parent.kind;
                switch (contextToken.kind) {
                    case 24 /* CommaToken */:
                        return containingNodeKind === 214 /* VariableDeclaration */ ||
                            containingNodeKind === 215 /* VariableDeclarationList */ ||
                            containingNodeKind === 196 /* VariableStatement */ ||
                            containingNodeKind === 220 /* EnumDeclaration */ ||
                            isFunction(containingNodeKind) ||
                            containingNodeKind === 217 /* ClassDeclaration */ ||
                            containingNodeKind === 189 /* ClassExpression */ ||
                            containingNodeKind === 218 /* InterfaceDeclaration */ ||
                            containingNodeKind === 165 /* ArrayBindingPattern */ ||
                            containingNodeKind === 219 /* TypeAliasDeclaration */; // type Map, K, |
                    case 21 /* DotToken */:
                        return containingNodeKind === 165 /* ArrayBindingPattern */; // var [.|
                    case 54 /* ColonToken */:
                        return containingNodeKind === 166 /* BindingElement */; // var {x :html|
                    case 19 /* OpenBracketToken */:
                        return containingNodeKind === 165 /* ArrayBindingPattern */; // var [x|
                    case 17 /* OpenParenToken */:
                        return containingNodeKind === 247 /* CatchClause */ ||
                            isFunction(containingNodeKind);
                    case 15 /* OpenBraceToken */:
                        return containingNodeKind === 220 /* EnumDeclaration */ ||
                            containingNodeKind === 218 /* InterfaceDeclaration */ ||
                            containingNodeKind === 156 /* TypeLiteral */; // const x : { |
                    case 23 /* SemicolonToken */:
                        return containingNodeKind === 141 /* PropertySignature */ &&
                            contextToken.parent && contextToken.parent.parent &&
                            (contextToken.parent.parent.kind === 218 /* InterfaceDeclaration */ ||
                                contextToken.parent.parent.kind === 156 /* TypeLiteral */); // const x : { a; |
                    case 25 /* LessThanToken */:
                        return containingNodeKind === 217 /* ClassDeclaration */ ||
                            containingNodeKind === 189 /* ClassExpression */ ||
                            containingNodeKind === 218 /* InterfaceDeclaration */ ||
                            containingNodeKind === 219 /* TypeAliasDeclaration */ ||
                            isFunction(containingNodeKind);
                    case 113 /* StaticKeyword */:
                        return containingNodeKind === 142 /* PropertyDeclaration */;
                    case 22 /* DotDotDotToken */:
                        return containingNodeKind === 139 /* Parameter */ ||
                            (contextToken.parent && contextToken.parent.parent &&
                                contextToken.parent.parent.kind === 165 /* ArrayBindingPattern */); // var [...z|
                    case 112 /* PublicKeyword */:
                    case 110 /* PrivateKeyword */:
                    case 111 /* ProtectedKeyword */:
                        return containingNodeKind === 139 /* Parameter */;
                    case 116 /* AsKeyword */:
                        return containingNodeKind === 229 /* ImportSpecifier */ ||
                            containingNodeKind === 233 /* ExportSpecifier */ ||
                            containingNodeKind === 227 /* NamespaceImport */;
                    case 73 /* ClassKeyword */:
                    case 81 /* EnumKeyword */:
                    case 107 /* InterfaceKeyword */:
                    case 87 /* FunctionKeyword */:
                    case 102 /* VarKeyword */:
                    case 123 /* GetKeyword */:
                    case 129 /* SetKeyword */:
                    case 89 /* ImportKeyword */:
                    case 108 /* LetKeyword */:
                    case 74 /* ConstKeyword */:
                    case 114 /* YieldKeyword */:
                    case 132 /* TypeKeyword */:
                        return true;
                }
                // Previous token may have been a keyword that was converted to an identifier.
                switch (contextToken.getText()) {
                    case "abstract":
                    case "async":
                    case "class":
                    case "const":
                    case "declare":
                    case "enum":
                    case "function":
                    case "interface":
                    case "let":
                    case "private":
                    case "protected":
                    case "public":
                    case "static":
                    case "var":
                    case "yield":
                        return true;
                }
                return false;
            }
            function isDotOfNumericLiteral(contextToken) {
                if (contextToken.kind === 8 /* NumericLiteral */) {
                    var text = contextToken.getFullText();
                    return text.charAt(text.length - 1) === ".";
                }
                return false;
            }
            /**
             * Filters out completion suggestions for named imports or exports.
             *
             * @param exportsOfModule          The list of symbols which a module exposes.
             * @param namedImportsOrExports    The list of existing import/export specifiers in the import/export clause.
             *
             * @returns Symbols to be suggested at an import/export clause, barring those whose named imports/exports
             *          do not occur at the current position and have not otherwise been typed.
             */
            function filterNamedImportOrExportCompletionItems(exportsOfModule, namedImportsOrExports) {
                var exisingImportsOrExports = {};
                for (var _i = 0, namedImportsOrExports_1 = namedImportsOrExports; _i < namedImportsOrExports_1.length; _i++) {
                    var element = namedImportsOrExports_1[_i];
                    // If this is the current item we are editing right now, do not filter it out
                    if (element.getStart() <= position && position <= element.getEnd()) {
                        continue;
                    }
                    var name_1 = element.propertyName || element.name;
                    exisingImportsOrExports[name_1.text] = true;
                }
                if (ts.isEmpty(exisingImportsOrExports)) {
                    return exportsOfModule;
                }
                return ts.filter(exportsOfModule, function (e) { return !ts.lookUp(exisingImportsOrExports, e.name); });
            }
            /**
             * Filters out completion suggestions for named imports or exports.
             *
             * @returns Symbols to be suggested in an object binding pattern or object literal expression, barring those whose declarations
             *          do not occur at the current position and have not otherwise been typed.
             */
            function filterObjectMembersList(contextualMemberSymbols, existingMembers) {
                if (!existingMembers || existingMembers.length === 0) {
                    return contextualMemberSymbols;
                }
                var existingMemberNames = {};
                for (var _i = 0, existingMembers_1 = existingMembers; _i < existingMembers_1.length; _i++) {
                    var m = existingMembers_1[_i];
                    // Ignore omitted expressions for missing members
                    if (m.kind !== 248 /* PropertyAssignment */ &&
                        m.kind !== 249 /* ShorthandPropertyAssignment */ &&
                        m.kind !== 166 /* BindingElement */ &&
                        m.kind !== 144 /* MethodDeclaration */) {
                        continue;
                    }
                    // If this is the current item we are editing right now, do not filter it out
                    if (m.getStart() <= position && position <= m.getEnd()) {
                        continue;
                    }
                    var existingName = void 0;
                    if (m.kind === 166 /* BindingElement */ && m.propertyName) {
                        // include only identifiers in completion list
                        if (m.propertyName.kind === 69 /* Identifier */) {
                            existingName = m.propertyName.text;
                        }
                    }
                    else {
                        // TODO(jfreeman): Account for computed property name
                        // NOTE: if one only performs this step when m.name is an identifier,
                        // things like '__proto__' are not filtered out.
                        existingName = m.name.text;
                    }
                    existingMemberNames[existingName] = true;
                }
                return ts.filter(contextualMemberSymbols, function (m) { return !ts.lookUp(existingMemberNames, m.name); });
            }
            /**
             * Filters out completion suggestions from 'symbols' according to existing JSX attributes.
             *
             * @returns Symbols to be suggested in a JSX element, barring those whose attributes
             *          do not occur at the current position and have not otherwise been typed.
             */
            function filterJsxAttributes(symbols, attributes) {
                var seenNames = {};
                for (var _i = 0, attributes_1 = attributes; _i < attributes_1.length; _i++) {
                    var attr = attributes_1[_i];
                    // If this is the current item we are editing right now, do not filter it out
                    if (attr.getStart() <= position && position <= attr.getEnd()) {
                        continue;
                    }
                    if (attr.kind === 241 /* JsxAttribute */) {
                        seenNames[attr.name.text] = true;
                    }
                }
                return ts.filter(symbols, function (a) { return !ts.lookUp(seenNames, a.name); });
            }
        }
        function getCompletionsAtPosition(fileName, position) {
            synchronizeHostData();
            var completionData = getCompletionData(fileName, position);
            if (!completionData) {
                return undefined;
            }
            var symbols = completionData.symbols, isMemberCompletion = completionData.isMemberCompletion, isNewIdentifierLocation = completionData.isNewIdentifierLocation, location = completionData.location, isJsDocTagName = completionData.isJsDocTagName;
            var typeChecker = program.getTypeChecker();
            if (isJsDocTagName) {
                // If the current position is a jsDoc tag name, only tag names should be provided for completion
                return { isMemberCompletion: false, isNewIdentifierLocation: false, entries: getAllJsDocCompletionEntries() };
            }
            var sourceFile = getValidSourceFile(fileName);
            var entries = [];
            if (ts.isSourceFileJavaScript(sourceFile)) {
                var uniqueNames = getCompletionEntriesFromSymbols(symbols, entries);
                ts.addRange(entries, getJavaScriptCompletionEntries(sourceFile, location.pos, uniqueNames));
            }
            else {
                if (!symbols || symbols.length === 0) {
                    if (sourceFile.languageVariant === 1 /* JSX */ &&
                        location.parent && location.parent.kind === 240 /* JsxClosingElement */) {
                        // In the TypeScript JSX element, if such element is not defined. When users query for completion at closing tag,
                        // instead of simply giving unknown value, the completion will return the tag-name of an associated opening-element.
                        // For example:
                        //     var x = <div> </ /*1*/>  completion list at "1" will contain "div" with type any
                        var tagName = location.parent.parent.openingElement.tagName;
                        entries.push({
                            name: tagName.text,
                            kind: undefined,
                            kindModifiers: undefined,
                            sortText: "0"
                        });
                    }
                    else {
                        return undefined;
                    }
                }
                getCompletionEntriesFromSymbols(symbols, entries);
            }
            // Add keywords if this is not a member completion list
            if (!isMemberCompletion && !isJsDocTagName) {
                ts.addRange(entries, keywordCompletions);
            }
            return { isMemberCompletion: isMemberCompletion, isNewIdentifierLocation: isNewIdentifierLocation, entries: entries };
            function getJavaScriptCompletionEntries(sourceFile, position, uniqueNames) {
                var entries = [];
                var target = program.getCompilerOptions().target;
                var nameTable = getNameTable(sourceFile);
                for (var name_2 in nameTable) {
                    // Skip identifiers produced only from the current location
                    if (nameTable[name_2] === position) {
                        continue;
                    }
                    if (!uniqueNames[name_2]) {
                        uniqueNames[name_2] = name_2;
                        var displayName = getCompletionEntryDisplayName(name_2, target, /*performCharacterChecks*/ true);
                        if (displayName) {
                            var entry = {
                                name: displayName,
                                kind: ScriptElementKind.warning,
                                kindModifiers: "",
                                sortText: "1"
                            };
                            entries.push(entry);
                        }
                    }
                }
                return entries;
            }
            function getAllJsDocCompletionEntries() {
                return jsDocCompletionEntries || (jsDocCompletionEntries = ts.map(jsDocTagNames, function (tagName) {
                    return {
                        name: tagName,
                        kind: ScriptElementKind.keyword,
                        kindModifiers: "",
                        sortText: "0"
                    };
                }));
            }
            function createCompletionEntry(symbol, location) {
                // Try to get a valid display name for this symbol, if we could not find one, then ignore it.
                // We would like to only show things that can be added after a dot, so for instance numeric properties can
                // not be accessed with a dot (a.1 <- invalid)
                var displayName = getCompletionEntryDisplayNameForSymbol(symbol, program.getCompilerOptions().target, /*performCharacterChecks*/ true, location);
                if (!displayName) {
                    return undefined;
                }
                // TODO(drosen): Right now we just permit *all* semantic meanings when calling
                // 'getSymbolKind' which is permissible given that it is backwards compatible; but
                // really we should consider passing the meaning for the node so that we don't report
                // that a suggestion for a value is an interface.  We COULD also just do what
                // 'getSymbolModifiers' does, which is to use the first declaration.
                // Use a 'sortText' of 0' so that all symbol completion entries come before any other
                // entries (like JavaScript identifier entries).
                return {
                    name: displayName,
                    kind: getSymbolKind(symbol, location),
                    kindModifiers: getSymbolModifiers(symbol),
                    sortText: "0",
                    type: typeChecker.typeToString(typeChecker.getTypeOfSymbolAtLocation(symbol, location))
                };
            }
            function getCompletionEntriesFromSymbols(symbols, entries) {
                var start = new Date().getTime();
                var uniqueNames = {};
                if (symbols) {
                    for (var _i = 0, symbols_1 = symbols; _i < symbols_1.length; _i++) {
                        var symbol = symbols_1[_i];
                        var entry = createCompletionEntry(symbol, location);
                        if (entry) {
                            var id = ts.escapeIdentifier(entry.name);
                            if (!ts.lookUp(uniqueNames, id)) {
                                entries.push(entry);
                                uniqueNames[id] = id;
                            }
                        }
                    }
                }
                log("getCompletionsAtPosition: getCompletionEntriesFromSymbols: " + (new Date().getTime() - start));
                return uniqueNames;
            }
        }
        function getCompletionEntryDetails(fileName, position, entryName) {
            synchronizeHostData();
            // Compute all the completion symbols again.
            var completionData = getCompletionData(fileName, position);
            if (completionData) {
                var symbols = completionData.symbols, location_1 = completionData.location;
                // Find the symbol with the matching entry name.
                var target_1 = program.getCompilerOptions().target;
                // We don't need to perform character checks here because we're only comparing the
                // name against 'entryName' (which is known to be good), not building a new
                // completion entry.
                var symbol = ts.forEach(symbols, function (s) { return getCompletionEntryDisplayNameForSymbol(s, target_1, /*performCharacterChecks*/ false, location_1) === entryName ? s : undefined; });
                if (symbol) {
                    var _a = getSymbolDisplayPartsDocumentationAndSymbolKind(symbol, getValidSourceFile(fileName), location_1, location_1, 7 /* All */), displayParts = _a.displayParts, documentation = _a.documentation, symbolKind = _a.symbolKind;
                    return {
                        name: entryName,
                        kindModifiers: getSymbolModifiers(symbol),
                        kind: symbolKind,
                        displayParts: displayParts,
                        documentation: documentation
                    };
                }
            }
            // Didn't find a symbol with this name.  See if we can find a keyword instead.
            var keywordCompletion = ts.forEach(keywordCompletions, function (c) { return c.name === entryName; });
            if (keywordCompletion) {
                return {
                    name: entryName,
                    kind: ScriptElementKind.keyword,
                    kindModifiers: ScriptElementKindModifier.none,
                    displayParts: [ts.displayPart(entryName, SymbolDisplayPartKind.keyword)],
                    documentation: undefined
                };
            }
            return undefined;
        }
        // TODO(drosen): use contextual SemanticMeaning.
        function getSymbolKind(symbol, location) {
            var flags = symbol.getFlags();
            if (flags & 32 /* Class */)
                return ts.getDeclarationOfKind(symbol, 189 /* ClassExpression */) ?
                    ScriptElementKind.localClassElement : ScriptElementKind.classElement;
            if (flags & 384 /* Enum */)
                return ScriptElementKind.enumElement;
            if (flags & 524288 /* TypeAlias */)
                return ScriptElementKind.typeElement;
            if (flags & 64 /* Interface */)
                return ScriptElementKind.interfaceElement;
            if (flags & 262144 /* TypeParameter */)
                return ScriptElementKind.typeParameterElement;
            var result = getSymbolKindOfConstructorPropertyMethodAccessorFunctionOrVar(symbol, flags, location);
            if (result === ScriptElementKind.unknown) {
                if (flags & 262144 /* TypeParameter */)
                    return ScriptElementKind.typeParameterElement;
                if (flags & 8 /* EnumMember */)
                    return ScriptElementKind.variableElement;
                if (flags & 8388608 /* Alias */)
                    return ScriptElementKind.alias;
                if (flags & 1536 /* Module */)
                    return ScriptElementKind.moduleElement;
            }
            return result;
        }
        function getSymbolKindOfConstructorPropertyMethodAccessorFunctionOrVar(symbol, flags, location) {
            var typeChecker = program.getTypeChecker();
            if (typeChecker.isUndefinedSymbol(symbol)) {
                return ScriptElementKind.variableElement;
            }
            if (typeChecker.isArgumentsSymbol(symbol)) {
                return ScriptElementKind.localVariableElement;
            }
            if (flags & 3 /* Variable */) {
                if (ts.isFirstDeclarationOfSymbolParameter(symbol)) {
                    return ScriptElementKind.parameterElement;
                }
                else if (symbol.valueDeclaration && ts.isConst(symbol.valueDeclaration)) {
                    return ScriptElementKind.constElement;
                }
                else if (ts.forEach(symbol.declarations, ts.isLet)) {
                    return ScriptElementKind.letElement;
                }
                return isLocalVariableOrFunction(symbol) ? ScriptElementKind.localVariableElement : ScriptElementKind.variableElement;
            }
            if (flags & 16 /* Function */)
                return isLocalVariableOrFunction(symbol) ? ScriptElementKind.localFunctionElement : ScriptElementKind.functionElement;
            if (flags & 32768 /* GetAccessor */)
                return ScriptElementKind.memberGetAccessorElement;
            if (flags & 65536 /* SetAccessor */)
                return ScriptElementKind.memberSetAccessorElement;
            if (flags & 8192 /* Method */)
                return ScriptElementKind.memberFunctionElement;
            if (flags & 16384 /* Constructor */)
                return ScriptElementKind.constructorImplementationElement;
            if (flags & 4 /* Property */) {
                if (flags & 268435456 /* SyntheticProperty */) {
                    // If union property is result of union of non method (property/accessors/variables), it is labeled as property
                    var unionPropertyKind = ts.forEach(typeChecker.getRootSymbols(symbol), function (rootSymbol) {
                        var rootSymbolFlags = rootSymbol.getFlags();
                        if (rootSymbolFlags & (98308 /* PropertyOrAccessor */ | 3 /* Variable */)) {
                            return ScriptElementKind.memberVariableElement;
                        }
                        ts.Debug.assert(!!(rootSymbolFlags & 8192 /* Method */));
                    });
                    if (!unionPropertyKind) {
                        // If this was union of all methods,
                        // make sure it has call signatures before we can label it as method
                        var typeOfUnionProperty = typeChecker.getTypeOfSymbolAtLocation(symbol, location);
                        if (typeOfUnionProperty.getCallSignatures().length) {
                            return ScriptElementKind.memberFunctionElement;
                        }
                        return ScriptElementKind.memberVariableElement;
                    }
                    return unionPropertyKind;
                }
                return ScriptElementKind.memberVariableElement;
            }
            return ScriptElementKind.unknown;
        }
        function getSymbolModifiers(symbol) {
            return symbol && symbol.declarations && symbol.declarations.length > 0
                ? ts.getNodeModifiers(symbol.declarations[0])
                : ScriptElementKindModifier.none;
        }
        // TODO(drosen): Currently completion entry details passes the SemanticMeaning.All instead of using semanticMeaning of location
        function getSymbolDisplayPartsDocumentationAndSymbolKind(symbol, sourceFile, enclosingDeclaration, location, semanticMeaning) {
            if (semanticMeaning === void 0) { semanticMeaning = getMeaningFromLocation(location); }
            var typeChecker = program.getTypeChecker();
            var displayParts = [];
            var documentation;
            var symbolFlags = symbol.flags;
            var symbolKind = getSymbolKindOfConstructorPropertyMethodAccessorFunctionOrVar(symbol, symbolFlags, location);
            var hasAddedSymbolInfo;
            var type;
            // Class at constructor site need to be shown as constructor apart from property,method, vars
            if (symbolKind !== ScriptElementKind.unknown || symbolFlags & 32 /* Class */ || symbolFlags & 8388608 /* Alias */) {
                // If it is accessor they are allowed only if location is at name of the accessor
                if (symbolKind === ScriptElementKind.memberGetAccessorElement || symbolKind === ScriptElementKind.memberSetAccessorElement) {
                    symbolKind = ScriptElementKind.memberVariableElement;
                }
                var signature = void 0;
                type = typeChecker.getTypeOfSymbolAtLocation(symbol, location);
                if (type) {
                    if (location.parent && location.parent.kind === 169 /* PropertyAccessExpression */) {
                        var right = location.parent.name;
                        // Either the location is on the right of a property access, or on the left and the right is missing
                        if (right === location || (right && right.getFullWidth() === 0)) {
                            location = location.parent;
                        }
                    }
                    // try get the call/construct signature from the type if it matches
                    var callExpression = void 0;
                    if (location.kind === 171 /* CallExpression */ || location.kind === 172 /* NewExpression */) {
                        callExpression = location;
                    }
                    else if (isCallExpressionTarget(location) || isNewExpressionTarget(location)) {
                        callExpression = location.parent;
                    }
                    if (callExpression) {
                        var candidateSignatures = [];
                        signature = typeChecker.getResolvedSignature(callExpression, candidateSignatures);
                        if (!signature && candidateSignatures.length) {
                            // Use the first candidate:
                            signature = candidateSignatures[0];
                        }
                        var useConstructSignatures = callExpression.kind === 172 /* NewExpression */ || callExpression.expression.kind === 95 /* SuperKeyword */;
                        var allSignatures = useConstructSignatures ? type.getConstructSignatures() : type.getCallSignatures();
                        if (!ts.contains(allSignatures, signature.target) && !ts.contains(allSignatures, signature)) {
                            // Get the first signature if there is one -- allSignatures may contain
                            // either the original signature or its target, so check for either
                            signature = allSignatures.length ? allSignatures[0] : undefined;
                        }
                        if (signature) {
                            if (useConstructSignatures && (symbolFlags & 32 /* Class */)) {
                                // Constructor
                                symbolKind = ScriptElementKind.constructorImplementationElement;
                                addPrefixForAnyFunctionOrVar(type.symbol, symbolKind);
                            }
                            else if (symbolFlags & 8388608 /* Alias */) {
                                symbolKind = ScriptElementKind.alias;
                                pushTypePart(symbolKind);
                                displayParts.push(ts.spacePart());
                                if (useConstructSignatures) {
                                    displayParts.push(ts.keywordPart(92 /* NewKeyword */));
                                    displayParts.push(ts.spacePart());
                                }
                                addFullSymbolName(symbol);
                            }
                            else {
                                addPrefixForAnyFunctionOrVar(symbol, symbolKind);
                            }
                            switch (symbolKind) {
                                case ScriptElementKind.memberVariableElement:
                                case ScriptElementKind.variableElement:
                                case ScriptElementKind.constElement:
                                case ScriptElementKind.letElement:
                                case ScriptElementKind.parameterElement:
                                case ScriptElementKind.localVariableElement:
                                    // If it is call or construct signature of lambda's write type name
                                    displayParts.push(ts.punctuationPart(54 /* ColonToken */));
                                    displayParts.push(ts.spacePart());
                                    if (useConstructSignatures) {
                                        displayParts.push(ts.keywordPart(92 /* NewKeyword */));
                                        displayParts.push(ts.spacePart());
                                    }
                                    if (!(type.flags & 65536 /* Anonymous */)) {
                                        ts.addRange(displayParts, ts.symbolToDisplayParts(typeChecker, type.symbol, enclosingDeclaration, /*meaning*/ undefined, 1 /* WriteTypeParametersOrArguments */));
                                    }
                                    addSignatureDisplayParts(signature, allSignatures, 8 /* WriteArrowStyleSignature */);
                                    break;
                                default:
                                    // Just signature
                                    addSignatureDisplayParts(signature, allSignatures);
                            }
                            hasAddedSymbolInfo = true;
                        }
                    }
                    else if ((isNameOfFunctionDeclaration(location) && !(symbol.flags & 98304 /* Accessor */)) ||
                        (location.kind === 121 /* ConstructorKeyword */ && location.parent.kind === 145 /* Constructor */)) {
                        // get the signature from the declaration and write it
                        var functionDeclaration = location.parent;
                        var allSignatures = functionDeclaration.kind === 145 /* Constructor */ ? type.getConstructSignatures() : type.getCallSignatures();
                        if (!typeChecker.isImplementationOfOverload(functionDeclaration)) {
                            signature = typeChecker.getSignatureFromDeclaration(functionDeclaration);
                        }
                        else {
                            signature = allSignatures[0];
                        }
                        if (functionDeclaration.kind === 145 /* Constructor */) {
                            // show (constructor) Type(...) signature
                            symbolKind = ScriptElementKind.constructorImplementationElement;
                            addPrefixForAnyFunctionOrVar(type.symbol, symbolKind);
                        }
                        else {
                            // (function/method) symbol(..signature)
                            addPrefixForAnyFunctionOrVar(functionDeclaration.kind === 148 /* CallSignature */ &&
                                !(type.symbol.flags & 2048 /* TypeLiteral */ || type.symbol.flags & 4096 /* ObjectLiteral */) ? type.symbol : symbol, symbolKind);
                        }
                        addSignatureDisplayParts(signature, allSignatures);
                        hasAddedSymbolInfo = true;
                    }
                }
            }
            if (symbolFlags & 32 /* Class */ && !hasAddedSymbolInfo) {
                if (ts.getDeclarationOfKind(symbol, 189 /* ClassExpression */)) {
                    // Special case for class expressions because we would like to indicate that
                    // the class name is local to the class body (similar to function expression)
                    //      (local class) class <className>
                    pushTypePart(ScriptElementKind.localClassElement);
                }
                else {
                    // Class declaration has name which is not local.
                    displayParts.push(ts.keywordPart(73 /* ClassKeyword */));
                }
                displayParts.push(ts.spacePart());
                addFullSymbolName(symbol);
                writeTypeParametersOfSymbol(symbol, sourceFile);
            }
            if ((symbolFlags & 64 /* Interface */) && (semanticMeaning & 2 /* Type */)) {
                addNewLineIfDisplayPartsExist();
                displayParts.push(ts.keywordPart(107 /* InterfaceKeyword */));
                displayParts.push(ts.spacePart());
                addFullSymbolName(symbol);
                writeTypeParametersOfSymbol(symbol, sourceFile);
            }
            if (symbolFlags & 524288 /* TypeAlias */) {
                addNewLineIfDisplayPartsExist();
                displayParts.push(ts.keywordPart(132 /* TypeKeyword */));
                displayParts.push(ts.spacePart());
                addFullSymbolName(symbol);
                writeTypeParametersOfSymbol(symbol, sourceFile);
                displayParts.push(ts.spacePart());
                displayParts.push(ts.operatorPart(56 /* EqualsToken */));
                displayParts.push(ts.spacePart());
                ts.addRange(displayParts, ts.typeToDisplayParts(typeChecker, typeChecker.getDeclaredTypeOfSymbol(symbol), enclosingDeclaration));
            }
            if (symbolFlags & 384 /* Enum */) {
                addNewLineIfDisplayPartsExist();
                if (ts.forEach(symbol.declarations, ts.isConstEnumDeclaration)) {
                    displayParts.push(ts.keywordPart(74 /* ConstKeyword */));
                    displayParts.push(ts.spacePart());
                }
                displayParts.push(ts.keywordPart(81 /* EnumKeyword */));
                displayParts.push(ts.spacePart());
                addFullSymbolName(symbol);
            }
            if (symbolFlags & 1536 /* Module */) {
                addNewLineIfDisplayPartsExist();
                var declaration = ts.getDeclarationOfKind(symbol, 221 /* ModuleDeclaration */);
                var isNamespace = declaration && declaration.name && declaration.name.kind === 69 /* Identifier */;
                displayParts.push(ts.keywordPart(isNamespace ? 126 /* NamespaceKeyword */ : 125 /* ModuleKeyword */));
                displayParts.push(ts.spacePart());
                addFullSymbolName(symbol);
            }
            if ((symbolFlags & 262144 /* TypeParameter */) && (semanticMeaning & 2 /* Type */)) {
                addNewLineIfDisplayPartsExist();
                displayParts.push(ts.punctuationPart(17 /* OpenParenToken */));
                displayParts.push(ts.textPart("type parameter"));
                displayParts.push(ts.punctuationPart(18 /* CloseParenToken */));
                displayParts.push(ts.spacePart());
                addFullSymbolName(symbol);
                displayParts.push(ts.spacePart());
                displayParts.push(ts.keywordPart(90 /* InKeyword */));
                displayParts.push(ts.spacePart());
                if (symbol.parent) {
                    // Class/Interface type parameter
                    addFullSymbolName(symbol.parent, enclosingDeclaration);
                    writeTypeParametersOfSymbol(symbol.parent, enclosingDeclaration);
                }
                else {
                    // Method/function type parameter
                    var declaration = ts.getDeclarationOfKind(symbol, 138 /* TypeParameter */);
                    ts.Debug.assert(declaration !== undefined);
                    declaration = declaration.parent;
                    if (declaration) {
                        if (ts.isFunctionLikeKind(declaration.kind)) {
                            var signature = typeChecker.getSignatureFromDeclaration(declaration);
                            if (declaration.kind === 149 /* ConstructSignature */) {
                                displayParts.push(ts.keywordPart(92 /* NewKeyword */));
                                displayParts.push(ts.spacePart());
                            }
                            else if (declaration.kind !== 148 /* CallSignature */ && declaration.name) {
                                addFullSymbolName(declaration.symbol);
                            }
                            ts.addRange(displayParts, ts.signatureToDisplayParts(typeChecker, signature, sourceFile, 32 /* WriteTypeArgumentsOfSignature */));
                        }
                        else {
                            // Type alias type parameter
                            // For example
                            //      type list<T> = T[];  // Both T will go through same code path
                            displayParts.push(ts.keywordPart(132 /* TypeKeyword */));
                            displayParts.push(ts.spacePart());
                            addFullSymbolName(declaration.symbol);
                            writeTypeParametersOfSymbol(declaration.symbol, sourceFile);
                        }
                    }
                }
            }
            if (symbolFlags & 8 /* EnumMember */) {
                addPrefixForAnyFunctionOrVar(symbol, "enum member");
                var declaration = symbol.declarations[0];
                if (declaration.kind === 250 /* EnumMember */) {
                    var constantValue = typeChecker.getConstantValue(declaration);
                    if (constantValue !== undefined) {
                        displayParts.push(ts.spacePart());
                        displayParts.push(ts.operatorPart(56 /* EqualsToken */));
                        displayParts.push(ts.spacePart());
                        displayParts.push(ts.displayPart(constantValue.toString(), SymbolDisplayPartKind.numericLiteral));
                    }
                }
            }
            if (symbolFlags & 8388608 /* Alias */) {
                addNewLineIfDisplayPartsExist();
                displayParts.push(ts.keywordPart(89 /* ImportKeyword */));
                displayParts.push(ts.spacePart());
                addFullSymbolName(symbol);
                ts.forEach(symbol.declarations, function (declaration) {
                    if (declaration.kind === 224 /* ImportEqualsDeclaration */) {
                        var importEqualsDeclaration = declaration;
                        if (ts.isExternalModuleImportEqualsDeclaration(importEqualsDeclaration)) {
                            displayParts.push(ts.spacePart());
                            displayParts.push(ts.operatorPart(56 /* EqualsToken */));
                            displayParts.push(ts.spacePart());
                            displayParts.push(ts.keywordPart(127 /* RequireKeyword */));
                            displayParts.push(ts.punctuationPart(17 /* OpenParenToken */));
                            displayParts.push(ts.displayPart(ts.getTextOfNode(ts.getExternalModuleImportEqualsDeclarationExpression(importEqualsDeclaration)), SymbolDisplayPartKind.stringLiteral));
                            displayParts.push(ts.punctuationPart(18 /* CloseParenToken */));
                        }
                        else {
                            var internalAliasSymbol = typeChecker.getSymbolAtLocation(importEqualsDeclaration.moduleReference);
                            if (internalAliasSymbol) {
                                displayParts.push(ts.spacePart());
                                displayParts.push(ts.operatorPart(56 /* EqualsToken */));
                                displayParts.push(ts.spacePart());
                                addFullSymbolName(internalAliasSymbol, enclosingDeclaration);
                            }
                        }
                        return true;
                    }
                });
            }
            if (!hasAddedSymbolInfo) {
                if (symbolKind !== ScriptElementKind.unknown) {
                    if (type) {
                        addPrefixForAnyFunctionOrVar(symbol, symbolKind);
                        // For properties, variables and local vars: show the type
                        if (symbolKind === ScriptElementKind.memberVariableElement ||
                            symbolFlags & 3 /* Variable */ ||
                            symbolKind === ScriptElementKind.localVariableElement) {
                            displayParts.push(ts.punctuationPart(54 /* ColonToken */));
                            displayParts.push(ts.spacePart());
                            // If the type is type parameter, format it specially
                            if (type.symbol && type.symbol.flags & 262144 /* TypeParameter */) {
                                var typeParameterParts = ts.mapToDisplayParts(function (writer) {
                                    typeChecker.getSymbolDisplayBuilder().buildTypeParameterDisplay(type, writer, enclosingDeclaration);
                                });
                                ts.addRange(displayParts, typeParameterParts);
                            }
                            else {
                                ts.addRange(displayParts, ts.typeToDisplayParts(typeChecker, type, enclosingDeclaration));
                            }
                        }
                        else if (symbolFlags & 16 /* Function */ ||
                            symbolFlags & 8192 /* Method */ ||
                            symbolFlags & 16384 /* Constructor */ ||
                            symbolFlags & 131072 /* Signature */ ||
                            symbolFlags & 98304 /* Accessor */ ||
                            symbolKind === ScriptElementKind.memberFunctionElement) {
                            var allSignatures = type.getCallSignatures();
                            addSignatureDisplayParts(allSignatures[0], allSignatures);
                        }
                    }
                }
                else {
                    symbolKind = getSymbolKind(symbol, location);
                }
            }
            if (!documentation) {
                documentation = symbol.getDocumentationComment();
            }
            return { displayParts: displayParts, documentation: documentation, symbolKind: symbolKind };
            function addNewLineIfDisplayPartsExist() {
                if (displayParts.length) {
                    displayParts.push(ts.lineBreakPart());
                }
            }
            function addFullSymbolName(symbol, enclosingDeclaration) {
                var fullSymbolDisplayParts = ts.symbolToDisplayParts(typeChecker, symbol, enclosingDeclaration || sourceFile, /*meaning*/ undefined, 1 /* WriteTypeParametersOrArguments */ | 2 /* UseOnlyExternalAliasing */);
                ts.addRange(displayParts, fullSymbolDisplayParts);
            }
            function addPrefixForAnyFunctionOrVar(symbol, symbolKind) {
                addNewLineIfDisplayPartsExist();
                if (symbolKind) {
                    pushTypePart(symbolKind);
                    displayParts.push(ts.spacePart());
                    addFullSymbolName(symbol);
                }
            }
            function pushTypePart(symbolKind) {
                switch (symbolKind) {
                    case ScriptElementKind.variableElement:
                    case ScriptElementKind.functionElement:
                    case ScriptElementKind.letElement:
                    case ScriptElementKind.constElement:
                    case ScriptElementKind.constructorImplementationElement:
                        displayParts.push(ts.textOrKeywordPart(symbolKind));
                        return;
                    default:
                        displayParts.push(ts.punctuationPart(17 /* OpenParenToken */));
                        displayParts.push(ts.textOrKeywordPart(symbolKind));
                        displayParts.push(ts.punctuationPart(18 /* CloseParenToken */));
                        return;
                }
            }
            function addSignatureDisplayParts(signature, allSignatures, flags) {
                ts.addRange(displayParts, ts.signatureToDisplayParts(typeChecker, signature, enclosingDeclaration, flags | 32 /* WriteTypeArgumentsOfSignature */));
                if (allSignatures.length > 1) {
                    displayParts.push(ts.spacePart());
                    displayParts.push(ts.punctuationPart(17 /* OpenParenToken */));
                    displayParts.push(ts.operatorPart(35 /* PlusToken */));
                    displayParts.push(ts.displayPart((allSignatures.length - 1).toString(), SymbolDisplayPartKind.numericLiteral));
                    displayParts.push(ts.spacePart());
                    displayParts.push(ts.textPart(allSignatures.length === 2 ? "overload" : "overloads"));
                    displayParts.push(ts.punctuationPart(18 /* CloseParenToken */));
                }
                documentation = signature.getDocumentationComment();
            }
            function writeTypeParametersOfSymbol(symbol, enclosingDeclaration) {
                var typeParameterParts = ts.mapToDisplayParts(function (writer) {
                    typeChecker.getSymbolDisplayBuilder().buildTypeParameterDisplayFromSymbol(symbol, writer, enclosingDeclaration);
                });
                ts.addRange(displayParts, typeParameterParts);
            }
        }
        function getQuickInfoAtPosition(fileName, position) {
            synchronizeHostData();
            var sourceFile = getValidSourceFile(fileName);
            var node = ts.getTouchingPropertyName(sourceFile, position);
            if (!node) {
                return undefined;
            }
            if (isLabelName(node)) {
                return undefined;
            }
            var typeChecker = program.getTypeChecker();
            var symbol = typeChecker.getSymbolAtLocation(node);
            if (!symbol || typeChecker.isUnknownSymbol(symbol)) {
                // Try getting just type at this position and show
                switch (node.kind) {
                    case 69 /* Identifier */:
                    case 169 /* PropertyAccessExpression */:
                    case 136 /* QualifiedName */:
                    case 97 /* ThisKeyword */:
                    case 162 /* ThisType */:
                    case 95 /* SuperKeyword */:
                        // For the identifiers/this/super etc get the type at position
                        var type = typeChecker.getTypeAtLocation(node);
                        if (type) {
                            return {
                                kind: ScriptElementKind.unknown,
                                kindModifiers: ScriptElementKindModifier.none,
                                textSpan: ts.createTextSpan(node.getStart(), node.getWidth()),
                                displayParts: ts.typeToDisplayParts(typeChecker, type, getContainerNode(node)),
                                documentation: type.symbol ? type.symbol.getDocumentationComment() : undefined
                            };
                        }
                }
                return undefined;
            }
            var displayPartsDocumentationsAndKind = getSymbolDisplayPartsDocumentationAndSymbolKind(symbol, sourceFile, getContainerNode(node), node);
            return {
                kind: displayPartsDocumentationsAndKind.symbolKind,
                kindModifiers: getSymbolModifiers(symbol),
                textSpan: ts.createTextSpan(node.getStart(), node.getWidth()),
                displayParts: displayPartsDocumentationsAndKind.displayParts,
                documentation: displayPartsDocumentationsAndKind.documentation
            };
        }
        function createDefinitionInfo(node, symbolKind, symbolName, containerName) {
            return {
                fileName: node.getSourceFile().fileName,
                textSpan: ts.createTextSpanFromBounds(node.getStart(), node.getEnd()),
                kind: symbolKind,
                name: symbolName,
                containerKind: undefined,
                containerName: containerName
            };
        }
        function getDefinitionFromSymbol(symbol, node) {
            var typeChecker = program.getTypeChecker();
            var result = [];
            var declarations = symbol.getDeclarations();
            var symbolName = typeChecker.symbolToString(symbol); // Do not get scoped name, just the name of the symbol
            var symbolKind = getSymbolKind(symbol, node);
            var containerSymbol = symbol.parent;
            var containerName = containerSymbol ? typeChecker.symbolToString(containerSymbol, node) : "";
            if (!tryAddConstructSignature(symbol, node, symbolKind, symbolName, containerName, result) &&
                !tryAddCallSignature(symbol, node, symbolKind, symbolName, containerName, result)) {
                // Just add all the declarations.
                ts.forEach(declarations, function (declaration) {
                    // netbeanstypescript edit - node kind is more useful to distinguish the decls
                    //result.push(createDefinitionInfo(declaration, symbolKind, symbolName, containerName));
                    result.push(createDefinitionInfo(declaration, getNodeKind(declaration), symbolName, containerName));
                });
            }
            return result;
            function tryAddConstructSignature(symbol, location, symbolKind, symbolName, containerName, result) {
                // Applicable only if we are in a new expression, or we are on a constructor declaration
                // and in either case the symbol has a construct signature definition, i.e. class
                if (isNewExpressionTarget(location) || location.kind === 121 /* ConstructorKeyword */) {
                    if (symbol.flags & 32 /* Class */) {
                        // Find the first class-like declaration and try to get the construct signature.
                        for (var _i = 0, _a = symbol.getDeclarations(); _i < _a.length; _i++) {
                            var declaration = _a[_i];
                            if (ts.isClassLike(declaration)) {
                                return tryAddSignature(declaration.members, 
                                /*selectConstructors*/ true, symbolKind, symbolName, containerName, result);
                            }
                        }
                        ts.Debug.fail("Expected declaration to have at least one class-like declaration");
                    }
                }
                return false;
            }
            function tryAddCallSignature(symbol, location, symbolKind, symbolName, containerName, result) {
                if (isCallExpressionTarget(location) || isNewExpressionTarget(location) || isNameOfFunctionDeclaration(location)) {
                    return tryAddSignature(symbol.declarations, /*selectConstructors*/ false, symbolKind, symbolName, containerName, result);
                }
                return false;
            }
            function tryAddSignature(signatureDeclarations, selectConstructors, symbolKind, symbolName, containerName, result) {
                var declarations = [];
                var definition;
                ts.forEach(signatureDeclarations, function (d) {
                    if ((selectConstructors && d.kind === 145 /* Constructor */) ||
                        (!selectConstructors && (d.kind === 216 /* FunctionDeclaration */ || d.kind === 144 /* MethodDeclaration */ || d.kind === 143 /* MethodSignature */))) {
                        declarations.push(d);
                        if (d.body)
                            definition = d;
                    }
                });
                if (definition) {
                    result.push(createDefinitionInfo(definition, symbolKind, symbolName, containerName));
                    return true;
                }
                else if (declarations.length) {
                    result.push(createDefinitionInfo(ts.lastOrUndefined(declarations), symbolKind, symbolName, containerName));
                    return true;
                }
                return false;
            }
        }
        /// Goto definition
        function getDefinitionAtPosition(fileName, position) {
            synchronizeHostData();
            var sourceFile = getValidSourceFile(fileName);
            var node = ts.getTouchingPropertyName(sourceFile, position);
            if (!node) {
                return undefined;
            }
            // Labels
            if (isJumpStatementTarget(node)) {
                var labelName = node.text;
                var label = getTargetLabel(node.parent, node.text);
                return label ? [createDefinitionInfo(label, ScriptElementKind.label, labelName, /*containerName*/ undefined)] : undefined;
            }
            /// Triple slash reference comments
            var comment = ts.forEach(sourceFile.referencedFiles, function (r) { return (r.pos <= position && position < r.end) ? r : undefined; });
            if (comment) {
                var referenceFile = ts.tryResolveScriptReference(program, sourceFile, comment);
                if (referenceFile) {
                    return [{
                            fileName: referenceFile.fileName,
                            textSpan: ts.createTextSpanFromBounds(0, 0),
                            kind: ScriptElementKind.scriptElement,
                            name: comment.fileName,
                            containerName: undefined,
                            containerKind: undefined
                        }];
                }
                return undefined;
            }
            var typeChecker = program.getTypeChecker();
            var symbol = typeChecker.getSymbolAtLocation(node);
            // Could not find a symbol e.g. node is string or number keyword,
            // or the symbol was an internal symbol and does not have a declaration e.g. undefined symbol
            if (!symbol) {
                return undefined;
            }
            // If this is an alias, and the request came at the declaration location
            // get the aliased symbol instead. This allows for goto def on an import e.g.
            //   import {A, B} from "mod";
            // to jump to the implementation directly.
            if (symbol.flags & 8388608 /* Alias */) {
                var declaration = symbol.declarations[0];
                if (node.kind === 69 /* Identifier */ && node.parent === declaration) {
                    symbol = typeChecker.getAliasedSymbol(symbol);
                }
            }
            // Because name in short-hand property assignment has two different meanings: property name and property value,
            // using go-to-definition at such position should go to the variable declaration of the property value rather than
            // go to the declaration of the property name (in this case stay at the same position). However, if go-to-definition
            // is performed at the location of property access, we would like to go to definition of the property in the short-hand
            // assignment. This case and others are handled by the following code.
            if (node.parent.kind === 249 /* ShorthandPropertyAssignment */) {
                var shorthandSymbol = typeChecker.getShorthandAssignmentValueSymbol(symbol.valueDeclaration);
                if (!shorthandSymbol) {
                    return [];
                }
                var shorthandDeclarations = shorthandSymbol.getDeclarations();
                var shorthandSymbolKind = getSymbolKind(shorthandSymbol, node);
                var shorthandSymbolName_1 = typeChecker.symbolToString(shorthandSymbol);
                var shorthandContainerName_1 = typeChecker.symbolToString(symbol.parent, node);
                return ts.map(shorthandDeclarations, 
                // netbeanstypescript edit - node kind is more useful to distinguish the decls
                //declaration => createDefinitionInfo(declaration, shorthandSymbolKind, shorthandSymbolName, shorthandContainerName));
                function (declaration) { return createDefinitionInfo(declaration, getNodeKind(declaration), shorthandSymbolName_1, shorthandContainerName_1); });
            }
            return getDefinitionFromSymbol(symbol, node);
        }
        /// Goto type
        function getTypeDefinitionAtPosition(fileName, position) {
            synchronizeHostData();
            var sourceFile = getValidSourceFile(fileName);
            var node = ts.getTouchingPropertyName(sourceFile, position);
            if (!node) {
                return undefined;
            }
            var typeChecker = program.getTypeChecker();
            var symbol = typeChecker.getSymbolAtLocation(node);
            if (!symbol) {
                return undefined;
            }
            var type = typeChecker.getTypeOfSymbolAtLocation(symbol, node);
            if (!type) {
                return undefined;
            }
            if (type.flags & 16384 /* Union */) {
                var result_2 = [];
                ts.forEach(type.types, function (t) {
                    if (t.symbol) {
                        ts.addRange(/*to*/ result_2, /*from*/ getDefinitionFromSymbol(t.symbol, node));
                    }
                });
                return result_2;
            }
            if (!type.symbol) {
                return undefined;
            }
            return getDefinitionFromSymbol(type.symbol, node);
        }
        function getOccurrencesAtPosition(fileName, position) {
            var results = getOccurrencesAtPositionCore(fileName, position);
            if (results) {
                var sourceFile_1 = getCanonicalFileName(ts.normalizeSlashes(fileName));
                // Get occurrences only supports reporting occurrences for the file queried.  So
                // filter down to that list.
                results = ts.filter(results, function (r) { return getCanonicalFileName(ts.normalizeSlashes(r.fileName)) === sourceFile_1; });
            }
            return results;
        }
        function getDocumentHighlights(fileName, position, filesToSearch) {
            synchronizeHostData();
            filesToSearch = ts.map(filesToSearch, ts.normalizeSlashes);
            var sourceFilesToSearch = ts.filter(program.getSourceFiles(), function (f) { return ts.contains(filesToSearch, f.fileName); });
            var sourceFile = getValidSourceFile(fileName);
            var node = ts.getTouchingWord(sourceFile, position);
            if (!node) {
                return undefined;
            }
            return getSemanticDocumentHighlights(node) || getSyntacticDocumentHighlights(node);
            function getHighlightSpanForNode(node) {
                var start = node.getStart();
                var end = node.getEnd();
                return {
                    fileName: sourceFile.fileName,
                    textSpan: ts.createTextSpanFromBounds(start, end),
                    kind: HighlightSpanKind.none
                };
            }
            function getSemanticDocumentHighlights(node) {
                if (node.kind === 69 /* Identifier */ ||
                    node.kind === 97 /* ThisKeyword */ ||
                    node.kind === 162 /* ThisType */ ||
                    node.kind === 95 /* SuperKeyword */ ||
                    isLiteralNameOfPropertyDeclarationOrIndexAccess(node) ||
                    isNameOfExternalModuleImportOrDeclaration(node)) {
                    var referencedSymbols = getReferencedSymbolsForNode(node, sourceFilesToSearch, /*findInStrings*/ false, /*findInComments*/ false);
                    return convertReferencedSymbols(referencedSymbols);
                }
                return undefined;
                function convertReferencedSymbols(referencedSymbols) {
                    if (!referencedSymbols) {
                        return undefined;
                    }
                    var fileNameToDocumentHighlights = {};
                    var result = [];
                    for (var _i = 0, referencedSymbols_1 = referencedSymbols; _i < referencedSymbols_1.length; _i++) {
                        var referencedSymbol = referencedSymbols_1[_i];
                        for (var _a = 0, _b = referencedSymbol.references; _a < _b.length; _a++) {
                            var referenceEntry = _b[_a];
                            var fileName_1 = referenceEntry.fileName;
                            var documentHighlights = ts.getProperty(fileNameToDocumentHighlights, fileName_1);
                            if (!documentHighlights) {
                                documentHighlights = { fileName: fileName_1, highlightSpans: [] };
                                fileNameToDocumentHighlights[fileName_1] = documentHighlights;
                                result.push(documentHighlights);
                            }
                            documentHighlights.highlightSpans.push({
                                textSpan: referenceEntry.textSpan,
                                kind: referenceEntry.isWriteAccess ? HighlightSpanKind.writtenReference : HighlightSpanKind.reference
                            });
                        }
                    }
                    return result;
                }
            }
            function getSyntacticDocumentHighlights(node) {
                var fileName = sourceFile.fileName;
                var highlightSpans = getHighlightSpans(node);
                if (!highlightSpans || highlightSpans.length === 0) {
                    return undefined;
                }
                return [{ fileName: fileName, highlightSpans: highlightSpans }];
                // returns true if 'node' is defined and has a matching 'kind'.
                function hasKind(node, kind) {
                    return node !== undefined && node.kind === kind;
                }
                // Null-propagating 'parent' function.
                function parent(node) {
                    return node && node.parent;
                }
                function getHighlightSpans(node) {
                    if (node) {
                        switch (node.kind) {
                            case 88 /* IfKeyword */:
                            case 80 /* ElseKeyword */:
                                if (hasKind(node.parent, 199 /* IfStatement */)) {
                                    return getIfElseOccurrences(node.parent);
                                }
                                break;
                            case 94 /* ReturnKeyword */:
                                if (hasKind(node.parent, 207 /* ReturnStatement */)) {
                                    return getReturnOccurrences(node.parent);
                                }
                                break;
                            case 98 /* ThrowKeyword */:
                                if (hasKind(node.parent, 211 /* ThrowStatement */)) {
                                    return getThrowOccurrences(node.parent);
                                }
                                break;
                            case 72 /* CatchKeyword */:
                                if (hasKind(parent(parent(node)), 212 /* TryStatement */)) {
                                    return getTryCatchFinallyOccurrences(node.parent.parent);
                                }
                                break;
                            case 100 /* TryKeyword */:
                            case 85 /* FinallyKeyword */:
                                if (hasKind(parent(node), 212 /* TryStatement */)) {
                                    return getTryCatchFinallyOccurrences(node.parent);
                                }
                                break;
                            case 96 /* SwitchKeyword */:
                                if (hasKind(node.parent, 209 /* SwitchStatement */)) {
                                    return getSwitchCaseDefaultOccurrences(node.parent);
                                }
                                break;
                            case 71 /* CaseKeyword */:
                            case 77 /* DefaultKeyword */:
                                if (hasKind(parent(parent(parent(node))), 209 /* SwitchStatement */)) {
                                    return getSwitchCaseDefaultOccurrences(node.parent.parent.parent);
                                }
                                break;
                            case 70 /* BreakKeyword */:
                            case 75 /* ContinueKeyword */:
                                if (hasKind(node.parent, 206 /* BreakStatement */) || hasKind(node.parent, 205 /* ContinueStatement */)) {
                                    return getBreakOrContinueStatementOccurrences(node.parent);
                                }
                                break;
                            case 86 /* ForKeyword */:
                                if (hasKind(node.parent, 202 /* ForStatement */) ||
                                    hasKind(node.parent, 203 /* ForInStatement */) ||
                                    hasKind(node.parent, 204 /* ForOfStatement */)) {
                                    return getLoopBreakContinueOccurrences(node.parent);
                                }
                                break;
                            case 104 /* WhileKeyword */:
                            case 79 /* DoKeyword */:
                                if (hasKind(node.parent, 201 /* WhileStatement */) || hasKind(node.parent, 200 /* DoStatement */)) {
                                    return getLoopBreakContinueOccurrences(node.parent);
                                }
                                break;
                            case 121 /* ConstructorKeyword */:
                                if (hasKind(node.parent, 145 /* Constructor */)) {
                                    return getConstructorOccurrences(node.parent);
                                }
                                break;
                            case 123 /* GetKeyword */:
                            case 129 /* SetKeyword */:
                                if (hasKind(node.parent, 146 /* GetAccessor */) || hasKind(node.parent, 147 /* SetAccessor */)) {
                                    return getGetAndSetOccurrences(node.parent);
                                }
                                break;
                            default:
                                if (ts.isModifierKind(node.kind) && node.parent &&
                                    (ts.isDeclaration(node.parent) || node.parent.kind === 196 /* VariableStatement */)) {
                                    return getModifierOccurrences(node.kind, node.parent);
                                }
                        }
                    }
                    return undefined;
                }
                /**
                 * Aggregates all throw-statements within this node *without* crossing
                 * into function boundaries and try-blocks with catch-clauses.
                 */
                function aggregateOwnedThrowStatements(node) {
                    var statementAccumulator = [];
                    aggregate(node);
                    return statementAccumulator;
                    function aggregate(node) {
                        if (node.kind === 211 /* ThrowStatement */) {
                            statementAccumulator.push(node);
                        }
                        else if (node.kind === 212 /* TryStatement */) {
                            var tryStatement = node;
                            if (tryStatement.catchClause) {
                                aggregate(tryStatement.catchClause);
                            }
                            else {
                                // Exceptions thrown within a try block lacking a catch clause
                                // are "owned" in the current context.
                                aggregate(tryStatement.tryBlock);
                            }
                            if (tryStatement.finallyBlock) {
                                aggregate(tryStatement.finallyBlock);
                            }
                        }
                        else if (!ts.isFunctionLike(node)) {
                            ts.forEachChild(node, aggregate);
                        }
                    }
                }
                /**
                 * For lack of a better name, this function takes a throw statement and returns the
                 * nearest ancestor that is a try-block (whose try statement has a catch clause),
                 * function-block, or source file.
                 */
                function getThrowStatementOwner(throwStatement) {
                    var child = throwStatement;
                    while (child.parent) {
                        var parent_5 = child.parent;
                        if (ts.isFunctionBlock(parent_5) || parent_5.kind === 251 /* SourceFile */) {
                            return parent_5;
                        }
                        // A throw-statement is only owned by a try-statement if the try-statement has
                        // a catch clause, and if the throw-statement occurs within the try block.
                        if (parent_5.kind === 212 /* TryStatement */) {
                            var tryStatement = parent_5;
                            if (tryStatement.tryBlock === child && tryStatement.catchClause) {
                                return child;
                            }
                        }
                        child = parent_5;
                    }
                    return undefined;
                }
                function aggregateAllBreakAndContinueStatements(node) {
                    var statementAccumulator = [];
                    aggregate(node);
                    return statementAccumulator;
                    function aggregate(node) {
                        if (node.kind === 206 /* BreakStatement */ || node.kind === 205 /* ContinueStatement */) {
                            statementAccumulator.push(node);
                        }
                        else if (!ts.isFunctionLike(node)) {
                            ts.forEachChild(node, aggregate);
                        }
                    }
                }
                function ownsBreakOrContinueStatement(owner, statement) {
                    var actualOwner = getBreakOrContinueOwner(statement);
                    return actualOwner && actualOwner === owner;
                }
                function getBreakOrContinueOwner(statement) {
                    for (var node_1 = statement.parent; node_1; node_1 = node_1.parent) {
                        switch (node_1.kind) {
                            case 209 /* SwitchStatement */:
                                if (statement.kind === 205 /* ContinueStatement */) {
                                    continue;
                                }
                            // Fall through.
                            case 202 /* ForStatement */:
                            case 203 /* ForInStatement */:
                            case 204 /* ForOfStatement */:
                            case 201 /* WhileStatement */:
                            case 200 /* DoStatement */:
                                if (!statement.label || isLabeledBy(node_1, statement.label.text)) {
                                    return node_1;
                                }
                                break;
                            default:
                                // Don't cross function boundaries.
                                if (ts.isFunctionLike(node_1)) {
                                    return undefined;
                                }
                                break;
                        }
                    }
                    return undefined;
                }
                function getModifierOccurrences(modifier, declaration) {
                    var container = declaration.parent;
                    // Make sure we only highlight the keyword when it makes sense to do so.
                    if (ts.isAccessibilityModifier(modifier)) {
                        if (!(container.kind === 217 /* ClassDeclaration */ ||
                            container.kind === 189 /* ClassExpression */ ||
                            (declaration.kind === 139 /* Parameter */ && hasKind(container, 145 /* Constructor */)))) {
                            return undefined;
                        }
                    }
                    else if (modifier === 113 /* StaticKeyword */) {
                        if (!(container.kind === 217 /* ClassDeclaration */ || container.kind === 189 /* ClassExpression */)) {
                            return undefined;
                        }
                    }
                    else if (modifier === 82 /* ExportKeyword */ || modifier === 122 /* DeclareKeyword */) {
                        if (!(container.kind === 222 /* ModuleBlock */ || container.kind === 251 /* SourceFile */)) {
                            return undefined;
                        }
                    }
                    else if (modifier === 115 /* AbstractKeyword */) {
                        if (!(container.kind === 217 /* ClassDeclaration */ || declaration.kind === 217 /* ClassDeclaration */)) {
                            return undefined;
                        }
                    }
                    else {
                        // unsupported modifier
                        return undefined;
                    }
                    var keywords = [];
                    var modifierFlag = getFlagFromModifier(modifier);
                    var nodes;
                    switch (container.kind) {
                        case 222 /* ModuleBlock */:
                        case 251 /* SourceFile */:
                            // Container is either a class declaration or the declaration is a classDeclaration
                            if (modifierFlag & 128 /* Abstract */) {
                                nodes = declaration.members.concat(declaration);
                            }
                            else {
                                nodes = container.statements;
                            }
                            break;
                        case 145 /* Constructor */:
                            nodes = container.parameters.concat(container.parent.members);
                            break;
                        case 217 /* ClassDeclaration */:
                        case 189 /* ClassExpression */:
                            nodes = container.members;
                            // If we're an accessibility modifier, we're in an instance member and should search
                            // the constructor's parameter list for instance members as well.
                            if (modifierFlag & 56 /* AccessibilityModifier */) {
                                var constructor = ts.forEach(container.members, function (member) {
                                    return member.kind === 145 /* Constructor */ && member;
                                });
                                if (constructor) {
                                    nodes = nodes.concat(constructor.parameters);
                                }
                            }
                            else if (modifierFlag & 128 /* Abstract */) {
                                nodes = nodes.concat(container);
                            }
                            break;
                        default:
                            ts.Debug.fail("Invalid container kind.");
                    }
                    ts.forEach(nodes, function (node) {
                        if (node.modifiers && node.flags & modifierFlag) {
                            ts.forEach(node.modifiers, function (child) { return pushKeywordIf(keywords, child, modifier); });
                        }
                    });
                    return ts.map(keywords, getHighlightSpanForNode);
                    function getFlagFromModifier(modifier) {
                        switch (modifier) {
                            case 112 /* PublicKeyword */:
                                return 8 /* Public */;
                            case 110 /* PrivateKeyword */:
                                return 16 /* Private */;
                            case 111 /* ProtectedKeyword */:
                                return 32 /* Protected */;
                            case 113 /* StaticKeyword */:
                                return 64 /* Static */;
                            case 82 /* ExportKeyword */:
                                return 2 /* Export */;
                            case 122 /* DeclareKeyword */:
                                return 4 /* Ambient */;
                            case 115 /* AbstractKeyword */:
                                return 128 /* Abstract */;
                            default:
                                ts.Debug.fail();
                        }
                    }
                }
                function pushKeywordIf(keywordList, token) {
                    var expected = [];
                    for (var _i = 2; _i < arguments.length; _i++) {
                        expected[_i - 2] = arguments[_i];
                    }
                    if (token && ts.contains(expected, token.kind)) {
                        keywordList.push(token);
                        return true;
                    }
                    return false;
                }
                function getGetAndSetOccurrences(accessorDeclaration) {
                    var keywords = [];
                    tryPushAccessorKeyword(accessorDeclaration.symbol, 146 /* GetAccessor */);
                    tryPushAccessorKeyword(accessorDeclaration.symbol, 147 /* SetAccessor */);
                    return ts.map(keywords, getHighlightSpanForNode);
                    function tryPushAccessorKeyword(accessorSymbol, accessorKind) {
                        var accessor = ts.getDeclarationOfKind(accessorSymbol, accessorKind);
                        if (accessor) {
                            ts.forEach(accessor.getChildren(), function (child) { return pushKeywordIf(keywords, child, 123 /* GetKeyword */, 129 /* SetKeyword */); });
                        }
                    }
                }
                function getConstructorOccurrences(constructorDeclaration) {
                    var declarations = constructorDeclaration.symbol.getDeclarations();
                    var keywords = [];
                    ts.forEach(declarations, function (declaration) {
                        ts.forEach(declaration.getChildren(), function (token) {
                            return pushKeywordIf(keywords, token, 121 /* ConstructorKeyword */);
                        });
                    });
                    return ts.map(keywords, getHighlightSpanForNode);
                }
                function getLoopBreakContinueOccurrences(loopNode) {
                    var keywords = [];
                    if (pushKeywordIf(keywords, loopNode.getFirstToken(), 86 /* ForKeyword */, 104 /* WhileKeyword */, 79 /* DoKeyword */)) {
                        // If we succeeded and got a do-while loop, then start looking for a 'while' keyword.
                        if (loopNode.kind === 200 /* DoStatement */) {
                            var loopTokens = loopNode.getChildren();
                            for (var i = loopTokens.length - 1; i >= 0; i--) {
                                if (pushKeywordIf(keywords, loopTokens[i], 104 /* WhileKeyword */)) {
                                    break;
                                }
                            }
                        }
                    }
                    var breaksAndContinues = aggregateAllBreakAndContinueStatements(loopNode.statement);
                    ts.forEach(breaksAndContinues, function (statement) {
                        if (ownsBreakOrContinueStatement(loopNode, statement)) {
                            pushKeywordIf(keywords, statement.getFirstToken(), 70 /* BreakKeyword */, 75 /* ContinueKeyword */);
                        }
                    });
                    return ts.map(keywords, getHighlightSpanForNode);
                }
                function getBreakOrContinueStatementOccurrences(breakOrContinueStatement) {
                    var owner = getBreakOrContinueOwner(breakOrContinueStatement);
                    if (owner) {
                        switch (owner.kind) {
                            case 202 /* ForStatement */:
                            case 203 /* ForInStatement */:
                            case 204 /* ForOfStatement */:
                            case 200 /* DoStatement */:
                            case 201 /* WhileStatement */:
                                return getLoopBreakContinueOccurrences(owner);
                            case 209 /* SwitchStatement */:
                                return getSwitchCaseDefaultOccurrences(owner);
                        }
                    }
                    return undefined;
                }
                function getSwitchCaseDefaultOccurrences(switchStatement) {
                    var keywords = [];
                    pushKeywordIf(keywords, switchStatement.getFirstToken(), 96 /* SwitchKeyword */);
                    // Go through each clause in the switch statement, collecting the 'case'/'default' keywords.
                    ts.forEach(switchStatement.caseBlock.clauses, function (clause) {
                        pushKeywordIf(keywords, clause.getFirstToken(), 71 /* CaseKeyword */, 77 /* DefaultKeyword */);
                        var breaksAndContinues = aggregateAllBreakAndContinueStatements(clause);
                        ts.forEach(breaksAndContinues, function (statement) {
                            if (ownsBreakOrContinueStatement(switchStatement, statement)) {
                                pushKeywordIf(keywords, statement.getFirstToken(), 70 /* BreakKeyword */);
                            }
                        });
                    });
                    return ts.map(keywords, getHighlightSpanForNode);
                }
                function getTryCatchFinallyOccurrences(tryStatement) {
                    var keywords = [];
                    pushKeywordIf(keywords, tryStatement.getFirstToken(), 100 /* TryKeyword */);
                    if (tryStatement.catchClause) {
                        pushKeywordIf(keywords, tryStatement.catchClause.getFirstToken(), 72 /* CatchKeyword */);
                    }
                    if (tryStatement.finallyBlock) {
                        var finallyKeyword = ts.findChildOfKind(tryStatement, 85 /* FinallyKeyword */, sourceFile);
                        pushKeywordIf(keywords, finallyKeyword, 85 /* FinallyKeyword */);
                    }
                    return ts.map(keywords, getHighlightSpanForNode);
                }
                function getThrowOccurrences(throwStatement) {
                    var owner = getThrowStatementOwner(throwStatement);
                    if (!owner) {
                        return undefined;
                    }
                    var keywords = [];
                    ts.forEach(aggregateOwnedThrowStatements(owner), function (throwStatement) {
                        pushKeywordIf(keywords, throwStatement.getFirstToken(), 98 /* ThrowKeyword */);
                    });
                    // If the "owner" is a function, then we equate 'return' and 'throw' statements in their
                    // ability to "jump out" of the function, and include occurrences for both.
                    if (ts.isFunctionBlock(owner)) {
                        ts.forEachReturnStatement(owner, function (returnStatement) {
                            pushKeywordIf(keywords, returnStatement.getFirstToken(), 94 /* ReturnKeyword */);
                        });
                    }
                    return ts.map(keywords, getHighlightSpanForNode);
                }
                function getReturnOccurrences(returnStatement) {
                    var func = ts.getContainingFunction(returnStatement);
                    // If we didn't find a containing function with a block body, bail out.
                    if (!(func && hasKind(func.body, 195 /* Block */))) {
                        return undefined;
                    }
                    var keywords = [];
                    ts.forEachReturnStatement(func.body, function (returnStatement) {
                        pushKeywordIf(keywords, returnStatement.getFirstToken(), 94 /* ReturnKeyword */);
                    });
                    // Include 'throw' statements that do not occur within a try block.
                    ts.forEach(aggregateOwnedThrowStatements(func.body), function (throwStatement) {
                        pushKeywordIf(keywords, throwStatement.getFirstToken(), 98 /* ThrowKeyword */);
                    });
                    return ts.map(keywords, getHighlightSpanForNode);
                }
                function getIfElseOccurrences(ifStatement) {
                    var keywords = [];
                    // Traverse upwards through all parent if-statements linked by their else-branches.
                    while (hasKind(ifStatement.parent, 199 /* IfStatement */) && ifStatement.parent.elseStatement === ifStatement) {
                        ifStatement = ifStatement.parent;
                    }
                    // Now traverse back down through the else branches, aggregating if/else keywords of if-statements.
                    while (ifStatement) {
                        var children = ifStatement.getChildren();
                        pushKeywordIf(keywords, children[0], 88 /* IfKeyword */);
                        // Generally the 'else' keyword is second-to-last, so we traverse backwards.
                        for (var i = children.length - 1; i >= 0; i--) {
                            if (pushKeywordIf(keywords, children[i], 80 /* ElseKeyword */)) {
                                break;
                            }
                        }
                        if (!hasKind(ifStatement.elseStatement, 199 /* IfStatement */)) {
                            break;
                        }
                        ifStatement = ifStatement.elseStatement;
                    }
                    var result = [];
                    // We'd like to highlight else/ifs together if they are only separated by whitespace
                    // (i.e. the keywords are separated by no comments, no newlines).
                    for (var i = 0; i < keywords.length; i++) {
                        if (keywords[i].kind === 80 /* ElseKeyword */ && i < keywords.length - 1) {
                            var elseKeyword = keywords[i];
                            var ifKeyword = keywords[i + 1]; // this *should* always be an 'if' keyword.
                            var shouldCombindElseAndIf = true;
                            // Avoid recalculating getStart() by iterating backwards.
                            for (var j = ifKeyword.getStart() - 1; j >= elseKeyword.end; j--) {
                                if (!ts.isWhiteSpace(sourceFile.text.charCodeAt(j))) {
                                    shouldCombindElseAndIf = false;
                                    break;
                                }
                            }
                            if (shouldCombindElseAndIf) {
                                result.push({
                                    fileName: fileName,
                                    textSpan: ts.createTextSpanFromBounds(elseKeyword.getStart(), ifKeyword.end),
                                    kind: HighlightSpanKind.reference
                                });
                                i++; // skip the next keyword
                                continue;
                            }
                        }
                        // Ordinary case: just highlight the keyword.
                        result.push(getHighlightSpanForNode(keywords[i]));
                    }
                    return result;
                }
            }
        }
        /// References and Occurrences
        function getOccurrencesAtPositionCore(fileName, position) {
            synchronizeHostData();
            return convertDocumentHighlights(getDocumentHighlights(fileName, position, [fileName]));
            function convertDocumentHighlights(documentHighlights) {
                if (!documentHighlights) {
                    return undefined;
                }
                var result = [];
                for (var _i = 0, documentHighlights_1 = documentHighlights; _i < documentHighlights_1.length; _i++) {
                    var entry = documentHighlights_1[_i];
                    for (var _a = 0, _b = entry.highlightSpans; _a < _b.length; _a++) {
                        var highlightSpan = _b[_a];
                        result.push({
                            fileName: entry.fileName,
                            textSpan: highlightSpan.textSpan,
                            isWriteAccess: highlightSpan.kind === HighlightSpanKind.writtenReference
                        });
                    }
                }
                return result;
            }
        }
        function convertReferences(referenceSymbols) {
            if (!referenceSymbols) {
                return undefined;
            }
            var referenceEntries = [];
            for (var _i = 0, referenceSymbols_1 = referenceSymbols; _i < referenceSymbols_1.length; _i++) {
                var referenceSymbol = referenceSymbols_1[_i];
                ts.addRange(referenceEntries, referenceSymbol.references);
            }
            return referenceEntries;
        }
        function findRenameLocations(fileName, position, findInStrings, findInComments) {
            var referencedSymbols = findReferencedSymbols(fileName, position, findInStrings, findInComments);
            return convertReferences(referencedSymbols);
        }
        function getReferencesAtPosition(fileName, position) {
            var referencedSymbols = findReferencedSymbols(fileName, position, /*findInStrings*/ false, /*findInComments*/ false);
            return convertReferences(referencedSymbols);
        }
        function findReferences(fileName, position) {
            var referencedSymbols = findReferencedSymbols(fileName, position, /*findInStrings*/ false, /*findInComments*/ false);
            // Only include referenced symbols that have a valid definition.
            return ts.filter(referencedSymbols, function (rs) { return !!rs.definition; });
        }
        function findReferencedSymbols(fileName, position, findInStrings, findInComments) {
            synchronizeHostData();
            var sourceFile = getValidSourceFile(fileName);
            var node = ts.getTouchingPropertyName(sourceFile, position);
            if (!node) {
                return undefined;
            }
            if (node.kind !== 69 /* Identifier */ &&
                // TODO (drosen): This should be enabled in a later release - currently breaks rename.
                // node.kind !== SyntaxKind.ThisKeyword &&
                // node.kind !== SyntaxKind.SuperKeyword &&
                !isLiteralNameOfPropertyDeclarationOrIndexAccess(node) &&
                !isNameOfExternalModuleImportOrDeclaration(node)) {
                return undefined;
            }
            ts.Debug.assert(node.kind === 69 /* Identifier */ || node.kind === 8 /* NumericLiteral */ || node.kind === 9 /* StringLiteral */);
            return getReferencedSymbolsForNode(node, program.getSourceFiles(), findInStrings, findInComments);
        }
        function getReferencedSymbolsForNode(node, sourceFiles, findInStrings, findInComments) {
            var typeChecker = program.getTypeChecker();
            // Labels
            if (isLabelName(node)) {
                if (isJumpStatementTarget(node)) {
                    var labelDefinition = getTargetLabel(node.parent, node.text);
                    // if we have a label definition, look within its statement for references, if not, then
                    // the label is undefined and we have no results..
                    return labelDefinition ? getLabelReferencesInNode(labelDefinition.parent, labelDefinition) : undefined;
                }
                else {
                    // it is a label definition and not a target, search within the parent labeledStatement
                    return getLabelReferencesInNode(node.parent, node);
                }
            }
            if (node.kind === 97 /* ThisKeyword */ || node.kind === 162 /* ThisType */) {
                return getReferencesForThisKeyword(node, sourceFiles);
            }
            if (node.kind === 95 /* SuperKeyword */) {
                return getReferencesForSuperKeyword(node);
            }
            var symbol = typeChecker.getSymbolAtLocation(node);
            // Could not find a symbol e.g. unknown identifier
            if (!symbol) {
                // Can't have references to something that we have no symbol for.
                return undefined;
            }
            var declarations = symbol.declarations;
            // The symbol was an internal symbol and does not have a declaration e.g. undefined symbol
            if (!declarations || !declarations.length) {
                return undefined;
            }
            var result;
            // Compute the meaning from the location and the symbol it references
            var searchMeaning = getIntersectingMeaningFromDeclarations(getMeaningFromLocation(node), declarations);
            // Get the text to search for.
            // Note: if this is an external module symbol, the name doesn't include quotes.
            var declaredName = ts.stripQuotes(ts.getDeclaredName(typeChecker, symbol, node));
            // Try to get the smallest valid scope that we can limit our search to;
            // otherwise we'll need to search globally (i.e. include each file).
            var scope = getSymbolScope(symbol);
            // Maps from a symbol ID to the ReferencedSymbol entry in 'result'.
            var symbolToIndex = [];
            if (scope) {
                result = [];
                getReferencesInNode(scope, symbol, declaredName, node, searchMeaning, findInStrings, findInComments, result, symbolToIndex);
            }
            else {
                var internedName = getInternedName(symbol, node, declarations);
                for (var _i = 0, sourceFiles_1 = sourceFiles; _i < sourceFiles_1.length; _i++) {
                    var sourceFile = sourceFiles_1[_i];
                    cancellationToken.throwIfCancellationRequested();
                    var nameTable = getNameTable(sourceFile);
                    if (ts.lookUp(nameTable, internedName) !== undefined) {
                        result = result || [];
                        getReferencesInNode(sourceFile, symbol, declaredName, node, searchMeaning, findInStrings, findInComments, result, symbolToIndex);
                    }
                }
            }
            return result;
            function getDefinition(symbol) {
                var info = getSymbolDisplayPartsDocumentationAndSymbolKind(symbol, node.getSourceFile(), getContainerNode(node), node);
                var name = ts.map(info.displayParts, function (p) { return p.text; }).join("");
                var declarations = symbol.declarations;
                if (!declarations || declarations.length === 0) {
                    return undefined;
                }
                return {
                    containerKind: "",
                    containerName: "",
                    name: name,
                    kind: info.symbolKind,
                    fileName: declarations[0].getSourceFile().fileName,
                    textSpan: ts.createTextSpan(declarations[0].getStart(), 0)
                };
            }
            function isImportSpecifierSymbol(symbol) {
                return (symbol.flags & 8388608 /* Alias */) && !!ts.getDeclarationOfKind(symbol, 229 /* ImportSpecifier */);
            }
            function getInternedName(symbol, location, declarations) {
                // If this is an export or import specifier it could have been renamed using the 'as' syntax.
                // If so we want to search for whatever under the cursor.
                if (ts.isImportOrExportSpecifierName(location)) {
                    return location.getText();
                }
                // Try to get the local symbol if we're dealing with an 'export default'
                // since that symbol has the "true" name.
                var localExportDefaultSymbol = ts.getLocalSymbolForExportDefault(symbol);
                symbol = localExportDefaultSymbol || symbol;
                return ts.stripQuotes(symbol.name);
            }
            /**
             * Determines the smallest scope in which a symbol may have named references.
             * Note that not every construct has been accounted for. This function can
             * probably be improved.
             *
             * @returns undefined if the scope cannot be determined, implying that
             * a reference to a symbol can occur anywhere.
             */
            function getSymbolScope(symbol) {
                // If this is the symbol of a named function expression or named class expression,
                // then named references are limited to its own scope.
                var valueDeclaration = symbol.valueDeclaration;
                if (valueDeclaration && (valueDeclaration.kind === 176 /* FunctionExpression */ || valueDeclaration.kind === 189 /* ClassExpression */)) {
                    return valueDeclaration;
                }
                // If this is private property or method, the scope is the containing class
                if (symbol.flags & (4 /* Property */ | 8192 /* Method */)) {
                    var privateDeclaration = ts.forEach(symbol.getDeclarations(), function (d) { return (d.flags & 16 /* Private */) ? d : undefined; });
                    if (privateDeclaration) {
                        return ts.getAncestor(privateDeclaration, 217 /* ClassDeclaration */);
                    }
                }
                // If the symbol is an import we would like to find it if we are looking for what it imports.
                // So consider it visibile outside its declaration scope.
                if (symbol.flags & 8388608 /* Alias */) {
                    return undefined;
                }
                // if this symbol is visible from its parent container, e.g. exported, then bail out
                // if symbol correspond to the union property - bail out
                if (symbol.parent || (symbol.flags & 268435456 /* SyntheticProperty */)) {
                    return undefined;
                }
                var scope;
                var declarations = symbol.getDeclarations();
                if (declarations) {
                    for (var _i = 0, declarations_1 = declarations; _i < declarations_1.length; _i++) {
                        var declaration = declarations_1[_i];
                        var container = getContainerNode(declaration);
                        if (!container) {
                            return undefined;
                        }
                        if (scope && scope !== container) {
                            // Different declarations have different containers, bail out
                            return undefined;
                        }
                        if (container.kind === 251 /* SourceFile */ && !ts.isExternalModule(container)) {
                            // This is a global variable and not an external module, any declaration defined
                            // within this scope is visible outside the file
                            return undefined;
                        }
                        // The search scope is the container node
                        scope = container;
                    }
                }
                return scope;
            }
            function getPossibleSymbolReferencePositions(sourceFile, symbolName, start, end) {
                var positions = [];
                /// TODO: Cache symbol existence for files to save text search
                // Also, need to make this work for unicode escapes.
                // Be resilient in the face of a symbol with no name or zero length name
                if (!symbolName || !symbolName.length) {
                    return positions;
                }
                var text = sourceFile.text;
                var sourceLength = text.length;
                var symbolNameLength = symbolName.length;
                var position = text.indexOf(symbolName, start);
                while (position >= 0) {
                    cancellationToken.throwIfCancellationRequested();
                    // If we are past the end, stop looking
                    if (position > end)
                        break;
                    // We found a match.  Make sure it's not part of a larger word (i.e. the char
                    // before and after it have to be a non-identifier char).
                    var endPosition = position + symbolNameLength;
                    if ((position === 0 || !ts.isIdentifierPart(text.charCodeAt(position - 1), 2 /* Latest */)) &&
                        (endPosition === sourceLength || !ts.isIdentifierPart(text.charCodeAt(endPosition), 2 /* Latest */))) {
                        // Found a real match.  Keep searching.
                        positions.push(position);
                    }
                    position = text.indexOf(symbolName, position + symbolNameLength + 1);
                }
                return positions;
            }
            function getLabelReferencesInNode(container, targetLabel) {
                var references = [];
                var sourceFile = container.getSourceFile();
                var labelName = targetLabel.text;
                var possiblePositions = getPossibleSymbolReferencePositions(sourceFile, labelName, container.getStart(), container.getEnd());
                ts.forEach(possiblePositions, function (position) {
                    cancellationToken.throwIfCancellationRequested();
                    var node = ts.getTouchingWord(sourceFile, position);
                    if (!node || node.getWidth() !== labelName.length) {
                        return;
                    }
                    // Only pick labels that are either the target label, or have a target that is the target label
                    if (node === targetLabel ||
                        (isJumpStatementTarget(node) && getTargetLabel(node, labelName) === targetLabel)) {
                        references.push(getReferenceEntryFromNode(node));
                    }
                });
                var definition = {
                    containerKind: "",
                    containerName: "",
                    fileName: targetLabel.getSourceFile().fileName,
                    kind: ScriptElementKind.label,
                    name: labelName,
                    textSpan: ts.createTextSpanFromBounds(targetLabel.getStart(), targetLabel.getEnd())
                };
                return [{ definition: definition, references: references }];
            }
            function isValidReferencePosition(node, searchSymbolName) {
                if (node) {
                    // Compare the length so we filter out strict superstrings of the symbol we are looking for
                    switch (node.kind) {
                        case 69 /* Identifier */:
                            return node.getWidth() === searchSymbolName.length;
                        case 9 /* StringLiteral */:
                            if (isLiteralNameOfPropertyDeclarationOrIndexAccess(node) ||
                                isNameOfExternalModuleImportOrDeclaration(node)) {
                                // For string literals we have two additional chars for the quotes
                                return node.getWidth() === searchSymbolName.length + 2;
                            }
                            break;
                        case 8 /* NumericLiteral */:
                            if (isLiteralNameOfPropertyDeclarationOrIndexAccess(node)) {
                                return node.getWidth() === searchSymbolName.length;
                            }
                            break;
                    }
                }
                return false;
            }
            /** Search within node "container" for references for a search value, where the search value is defined as a
              * tuple of(searchSymbol, searchText, searchLocation, and searchMeaning).
              * searchLocation: a node where the search value
              */
            function getReferencesInNode(container, searchSymbol, searchText, searchLocation, searchMeaning, findInStrings, findInComments, result, symbolToIndex) {
                var sourceFile = container.getSourceFile();
                var tripleSlashDirectivePrefixRegex = /^\/\/\/\s*</;
                var possiblePositions = getPossibleSymbolReferencePositions(sourceFile, searchText, container.getStart(), container.getEnd());
                if (possiblePositions.length) {
                    // Build the set of symbols to search for, initially it has only the current symbol
                    var searchSymbols_1 = populateSearchSymbolSet(searchSymbol, searchLocation);
                    ts.forEach(possiblePositions, function (position) {
                        cancellationToken.throwIfCancellationRequested();
                        var referenceLocation = ts.getTouchingPropertyName(sourceFile, position);
                        if (!isValidReferencePosition(referenceLocation, searchText)) {
                            // This wasn't the start of a token.  Check to see if it might be a
                            // match in a comment or string if that's what the caller is asking
                            // for.
                            if ((findInStrings && ts.isInString(sourceFile, position)) ||
                                (findInComments && isInNonReferenceComment(sourceFile, position))) {
                                // In the case where we're looking inside comments/strings, we don't have
                                // an actual definition.  So just use 'undefined' here.  Features like
                                // 'Rename' won't care (as they ignore the definitions), and features like
                                // 'FindReferences' will just filter out these results.
                                result.push({
                                    definition: undefined,
                                    references: [{
                                            fileName: sourceFile.fileName,
                                            textSpan: ts.createTextSpan(position, searchText.length),
                                            isWriteAccess: false
                                        }]
                                });
                            }
                            return;
                        }
                        if (!(getMeaningFromLocation(referenceLocation) & searchMeaning)) {
                            return;
                        }
                        var referenceSymbol = typeChecker.getSymbolAtLocation(referenceLocation);
                        if (referenceSymbol) {
                            var referenceSymbolDeclaration = referenceSymbol.valueDeclaration;
                            var shorthandValueSymbol = typeChecker.getShorthandAssignmentValueSymbol(referenceSymbolDeclaration);
                            var relatedSymbol = getRelatedSymbol(searchSymbols_1, referenceSymbol, referenceLocation);
                            if (relatedSymbol) {
                                var referencedSymbol = getReferencedSymbol(relatedSymbol);
                                referencedSymbol.references.push(getReferenceEntryFromNode(referenceLocation));
                            }
                            else if (!(referenceSymbol.flags & 67108864 /* Transient */) && searchSymbols_1.indexOf(shorthandValueSymbol) >= 0) {
                                var referencedSymbol = getReferencedSymbol(shorthandValueSymbol);
                                referencedSymbol.references.push(getReferenceEntryFromNode(referenceSymbolDeclaration.name));
                            }
                        }
                    });
                }
                return;
                function getReferencedSymbol(symbol) {
                    var symbolId = ts.getSymbolId(symbol);
                    var index = symbolToIndex[symbolId];
                    if (index === undefined) {
                        index = result.length;
                        symbolToIndex[symbolId] = index;
                        result.push({
                            definition: getDefinition(symbol),
                            references: []
                        });
                    }
                    return result[index];
                }
                function isInNonReferenceComment(sourceFile, position) {
                    return ts.isInCommentHelper(sourceFile, position, isNonReferenceComment);
                    function isNonReferenceComment(c) {
                        var commentText = sourceFile.text.substring(c.pos, c.end);
                        return !tripleSlashDirectivePrefixRegex.test(commentText);
                    }
                }
            }
            function getReferencesForSuperKeyword(superKeyword) {
                var searchSpaceNode = ts.getSuperContainer(superKeyword, /*stopOnFunctions*/ false);
                if (!searchSpaceNode) {
                    return undefined;
                }
                // Whether 'super' occurs in a static context within a class.
                var staticFlag = 64 /* Static */;
                switch (searchSpaceNode.kind) {
                    case 142 /* PropertyDeclaration */:
                    case 141 /* PropertySignature */:
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                    case 145 /* Constructor */:
                    case 146 /* GetAccessor */:
                    case 147 /* SetAccessor */:
                        staticFlag &= searchSpaceNode.flags;
                        searchSpaceNode = searchSpaceNode.parent; // re-assign to be the owning class
                        break;
                    default:
                        return undefined;
                }
                var references = [];
                var sourceFile = searchSpaceNode.getSourceFile();
                var possiblePositions = getPossibleSymbolReferencePositions(sourceFile, "super", searchSpaceNode.getStart(), searchSpaceNode.getEnd());
                ts.forEach(possiblePositions, function (position) {
                    cancellationToken.throwIfCancellationRequested();
                    var node = ts.getTouchingWord(sourceFile, position);
                    if (!node || node.kind !== 95 /* SuperKeyword */) {
                        return;
                    }
                    var container = ts.getSuperContainer(node, /*stopOnFunctions*/ false);
                    // If we have a 'super' container, we must have an enclosing class.
                    // Now make sure the owning class is the same as the search-space
                    // and has the same static qualifier as the original 'super's owner.
                    if (container && (64 /* Static */ & container.flags) === staticFlag && container.parent.symbol === searchSpaceNode.symbol) {
                        references.push(getReferenceEntryFromNode(node));
                    }
                });
                var definition = getDefinition(searchSpaceNode.symbol);
                return [{ definition: definition, references: references }];
            }
            function getReferencesForThisKeyword(thisOrSuperKeyword, sourceFiles) {
                var searchSpaceNode = ts.getThisContainer(thisOrSuperKeyword, /* includeArrowFunctions */ false);
                // Whether 'this' occurs in a static context within a class.
                var staticFlag = 64 /* Static */;
                switch (searchSpaceNode.kind) {
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                        if (ts.isObjectLiteralMethod(searchSpaceNode)) {
                            break;
                        }
                    // fall through
                    case 142 /* PropertyDeclaration */:
                    case 141 /* PropertySignature */:
                    case 145 /* Constructor */:
                    case 146 /* GetAccessor */:
                    case 147 /* SetAccessor */:
                        staticFlag &= searchSpaceNode.flags;
                        searchSpaceNode = searchSpaceNode.parent; // re-assign to be the owning class
                        break;
                    case 251 /* SourceFile */:
                        if (ts.isExternalModule(searchSpaceNode)) {
                            return undefined;
                        }
                    // Fall through
                    case 216 /* FunctionDeclaration */:
                    case 176 /* FunctionExpression */:
                        break;
                    // Computed properties in classes are not handled here because references to this are illegal,
                    // so there is no point finding references to them.
                    default:
                        return undefined;
                }
                var references = [];
                var possiblePositions;
                if (searchSpaceNode.kind === 251 /* SourceFile */) {
                    ts.forEach(sourceFiles, function (sourceFile) {
                        possiblePositions = getPossibleSymbolReferencePositions(sourceFile, "this", sourceFile.getStart(), sourceFile.getEnd());
                        getThisReferencesInFile(sourceFile, sourceFile, possiblePositions, references);
                    });
                }
                else {
                    var sourceFile = searchSpaceNode.getSourceFile();
                    possiblePositions = getPossibleSymbolReferencePositions(sourceFile, "this", searchSpaceNode.getStart(), searchSpaceNode.getEnd());
                    getThisReferencesInFile(sourceFile, searchSpaceNode, possiblePositions, references);
                }
                return [{
                        definition: {
                            containerKind: "",
                            containerName: "",
                            fileName: node.getSourceFile().fileName,
                            kind: ScriptElementKind.variableElement,
                            name: "this",
                            textSpan: ts.createTextSpanFromBounds(node.getStart(), node.getEnd())
                        },
                        references: references
                    }];
                function getThisReferencesInFile(sourceFile, searchSpaceNode, possiblePositions, result) {
                    ts.forEach(possiblePositions, function (position) {
                        cancellationToken.throwIfCancellationRequested();
                        var node = ts.getTouchingWord(sourceFile, position);
                        if (!node || (node.kind !== 97 /* ThisKeyword */ && node.kind !== 162 /* ThisType */)) {
                            return;
                        }
                        var container = ts.getThisContainer(node, /* includeArrowFunctions */ false);
                        switch (searchSpaceNode.kind) {
                            case 176 /* FunctionExpression */:
                            case 216 /* FunctionDeclaration */:
                                if (searchSpaceNode.symbol === container.symbol) {
                                    result.push(getReferenceEntryFromNode(node));
                                }
                                break;
                            case 144 /* MethodDeclaration */:
                            case 143 /* MethodSignature */:
                                if (ts.isObjectLiteralMethod(searchSpaceNode) && searchSpaceNode.symbol === container.symbol) {
                                    result.push(getReferenceEntryFromNode(node));
                                }
                                break;
                            case 189 /* ClassExpression */:
                            case 217 /* ClassDeclaration */:
                                // Make sure the container belongs to the same class
                                // and has the appropriate static modifier from the original container.
                                if (container.parent && searchSpaceNode.symbol === container.parent.symbol && (container.flags & 64 /* Static */) === staticFlag) {
                                    result.push(getReferenceEntryFromNode(node));
                                }
                                break;
                            case 251 /* SourceFile */:
                                if (container.kind === 251 /* SourceFile */ && !ts.isExternalModule(container)) {
                                    result.push(getReferenceEntryFromNode(node));
                                }
                                break;
                        }
                    });
                }
            }
            function populateSearchSymbolSet(symbol, location) {
                // The search set contains at least the current symbol
                var result = [symbol];
                // If the symbol is an alias, add what it alaises to the list
                if (isImportSpecifierSymbol(symbol)) {
                    result.push(typeChecker.getAliasedSymbol(symbol));
                }
                // For export specifiers, the exported name can be refering to a local symbol, e.g.:
                //     import {a} from "mod";
                //     export {a as somethingElse}
                // We want the *local* declaration of 'a' as declared in the import,
                // *not* as declared within "mod" (or farther)
                if (location.parent.kind === 233 /* ExportSpecifier */) {
                    result.push(typeChecker.getExportSpecifierLocalTargetSymbol(location.parent));
                }
                // If the location is in a context sensitive location (i.e. in an object literal) try
                // to get a contextual type for it, and add the property symbol from the contextual
                // type to the search set
                if (isNameOfPropertyAssignment(location)) {
                    ts.forEach(getPropertySymbolsFromContextualType(location), function (contextualSymbol) {
                        ts.addRange(result, typeChecker.getRootSymbols(contextualSymbol));
                    });
                    /* Because in short-hand property assignment, location has two meaning : property name and as value of the property
                     * When we do findAllReference at the position of the short-hand property assignment, we would want to have references to position of
                     * property name and variable declaration of the identifier.
                     * Like in below example, when querying for all references for an identifier 'name', of the property assignment, the language service
                     * should show both 'name' in 'obj' and 'name' in variable declaration
                     *      const name = "Foo";
                     *      const obj = { name };
                     * In order to do that, we will populate the search set with the value symbol of the identifier as a value of the property assignment
                     * so that when matching with potential reference symbol, both symbols from property declaration and variable declaration
                     * will be included correctly.
                     */
                    var shorthandValueSymbol = typeChecker.getShorthandAssignmentValueSymbol(location.parent);
                    if (shorthandValueSymbol) {
                        result.push(shorthandValueSymbol);
                    }
                }
                // If the symbol.valueDeclaration is a property parameter declaration,
                // we should include both parameter declaration symbol and property declaration symbol
                // Parameter Declaration symbol is only visible within function scope, so the symbol is stored in contructor.locals.
                // Property Declaration symbol is a member of the class, so the symbol is stored in its class Declaration.symbol.members
                if (symbol.valueDeclaration && symbol.valueDeclaration.kind === 139 /* Parameter */ &&
                    ts.isParameterPropertyDeclaration(symbol.valueDeclaration)) {
                    result = result.concat(typeChecker.getSymbolsOfParameterPropertyDeclaration(symbol.valueDeclaration, symbol.name));
                }
                // If this is a union property, add all the symbols from all its source symbols in all unioned types.
                // If the symbol is an instantiation from a another symbol (e.g. widened symbol) , add the root the list
                ts.forEach(typeChecker.getRootSymbols(symbol), function (rootSymbol) {
                    if (rootSymbol !== symbol) {
                        result.push(rootSymbol);
                    }
                    // Add symbol of properties/methods of the same name in base classes and implemented interfaces definitions
                    if (rootSymbol.parent && rootSymbol.parent.flags & (32 /* Class */ | 64 /* Interface */)) {
                        getPropertySymbolsFromBaseTypes(rootSymbol.parent, rootSymbol.getName(), result, /*previousIterationSymbolsCache*/ {});
                    }
                });
                return result;
            }
            /**
             * Find symbol of the given property-name and add the symbol to the given result array
             * @param symbol a symbol to start searching for the given propertyName
             * @param propertyName a name of property to serach for
             * @param result an array of symbol of found property symbols
             * @param previousIterationSymbolsCache a cache of symbol from previous iterations of calling this function to prevent infinite revisitng of the same symbol.
             *                                The value of previousIterationSymbol is undefined when the function is first called.
             */
            function getPropertySymbolsFromBaseTypes(symbol, propertyName, result, previousIterationSymbolsCache) {
                if (!symbol) {
                    return;
                }
                // If the current symbol is the same as the previous-iteration symbol, we can just return the symbol that has already been visited
                // This is particularly important for the following cases, so that we do not infinitely visit the same symbol.
                // For example:
                //      interface C extends C {
                //          /*findRef*/propName: string;
                //      }
                // The first time getPropertySymbolsFromBaseTypes is called when finding-all-references at propName,
                // the symbol argument will be the symbol of an interface "C" and previousIterationSymbol is undefined,
                // the function will add any found symbol of the property-name, then its sub-routine will call
                // getPropertySymbolsFromBaseTypes again to walk up any base types to prevent revisiting already
                // visited symbol, interface "C", the sub-routine will pass the current symbol as previousIterationSymbol.
                if (ts.hasProperty(previousIterationSymbolsCache, symbol.name)) {
                    return;
                }
                if (symbol.flags & (32 /* Class */ | 64 /* Interface */)) {
                    ts.forEach(symbol.getDeclarations(), function (declaration) {
                        if (declaration.kind === 217 /* ClassDeclaration */) {
                            getPropertySymbolFromTypeReference(ts.getClassExtendsHeritageClauseElement(declaration));
                            ts.forEach(ts.getClassImplementsHeritageClauseElements(declaration), getPropertySymbolFromTypeReference);
                        }
                        else if (declaration.kind === 218 /* InterfaceDeclaration */) {
                            ts.forEach(ts.getInterfaceBaseTypeNodes(declaration), getPropertySymbolFromTypeReference);
                        }
                    });
                }
                return;
                function getPropertySymbolFromTypeReference(typeReference) {
                    if (typeReference) {
                        var type = typeChecker.getTypeAtLocation(typeReference);
                        if (type) {
                            var propertySymbol = typeChecker.getPropertyOfType(type, propertyName);
                            if (propertySymbol) {
                                result.push(propertySymbol);
                            }
                            // Visit the typeReference as well to see if it directly or indirectly use that property
                            previousIterationSymbolsCache[symbol.name] = symbol;
                            getPropertySymbolsFromBaseTypes(type.symbol, propertyName, result, previousIterationSymbolsCache);
                        }
                    }
                }
            }
            function getRelatedSymbol(searchSymbols, referenceSymbol, referenceLocation) {
                if (searchSymbols.indexOf(referenceSymbol) >= 0) {
                    return referenceSymbol;
                }
                // If the reference symbol is an alias, check if what it is aliasing is one of the search
                // symbols.
                if (isImportSpecifierSymbol(referenceSymbol)) {
                    var aliasedSymbol = typeChecker.getAliasedSymbol(referenceSymbol);
                    if (searchSymbols.indexOf(aliasedSymbol) >= 0) {
                        return aliasedSymbol;
                    }
                }
                // For export specifiers, it can be a local symbol, e.g. 
                //     import {a} from "mod";
                //     export {a as somethingElse}
                // We want the local target of the export (i.e. the import symbol) and not the final target (i.e. "mod".a)
                if (referenceLocation.parent.kind === 233 /* ExportSpecifier */) {
                    var aliasedSymbol = typeChecker.getExportSpecifierLocalTargetSymbol(referenceLocation.parent);
                    if (searchSymbols.indexOf(aliasedSymbol) >= 0) {
                        return aliasedSymbol;
                    }
                }
                // If the reference location is in an object literal, try to get the contextual type for the
                // object literal, lookup the property symbol in the contextual type, and use this symbol to
                // compare to our searchSymbol
                if (isNameOfPropertyAssignment(referenceLocation)) {
                    return ts.forEach(getPropertySymbolsFromContextualType(referenceLocation), function (contextualSymbol) {
                        return ts.forEach(typeChecker.getRootSymbols(contextualSymbol), function (s) { return searchSymbols.indexOf(s) >= 0 ? s : undefined; });
                    });
                }
                // Unwrap symbols to get to the root (e.g. transient symbols as a result of widening)
                // Or a union property, use its underlying unioned symbols
                return ts.forEach(typeChecker.getRootSymbols(referenceSymbol), function (rootSymbol) {
                    // if it is in the list, then we are done
                    if (searchSymbols.indexOf(rootSymbol) >= 0) {
                        return rootSymbol;
                    }
                    // Finally, try all properties with the same name in any type the containing type extended or implemented, and
                    // see if any is in the list
                    if (rootSymbol.parent && rootSymbol.parent.flags & (32 /* Class */ | 64 /* Interface */)) {
                        var result_3 = [];
                        getPropertySymbolsFromBaseTypes(rootSymbol.parent, rootSymbol.getName(), result_3, /*previousIterationSymbolsCache*/ {});
                        return ts.forEach(result_3, function (s) { return searchSymbols.indexOf(s) >= 0 ? s : undefined; });
                    }
                    return undefined;
                });
            }
            function getPropertySymbolsFromContextualType(node) {
                if (isNameOfPropertyAssignment(node)) {
                    var objectLiteral = node.parent.parent;
                    var contextualType = typeChecker.getContextualType(objectLiteral);
                    var name_3 = node.text;
                    if (contextualType) {
                        if (contextualType.flags & 16384 /* Union */) {
                            // This is a union type, first see if the property we are looking for is a union property (i.e. exists in all types)
                            // if not, search the constituent types for the property
                            var unionProperty = contextualType.getProperty(name_3);
                            if (unionProperty) {
                                return [unionProperty];
                            }
                            else {
                                var result_4 = [];
                                ts.forEach(contextualType.types, function (t) {
                                    var symbol = t.getProperty(name_3);
                                    if (symbol) {
                                        result_4.push(symbol);
                                    }
                                });
                                return result_4;
                            }
                        }
                        else {
                            var symbol_1 = contextualType.getProperty(name_3);
                            if (symbol_1) {
                                return [symbol_1];
                            }
                        }
                    }
                }
                return undefined;
            }
            /** Given an initial searchMeaning, extracted from a location, widen the search scope based on the declarations
              * of the corresponding symbol. e.g. if we are searching for "Foo" in value position, but "Foo" references a class
              * then we need to widen the search to include type positions as well.
              * On the contrary, if we are searching for "Bar" in type position and we trace bar to an interface, and an uninstantiated
              * module, we want to keep the search limited to only types, as the two declarations (interface and uninstantiated module)
              * do not intersect in any of the three spaces.
              */
            function getIntersectingMeaningFromDeclarations(meaning, declarations) {
                if (declarations) {
                    var lastIterationMeaning = void 0;
                    do {
                        // The result is order-sensitive, for instance if initialMeaning === Namespace, and declarations = [class, instantiated module]
                        // we need to consider both as they initialMeaning intersects with the module in the namespace space, and the module
                        // intersects with the class in the value space.
                        // To achieve that we will keep iterating until the result stabilizes.
                        // Remember the last meaning
                        lastIterationMeaning = meaning;
                        for (var _i = 0, declarations_2 = declarations; _i < declarations_2.length; _i++) {
                            var declaration = declarations_2[_i];
                            var declarationMeaning = getMeaningFromDeclaration(declaration);
                            if (declarationMeaning & meaning) {
                                meaning |= declarationMeaning;
                            }
                        }
                    } while (meaning !== lastIterationMeaning);
                }
                return meaning;
            }
        }
        function getReferenceEntryFromNode(node) {
            var start = node.getStart();
            var end = node.getEnd();
            if (node.kind === 9 /* StringLiteral */) {
                start += 1;
                end -= 1;
            }
            return {
                fileName: node.getSourceFile().fileName,
                textSpan: ts.createTextSpanFromBounds(start, end),
                isWriteAccess: isWriteAccess(node)
            };
        }
        /** A node is considered a writeAccess iff it is a name of a declaration or a target of an assignment */
        function isWriteAccess(node) {
            if (node.kind === 69 /* Identifier */ && ts.isDeclarationName(node)) {
                return true;
            }
            var parent = node.parent;
            if (parent) {
                if (parent.kind === 183 /* PostfixUnaryExpression */ || parent.kind === 182 /* PrefixUnaryExpression */) {
                    return true;
                }
                else if (parent.kind === 184 /* BinaryExpression */ && parent.left === node) {
                    var operator = parent.operatorToken.kind;
                    return 56 /* FirstAssignment */ <= operator && operator <= 68 /* LastAssignment */;
                }
            }
            return false;
        }
        /// NavigateTo
        function getNavigateToItems(searchValue, maxResultCount) {
            synchronizeHostData();
            return ts.NavigateTo.getNavigateToItems(program, cancellationToken, searchValue, maxResultCount);
        }
        function getEmitOutput(fileName) {
            synchronizeHostData();
            var sourceFile = getValidSourceFile(fileName);
            var outputFiles = [];
            function writeFile(fileName, data, writeByteOrderMark) {
                outputFiles.push({
                    name: fileName,
                    writeByteOrderMark: writeByteOrderMark,
                    text: data
                });
            }
            var emitOutput = program.emit(sourceFile, writeFile, cancellationToken);
            return {
                outputFiles: outputFiles,
                emitSkipped: emitOutput.emitSkipped
            };
        }
        function getMeaningFromDeclaration(node) {
            switch (node.kind) {
                case 139 /* Parameter */:
                case 214 /* VariableDeclaration */:
                case 166 /* BindingElement */:
                case 142 /* PropertyDeclaration */:
                case 141 /* PropertySignature */:
                case 248 /* PropertyAssignment */:
                case 249 /* ShorthandPropertyAssignment */:
                case 250 /* EnumMember */:
                case 144 /* MethodDeclaration */:
                case 143 /* MethodSignature */:
                case 145 /* Constructor */:
                case 146 /* GetAccessor */:
                case 147 /* SetAccessor */:
                case 216 /* FunctionDeclaration */:
                case 176 /* FunctionExpression */:
                case 177 /* ArrowFunction */:
                case 247 /* CatchClause */:
                    return 1 /* Value */;
                case 138 /* TypeParameter */:
                case 218 /* InterfaceDeclaration */:
                case 219 /* TypeAliasDeclaration */:
                case 156 /* TypeLiteral */:
                    return 2 /* Type */;
                case 217 /* ClassDeclaration */:
                case 220 /* EnumDeclaration */:
                    return 1 /* Value */ | 2 /* Type */;
                case 221 /* ModuleDeclaration */:
                    if (ts.isAmbientModule(node)) {
                        return 4 /* Namespace */ | 1 /* Value */;
                    }
                    else if (ts.getModuleInstanceState(node) === 1 /* Instantiated */) {
                        return 4 /* Namespace */ | 1 /* Value */;
                    }
                    else {
                        return 4 /* Namespace */;
                    }
                case 228 /* NamedImports */:
                case 229 /* ImportSpecifier */:
                case 224 /* ImportEqualsDeclaration */:
                case 225 /* ImportDeclaration */:
                case 230 /* ExportAssignment */:
                case 231 /* ExportDeclaration */:
                    return 1 /* Value */ | 2 /* Type */ | 4 /* Namespace */;
                // An external module can be a Value
                case 251 /* SourceFile */:
                    return 4 /* Namespace */ | 1 /* Value */;
            }
            return 1 /* Value */ | 2 /* Type */ | 4 /* Namespace */;
        }
        function isTypeReference(node) {
            if (ts.isRightSideOfQualifiedNameOrPropertyAccess(node)) {
                node = node.parent;
            }
            return node.parent.kind === 152 /* TypeReference */ ||
                (node.parent.kind === 191 /* ExpressionWithTypeArguments */ && !ts.isExpressionWithTypeArgumentsInClassExtendsClause(node.parent)) ||
                (node.kind === 97 /* ThisKeyword */ && !ts.isExpression(node)) ||
                node.kind === 162 /* ThisType */;
        }
        function isNamespaceReference(node) {
            return isQualifiedNameNamespaceReference(node) || isPropertyAccessNamespaceReference(node);
        }
        function isPropertyAccessNamespaceReference(node) {
            var root = node;
            var isLastClause = true;
            if (root.parent.kind === 169 /* PropertyAccessExpression */) {
                while (root.parent && root.parent.kind === 169 /* PropertyAccessExpression */) {
                    root = root.parent;
                }
                isLastClause = root.name === node;
            }
            if (!isLastClause && root.parent.kind === 191 /* ExpressionWithTypeArguments */ && root.parent.parent.kind === 246 /* HeritageClause */) {
                var decl = root.parent.parent.parent;
                return (decl.kind === 217 /* ClassDeclaration */ && root.parent.parent.token === 106 /* ImplementsKeyword */) ||
                    (decl.kind === 218 /* InterfaceDeclaration */ && root.parent.parent.token === 83 /* ExtendsKeyword */);
            }
            return false;
        }
        function isQualifiedNameNamespaceReference(node) {
            var root = node;
            var isLastClause = true;
            if (root.parent.kind === 136 /* QualifiedName */) {
                while (root.parent && root.parent.kind === 136 /* QualifiedName */) {
                    root = root.parent;
                }
                isLastClause = root.right === node;
            }
            return root.parent.kind === 152 /* TypeReference */ && !isLastClause;
        }
        function isInRightSideOfImport(node) {
            while (node.parent.kind === 136 /* QualifiedName */) {
                node = node.parent;
            }
            return ts.isInternalModuleImportEqualsDeclaration(node.parent) && node.parent.moduleReference === node;
        }
        function getMeaningFromRightHandSideOfImportEquals(node) {
            ts.Debug.assert(node.kind === 69 /* Identifier */);
            //     import a = |b|; // Namespace
            //     import a = |b.c|; // Value, type, namespace
            //     import a = |b.c|.d; // Namespace
            if (node.parent.kind === 136 /* QualifiedName */ &&
                node.parent.right === node &&
                node.parent.parent.kind === 224 /* ImportEqualsDeclaration */) {
                return 1 /* Value */ | 2 /* Type */ | 4 /* Namespace */;
            }
            return 4 /* Namespace */;
        }
        function getMeaningFromLocation(node) {
            if (node.parent.kind === 230 /* ExportAssignment */) {
                return 1 /* Value */ | 2 /* Type */ | 4 /* Namespace */;
            }
            else if (isInRightSideOfImport(node)) {
                return getMeaningFromRightHandSideOfImportEquals(node);
            }
            else if (ts.isDeclarationName(node)) {
                return getMeaningFromDeclaration(node.parent);
            }
            else if (isTypeReference(node)) {
                return 2 /* Type */;
            }
            else if (isNamespaceReference(node)) {
                return 4 /* Namespace */;
            }
            else {
                return 1 /* Value */;
            }
        }
        // Signature help
        /**
         * This is a semantic operation.
         */
        function getSignatureHelpItems(fileName, position) {
            synchronizeHostData();
            var sourceFile = getValidSourceFile(fileName);
            return ts.SignatureHelp.getSignatureHelpItems(program, sourceFile, position, cancellationToken);
        }
        /// Syntactic features
        function getSourceFile(fileName) {
            return syntaxTreeCache.getCurrentSourceFile(fileName);
        }
        function getNameOrDottedNameSpan(fileName, startPos, endPos) {
            var sourceFile = syntaxTreeCache.getCurrentSourceFile(fileName);
            // Get node at the location
            var node = ts.getTouchingPropertyName(sourceFile, startPos);
            if (!node) {
                return;
            }
            switch (node.kind) {
                case 169 /* PropertyAccessExpression */:
                case 136 /* QualifiedName */:
                case 9 /* StringLiteral */:
                case 163 /* StringLiteralType */:
                case 84 /* FalseKeyword */:
                case 99 /* TrueKeyword */:
                case 93 /* NullKeyword */:
                case 95 /* SuperKeyword */:
                case 97 /* ThisKeyword */:
                case 162 /* ThisType */:
                case 69 /* Identifier */:
                    break;
                // Cant create the text span
                default:
                    return;
            }
            var nodeForStartPos = node;
            while (true) {
                if (isRightSideOfPropertyAccess(nodeForStartPos) || isRightSideOfQualifiedName(nodeForStartPos)) {
                    // If on the span is in right side of the the property or qualified name, return the span from the qualified name pos to end of this node
                    nodeForStartPos = nodeForStartPos.parent;
                }
                else if (isNameOfModuleDeclaration(nodeForStartPos)) {
                    // If this is name of a module declarations, check if this is right side of dotted module name
                    // If parent of the module declaration which is parent of this node is module declaration and its body is the module declaration that this node is name of
                    // Then this name is name from dotted module
                    if (nodeForStartPos.parent.parent.kind === 221 /* ModuleDeclaration */ &&
                        nodeForStartPos.parent.parent.body === nodeForStartPos.parent) {
                        // Use parent module declarations name for start pos
                        nodeForStartPos = nodeForStartPos.parent.parent.name;
                    }
                    else {
                        // We have to use this name for start pos
                        break;
                    }
                }
                else {
                    // Is not a member expression so we have found the node for start pos
                    break;
                }
            }
            return ts.createTextSpanFromBounds(nodeForStartPos.getStart(), node.getEnd());
        }
        function getBreakpointStatementAtPosition(fileName, position) {
            // doesn't use compiler - no need to synchronize with host
            var sourceFile = syntaxTreeCache.getCurrentSourceFile(fileName);
            return ts.BreakpointResolver.spanInSourceFileAtLocation(sourceFile, position);
        }
        function getNavigationBarItems(fileName) {
            var sourceFile = syntaxTreeCache.getCurrentSourceFile(fileName);
            return ts.NavigationBar.getNavigationBarItems(sourceFile, host.getCompilationSettings());
        }
        function getSemanticClassifications(fileName, span) {
            return convertClassifications(getEncodedSemanticClassifications(fileName, span));
        }
        function checkForClassificationCancellation(kind) {
            // We don't want to actually call back into our host on every node to find out if we've
            // been canceled.  That would be an enormous amount of chattyness, along with the all
            // the overhead of marshalling the data to/from the host.  So instead we pick a few
            // reasonable node kinds to bother checking on.  These node kinds represent high level
            // constructs that we would expect to see commonly, but just at a far less frequent
            // interval.
            //
            // For example, in checker.ts (around 750k) we only have around 600 of these constructs.
            // That means we're calling back into the host around every 1.2k of the file we process.
            // Lib.d.ts has similar numbers.
            switch (kind) {
                case 221 /* ModuleDeclaration */:
                case 217 /* ClassDeclaration */:
                case 218 /* InterfaceDeclaration */:
                case 216 /* FunctionDeclaration */:
                    cancellationToken.throwIfCancellationRequested();
            }
        }
        function getEncodedSemanticClassifications(fileName, span) {
            synchronizeHostData();
            var sourceFile = getValidSourceFile(fileName);
            var typeChecker = program.getTypeChecker();
            var result = [];
            var classifiableNames = program.getClassifiableNames();
            processNode(sourceFile);
            return { spans: result, endOfLineState: 0 /* None */ };
            function pushClassification(start, length, type) {
                result.push(start);
                result.push(length);
                result.push(type);
            }
            function classifySymbol(symbol, meaningAtPosition) {
                var flags = symbol.getFlags();
                if ((flags & 788448 /* Classifiable */) === 0 /* None */) {
                    return;
                }
                if (flags & 32 /* Class */) {
                    return 11 /* className */;
                }
                else if (flags & 384 /* Enum */) {
                    return 12 /* enumName */;
                }
                else if (flags & 524288 /* TypeAlias */) {
                    return 16 /* typeAliasName */;
                }
                else if (meaningAtPosition & 2 /* Type */) {
                    if (flags & 64 /* Interface */) {
                        return 13 /* interfaceName */;
                    }
                    else if (flags & 262144 /* TypeParameter */) {
                        return 15 /* typeParameterName */;
                    }
                }
                else if (flags & 1536 /* Module */) {
                    // Only classify a module as such if
                    //  - It appears in a namespace context.
                    //  - There exists a module declaration which actually impacts the value side.
                    if (meaningAtPosition & 4 /* Namespace */ ||
                        (meaningAtPosition & 1 /* Value */ && hasValueSideModule(symbol))) {
                        return 14 /* moduleName */;
                    }
                }
                return undefined;
                /**
                 * Returns true if there exists a module that introduces entities on the value side.
                 */
                function hasValueSideModule(symbol) {
                    return ts.forEach(symbol.declarations, function (declaration) {
                        return declaration.kind === 221 /* ModuleDeclaration */ &&
                            ts.getModuleInstanceState(declaration) === 1 /* Instantiated */;
                    });
                }
            }
            function processNode(node) {
                // Only walk into nodes that intersect the requested span.
                if (node && ts.textSpanIntersectsWith(span, node.getFullStart(), node.getFullWidth())) {
                    var kind = node.kind;
                    checkForClassificationCancellation(kind);
                    if (kind === 69 /* Identifier */ && !ts.nodeIsMissing(node)) {
                        var identifier = node;
                        // Only bother calling into the typechecker if this is an identifier that
                        // could possibly resolve to a type name.  This makes classification run
                        // in a third of the time it would normally take.
                        if (classifiableNames[identifier.text]) {
                            var symbol = typeChecker.getSymbolAtLocation(node);
                            if (symbol) {
                                var type = classifySymbol(symbol, getMeaningFromLocation(node));
                                if (type) {
                                    pushClassification(node.getStart(), node.getWidth(), type);
                                }
                            }
                        }
                    }
                    ts.forEachChild(node, processNode);
                }
            }
        }
        function getClassificationTypeName(type) {
            switch (type) {
                case 1 /* comment */: return ClassificationTypeNames.comment;
                case 2 /* identifier */: return ClassificationTypeNames.identifier;
                case 3 /* keyword */: return ClassificationTypeNames.keyword;
                case 4 /* numericLiteral */: return ClassificationTypeNames.numericLiteral;
                case 5 /* operator */: return ClassificationTypeNames.operator;
                case 6 /* stringLiteral */: return ClassificationTypeNames.stringLiteral;
                case 8 /* whiteSpace */: return ClassificationTypeNames.whiteSpace;
                case 9 /* text */: return ClassificationTypeNames.text;
                case 10 /* punctuation */: return ClassificationTypeNames.punctuation;
                case 11 /* className */: return ClassificationTypeNames.className;
                case 12 /* enumName */: return ClassificationTypeNames.enumName;
                case 13 /* interfaceName */: return ClassificationTypeNames.interfaceName;
                case 14 /* moduleName */: return ClassificationTypeNames.moduleName;
                case 15 /* typeParameterName */: return ClassificationTypeNames.typeParameterName;
                case 16 /* typeAliasName */: return ClassificationTypeNames.typeAliasName;
                case 17 /* parameterName */: return ClassificationTypeNames.parameterName;
                case 18 /* docCommentTagName */: return ClassificationTypeNames.docCommentTagName;
                case 19 /* jsxOpenTagName */: return ClassificationTypeNames.jsxOpenTagName;
                case 20 /* jsxCloseTagName */: return ClassificationTypeNames.jsxCloseTagName;
                case 21 /* jsxSelfClosingTagName */: return ClassificationTypeNames.jsxSelfClosingTagName;
                case 22 /* jsxAttribute */: return ClassificationTypeNames.jsxAttribute;
                case 23 /* jsxText */: return ClassificationTypeNames.jsxText;
                case 24 /* jsxAttributeStringLiteralValue */: return ClassificationTypeNames.jsxAttributeStringLiteralValue;
            }
        }
        function convertClassifications(classifications) {
            ts.Debug.assert(classifications.spans.length % 3 === 0);
            var dense = classifications.spans;
            var result = [];
            for (var i = 0, n = dense.length; i < n; i += 3) {
                result.push({
                    textSpan: ts.createTextSpan(dense[i], dense[i + 1]),
                    classificationType: getClassificationTypeName(dense[i + 2])
                });
            }
            return result;
        }
        function getSyntacticClassifications(fileName, span) {
            return convertClassifications(getEncodedSyntacticClassifications(fileName, span));
        }
        function getEncodedSyntacticClassifications(fileName, span) {
            // doesn't use compiler - no need to synchronize with host
            var sourceFile = syntaxTreeCache.getCurrentSourceFile(fileName);
            var spanStart = span.start;
            var spanLength = span.length;
            // Make a scanner we can get trivia from.
            var triviaScanner = ts.createScanner(2 /* Latest */, /*skipTrivia*/ false, sourceFile.languageVariant, sourceFile.text);
            var mergeConflictScanner = ts.createScanner(2 /* Latest */, /*skipTrivia*/ false, sourceFile.languageVariant, sourceFile.text);
            var result = [];
            processElement(sourceFile);
            return { spans: result, endOfLineState: 0 /* None */ };
            function pushClassification(start, length, type) {
                result.push(start);
                result.push(length);
                result.push(type);
            }
            function classifyLeadingTriviaAndGetTokenStart(token) {
                triviaScanner.setTextPos(token.pos);
                while (true) {
                    var start = triviaScanner.getTextPos();
                    // only bother scanning if we have something that could be trivia.
                    if (!ts.couldStartTrivia(sourceFile.text, start)) {
                        return start;
                    }
                    var kind = triviaScanner.scan();
                    var end = triviaScanner.getTextPos();
                    var width = end - start;
                    // The moment we get something that isn't trivia, then stop processing.
                    if (!ts.isTrivia(kind)) {
                        return start;
                    }
                    // Don't bother with newlines/whitespace.
                    if (kind === 4 /* NewLineTrivia */ || kind === 5 /* WhitespaceTrivia */) {
                        continue;
                    }
                    // Only bother with the trivia if it at least intersects the span of interest.
                    if (ts.isComment(kind)) {
                        classifyComment(token, kind, start, width);
                        // Classifying a comment might cause us to reuse the trivia scanner
                        // (because of jsdoc comments).  So after we classify the comment make
                        // sure we set the scanner position back to where it needs to be.
                        triviaScanner.setTextPos(end);
                        continue;
                    }
                    if (kind === 7 /* ConflictMarkerTrivia */) {
                        var text = sourceFile.text;
                        var ch = text.charCodeAt(start);
                        // for the <<<<<<< and >>>>>>> markers, we just add them in as comments
                        // in the classification stream.
                        if (ch === 60 /* lessThan */ || ch === 62 /* greaterThan */) {
                            pushClassification(start, width, 1 /* comment */);
                            continue;
                        }
                        // for the ======== add a comment for the first line, and then lex all
                        // subsequent lines up until the end of the conflict marker.
                        ts.Debug.assert(ch === 61 /* equals */);
                        classifyDisabledMergeCode(text, start, end);
                    }
                }
            }
            function classifyComment(token, kind, start, width) {
                if (kind === 3 /* MultiLineCommentTrivia */) {
                    // See if this is a doc comment.  If so, we'll classify certain portions of it
                    // specially.
                    var docCommentAndDiagnostics = ts.parseIsolatedJSDocComment(sourceFile.text, start, width);
                    if (docCommentAndDiagnostics && docCommentAndDiagnostics.jsDocComment) {
                        docCommentAndDiagnostics.jsDocComment.parent = token;
                        classifyJSDocComment(docCommentAndDiagnostics.jsDocComment);
                        return;
                    }
                }
                // Simple comment.  Just add as is.
                pushCommentRange(start, width);
            }
            function pushCommentRange(start, width) {
                pushClassification(start, width, 1 /* comment */);
            }
            function classifyJSDocComment(docComment) {
                var pos = docComment.pos;
                for (var _i = 0, _a = docComment.tags; _i < _a.length; _i++) {
                    var tag = _a[_i];
                    // As we walk through each tag, classify the portion of text from the end of
                    // the last tag (or the start of the entire doc comment) as 'comment'.
                    if (tag.pos !== pos) {
                        pushCommentRange(pos, tag.pos - pos);
                    }
                    pushClassification(tag.atToken.pos, tag.atToken.end - tag.atToken.pos, 10 /* punctuation */);
                    pushClassification(tag.tagName.pos, tag.tagName.end - tag.tagName.pos, 18 /* docCommentTagName */);
                    pos = tag.tagName.end;
                    switch (tag.kind) {
                        case 270 /* JSDocParameterTag */:
                            processJSDocParameterTag(tag);
                            break;
                        case 273 /* JSDocTemplateTag */:
                            processJSDocTemplateTag(tag);
                            break;
                        case 272 /* JSDocTypeTag */:
                            processElement(tag.typeExpression);
                            break;
                        case 271 /* JSDocReturnTag */:
                            processElement(tag.typeExpression);
                            break;
                    }
                    pos = tag.end;
                }
                if (pos !== docComment.end) {
                    pushCommentRange(pos, docComment.end - pos);
                }
                return;
                function processJSDocParameterTag(tag) {
                    if (tag.preParameterName) {
                        pushCommentRange(pos, tag.preParameterName.pos - pos);
                        pushClassification(tag.preParameterName.pos, tag.preParameterName.end - tag.preParameterName.pos, 17 /* parameterName */);
                        pos = tag.preParameterName.end;
                    }
                    if (tag.typeExpression) {
                        pushCommentRange(pos, tag.typeExpression.pos - pos);
                        processElement(tag.typeExpression);
                        pos = tag.typeExpression.end;
                    }
                    if (tag.postParameterName) {
                        pushCommentRange(pos, tag.postParameterName.pos - pos);
                        pushClassification(tag.postParameterName.pos, tag.postParameterName.end - tag.postParameterName.pos, 17 /* parameterName */);
                        pos = tag.postParameterName.end;
                    }
                }
            }
            function processJSDocTemplateTag(tag) {
                for (var _i = 0, _a = tag.getChildren(); _i < _a.length; _i++) {
                    var child = _a[_i];
                    processElement(child);
                }
            }
            function classifyDisabledMergeCode(text, start, end) {
                // Classify the line that the ======= marker is on as a comment.  Then just lex
                // all further tokens and add them to the result.
                var i;
                for (i = start; i < end; i++) {
                    if (ts.isLineBreak(text.charCodeAt(i))) {
                        break;
                    }
                }
                pushClassification(start, i - start, 1 /* comment */);
                mergeConflictScanner.setTextPos(i);
                while (mergeConflictScanner.getTextPos() < end) {
                    classifyDisabledCodeToken();
                }
            }
            function classifyDisabledCodeToken() {
                var start = mergeConflictScanner.getTextPos();
                var tokenKind = mergeConflictScanner.scan();
                var end = mergeConflictScanner.getTextPos();
                var type = classifyTokenType(tokenKind);
                if (type) {
                    pushClassification(start, end - start, type);
                }
            }
            /**
             * Returns true if node should be treated as classified and no further processing is required.
             * False will mean that node is not classified and traverse routine should recurse into node contents.
             */
            function tryClassifyNode(node) {
                if (ts.nodeIsMissing(node)) {
                    return true;
                }
                var classifiedElementName = tryClassifyJsxElementName(node);
                if (!ts.isToken(node) && node.kind !== 239 /* JsxText */ && classifiedElementName === undefined) {
                    return false;
                }
                var tokenStart = node.kind === 239 /* JsxText */ ? node.pos : classifyLeadingTriviaAndGetTokenStart(node);
                var tokenWidth = node.end - tokenStart;
                ts.Debug.assert(tokenWidth >= 0);
                if (tokenWidth > 0) {
                    var type = classifiedElementName || classifyTokenType(node.kind, node);
                    if (type) {
                        pushClassification(tokenStart, tokenWidth, type);
                    }
                }
                return true;
            }
            function tryClassifyJsxElementName(token) {
                switch (token.parent && token.parent.kind) {
                    case 238 /* JsxOpeningElement */:
                        if (token.parent.tagName === token) {
                            return 19 /* jsxOpenTagName */;
                        }
                        break;
                    case 240 /* JsxClosingElement */:
                        if (token.parent.tagName === token) {
                            return 20 /* jsxCloseTagName */;
                        }
                        break;
                    case 237 /* JsxSelfClosingElement */:
                        if (token.parent.tagName === token) {
                            return 21 /* jsxSelfClosingTagName */;
                        }
                        break;
                    case 241 /* JsxAttribute */:
                        if (token.parent.name === token) {
                            return 22 /* jsxAttribute */;
                        }
                        break;
                }
                return undefined;
            }
            // for accurate classification, the actual token should be passed in.  however, for
            // cases like 'disabled merge code' classification, we just get the token kind and
            // classify based on that instead.
            function classifyTokenType(tokenKind, token) {
                if (ts.isKeyword(tokenKind)) {
                    return 3 /* keyword */;
                }
                // Special case < and >  If they appear in a generic context they are punctuation,
                // not operators.
                if (tokenKind === 25 /* LessThanToken */ || tokenKind === 27 /* GreaterThanToken */) {
                    // If the node owning the token has a type argument list or type parameter list, then
                    // we can effectively assume that a '<' and '>' belong to those lists.
                    if (token && ts.getTypeArgumentOrTypeParameterList(token.parent)) {
                        return 10 /* punctuation */;
                    }
                }
                if (ts.isPunctuation(tokenKind)) {
                    if (token) {
                        if (tokenKind === 56 /* EqualsToken */) {
                            // the '=' in a variable declaration is special cased here.
                            if (token.parent.kind === 214 /* VariableDeclaration */ ||
                                token.parent.kind === 142 /* PropertyDeclaration */ ||
                                token.parent.kind === 139 /* Parameter */ ||
                                token.parent.kind === 241 /* JsxAttribute */) {
                                return 5 /* operator */;
                            }
                        }
                        if (token.parent.kind === 184 /* BinaryExpression */ ||
                            token.parent.kind === 182 /* PrefixUnaryExpression */ ||
                            token.parent.kind === 183 /* PostfixUnaryExpression */ ||
                            token.parent.kind === 185 /* ConditionalExpression */) {
                            return 5 /* operator */;
                        }
                    }
                    return 10 /* punctuation */;
                }
                else if (tokenKind === 8 /* NumericLiteral */) {
                    return 4 /* numericLiteral */;
                }
                else if (tokenKind === 9 /* StringLiteral */ || tokenKind === 163 /* StringLiteralType */) {
                    return token.parent.kind === 241 /* JsxAttribute */ ? 24 /* jsxAttributeStringLiteralValue */ : 6 /* stringLiteral */;
                }
                else if (tokenKind === 10 /* RegularExpressionLiteral */) {
                    // TODO: we should get another classification type for these literals.
                    return 6 /* stringLiteral */;
                }
                else if (ts.isTemplateLiteralKind(tokenKind)) {
                    // TODO (drosen): we should *also* get another classification type for these literals.
                    return 6 /* stringLiteral */;
                }
                else if (tokenKind === 239 /* JsxText */) {
                    return 23 /* jsxText */;
                }
                else if (tokenKind === 69 /* Identifier */) {
                    if (token) {
                        switch (token.parent.kind) {
                            case 217 /* ClassDeclaration */:
                                if (token.parent.name === token) {
                                    return 11 /* className */;
                                }
                                return;
                            case 138 /* TypeParameter */:
                                if (token.parent.name === token) {
                                    return 15 /* typeParameterName */;
                                }
                                return;
                            case 218 /* InterfaceDeclaration */:
                                if (token.parent.name === token) {
                                    return 13 /* interfaceName */;
                                }
                                return;
                            case 220 /* EnumDeclaration */:
                                if (token.parent.name === token) {
                                    return 12 /* enumName */;
                                }
                                return;
                            case 221 /* ModuleDeclaration */:
                                if (token.parent.name === token) {
                                    return 14 /* moduleName */;
                                }
                                return;
                            case 139 /* Parameter */:
                                if (token.parent.name === token) {
                                    return 17 /* parameterName */;
                                }
                                return;
                        }
                    }
                    return 2 /* identifier */;
                }
            }
            function processElement(element) {
                if (!element) {
                    return;
                }
                // Ignore nodes that don't intersect the original span to classify.
                if (ts.decodedTextSpanIntersectsWith(spanStart, spanLength, element.pos, element.getFullWidth())) {
                    checkForClassificationCancellation(element.kind);
                    var children = element.getChildren(sourceFile);
                    for (var i = 0, n = children.length; i < n; i++) {
                        var child = children[i];
                        if (!tryClassifyNode(child)) {
                            // Recurse into our child nodes.
                            processElement(child);
                        }
                    }
                }
            }
        }
        function getOutliningSpans(fileName) {
            // doesn't use compiler - no need to synchronize with host
            var sourceFile = syntaxTreeCache.getCurrentSourceFile(fileName);
            return ts.OutliningElementsCollector.collectElements(sourceFile);
        }
        function getBraceMatchingAtPosition(fileName, position) {
            var sourceFile = syntaxTreeCache.getCurrentSourceFile(fileName);
            var result = [];
            var token = ts.getTouchingToken(sourceFile, position);
            if (token.getStart(sourceFile) === position) {
                var matchKind = getMatchingTokenKind(token);
                // Ensure that there is a corresponding token to match ours.
                if (matchKind) {
                    var parentElement = token.parent;
                    var childNodes = parentElement.getChildren(sourceFile);
                    for (var _i = 0, childNodes_1 = childNodes; _i < childNodes_1.length; _i++) {
                        var current = childNodes_1[_i];
                        if (current.kind === matchKind) {
                            var range1 = ts.createTextSpan(token.getStart(sourceFile), token.getWidth(sourceFile));
                            var range2 = ts.createTextSpan(current.getStart(sourceFile), current.getWidth(sourceFile));
                            // We want to order the braces when we return the result.
                            if (range1.start < range2.start) {
                                result.push(range1, range2);
                            }
                            else {
                                result.push(range2, range1);
                            }
                            break;
                        }
                    }
                }
            }
            return result;
            function getMatchingTokenKind(token) {
                switch (token.kind) {
                    case 15 /* OpenBraceToken */: return 16 /* CloseBraceToken */;
                    case 17 /* OpenParenToken */: return 18 /* CloseParenToken */;
                    case 19 /* OpenBracketToken */: return 20 /* CloseBracketToken */;
                    case 25 /* LessThanToken */: return 27 /* GreaterThanToken */;
                    case 16 /* CloseBraceToken */: return 15 /* OpenBraceToken */;
                    case 18 /* CloseParenToken */: return 17 /* OpenParenToken */;
                    case 20 /* CloseBracketToken */: return 19 /* OpenBracketToken */;
                    case 27 /* GreaterThanToken */: return 25 /* LessThanToken */;
                }
                return undefined;
            }
        }
        function getIndentationAtPosition(fileName, position, editorOptions) {
            var start = new Date().getTime();
            var sourceFile = syntaxTreeCache.getCurrentSourceFile(fileName);
            log("getIndentationAtPosition: getCurrentSourceFile: " + (new Date().getTime() - start));
            start = new Date().getTime();
            var result = ts.formatting.SmartIndenter.getIndentation(position, sourceFile, editorOptions);
            log("getIndentationAtPosition: computeIndentation  : " + (new Date().getTime() - start));
            return result;
        }
        function getFormattingEditsForRange(fileName, start, end, options) {
            var sourceFile = syntaxTreeCache.getCurrentSourceFile(fileName);
            return ts.formatting.formatSelection(start, end, sourceFile, getRuleProvider(options), options);
        }
        function getFormattingEditsForDocument(fileName, options) {
            var sourceFile = syntaxTreeCache.getCurrentSourceFile(fileName);
            return ts.formatting.formatDocument(sourceFile, getRuleProvider(options), options);
        }
        function getFormattingEditsAfterKeystroke(fileName, position, key, options) {
            var sourceFile = syntaxTreeCache.getCurrentSourceFile(fileName);
            if (key === "}") {
                return ts.formatting.formatOnClosingCurly(position, sourceFile, getRuleProvider(options), options);
            }
            else if (key === ";") {
                return ts.formatting.formatOnSemicolon(position, sourceFile, getRuleProvider(options), options);
            }
            else if (key === "\n") {
                return ts.formatting.formatOnEnter(position, sourceFile, getRuleProvider(options), options);
            }
            return [];
        }
        /**
         * Checks if position points to a valid position to add JSDoc comments, and if so,
         * returns the appropriate template. Otherwise returns an empty string.
         * Valid positions are
         *      - outside of comments, statements, and expressions, and
         *      - preceding a:
         *          - function/constructor/method declaration
         *          - class declarations
         *          - variable statements
         *          - namespace declarations
         *
         * Hosts should ideally check that:
         * - The line is all whitespace up to 'position' before performing the insertion.
         * - If the keystroke sequence "/\*\*" induced the call, we also check that the next
         * non-whitespace character is '*', which (approximately) indicates whether we added
         * the second '*' to complete an existing (JSDoc) comment.
         * @param fileName The file in which to perform the check.
         * @param position The (character-indexed) position in the file where the check should
         * be performed.
         */
        function getDocCommentTemplateAtPosition(fileName, position) {
            var sourceFile = syntaxTreeCache.getCurrentSourceFile(fileName);
            // Check if in a context where we don't want to perform any insertion
            if (ts.isInString(sourceFile, position) || ts.isInComment(sourceFile, position) || ts.hasDocComment(sourceFile, position)) {
                return undefined;
            }
            var tokenAtPos = ts.getTokenAtPosition(sourceFile, position);
            var tokenStart = tokenAtPos.getStart();
            if (!tokenAtPos || tokenStart < position) {
                return undefined;
            }
            // TODO: add support for:
            // - enums/enum members
            // - interfaces
            // - property declarations
            // - potentially property assignments
            var commentOwner;
            findOwner: for (commentOwner = tokenAtPos; commentOwner; commentOwner = commentOwner.parent) {
                switch (commentOwner.kind) {
                    case 216 /* FunctionDeclaration */:
                    case 144 /* MethodDeclaration */:
                    case 145 /* Constructor */:
                    case 217 /* ClassDeclaration */:
                    case 196 /* VariableStatement */:
                        break findOwner;
                    case 251 /* SourceFile */:
                        return undefined;
                    case 221 /* ModuleDeclaration */:
                        // If in walking up the tree, we hit a a nested namespace declaration,
                        // then we must be somewhere within a dotted namespace name; however we don't
                        // want to give back a JSDoc template for the 'b' or 'c' in 'namespace a.b.c { }'.
                        if (commentOwner.parent.kind === 221 /* ModuleDeclaration */) {
                            return undefined;
                        }
                        break findOwner;
                }
            }
            if (!commentOwner || commentOwner.getStart() < position) {
                return undefined;
            }
            var parameters = getParametersForJsDocOwningNode(commentOwner);
            var posLineAndChar = sourceFile.getLineAndCharacterOfPosition(position);
            var lineStart = sourceFile.getLineStarts()[posLineAndChar.line];
            var indentationStr = sourceFile.text.substr(lineStart, posLineAndChar.character);
            var newLine = ts.getNewLineOrDefaultFromHost(host);
            var docParams = "";
            for (var i = 0, numParams = parameters.length; i < numParams; i++) {
                var currentName = parameters[i].name;
                var paramName = currentName.kind === 69 /* Identifier */ ?
                    currentName.text :
                    "param" + i;
                docParams += indentationStr + " * @param " + paramName + newLine;
            }
            // A doc comment consists of the following
            // * The opening comment line
            // * the first line (without a param) for the object's untagged info (this is also where the caret ends up)
            // * the '@param'-tagged lines
            // * TODO: other tags.
            // * the closing comment line
            // * if the caret was directly in front of the object, then we add an extra line and indentation.
            var preamble = "/**" + newLine +
                indentationStr + " * ";
            var result = preamble + newLine +
                docParams +
                indentationStr + " */" +
                (tokenStart === position ? newLine + indentationStr : "");
            return { newText: result, caretOffset: preamble.length };
        }
        function getParametersForJsDocOwningNode(commentOwner) {
            if (ts.isFunctionLike(commentOwner)) {
                return commentOwner.parameters;
            }
            if (commentOwner.kind === 196 /* VariableStatement */) {
                var varStatement = commentOwner;
                var varDeclarations = varStatement.declarationList.declarations;
                if (varDeclarations.length === 1 && varDeclarations[0].initializer) {
                    return getParametersFromRightHandSideOfAssignment(varDeclarations[0].initializer);
                }
            }
            return emptyArray;
        }
        /**
         * Digs into an an initializer or RHS operand of an assignment operation
         * to get the parameters of an apt signature corresponding to a
         * function expression or a class expression.
         *
         * @param rightHandSide the expression which may contain an appropriate set of parameters
         * @returns the parameters of a signature found on the RHS if one exists; otherwise 'emptyArray'.
         */
        function getParametersFromRightHandSideOfAssignment(rightHandSide) {
            while (rightHandSide.kind === 175 /* ParenthesizedExpression */) {
                rightHandSide = rightHandSide.expression;
            }
            switch (rightHandSide.kind) {
                case 176 /* FunctionExpression */:
                case 177 /* ArrowFunction */:
                    return rightHandSide.parameters;
                case 189 /* ClassExpression */:
                    for (var _i = 0, _a = rightHandSide.members; _i < _a.length; _i++) {
                        var member = _a[_i];
                        if (member.kind === 145 /* Constructor */) {
                            return member.parameters;
                        }
                    }
                    break;
            }
            return emptyArray;
        }
        function getTodoComments(fileName, descriptors) {
            // Note: while getting todo comments seems like a syntactic operation, we actually
            // treat it as a semantic operation here.  This is because we expect our host to call
            // this on every single file.  If we treat this syntactically, then that will cause
            // us to populate and throw away the tree in our syntax tree cache for each file.  By
            // treating this as a semantic operation, we can access any tree without throwing
            // anything away.
            synchronizeHostData();
            var sourceFile = getValidSourceFile(fileName);
            cancellationToken.throwIfCancellationRequested();
            var fileContents = sourceFile.text;
            var result = [];
            if (descriptors.length > 0) {
                var regExp = getTodoCommentsRegExp();
                var matchArray = void 0;
                while (matchArray = regExp.exec(fileContents)) {
                    cancellationToken.throwIfCancellationRequested();
                    // If we got a match, here is what the match array will look like.  Say the source text is:
                    //
                    //      "    // hack   1"
                    //
                    // The result array with the regexp:    will be:
                    //
                    //      ["// hack   1", "// ", "hack   1", undefined, "hack"]
                    //
                    // Here are the relevant capture groups:
                    //  0) The full match for the entire regexp.
                    //  1) The preamble to the message portion.
                    //  2) The message portion.
                    //  3...N) The descriptor that was matched - by index.  'undefined' for each
                    //         descriptor that didn't match.  an actual value if it did match.
                    //
                    //  i.e. 'undefined' in position 3 above means TODO(jason) didn't match.
                    //       "hack"      in position 4 means HACK did match.
                    var firstDescriptorCaptureIndex = 3;
                    ts.Debug.assert(matchArray.length === descriptors.length + firstDescriptorCaptureIndex);
                    var preamble = matchArray[1];
                    var matchPosition = matchArray.index + preamble.length;
                    // OK, we have found a match in the file.  This is only an acceptable match if
                    // it is contained within a comment.
                    var token = ts.getTokenAtPosition(sourceFile, matchPosition);
                    if (!isInsideComment(sourceFile, token, matchPosition)) {
                        continue;
                    }
                    var descriptor = undefined;
                    for (var i = 0, n = descriptors.length; i < n; i++) {
                        if (matchArray[i + firstDescriptorCaptureIndex]) {
                            descriptor = descriptors[i];
                        }
                    }
                    ts.Debug.assert(descriptor !== undefined);
                    // We don't want to match something like 'TODOBY', so we make sure a non
                    // letter/digit follows the match.
                    if (isLetterOrDigit(fileContents.charCodeAt(matchPosition + descriptor.text.length))) {
                        continue;
                    }
                    var message = matchArray[2];
                    result.push({
                        descriptor: descriptor,
                        message: message,
                        position: matchPosition
                    });
                }
            }
            return result;
            function escapeRegExp(str) {
                return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            }
            function getTodoCommentsRegExp() {
                // NOTE: ?:  means 'non-capture group'.  It allows us to have groups without having to
                // filter them out later in the final result array.
                // TODO comments can appear in one of the following forms:
                //
                //  1)      // TODO     or  /////////// TODO
                //
                //  2)      /* TODO     or  /********** TODO
                //
                //  3)      /*
                //           *   TODO
                //           */
                //
                // The following three regexps are used to match the start of the text up to the TODO
                // comment portion.
                var singleLineCommentStart = /(?:\/\/+\s*)/.source;
                var multiLineCommentStart = /(?:\/\*+\s*)/.source;
                var anyNumberOfSpacesAndAsterixesAtStartOfLine = /(?:^(?:\s|\*)*)/.source;
                // Match any of the above three TODO comment start regexps.
                // Note that the outermost group *is* a capture group.  We want to capture the preamble
                // so that we can determine the starting position of the TODO comment match.
                var preamble = "(" + anyNumberOfSpacesAndAsterixesAtStartOfLine + "|" + singleLineCommentStart + "|" + multiLineCommentStart + ")";
                // Takes the descriptors and forms a regexp that matches them as if they were literals.
                // For example, if the descriptors are "TODO(jason)" and "HACK", then this will be:
                //
                //      (?:(TODO\(jason\))|(HACK))
                //
                // Note that the outermost group is *not* a capture group, but the innermost groups
                // *are* capture groups.  By capturing the inner literals we can determine after
                // matching which descriptor we are dealing with.
                var literals = "(?:" + ts.map(descriptors, function (d) { return "(" + escapeRegExp(d.text) + ")"; }).join("|") + ")";
                // After matching a descriptor literal, the following regexp matches the rest of the
                // text up to the end of the line (or */).
                var endOfLineOrEndOfComment = /(?:$|\*\/)/.source;
                var messageRemainder = /(?:.*?)/.source;
                // This is the portion of the match we'll return as part of the TODO comment result. We
                // match the literal portion up to the end of the line or end of comment.
                var messagePortion = "(" + literals + messageRemainder + ")";
                var regExpString = preamble + messagePortion + endOfLineOrEndOfComment;
                // The final regexp will look like this:
                // /((?:\/\/+\s*)|(?:\/\*+\s*)|(?:^(?:\s|\*)*))((?:(TODO\(jason\))|(HACK))(?:.*?))(?:$|\*\/)/gim
                // The flags of the regexp are important here.
                //  'g' is so that we are doing a global search and can find matches several times
                //  in the input.
                //
                //  'i' is for case insensitivity (We do this to match C# TODO comment code).
                //
                //  'm' is so we can find matches in a multi-line input.
                return new RegExp(regExpString, "gim");
            }
            function isLetterOrDigit(char) {
                return (char >= 97 /* a */ && char <= 122 /* z */) ||
                    (char >= 65 /* A */ && char <= 90 /* Z */) ||
                    (char >= 48 /* _0 */ && char <= 57 /* _9 */);
            }
        }
        function getRenameInfo(fileName, position) {
            synchronizeHostData();
            var sourceFile = getValidSourceFile(fileName);
            var typeChecker = program.getTypeChecker();
            var node = ts.getTouchingWord(sourceFile, position);
            // Can only rename an identifier.
            if (node && node.kind === 69 /* Identifier */) {
                var symbol = typeChecker.getSymbolAtLocation(node);
                // Only allow a symbol to be renamed if it actually has at least one declaration.
                if (symbol) {
                    var declarations = symbol.getDeclarations();
                    if (declarations && declarations.length > 0) {
                        // Disallow rename for elements that are defined in the standard TypeScript library.
                        var defaultLibFileName = host.getDefaultLibFileName(host.getCompilationSettings());
                        var canonicalDefaultLibName = getCanonicalFileName(ts.normalizePath(defaultLibFileName));
                        if (defaultLibFileName) {
                            for (var _i = 0, declarations_3 = declarations; _i < declarations_3.length; _i++) {
                                var current = declarations_3[_i];
                                var sourceFile_2 = current.getSourceFile();
                                // TODO (drosen): When is there no source file?
                                if (!sourceFile_2) {
                                    continue;
                                }
                                var canonicalName = getCanonicalFileName(ts.normalizePath(sourceFile_2.fileName));
                                if (canonicalName === canonicalDefaultLibName) {
                                    return getRenameInfoError(ts.getLocaleSpecificMessage(ts.Diagnostics.You_cannot_rename_elements_that_are_defined_in_the_standard_TypeScript_library));
                                }
                            }
                        }
                        var displayName = ts.stripQuotes(ts.getDeclaredName(typeChecker, symbol, node));
                        var kind = getSymbolKind(symbol, node);
                        if (kind) {
                            return {
                                canRename: true,
                                kind: kind,
                                displayName: displayName,
                                localizedErrorMessage: undefined,
                                fullDisplayName: typeChecker.getFullyQualifiedName(symbol),
                                kindModifiers: getSymbolModifiers(symbol),
                                triggerSpan: ts.createTextSpan(node.getStart(), node.getWidth())
                            };
                        }
                    }
                }
            }
            return getRenameInfoError(ts.getLocaleSpecificMessage(ts.Diagnostics.You_cannot_rename_this_element));
            function getRenameInfoError(localizedErrorMessage) {
                return {
                    canRename: false,
                    localizedErrorMessage: localizedErrorMessage,
                    displayName: undefined,
                    fullDisplayName: undefined,
                    kind: undefined,
                    kindModifiers: undefined,
                    triggerSpan: undefined
                };
            }
        }
        return {
            dispose: dispose,
            cleanupSemanticCache: cleanupSemanticCache,
            getSyntacticDiagnostics: getSyntacticDiagnostics,
            getSemanticDiagnostics: getSemanticDiagnostics,
            getCompilerOptionsDiagnostics: getCompilerOptionsDiagnostics,
            getSyntacticClassifications: getSyntacticClassifications,
            getSemanticClassifications: getSemanticClassifications,
            getEncodedSyntacticClassifications: getEncodedSyntacticClassifications,
            getEncodedSemanticClassifications: getEncodedSemanticClassifications,
            getCompletionsAtPosition: getCompletionsAtPosition,
            getCompletionEntryDetails: getCompletionEntryDetails,
            getSignatureHelpItems: getSignatureHelpItems,
            getQuickInfoAtPosition: getQuickInfoAtPosition,
            getDefinitionAtPosition: getDefinitionAtPosition,
            getTypeDefinitionAtPosition: getTypeDefinitionAtPosition,
            getReferencesAtPosition: getReferencesAtPosition,
            findReferences: findReferences,
            getOccurrencesAtPosition: getOccurrencesAtPosition,
            getDocumentHighlights: getDocumentHighlights,
            getNameOrDottedNameSpan: getNameOrDottedNameSpan,
            getBreakpointStatementAtPosition: getBreakpointStatementAtPosition,
            getNavigateToItems: getNavigateToItems,
            getRenameInfo: getRenameInfo,
            findRenameLocations: findRenameLocations,
            getNavigationBarItems: getNavigationBarItems,
            getOutliningSpans: getOutliningSpans,
            getTodoComments: getTodoComments,
            getBraceMatchingAtPosition: getBraceMatchingAtPosition,
            getIndentationAtPosition: getIndentationAtPosition,
            getFormattingEditsForRange: getFormattingEditsForRange,
            getFormattingEditsForDocument: getFormattingEditsForDocument,
            getFormattingEditsAfterKeystroke: getFormattingEditsAfterKeystroke,
            getDocCommentTemplateAtPosition: getDocCommentTemplateAtPosition,
            getEmitOutput: getEmitOutput,
            getSourceFile: getSourceFile,
            getProgram: getProgram
        };
    }
    ts.createLanguageService = createLanguageService;
    /* @internal */
    function getNameTable(sourceFile) {
        if (!sourceFile.nameTable) {
            initializeNameTable(sourceFile);
        }
        return sourceFile.nameTable;
    }
    ts.getNameTable = getNameTable;
    function initializeNameTable(sourceFile) {
        var nameTable = {};
        walk(sourceFile);
        sourceFile.nameTable = nameTable;
        function walk(node) {
            switch (node.kind) {
                case 69 /* Identifier */:
                    nameTable[node.text] = nameTable[node.text] === undefined ? node.pos : -1;
                    break;
                case 9 /* StringLiteral */:
                case 8 /* NumericLiteral */:
                    // We want to store any numbers/strings if they were a name that could be
                    // related to a declaration.  So, if we have 'import x = require("something")'
                    // then we want 'something' to be in the name table.  Similarly, if we have
                    // "a['propname']" then we want to store "propname" in the name table.
                    if (ts.isDeclarationName(node) ||
                        node.parent.kind === 235 /* ExternalModuleReference */ ||
                        isArgumentOfElementAccessExpression(node)) {
                        nameTable[node.text] = nameTable[node.text] === undefined ? node.pos : -1;
                    }
                    break;
                default:
                    ts.forEachChild(node, walk);
            }
        }
    }
    function isArgumentOfElementAccessExpression(node) {
        return node &&
            node.parent &&
            node.parent.kind === 170 /* ElementAccessExpression */ &&
            node.parent.argumentExpression === node;
    }
    /// Classifier
    function createClassifier() {
        var scanner = ts.createScanner(2 /* Latest */, /*skipTrivia*/ false);
        /// We do not have a full parser support to know when we should parse a regex or not
        /// If we consider every slash token to be a regex, we could be missing cases like "1/2/3", where
        /// we have a series of divide operator. this list allows us to be more accurate by ruling out
        /// locations where a regexp cannot exist.
        var noRegexTable = [];
        noRegexTable[69 /* Identifier */] = true;
        noRegexTable[9 /* StringLiteral */] = true;
        noRegexTable[8 /* NumericLiteral */] = true;
        noRegexTable[10 /* RegularExpressionLiteral */] = true;
        noRegexTable[97 /* ThisKeyword */] = true;
        noRegexTable[41 /* PlusPlusToken */] = true;
        noRegexTable[42 /* MinusMinusToken */] = true;
        noRegexTable[18 /* CloseParenToken */] = true;
        noRegexTable[20 /* CloseBracketToken */] = true;
        noRegexTable[16 /* CloseBraceToken */] = true;
        noRegexTable[99 /* TrueKeyword */] = true;
        noRegexTable[84 /* FalseKeyword */] = true;
        // Just a stack of TemplateHeads and OpenCurlyBraces, used to perform rudimentary (inexact)
        // classification on template strings. Because of the context free nature of templates,
        // the only precise way to classify a template portion would be by propagating the stack across
        // lines, just as we do with the end-of-line state. However, this is a burden for implementers,
        // and the behavior is entirely subsumed by the syntactic classifier anyway, so we instead
        // flatten any nesting when the template stack is non-empty and encode it in the end-of-line state.
        // Situations in which this fails are
        //  1) When template strings are nested across different lines:
        //          `hello ${ `world
        //          ` }`
        //
        //     Where on the second line, you will get the closing of a template,
        //     a closing curly, and a new template.
        //
        //  2) When substitution expressions have curly braces and the curly brace falls on the next line:
        //          `hello ${ () => {
        //          return "world" } } `
        //
        //     Where on the second line, you will get the 'return' keyword,
        //     a string literal, and a template end consisting of '} } `'.
        var templateStack = [];
        /** Returns true if 'keyword2' can legally follow 'keyword1' in any language construct. */
        function canFollow(keyword1, keyword2) {
            if (ts.isAccessibilityModifier(keyword1)) {
                if (keyword2 === 123 /* GetKeyword */ ||
                    keyword2 === 129 /* SetKeyword */ ||
                    keyword2 === 121 /* ConstructorKeyword */ ||
                    keyword2 === 113 /* StaticKeyword */) {
                    // Allow things like "public get", "public constructor" and "public static".
                    // These are all legal.
                    return true;
                }
                // Any other keyword following "public" is actually an identifier an not a real
                // keyword.
                return false;
            }
            // Assume any other keyword combination is legal.  This can be refined in the future
            // if there are more cases we want the classifier to be better at.
            return true;
        }
        function convertClassifications(classifications, text) {
            var entries = [];
            var dense = classifications.spans;
            var lastEnd = 0;
            for (var i = 0, n = dense.length; i < n; i += 3) {
                var start = dense[i];
                var length_1 = dense[i + 1];
                var type = dense[i + 2];
                // Make a whitespace entry between the last item and this one.
                if (lastEnd >= 0) {
                    var whitespaceLength_1 = start - lastEnd;
                    if (whitespaceLength_1 > 0) {
                        entries.push({ length: whitespaceLength_1, classification: TokenClass.Whitespace });
                    }
                }
                entries.push({ length: length_1, classification: convertClassification(type) });
                lastEnd = start + length_1;
            }
            var whitespaceLength = text.length - lastEnd;
            if (whitespaceLength > 0) {
                entries.push({ length: whitespaceLength, classification: TokenClass.Whitespace });
            }
            return { entries: entries, finalLexState: classifications.endOfLineState };
        }
        function convertClassification(type) {
            switch (type) {
                case 1 /* comment */: return TokenClass.Comment;
                case 3 /* keyword */: return TokenClass.Keyword;
                case 4 /* numericLiteral */: return TokenClass.NumberLiteral;
                case 5 /* operator */: return TokenClass.Operator;
                case 6 /* stringLiteral */: return TokenClass.StringLiteral;
                case 8 /* whiteSpace */: return TokenClass.Whitespace;
                case 10 /* punctuation */: return TokenClass.Punctuation;
                case 2 /* identifier */:
                case 11 /* className */:
                case 12 /* enumName */:
                case 13 /* interfaceName */:
                case 14 /* moduleName */:
                case 15 /* typeParameterName */:
                case 16 /* typeAliasName */:
                case 9 /* text */:
                case 17 /* parameterName */:
                default:
                    return TokenClass.Identifier;
            }
        }
        function getClassificationsForLine(text, lexState, syntacticClassifierAbsent) {
            return convertClassifications(getEncodedLexicalClassifications(text, lexState, syntacticClassifierAbsent), text);
        }
        // If there is a syntactic classifier ('syntacticClassifierAbsent' is false),
        // we will be more conservative in order to avoid conflicting with the syntactic classifier.
        function getEncodedLexicalClassifications(text, lexState, syntacticClassifierAbsent) {
            var offset = 0;
            var token = 0 /* Unknown */;
            var lastNonTriviaToken = 0 /* Unknown */;
            // Empty out the template stack for reuse.
            while (templateStack.length > 0) {
                templateStack.pop();
            }
            // If we're in a string literal, then prepend: "\
            // (and a newline).  That way when we lex we'll think we're still in a string literal.
            //
            // If we're in a multiline comment, then prepend: /*
            // (and a newline).  That way when we lex we'll think we're still in a multiline comment.
            switch (lexState) {
                case 3 /* InDoubleQuoteStringLiteral */:
                    text = "\"\\\n" + text;
                    offset = 3;
                    break;
                case 2 /* InSingleQuoteStringLiteral */:
                    text = "'\\\n" + text;
                    offset = 3;
                    break;
                case 1 /* InMultiLineCommentTrivia */:
                    text = "/*\n" + text;
                    offset = 3;
                    break;
                case 4 /* InTemplateHeadOrNoSubstitutionTemplate */:
                    text = "`\n" + text;
                    offset = 2;
                    break;
                case 5 /* InTemplateMiddleOrTail */:
                    text = "}\n" + text;
                    offset = 2;
                // fallthrough
                case 6 /* InTemplateSubstitutionPosition */:
                    templateStack.push(12 /* TemplateHead */);
                    break;
            }
            scanner.setText(text);
            var result = {
                endOfLineState: 0 /* None */,
                spans: []
            };
            // We can run into an unfortunate interaction between the lexical and syntactic classifier
            // when the user is typing something generic.  Consider the case where the user types:
            //
            //      Foo<number
            //
            // From the lexical classifier's perspective, 'number' is a keyword, and so the word will
            // be classified as such.  However, from the syntactic classifier's tree-based perspective
            // this is simply an expression with the identifier 'number' on the RHS of the less than
            // token.  So the classification will go back to being an identifier.  The moment the user
            // types again, number will become a keyword, then an identifier, etc. etc.
            //
            // To try to avoid this problem, we avoid classifying contextual keywords as keywords
            // when the user is potentially typing something generic.  We just can't do a good enough
            // job at the lexical level, and so well leave it up to the syntactic classifier to make
            // the determination.
            //
            // In order to determine if the user is potentially typing something generic, we use a
            // weak heuristic where we track < and > tokens.  It's a weak heuristic, but should
            // work well enough in practice.
            var angleBracketStack = 0;
            do {
                token = scanner.scan();
                if (!ts.isTrivia(token)) {
                    if ((token === 39 /* SlashToken */ || token === 61 /* SlashEqualsToken */) && !noRegexTable[lastNonTriviaToken]) {
                        if (scanner.reScanSlashToken() === 10 /* RegularExpressionLiteral */) {
                            token = 10 /* RegularExpressionLiteral */;
                        }
                    }
                    else if (lastNonTriviaToken === 21 /* DotToken */ && isKeyword(token)) {
                        token = 69 /* Identifier */;
                    }
                    else if (isKeyword(lastNonTriviaToken) && isKeyword(token) && !canFollow(lastNonTriviaToken, token)) {
                        // We have two keywords in a row.  Only treat the second as a keyword if
                        // it's a sequence that could legally occur in the language.  Otherwise
                        // treat it as an identifier.  This way, if someone writes "private var"
                        // we recognize that 'var' is actually an identifier here.
                        token = 69 /* Identifier */;
                    }
                    else if (lastNonTriviaToken === 69 /* Identifier */ &&
                        token === 25 /* LessThanToken */) {
                        // Could be the start of something generic.  Keep track of that by bumping
                        // up the current count of generic contexts we may be in.
                        angleBracketStack++;
                    }
                    else if (token === 27 /* GreaterThanToken */ && angleBracketStack > 0) {
                        // If we think we're currently in something generic, then mark that that
                        // generic entity is complete.
                        angleBracketStack--;
                    }
                    else if (token === 117 /* AnyKeyword */ ||
                        token === 130 /* StringKeyword */ ||
                        token === 128 /* NumberKeyword */ ||
                        token === 120 /* BooleanKeyword */ ||
                        token === 131 /* SymbolKeyword */) {
                        if (angleBracketStack > 0 && !syntacticClassifierAbsent) {
                            // If it looks like we're could be in something generic, don't classify this
                            // as a keyword.  We may just get overwritten by the syntactic classifier,
                            // causing a noisy experience for the user.
                            token = 69 /* Identifier */;
                        }
                    }
                    else if (token === 12 /* TemplateHead */) {
                        templateStack.push(token);
                    }
                    else if (token === 15 /* OpenBraceToken */) {
                        // If we don't have anything on the template stack,
                        // then we aren't trying to keep track of a previously scanned template head.
                        if (templateStack.length > 0) {
                            templateStack.push(token);
                        }
                    }
                    else if (token === 16 /* CloseBraceToken */) {
                        // If we don't have anything on the template stack,
                        // then we aren't trying to keep track of a previously scanned template head.
                        if (templateStack.length > 0) {
                            var lastTemplateStackToken = ts.lastOrUndefined(templateStack);
                            if (lastTemplateStackToken === 12 /* TemplateHead */) {
                                token = scanner.reScanTemplateToken();
                                // Only pop on a TemplateTail; a TemplateMiddle indicates there is more for us.
                                if (token === 14 /* TemplateTail */) {
                                    templateStack.pop();
                                }
                                else {
                                    ts.Debug.assert(token === 13 /* TemplateMiddle */, "Should have been a template middle. Was " + token);
                                }
                            }
                            else {
                                ts.Debug.assert(lastTemplateStackToken === 15 /* OpenBraceToken */, "Should have been an open brace. Was: " + token);
                                templateStack.pop();
                            }
                        }
                    }
                    lastNonTriviaToken = token;
                }
                processToken();
            } while (token !== 1 /* EndOfFileToken */);
            return result;
            function processToken() {
                var start = scanner.getTokenPos();
                var end = scanner.getTextPos();
                addResult(start, end, classFromKind(token));
                if (end >= text.length) {
                    if (token === 9 /* StringLiteral */ || token === 163 /* StringLiteralType */) {
                        // Check to see if we finished up on a multiline string literal.
                        var tokenText = scanner.getTokenText();
                        if (scanner.isUnterminated()) {
                            var lastCharIndex = tokenText.length - 1;
                            var numBackslashes = 0;
                            while (tokenText.charCodeAt(lastCharIndex - numBackslashes) === 92 /* backslash */) {
                                numBackslashes++;
                            }
                            // If we have an odd number of backslashes, then the multiline string is unclosed
                            if (numBackslashes & 1) {
                                var quoteChar = tokenText.charCodeAt(0);
                                result.endOfLineState = quoteChar === 34 /* doubleQuote */
                                    ? 3 /* InDoubleQuoteStringLiteral */
                                    : 2 /* InSingleQuoteStringLiteral */;
                            }
                        }
                    }
                    else if (token === 3 /* MultiLineCommentTrivia */) {
                        // Check to see if the multiline comment was unclosed.
                        if (scanner.isUnterminated()) {
                            result.endOfLineState = 1 /* InMultiLineCommentTrivia */;
                        }
                    }
                    else if (ts.isTemplateLiteralKind(token)) {
                        if (scanner.isUnterminated()) {
                            if (token === 14 /* TemplateTail */) {
                                result.endOfLineState = 5 /* InTemplateMiddleOrTail */;
                            }
                            else if (token === 11 /* NoSubstitutionTemplateLiteral */) {
                                result.endOfLineState = 4 /* InTemplateHeadOrNoSubstitutionTemplate */;
                            }
                            else {
                                ts.Debug.fail("Only 'NoSubstitutionTemplateLiteral's and 'TemplateTail's can be unterminated; got SyntaxKind #" + token);
                            }
                        }
                    }
                    else if (templateStack.length > 0 && ts.lastOrUndefined(templateStack) === 12 /* TemplateHead */) {
                        result.endOfLineState = 6 /* InTemplateSubstitutionPosition */;
                    }
                }
            }
            function addResult(start, end, classification) {
                if (classification === 8 /* whiteSpace */) {
                    // Don't bother with whitespace classifications.  They're not needed.
                    return;
                }
                if (start === 0 && offset > 0) {
                    // We're classifying the first token, and this was a case where we prepended
                    // text.  We should consider the start of this token to be at the start of
                    // the original text.
                    start += offset;
                }
                // All our tokens are in relation to the augmented text.  Move them back to be
                // relative to the original text.
                start -= offset;
                end -= offset;
                var length = end - start;
                if (length > 0) {
                    result.spans.push(start);
                    result.spans.push(length);
                    result.spans.push(classification);
                }
            }
        }
        function isBinaryExpressionOperatorToken(token) {
            switch (token) {
                case 37 /* AsteriskToken */:
                case 39 /* SlashToken */:
                case 40 /* PercentToken */:
                case 35 /* PlusToken */:
                case 36 /* MinusToken */:
                case 43 /* LessThanLessThanToken */:
                case 44 /* GreaterThanGreaterThanToken */:
                case 45 /* GreaterThanGreaterThanGreaterThanToken */:
                case 25 /* LessThanToken */:
                case 27 /* GreaterThanToken */:
                case 28 /* LessThanEqualsToken */:
                case 29 /* GreaterThanEqualsToken */:
                case 91 /* InstanceOfKeyword */:
                case 90 /* InKeyword */:
                case 116 /* AsKeyword */:
                case 30 /* EqualsEqualsToken */:
                case 31 /* ExclamationEqualsToken */:
                case 32 /* EqualsEqualsEqualsToken */:
                case 33 /* ExclamationEqualsEqualsToken */:
                case 46 /* AmpersandToken */:
                case 48 /* CaretToken */:
                case 47 /* BarToken */:
                case 51 /* AmpersandAmpersandToken */:
                case 52 /* BarBarToken */:
                case 67 /* BarEqualsToken */:
                case 66 /* AmpersandEqualsToken */:
                case 68 /* CaretEqualsToken */:
                case 63 /* LessThanLessThanEqualsToken */:
                case 64 /* GreaterThanGreaterThanEqualsToken */:
                case 65 /* GreaterThanGreaterThanGreaterThanEqualsToken */:
                case 57 /* PlusEqualsToken */:
                case 58 /* MinusEqualsToken */:
                case 59 /* AsteriskEqualsToken */:
                case 61 /* SlashEqualsToken */:
                case 62 /* PercentEqualsToken */:
                case 56 /* EqualsToken */:
                case 24 /* CommaToken */:
                    return true;
                default:
                    return false;
            }
        }
        function isPrefixUnaryExpressionOperatorToken(token) {
            switch (token) {
                case 35 /* PlusToken */:
                case 36 /* MinusToken */:
                case 50 /* TildeToken */:
                case 49 /* ExclamationToken */:
                case 41 /* PlusPlusToken */:
                case 42 /* MinusMinusToken */:
                    return true;
                default:
                    return false;
            }
        }
        function isKeyword(token) {
            return token >= 70 /* FirstKeyword */ && token <= 135 /* LastKeyword */;
        }
        function classFromKind(token) {
            if (isKeyword(token)) {
                return 3 /* keyword */;
            }
            else if (isBinaryExpressionOperatorToken(token) || isPrefixUnaryExpressionOperatorToken(token)) {
                return 5 /* operator */;
            }
            else if (token >= 15 /* FirstPunctuation */ && token <= 68 /* LastPunctuation */) {
                return 10 /* punctuation */;
            }
            switch (token) {
                case 8 /* NumericLiteral */:
                    return 4 /* numericLiteral */;
                case 9 /* StringLiteral */:
                case 163 /* StringLiteralType */:
                    return 6 /* stringLiteral */;
                case 10 /* RegularExpressionLiteral */:
                    return 7 /* regularExpressionLiteral */;
                case 7 /* ConflictMarkerTrivia */:
                case 3 /* MultiLineCommentTrivia */:
                case 2 /* SingleLineCommentTrivia */:
                    return 1 /* comment */;
                case 5 /* WhitespaceTrivia */:
                case 4 /* NewLineTrivia */:
                    return 8 /* whiteSpace */;
                case 69 /* Identifier */:
                default:
                    if (ts.isTemplateLiteralKind(token)) {
                        return 6 /* stringLiteral */;
                    }
                    return 2 /* identifier */;
            }
        }
        return {
            getClassificationsForLine: getClassificationsForLine,
            getEncodedLexicalClassifications: getEncodedLexicalClassifications
        };
    }
    ts.createClassifier = createClassifier;
    /**
      * Get the path of the default library files (lib.d.ts) as distributed with the typescript
      * node package.
      * The functionality is not supported if the ts module is consumed outside of a node module.
      */
    function getDefaultLibFilePath(options) {
        // Check __dirname is defined and that we are on a node.js system.
        if (typeof __dirname !== "undefined") {
            return __dirname + ts.directorySeparator + ts.getDefaultLibFileName(options);
        }
        throw new Error("getDefaultLibFilePath is only supported when consumed as a node module. ");
    }
    ts.getDefaultLibFilePath = getDefaultLibFilePath;
    function initializeServices() {
        ts.objectAllocator = {
            getNodeConstructor: function () { return NodeObject; },
            getSourceFileConstructor: function () { return SourceFileObject; },
            getSymbolConstructor: function () { return SymbolObject; },
            getTypeConstructor: function () { return TypeObject; },
            getSignatureConstructor: function () { return SignatureObject; }
        };
    }
    initializeServices();
})(ts || (ts = {}));
