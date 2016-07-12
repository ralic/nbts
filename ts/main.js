/*
 * Copyright (C) 2015 Everlaw
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var SEK = ts.ScriptElementKind;
var builtinLibs = {};
var HostImpl = (function () {
    function HostImpl() {
        this.version = 0;
        this.files = {};
        this.cachedConfig = null;
    }
    HostImpl.prototype.log = function (s) {
        process.stdout.write('L' + JSON.stringify(s) + '\n');
    };
    HostImpl.prototype.getCompilationSettings = function () {
        var options = this.configUpToDate().pcl.options;
        var settings = Object.create(options);
        if (options.noImplicitAny == null) {
            // report implicit-any errors anyway, but only as warnings (see getDiagnostics)
            settings.noImplicitAny = true;
        }
        return settings;
    };
    HostImpl.prototype.getNewLine = function () {
        return ts.getNewLineCharacter(this.configUpToDate().pcl.options);
    };
    HostImpl.prototype.getProjectVersion = function () {
        return String(this.version);
    };
    HostImpl.prototype.getScriptFileNames = function () {
        return this.configUpToDate().pcl.fileNames;
    };
    HostImpl.prototype.getScriptVersion = function (fileName) {
        if (fileName in builtinLibs) {
            return "0";
        }
        return this.files[fileName] && this.files[fileName].version;
    };
    HostImpl.prototype.getScriptSnapshot = function (fileName) {
        if (fileName in builtinLibs) {
            return new SnapshotImpl(builtinLibs[fileName]);
        }
        return this.files[fileName] && this.files[fileName].snapshot;
    };
    HostImpl.prototype.getCurrentDirectory = function () {
        return "";
    };
    HostImpl.prototype.getDefaultLibFileName = function (options) {
        return "(builtin) " + ts.getDefaultLibFileName(options);
    };
    HostImpl.prototype.useCaseSensitiveFileNames = function () {
        // Necessary on Unix, should be OK on Windows since filenames always come from the indexer
        // and should therefore be canonical.
        return true;
    };
    HostImpl.prototype.readDirectory = function (path, extension, exclude) {
        exclude = ts.map(exclude, function (s) { return ts.combinePaths(path, s); });
        return Object.keys(this.files).filter(function (name) {
            if (path && name.lastIndexOf(path + ts.directorySeparator, 0) !== 0) {
                return false;
            }
            else if (extension && !ts.fileExtensionIs(name, extension)) {
                return false;
            }
            else if (exclude && exclude.some(function (e) {
                return name === e || name.lastIndexOf(e + ts.directorySeparator, 0) === 0;
            })) {
                return false;
            }
            return true;
        });
    };
    HostImpl.prototype.configUpToDate = function () {
        if (!this.cachedConfig) {
            var path = "";
            var json = {};
            var configFiles = this.readDirectory(null, '.json');
            if (configFiles.length) {
                // We only support one project per source root for now; if there are multiple
                // tsconfig.json files under this root, pick the one with the shortest path.
                configFiles.sort(function (a, b) { return a.length - b.length || a.localeCompare(b); })[0];
                path = configFiles[0];
                json = ts.parseConfigFileTextToJson(path, this.files[path].snapshot.text).config || {};
            }
            var dir = ts.getDirectoryPath(path);
            this.cachedConfig = { path: path, pcl: ts.parseJsonConfigFileContent(json, this, dir) };
        }
        return this.cachedConfig;
    };
    return HostImpl;
}());
var SnapshotImpl = (function () {
    function SnapshotImpl(text) {
        this.text = text;
    }
    SnapshotImpl.prototype.getText = function (start, end) {
        return this.text.substring(start, end);
    };
    SnapshotImpl.prototype.getLength = function () {
        return this.text.length;
    };
    SnapshotImpl.prototype.getChangeRange = function (oldSnapshot) {
        var newText = this.text, oldText = oldSnapshot.text;
        var newEnd = newText.length, oldEnd = oldText.length;
        while (newEnd > 0 && oldEnd > 0 && newText.charCodeAt(newEnd) === oldText.charCodeAt(oldEnd)) {
            newEnd--;
            oldEnd--;
        }
        var start = 0, start = 0;
        while (start < oldEnd && start < newEnd && newText.charCodeAt(start) === oldText.charCodeAt(start)) {
            start++;
        }
        return { span: { start: start, length: oldEnd - start }, newLength: newEnd - start };
    };
    return SnapshotImpl;
}());
var Program = (function () {
    function Program() {
        this.host = new HostImpl();
        this.service = ts.createLanguageService(this.host, ts.createDocumentRegistry(true));
    }
    Program.prototype.updateFile = function (fileName, newText, modified) {
        this.host.version++;
        if (!(fileName in this.host.files) || /\.json$/.test(fileName)) {
            this.host.cachedConfig = null;
        }
        this.host.files[fileName] = {
            version: String(this.host.version),
            snapshot: new SnapshotImpl(newText)
        };
    };
    Program.prototype.deleteFile = function (fileName) {
        this.host.version++;
        this.host.cachedConfig = null;
        delete this.host.files[fileName];
    };
    Program.prototype.fileInProject = function (fileName) {
        return !!this.service.getProgram().getSourceFile(ts.normalizeSlashes(fileName));
    };
    Program.prototype.getDiagnostics = function (fileName) {
        var config = this.host.configUpToDate();
        if (!this.fileInProject(fileName)) {
            return {
                errs: [],
                metaError: "File " + fileName + " is not in project defined by " + config.path
            };
        }
        var mapDiag = function (diag) { return ({
            line: ts.getLineAndCharacterOfPosition(diag.file, diag.start).line + 1,
            start: diag.start,
            length: diag.length,
            messageText: ts.flattenDiagnosticMessageText(diag.messageText, "\n"),
            // 2602 and 7000-7026 are implicit-any errors
            category: (diag.code === 2602 || diag.code >= 7000 && diag.code <= 7026) && !config.pcl.options.noImplicitAny
                ? ts.DiagnosticCategory.Warning
                : diag.category,
            code: diag.code
        }); };
        var errs = this.service.getSyntacticDiagnostics(fileName).map(mapDiag);
        var metaError;
        try {
            // In case there are bugs in the type checker, make sure we can handle it throwing an
            // exception and still show the syntactic errors.
            errs = errs.concat(this.service.getSemanticDiagnostics(fileName).map(mapDiag));
        }
        catch (e) {
            metaError = "Error in getSemanticDiagnostics\n\n" + e.stack;
        }
        return { errs: errs, metaError: metaError };
    };
    Program.prototype.getCompletions = function (fileName, position, prefix, isPrefixMatch, caseSensitive) {
        if (!this.fileInProject(fileName))
            return null;
        var service = this.service;
        var info = service.getCompletionsAtPosition(fileName, position);
        if (!caseSensitive)
            prefix = prefix.toLowerCase();
        if (info) {
            return {
                isMemberCompletion: info.isMemberCompletion,
                entries: info.entries.filter(function (e) {
                    var name = e.name;
                    if (isPrefixMatch)
                        name = name.substr(0, prefix.length);
                    if (!caseSensitive)
                        name = name.toLowerCase();
                    return name === prefix;
                })
            };
        }
        return info;
    };
    Program.prototype.getCompletionEntryDetails = function (fileName, position, entryName) {
        if (!this.fileInProject(fileName))
            return null;
        return this.service.getCompletionEntryDetails(fileName, position, entryName);
    };
    Program.prototype.getQuickInfoAtPosition = function (fileName, position) {
        if (!this.fileInProject(fileName))
            return null;
        var quickInfo = this.service.getQuickInfoAtPosition(fileName, position);
        return quickInfo && {
            name: this.host.getScriptSnapshot(fileName).getText(quickInfo.textSpan.start, quickInfo.textSpan.start + quickInfo.textSpan.length),
            kind: quickInfo.kind,
            kindModifiers: quickInfo.kindModifiers,
            start: quickInfo.textSpan.start,
            end: quickInfo.textSpan.start + quickInfo.textSpan.length,
            displayParts: quickInfo.displayParts,
            documentation: quickInfo.documentation
        };
    };
    Program.prototype.getDefsAtPosition = function (fileName, position) {
        var _this = this;
        if (!this.fileInProject(fileName))
            return null;
        var defs = this.service.getDefinitionAtPosition(fileName, position);
        return defs && defs.map(function (di) {
            var sourceFile = _this.service.getSourceFile(di.fileName);
            return {
                fileName: di.fileName,
                start: di.textSpan.start,
                line: sourceFile.getLineAndCharacterOfPosition(di.textSpan.start).line + 1,
                kind: di.kind,
                name: di.name,
                containerKind: di.containerKind,
                containerName: di.containerName
            };
        });
    };
    Program.prototype.getOccurrencesAtPosition = function (fileName, position) {
        if (!this.fileInProject(fileName))
            return null;
        var occurrences = this.service.getOccurrencesAtPosition(fileName, position);
        return occurrences && occurrences.map(function (occ) { return ({
            start: occ.textSpan.start,
            end: occ.textSpan.start + occ.textSpan.length
        }); });
    };
    Program.prototype.getSemanticHighlights = function (fileName) {
        var program = this.service.getProgram();
        var sourceFile = program.getSourceFile(ts.normalizeSlashes(fileName));
        if (!sourceFile)
            return null;
        var typeInfoResolver = program.getTypeChecker();
        var results = [];
        var resultByPos = {};
        function highlight(start, end, attr) {
            var res = resultByPos[start];
            if (!res) {
                res = { s: start, l: end - start, a: [] };
                results.push(res);
                resultByPos[start] = res;
            }
            res.a.push(attr);
        }
        function highlightIdent(node, attr) {
            // node.pos is too early (includes leading trivia)
            node.text && highlight(node.end - node.text.length, node.end, attr);
        }
        var localDecls = [];
        var usedSymbols = new Set();
        function isGlobal(decl) {
            switch (decl.kind) {
                case 176 /* FunctionExpression */:
                case 189 /* ClassExpression */:
                case 251 /* SourceFile */:
                    return false;
            }
            do {
                decl = decl.parent;
            } while (!decl.locals);
            return decl.kind === 251 /* SourceFile */ && !ts.isExternalModule(decl);
        }
        function walk(node) {
            if (node.symbol && node.name && node.name.text) {
                var isLocal;
                if (node.kind === 139 /* Parameter */ && !node.parent.body) {
                    // don't complain about unused parameters in functions with no implementation body
                    isLocal = false;
                }
                else if (node.kind === 233 /* ExportSpecifier */) {
                    usedSymbols.add(typeInfoResolver.getAliasedSymbol(node.symbol));
                    isLocal = false;
                }
                else if (node.symbol.flags & 0x1A00C) {
                    // property, enum member, method, get/set - public by default
                    // is only local if "private" modifier is present
                    isLocal = !!(node.flags & 16 /* Private */);
                }
                else {
                    // other symbols are local unless in global scope or exported
                    isLocal = !(isGlobal(node) || node.localSymbol);
                }
                isLocal && localDecls.push(node);
            }
            if (node.kind === 69 /* Identifier */ && node.text) {
                var symbol;
                if (node.parent.symbol && node.parent.name === node) {
                    // declaration
                    symbol = node.parent.symbol;
                    if (node.parent.kind === 249 /* ShorthandPropertyAssignment */) {
                        // this isn't just a declaration, but also a usage - of a different symbol
                        usedSymbols.add(typeInfoResolver.getShorthandAssignmentValueSymbol(node.parent));
                    }
                }
                else {
                    // usage
                    // TODO: In code like "import A = X; import B = A.foo;" this does not do quite
                    // what we want. For the A in A.foo, it returns the aliased symbol X rather than
                    // the alias A, so we fail to recognize that the alias A is used.
                    symbol = typeInfoResolver.getSymbolAtLocation(node);
                    if (symbol) {
                        // if this is a generic instantiation, find the original symbol
                        symbol = symbol.target || symbol;
                        usedSymbols.add(symbol);
                    }
                }
                if (symbol) {
                    var decls = symbol.declarations;
                    if (symbol.flags & 2147483648 /* Deprecated */) {
                        highlightIdent(node, 'DEPRECATED');
                    }
                    if (symbol.flags & 0x1800C) {
                        // Property, EnumMember, GetAccessor, SetAccessor
                        highlightIdent(node, 'FIELD');
                    }
                    else if (symbol.flags & 8914931 /* ModuleMember */) {
                        // var, function, class, interface, enum, module, type alias, alias
                        if (isGlobal(decls[0])) {
                            highlightIdent(node, 'GLOBAL');
                        }
                    }
                }
                else {
                    highlightIdent(node, 'UNDEFINED');
                }
                return;
            }
            switch (node.kind) {
                case 144 /* MethodDeclaration */:
                case 176 /* FunctionExpression */:
                case 216 /* FunctionDeclaration */:
                    // For MethodDeclaration, name.kind could be string literal
                    if (node.name && node.name.kind === 69 /* Identifier */) {
                        highlightIdent(node.name, 'METHOD');
                    }
                    break;
                case 189 /* ClassExpression */:
                case 217 /* ClassDeclaration */:
                case 218 /* InterfaceDeclaration */:
                case 219 /* TypeAliasDeclaration */:
                case 220 /* EnumDeclaration */:
                case 221 /* ModuleDeclaration */:
                    // name.kind could be string (external module decl); don't highlight that
                    if (node.name && node.name.kind === 69 /* Identifier */) {
                        highlightIdent(node.name, 'CLASS');
                    }
                    break;
                case 145 /* Constructor */:
                    node.getChildren().forEach(function (n) {
                        if (n.kind === 121 /* ConstructorKeyword */) {
                            highlight(n.end - 11, n.end, 'METHOD');
                        }
                    });
                    break;
                case 146 /* GetAccessor */:
                case 147 /* SetAccessor */:
                    highlight(node.name.pos - 3, node.name.pos, 'METHOD');
                    break;
            }
            ts.forEachChild(node, walk);
        }
        walk(sourceFile);
        localDecls.forEach(function (decl) {
            usedSymbols.has(decl.symbol) || highlightIdent(decl.name, 'UNUSED');
        });
        return results;
    };
    Program.prototype.getStructureItems = function (fileName) {
        var program = this.service.getProgram();
        var sourceFile = program.getSourceFile(ts.normalizeSlashes(fileName));
        if (!sourceFile)
            return null;
        var typeInfoResolver = program.getTypeChecker();
        function buildResults(topNode, inFunction) {
            var results = [];
            function add(node, kind, symbol) {
                var name = node.kind === 145 /* Constructor */ ? "constructor" : node.name.text;
                if (!name) {
                    return;
                }
                var res = {
                    name: name,
                    kind: kind,
                    kindModifiers: ts.getNodeModifiers(node),
                    start: ts.skipTrivia(sourceFile.text, node.pos),
                    end: node.end
                };
                if (symbol) {
                    var type = typeInfoResolver.getTypeOfSymbolAtLocation(symbol, node);
                    res.type = typeInfoResolver.typeToString(type);
                }
                results.push(res);
                return res;
            }
            function addFunc(node, kind, symbol) {
                if (node.body) {
                    var res = add(node, kind, symbol);
                    res.children = buildResults(node.body, true);
                }
            }
            function addWithHeritage(node, kind) {
                var res = add(node, kind);
                node.heritageClauses && node.heritageClauses.forEach(function (hc) {
                    var types = hc.types.map(function (type) { return type.getFullText(); }).join(', ');
                    if (hc.token === 83 /* ExtendsKeyword */) {
                        res.extends = types;
                    }
                    else {
                        res.type = types;
                    }
                });
                return res;
            }
            function visit(node) {
                switch (node.kind) {
                    case 142 /* PropertyDeclaration */:
                        add(node, SEK.memberVariableElement, node.symbol);
                        break;
                    case 144 /* MethodDeclaration */:
                        addFunc(node, SEK.memberFunctionElement, node.symbol);
                        break;
                    case 145 /* Constructor */:
                        addFunc(node, SEK.constructorImplementationElement);
                        break;
                    case 146 /* GetAccessor */:
                        addFunc(node, SEK.memberGetAccessorElement, node.symbol);
                        break;
                    case 147 /* SetAccessor */:
                        addFunc(node, SEK.memberSetAccessorElement, node.symbol);
                        break;
                    case 196 /* VariableStatement */:
                        if (!inFunction) {
                            node.declarationList.declarations.forEach(function (v) {
                                add(v, SEK.variableElement, v.symbol);
                            });
                        }
                        break;
                    case 216 /* FunctionDeclaration */:
                        addFunc(node, SEK.functionElement, node.symbol);
                        break;
                    case 217 /* ClassDeclaration */:
                        var res = addWithHeritage(node, SEK.classElement);
                        res.children = buildResults(node, false);
                        break;
                    case 218 /* InterfaceDeclaration */:
                        addWithHeritage(node, SEK.interfaceElement);
                        break;
                    case 220 /* EnumDeclaration */:
                        add(node, SEK.enumElement);
                        break;
                    case 221 /* ModuleDeclaration */:
                        var res = add(node, SEK.moduleElement);
                        res.children = buildResults(node, false);
                        break;
                    case 222 /* ModuleBlock */:
                        node.statements.forEach(visit);
                        break;
                }
            }
            ts.forEachChild(topNode, visit);
            return results;
        }
        return buildResults(sourceFile, false);
    };
    Program.prototype.getFolds = function (fileName) {
        // ok if file not in project
        return this.service.getOutliningSpans(fileName).map(function (os) { return ({
            start: os.textSpan.start,
            end: os.textSpan.start + os.textSpan.length
        }); });
    };
    Program.prototype.getReferencesAtPosition = function (fileName, position) {
        var _this = this;
        if (!this.fileInProject(fileName))
            return null;
        var refs = this.service.getReferencesAtPosition(fileName, position);
        return refs && refs.map(function (ref) {
            var file = _this.service.getSourceFile(ref.fileName);
            var lineStarts = file.getLineStarts();
            var line = ts.computeLineAndCharacterOfPosition(lineStarts, ref.textSpan.start).line;
            return {
                fileName: ref.fileName,
                isWriteAccess: ref.isWriteAccess,
                start: ref.textSpan.start,
                end: ref.textSpan.start + ref.textSpan.length,
                lineStart: lineStarts[line],
                lineText: file.text.substring(lineStarts[line], lineStarts[line + 1])
            };
        });
    };
    Program.prototype.getFormattingEdits = function (fileName, start, end, indent, tabSize, expandTabs) {
        // ok if file not in project
        return this.service.getFormattingEditsForRange(fileName, start, end, {
            IndentSize: indent,
            TabSize: tabSize,
            NewLineCharacter: '\n',
            ConvertTabsToSpaces: expandTabs,
            IndentStyle: ts.IndentStyle.Smart,
            InsertSpaceAfterCommaDelimiter: true,
            InsertSpaceAfterSemicolonInForStatements: true,
            InsertSpaceBeforeAndAfterBinaryOperators: true,
            InsertSpaceAfterKeywordsInControlFlowStatements: true,
            InsertSpaceAfterFunctionKeywordForAnonymousFunctions: false,
            InsertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
            InsertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
            InsertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
            PlaceOpenBraceOnNewLineForFunctions: false,
            PlaceOpenBraceOnNewLineForControlBlocks: false
        }).map(function (edit) { return ({ s: edit.span.start, l: edit.span.length, t: edit.newText }); });
    };
    Program.prototype.getRenameInfo = function (fileName, position) {
        if (!this.fileInProject(fileName))
            return null;
        return this.service.getRenameInfo(fileName, position);
    };
    Program.prototype.findRenameLocations = function (fileName, position, findInStrings, findInComments) {
        if (!this.fileInProject(fileName))
            return null;
        var locs = this.service.findRenameLocations(fileName, position, findInStrings, findInComments);
        return locs && locs.map(function (loc) {
            return {
                fileName: loc.fileName,
                start: loc.textSpan.start,
                end: loc.textSpan.start + loc.textSpan.length
            };
        });
    };
    Program.prototype.getEmitOutput = function (fileName) {
        if (!this.fileInProject(fileName))
            return null;
        return this.service.getEmitOutput(fileName);
    };
    return Program;
}());
require('readline').createInterface(process.stdin, process.stdout).on('line', function (l) {
    try {
        var r = JSON.stringify(eval(l));
    }
    catch (error) {
        r = 'X' + JSON.stringify(error.stack);
    }
    process.stdout.write(r + '\n');
});
