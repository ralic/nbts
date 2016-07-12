/// <reference path="checker.ts"/>
/* @internal */
var ts;
(function (ts) {
    function getDeclarationDiagnostics(host, resolver, targetSourceFile) {
        var declarationDiagnostics = ts.createDiagnosticCollection();
        ts.forEachExpectedEmitFile(host, getDeclarationDiagnosticsFromFile, targetSourceFile);
        return declarationDiagnostics.getDiagnostics(targetSourceFile ? targetSourceFile.fileName : undefined);
        function getDeclarationDiagnosticsFromFile(_a, sources, isBundledEmit) {
            var declarationFilePath = _a.declarationFilePath;
            emitDeclarations(host, resolver, declarationDiagnostics, declarationFilePath, sources, isBundledEmit);
        }
    }
    ts.getDeclarationDiagnostics = getDeclarationDiagnostics;
    function emitDeclarations(host, resolver, emitterDiagnostics, declarationFilePath, sourceFiles, isBundledEmit) {
        var newLine = host.getNewLine();
        var compilerOptions = host.getCompilerOptions();
        var write;
        var writeLine;
        var increaseIndent;
        var decreaseIndent;
        var writeTextOfNode;
        var writer = createAndSetNewTextWriterWithSymbolWriter();
        var enclosingDeclaration;
        var resultHasExternalModuleIndicator;
        var currentText;
        var currentLineMap;
        var currentIdentifiers;
        var isCurrentFileExternalModule;
        var reportedDeclarationError = false;
        var errorNameNode;
        var emitJsDocComments = compilerOptions.removeComments ? function (declaration) { } : writeJsDocComments;
        var emit = compilerOptions.stripInternal ? stripInternal : emitNode;
        var noDeclare;
        var moduleElementDeclarationEmitInfo = [];
        var asynchronousSubModuleDeclarationEmitInfo;
        // Contains the reference paths that needs to go in the declaration file.
        // Collecting this separately because reference paths need to be first thing in the declaration file
        // and we could be collecting these paths from multiple files into single one with --out option
        var referencePathsOutput = "";
        // Emit references corresponding to each file
        var emittedReferencedFiles = [];
        var addedGlobalFileReference = false;
        var allSourcesModuleElementDeclarationEmitInfo = [];
        ts.forEach(sourceFiles, function (sourceFile) {
            // Dont emit for javascript file
            if (ts.isSourceFileJavaScript(sourceFile)) {
                return;
            }
            // Check what references need to be added
            if (!compilerOptions.noResolve) {
                ts.forEach(sourceFile.referencedFiles, function (fileReference) {
                    var referencedFile = ts.tryResolveScriptReference(host, sourceFile, fileReference);
                    // Emit reference in dts, if the file reference was not already emitted
                    if (referencedFile && !ts.contains(emittedReferencedFiles, referencedFile)) {
                        // Add a reference to generated dts file,
                        // global file reference is added only 
                        //  - if it is not bundled emit (because otherwise it would be self reference)
                        //  - and it is not already added
                        if (writeReferencePath(referencedFile, !isBundledEmit && !addedGlobalFileReference)) {
                            addedGlobalFileReference = true;
                        }
                        emittedReferencedFiles.push(referencedFile);
                    }
                });
            }
            resultHasExternalModuleIndicator = false;
            if (!isBundledEmit || !ts.isExternalModule(sourceFile)) {
                noDeclare = false;
                emitSourceFile(sourceFile);
            }
            else if (ts.isExternalModule(sourceFile)) {
                noDeclare = true;
                write("declare module \"" + ts.getResolvedExternalModuleName(host, sourceFile) + "\" {");
                writeLine();
                increaseIndent();
                emitSourceFile(sourceFile);
                decreaseIndent();
                write("}");
                writeLine();
            }
            // create asynchronous output for the importDeclarations
            if (moduleElementDeclarationEmitInfo.length) {
                var oldWriter = writer;
                ts.forEach(moduleElementDeclarationEmitInfo, function (aliasEmitInfo) {
                    if (aliasEmitInfo.isVisible && !aliasEmitInfo.asynchronousOutput) {
                        ts.Debug.assert(aliasEmitInfo.node.kind === 225 /* ImportDeclaration */);
                        createAndSetNewTextWriterWithSymbolWriter();
                        ts.Debug.assert(aliasEmitInfo.indent === 0 || (aliasEmitInfo.indent === 1 && isBundledEmit));
                        for (var i = 0; i < aliasEmitInfo.indent; i++) {
                            increaseIndent();
                        }
                        writeImportDeclaration(aliasEmitInfo.node);
                        aliasEmitInfo.asynchronousOutput = writer.getText();
                        for (var i = 0; i < aliasEmitInfo.indent; i++) {
                            decreaseIndent();
                        }
                    }
                });
                setWriter(oldWriter);
                allSourcesModuleElementDeclarationEmitInfo = allSourcesModuleElementDeclarationEmitInfo.concat(moduleElementDeclarationEmitInfo);
                moduleElementDeclarationEmitInfo = [];
            }
            if (!isBundledEmit && ts.isExternalModule(sourceFile) && sourceFile.moduleAugmentations.length && !resultHasExternalModuleIndicator) {
                // if file was external module with augmentations - this fact should be preserved in .d.ts as well.
                // in case if we didn't write any external module specifiers in .d.ts we need to emit something 
                // that will force compiler to think that this file is an external module - 'export {}' is a reasonable choice here.
                write("export {};");
                writeLine();
            }
        });
        return {
            reportedDeclarationError: reportedDeclarationError,
            moduleElementDeclarationEmitInfo: allSourcesModuleElementDeclarationEmitInfo,
            synchronousDeclarationOutput: writer.getText(),
            referencePathsOutput: referencePathsOutput
        };
        function hasInternalAnnotation(range) {
            var comment = currentText.substring(range.pos, range.end);
            return comment.indexOf("@internal") >= 0;
        }
        function stripInternal(node) {
            if (node) {
                var leadingCommentRanges = ts.getLeadingCommentRanges(currentText, node.pos);
                if (ts.forEach(leadingCommentRanges, hasInternalAnnotation)) {
                    return;
                }
                emitNode(node);
            }
        }
        function createAndSetNewTextWriterWithSymbolWriter() {
            var writer = ts.createTextWriter(newLine);
            writer.trackSymbol = trackSymbol;
            writer.reportInaccessibleThisError = reportInaccessibleThisError;
            writer.writeKeyword = writer.write;
            writer.writeOperator = writer.write;
            writer.writePunctuation = writer.write;
            writer.writeSpace = writer.write;
            writer.writeStringLiteral = writer.writeLiteral;
            writer.writeParameter = writer.write;
            writer.writeSymbol = writer.write;
            setWriter(writer);
            return writer;
        }
        function setWriter(newWriter) {
            writer = newWriter;
            write = newWriter.write;
            writeTextOfNode = newWriter.writeTextOfNode;
            writeLine = newWriter.writeLine;
            increaseIndent = newWriter.increaseIndent;
            decreaseIndent = newWriter.decreaseIndent;
        }
        function writeAsynchronousModuleElements(nodes) {
            var oldWriter = writer;
            ts.forEach(nodes, function (declaration) {
                var nodeToCheck;
                if (declaration.kind === 214 /* VariableDeclaration */) {
                    nodeToCheck = declaration.parent.parent;
                }
                else if (declaration.kind === 228 /* NamedImports */ || declaration.kind === 229 /* ImportSpecifier */ || declaration.kind === 226 /* ImportClause */) {
                    ts.Debug.fail("We should be getting ImportDeclaration instead to write");
                }
                else {
                    nodeToCheck = declaration;
                }
                var moduleElementEmitInfo = ts.forEach(moduleElementDeclarationEmitInfo, function (declEmitInfo) { return declEmitInfo.node === nodeToCheck ? declEmitInfo : undefined; });
                if (!moduleElementEmitInfo && asynchronousSubModuleDeclarationEmitInfo) {
                    moduleElementEmitInfo = ts.forEach(asynchronousSubModuleDeclarationEmitInfo, function (declEmitInfo) { return declEmitInfo.node === nodeToCheck ? declEmitInfo : undefined; });
                }
                // If the alias was marked as not visible when we saw its declaration, we would have saved the aliasEmitInfo, but if we haven't yet visited the alias declaration
                // then we don't need to write it at this point. We will write it when we actually see its declaration
                // Eg.
                // export function bar(a: foo.Foo) { }
                // import foo = require("foo");
                // Writing of function bar would mark alias declaration foo as visible but we haven't yet visited that declaration so do nothing,
                // we would write alias foo declaration when we visit it since it would now be marked as visible
                if (moduleElementEmitInfo) {
                    if (moduleElementEmitInfo.node.kind === 225 /* ImportDeclaration */) {
                        // we have to create asynchronous output only after we have collected complete information
                        // because it is possible to enable multiple bindings as asynchronously visible
                        moduleElementEmitInfo.isVisible = true;
                    }
                    else {
                        createAndSetNewTextWriterWithSymbolWriter();
                        for (var declarationIndent = moduleElementEmitInfo.indent; declarationIndent; declarationIndent--) {
                            increaseIndent();
                        }
                        if (nodeToCheck.kind === 221 /* ModuleDeclaration */) {
                            ts.Debug.assert(asynchronousSubModuleDeclarationEmitInfo === undefined);
                            asynchronousSubModuleDeclarationEmitInfo = [];
                        }
                        writeModuleElement(nodeToCheck);
                        if (nodeToCheck.kind === 221 /* ModuleDeclaration */) {
                            moduleElementEmitInfo.subModuleElementDeclarationEmitInfo = asynchronousSubModuleDeclarationEmitInfo;
                            asynchronousSubModuleDeclarationEmitInfo = undefined;
                        }
                        moduleElementEmitInfo.asynchronousOutput = writer.getText();
                    }
                }
            });
            setWriter(oldWriter);
        }
        function handleSymbolAccessibilityError(symbolAccesibilityResult) {
            if (symbolAccesibilityResult.accessibility === 0 /* Accessible */) {
                // write the aliases
                if (symbolAccesibilityResult && symbolAccesibilityResult.aliasesToMakeVisible) {
                    writeAsynchronousModuleElements(symbolAccesibilityResult.aliasesToMakeVisible);
                }
            }
            else {
                // Report error
                reportedDeclarationError = true;
                var errorInfo = writer.getSymbolAccessibilityDiagnostic(symbolAccesibilityResult);
                if (errorInfo) {
                    if (errorInfo.typeName) {
                        emitterDiagnostics.add(ts.createDiagnosticForNode(symbolAccesibilityResult.errorNode || errorInfo.errorNode, errorInfo.diagnosticMessage, ts.getTextOfNodeFromSourceText(currentText, errorInfo.typeName), symbolAccesibilityResult.errorSymbolName, symbolAccesibilityResult.errorModuleName));
                    }
                    else {
                        emitterDiagnostics.add(ts.createDiagnosticForNode(symbolAccesibilityResult.errorNode || errorInfo.errorNode, errorInfo.diagnosticMessage, symbolAccesibilityResult.errorSymbolName, symbolAccesibilityResult.errorModuleName));
                    }
                }
            }
        }
        function trackSymbol(symbol, enclosingDeclaration, meaning) {
            handleSymbolAccessibilityError(resolver.isSymbolAccessible(symbol, enclosingDeclaration, meaning));
        }
        function reportInaccessibleThisError() {
            if (errorNameNode) {
                reportedDeclarationError = true;
                emitterDiagnostics.add(ts.createDiagnosticForNode(errorNameNode, ts.Diagnostics.The_inferred_type_of_0_references_an_inaccessible_this_type_A_type_annotation_is_necessary, ts.declarationNameToString(errorNameNode)));
            }
        }
        function writeTypeOfDeclaration(declaration, type, getSymbolAccessibilityDiagnostic) {
            writer.getSymbolAccessibilityDiagnostic = getSymbolAccessibilityDiagnostic;
            write(": ");
            if (type) {
                // Write the type
                emitType(type);
            }
            else {
                errorNameNode = declaration.name;
                resolver.writeTypeOfDeclaration(declaration, enclosingDeclaration, 2 /* UseTypeOfFunction */, writer);
                errorNameNode = undefined;
            }
        }
        function writeReturnTypeAtSignature(signature, getSymbolAccessibilityDiagnostic) {
            writer.getSymbolAccessibilityDiagnostic = getSymbolAccessibilityDiagnostic;
            write(": ");
            if (signature.type) {
                // Write the type
                emitType(signature.type);
            }
            else {
                errorNameNode = signature.name;
                resolver.writeReturnTypeOfSignatureDeclaration(signature, enclosingDeclaration, 2 /* UseTypeOfFunction */, writer);
                errorNameNode = undefined;
            }
        }
        function emitLines(nodes) {
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var node = nodes_1[_i];
                emit(node);
            }
        }
        function emitSeparatedList(nodes, separator, eachNodeEmitFn, canEmitFn) {
            var currentWriterPos = writer.getTextPos();
            for (var _i = 0, nodes_2 = nodes; _i < nodes_2.length; _i++) {
                var node = nodes_2[_i];
                if (!canEmitFn || canEmitFn(node)) {
                    if (currentWriterPos !== writer.getTextPos()) {
                        write(separator);
                    }
                    currentWriterPos = writer.getTextPos();
                    eachNodeEmitFn(node);
                }
            }
        }
        function emitCommaList(nodes, eachNodeEmitFn, canEmitFn) {
            emitSeparatedList(nodes, ", ", eachNodeEmitFn, canEmitFn);
        }
        function writeJsDocComments(declaration) {
            if (declaration) {
                var jsDocComments = ts.getJsDocCommentsFromText(declaration, currentText);
                ts.emitNewLineBeforeLeadingComments(currentLineMap, writer, declaration, jsDocComments);
                // jsDoc comments are emitted at /*leading comment1 */space/*leading comment*/space
                ts.emitComments(currentText, currentLineMap, writer, jsDocComments, /*trailingSeparator*/ true, newLine, ts.writeCommentRange);
            }
        }
        function emitTypeWithNewGetSymbolAccessibilityDiagnostic(type, getSymbolAccessibilityDiagnostic) {
            writer.getSymbolAccessibilityDiagnostic = getSymbolAccessibilityDiagnostic;
            emitType(type);
        }
        function emitType(type) {
            switch (type.kind) {
                case 117 /* AnyKeyword */:
                case 130 /* StringKeyword */:
                case 128 /* NumberKeyword */:
                case 120 /* BooleanKeyword */:
                case 131 /* SymbolKeyword */:
                case 103 /* VoidKeyword */:
                case 162 /* ThisType */:
                case 163 /* StringLiteralType */:
                    return writeTextOfNode(currentText, type);
                case 191 /* ExpressionWithTypeArguments */:
                    return emitExpressionWithTypeArguments(type);
                case 152 /* TypeReference */:
                    return emitTypeReference(type);
                case 155 /* TypeQuery */:
                    return emitTypeQuery(type);
                case 157 /* ArrayType */:
                    return emitArrayType(type);
                case 158 /* TupleType */:
                    return emitTupleType(type);
                case 159 /* UnionType */:
                    return emitUnionType(type);
                case 160 /* IntersectionType */:
                    return emitIntersectionType(type);
                case 161 /* ParenthesizedType */:
                    return emitParenType(type);
                case 153 /* FunctionType */:
                case 154 /* ConstructorType */:
                    return emitSignatureDeclarationWithJsDocComments(type);
                case 156 /* TypeLiteral */:
                    return emitTypeLiteral(type);
                case 69 /* Identifier */:
                    return emitEntityName(type);
                case 136 /* QualifiedName */:
                    return emitEntityName(type);
                case 151 /* TypePredicate */:
                    return emitTypePredicate(type);
            }
            function writeEntityName(entityName) {
                if (entityName.kind === 69 /* Identifier */) {
                    writeTextOfNode(currentText, entityName);
                }
                else {
                    var left = entityName.kind === 136 /* QualifiedName */ ? entityName.left : entityName.expression;
                    var right = entityName.kind === 136 /* QualifiedName */ ? entityName.right : entityName.name;
                    writeEntityName(left);
                    write(".");
                    writeTextOfNode(currentText, right);
                }
            }
            function emitEntityName(entityName) {
                var visibilityResult = resolver.isEntityNameVisible(entityName, 
                // Aliases can be written asynchronously so use correct enclosing declaration
                entityName.parent.kind === 224 /* ImportEqualsDeclaration */ ? entityName.parent : enclosingDeclaration);
                handleSymbolAccessibilityError(visibilityResult);
                writeEntityName(entityName);
            }
            function emitExpressionWithTypeArguments(node) {
                if (ts.isSupportedExpressionWithTypeArguments(node)) {
                    ts.Debug.assert(node.expression.kind === 69 /* Identifier */ || node.expression.kind === 169 /* PropertyAccessExpression */);
                    emitEntityName(node.expression);
                    if (node.typeArguments) {
                        write("<");
                        emitCommaList(node.typeArguments, emitType);
                        write(">");
                    }
                }
            }
            function emitTypeReference(type) {
                emitEntityName(type.typeName);
                if (type.typeArguments) {
                    write("<");
                    emitCommaList(type.typeArguments, emitType);
                    write(">");
                }
            }
            function emitTypePredicate(type) {
                writeTextOfNode(currentText, type.parameterName);
                write(" is ");
                emitType(type.type);
            }
            function emitTypeQuery(type) {
                write("typeof ");
                emitEntityName(type.exprName);
            }
            function emitArrayType(type) {
                emitType(type.elementType);
                write("[]");
            }
            function emitTupleType(type) {
                write("[");
                emitCommaList(type.elementTypes, emitType);
                write("]");
            }
            function emitUnionType(type) {
                emitSeparatedList(type.types, " | ", emitType);
            }
            function emitIntersectionType(type) {
                emitSeparatedList(type.types, " & ", emitType);
            }
            function emitParenType(type) {
                write("(");
                emitType(type.type);
                write(")");
            }
            function emitTypeLiteral(type) {
                write("{");
                if (type.members.length) {
                    writeLine();
                    increaseIndent();
                    // write members
                    emitLines(type.members);
                    decreaseIndent();
                }
                write("}");
            }
        }
        function emitSourceFile(node) {
            currentText = node.text;
            currentLineMap = ts.getLineStarts(node);
            currentIdentifiers = node.identifiers;
            isCurrentFileExternalModule = ts.isExternalModule(node);
            enclosingDeclaration = node;
            ts.emitDetachedComments(currentText, currentLineMap, writer, ts.writeCommentRange, node, newLine, true /* remove comments */);
            emitLines(node.statements);
        }
        // Return a temp variable name to be used in `export default` statements.
        // The temp name will be of the form _default_counter.
        // Note that export default is only allowed at most once in a module, so we
        // do not need to keep track of created temp names.
        function getExportDefaultTempVariableName() {
            var baseName = "_default";
            if (!ts.hasProperty(currentIdentifiers, baseName)) {
                return baseName;
            }
            var count = 0;
            while (true) {
                count++;
                var name_1 = baseName + "_" + count;
                if (!ts.hasProperty(currentIdentifiers, name_1)) {
                    return name_1;
                }
            }
        }
        function emitExportAssignment(node) {
            if (node.expression.kind === 69 /* Identifier */) {
                write(node.isExportEquals ? "export = " : "export default ");
                writeTextOfNode(currentText, node.expression);
            }
            else {
                // Expression
                var tempVarName = getExportDefaultTempVariableName();
                write("declare var ");
                write(tempVarName);
                write(": ");
                writer.getSymbolAccessibilityDiagnostic = getDefaultExportAccessibilityDiagnostic;
                resolver.writeTypeOfExpression(node.expression, enclosingDeclaration, 2 /* UseTypeOfFunction */, writer);
                write(";");
                writeLine();
                write(node.isExportEquals ? "export = " : "export default ");
                write(tempVarName);
            }
            write(";");
            writeLine();
            // Make all the declarations visible for the export name
            if (node.expression.kind === 69 /* Identifier */) {
                var nodes = resolver.collectLinkedAliases(node.expression);
                // write each of these declarations asynchronously
                writeAsynchronousModuleElements(nodes);
            }
            function getDefaultExportAccessibilityDiagnostic(diagnostic) {
                return {
                    diagnosticMessage: ts.Diagnostics.Default_export_of_the_module_has_or_is_using_private_name_0,
                    errorNode: node
                };
            }
        }
        function isModuleElementVisible(node) {
            return resolver.isDeclarationVisible(node);
        }
        function emitModuleElement(node, isModuleElementVisible) {
            if (isModuleElementVisible) {
                writeModuleElement(node);
            }
            else if (node.kind === 224 /* ImportEqualsDeclaration */ ||
                (node.parent.kind === 251 /* SourceFile */ && isCurrentFileExternalModule)) {
                var isVisible = void 0;
                if (asynchronousSubModuleDeclarationEmitInfo && node.parent.kind !== 251 /* SourceFile */) {
                    // Import declaration of another module that is visited async so lets put it in right spot
                    asynchronousSubModuleDeclarationEmitInfo.push({
                        node: node,
                        outputPos: writer.getTextPos(),
                        indent: writer.getIndent(),
                        isVisible: isVisible
                    });
                }
                else {
                    if (node.kind === 225 /* ImportDeclaration */) {
                        var importDeclaration = node;
                        if (importDeclaration.importClause) {
                            isVisible = (importDeclaration.importClause.name && resolver.isDeclarationVisible(importDeclaration.importClause)) ||
                                isVisibleNamedBinding(importDeclaration.importClause.namedBindings);
                        }
                    }
                    moduleElementDeclarationEmitInfo.push({
                        node: node,
                        outputPos: writer.getTextPos(),
                        indent: writer.getIndent(),
                        isVisible: isVisible
                    });
                }
            }
        }
        function writeModuleElement(node) {
            switch (node.kind) {
                case 216 /* FunctionDeclaration */:
                    return writeFunctionDeclaration(node);
                case 196 /* VariableStatement */:
                    return writeVariableStatement(node);
                case 218 /* InterfaceDeclaration */:
                    return writeInterfaceDeclaration(node);
                case 217 /* ClassDeclaration */:
                    return writeClassDeclaration(node);
                case 219 /* TypeAliasDeclaration */:
                    return writeTypeAliasDeclaration(node);
                case 220 /* EnumDeclaration */:
                    return writeEnumDeclaration(node);
                case 221 /* ModuleDeclaration */:
                    return writeModuleDeclaration(node);
                case 224 /* ImportEqualsDeclaration */:
                    return writeImportEqualsDeclaration(node);
                case 225 /* ImportDeclaration */:
                    return writeImportDeclaration(node);
                default:
                    ts.Debug.fail("Unknown symbol kind");
            }
        }
        function emitModuleElementDeclarationFlags(node) {
            // If the node is parented in the current source file we need to emit export declare or just export
            if (node.parent.kind === 251 /* SourceFile */) {
                // If the node is exported
                if (node.flags & 2 /* Export */) {
                    write("export ");
                }
                if (node.flags & 512 /* Default */) {
                    write("default ");
                }
                else if (node.kind !== 218 /* InterfaceDeclaration */ && !noDeclare) {
                    write("declare ");
                }
            }
        }
        function emitClassMemberDeclarationFlags(node) {
            if (node.flags & 16 /* Private */) {
                write("private ");
            }
            else if (node.flags & 32 /* Protected */) {
                write("protected ");
            }
            if (node.flags & 64 /* Static */) {
                write("static ");
            }
            if (node.flags & 128 /* Abstract */) {
                write("abstract ");
            }
        }
        function writeImportEqualsDeclaration(node) {
            // note usage of writer. methods instead of aliases created, just to make sure we are using
            // correct writer especially to handle asynchronous alias writing
            emitJsDocComments(node);
            if (node.flags & 2 /* Export */) {
                write("export ");
            }
            write("import ");
            writeTextOfNode(currentText, node.name);
            write(" = ");
            if (ts.isInternalModuleImportEqualsDeclaration(node)) {
                emitTypeWithNewGetSymbolAccessibilityDiagnostic(node.moduleReference, getImportEntityNameVisibilityError);
                write(";");
            }
            else {
                write("require(");
                emitExternalModuleSpecifier(node);
                write(");");
            }
            writer.writeLine();
            function getImportEntityNameVisibilityError(symbolAccesibilityResult) {
                return {
                    diagnosticMessage: ts.Diagnostics.Import_declaration_0_is_using_private_name_1,
                    errorNode: node,
                    typeName: node.name
                };
            }
        }
        function isVisibleNamedBinding(namedBindings) {
            if (namedBindings) {
                if (namedBindings.kind === 227 /* NamespaceImport */) {
                    return resolver.isDeclarationVisible(namedBindings);
                }
                else {
                    return ts.forEach(namedBindings.elements, function (namedImport) { return resolver.isDeclarationVisible(namedImport); });
                }
            }
        }
        function writeImportDeclaration(node) {
            emitJsDocComments(node);
            if (node.flags & 2 /* Export */) {
                write("export ");
            }
            write("import ");
            if (node.importClause) {
                var currentWriterPos = writer.getTextPos();
                if (node.importClause.name && resolver.isDeclarationVisible(node.importClause)) {
                    writeTextOfNode(currentText, node.importClause.name);
                }
                if (node.importClause.namedBindings && isVisibleNamedBinding(node.importClause.namedBindings)) {
                    if (currentWriterPos !== writer.getTextPos()) {
                        // If the default binding was emitted, write the separated
                        write(", ");
                    }
                    if (node.importClause.namedBindings.kind === 227 /* NamespaceImport */) {
                        write("* as ");
                        writeTextOfNode(currentText, node.importClause.namedBindings.name);
                    }
                    else {
                        write("{ ");
                        emitCommaList(node.importClause.namedBindings.elements, emitImportOrExportSpecifier, resolver.isDeclarationVisible);
                        write(" }");
                    }
                }
                write(" from ");
            }
            emitExternalModuleSpecifier(node);
            write(";");
            writer.writeLine();
        }
        function emitExternalModuleSpecifier(parent) {
            // emitExternalModuleSpecifier is usually called when we emit something in the.d.ts file that will make it an external module (i.e. import/export declarations).
            // the only case when it is not true is when we call it to emit correct name for module augmentation - d.ts files with just module augmentations are not considered 
            // external modules since they are indistingushable from script files with ambient modules. To fix this in such d.ts files we'll emit top level 'export {}'
            // so compiler will treat them as external modules.
            resultHasExternalModuleIndicator = resultHasExternalModuleIndicator || parent.kind !== 221 /* ModuleDeclaration */;
            var moduleSpecifier;
            if (parent.kind === 224 /* ImportEqualsDeclaration */) {
                var node = parent;
                moduleSpecifier = ts.getExternalModuleImportEqualsDeclarationExpression(node);
            }
            else if (parent.kind === 221 /* ModuleDeclaration */) {
                moduleSpecifier = parent.name;
            }
            else {
                var node = parent;
                moduleSpecifier = node.moduleSpecifier;
            }
            if (moduleSpecifier.kind === 9 /* StringLiteral */ && isBundledEmit && (compilerOptions.out || compilerOptions.outFile)) {
                var moduleName = ts.getExternalModuleNameFromDeclaration(host, resolver, parent);
                if (moduleName) {
                    write("\"");
                    write(moduleName);
                    write("\"");
                    return;
                }
            }
            writeTextOfNode(currentText, moduleSpecifier);
        }
        function emitImportOrExportSpecifier(node) {
            if (node.propertyName) {
                writeTextOfNode(currentText, node.propertyName);
                write(" as ");
            }
            writeTextOfNode(currentText, node.name);
        }
        function emitExportSpecifier(node) {
            emitImportOrExportSpecifier(node);
            // Make all the declarations visible for the export name
            var nodes = resolver.collectLinkedAliases(node.propertyName || node.name);
            // write each of these declarations asynchronously
            writeAsynchronousModuleElements(nodes);
        }
        function emitExportDeclaration(node) {
            emitJsDocComments(node);
            write("export ");
            if (node.exportClause) {
                write("{ ");
                emitCommaList(node.exportClause.elements, emitExportSpecifier);
                write(" }");
            }
            else {
                write("*");
            }
            if (node.moduleSpecifier) {
                write(" from ");
                emitExternalModuleSpecifier(node);
            }
            write(";");
            writer.writeLine();
        }
        function writeModuleDeclaration(node) {
            emitJsDocComments(node);
            emitModuleElementDeclarationFlags(node);
            if (ts.isGlobalScopeAugmentation(node)) {
                write("global ");
            }
            else {
                if (node.flags & 65536 /* Namespace */) {
                    write("namespace ");
                }
                else {
                    write("module ");
                }
                if (ts.isExternalModuleAugmentation(node)) {
                    emitExternalModuleSpecifier(node);
                }
                else {
                    writeTextOfNode(currentText, node.name);
                }
            }
            while (node.body.kind !== 222 /* ModuleBlock */) {
                node = node.body;
                write(".");
                writeTextOfNode(currentText, node.name);
            }
            var prevEnclosingDeclaration = enclosingDeclaration;
            enclosingDeclaration = node;
            write(" {");
            writeLine();
            increaseIndent();
            emitLines(node.body.statements);
            decreaseIndent();
            write("}");
            writeLine();
            enclosingDeclaration = prevEnclosingDeclaration;
        }
        function writeTypeAliasDeclaration(node) {
            var prevEnclosingDeclaration = enclosingDeclaration;
            enclosingDeclaration = node;
            emitJsDocComments(node);
            emitModuleElementDeclarationFlags(node);
            write("type ");
            writeTextOfNode(currentText, node.name);
            emitTypeParameters(node.typeParameters);
            write(" = ");
            emitTypeWithNewGetSymbolAccessibilityDiagnostic(node.type, getTypeAliasDeclarationVisibilityError);
            write(";");
            writeLine();
            enclosingDeclaration = prevEnclosingDeclaration;
            function getTypeAliasDeclarationVisibilityError(symbolAccesibilityResult) {
                return {
                    diagnosticMessage: ts.Diagnostics.Exported_type_alias_0_has_or_is_using_private_name_1,
                    errorNode: node.type,
                    typeName: node.name
                };
            }
        }
        function writeEnumDeclaration(node) {
            emitJsDocComments(node);
            emitModuleElementDeclarationFlags(node);
            if (ts.isConst(node)) {
                write("const ");
            }
            write("enum ");
            writeTextOfNode(currentText, node.name);
            write(" {");
            writeLine();
            increaseIndent();
            emitLines(node.members);
            decreaseIndent();
            write("}");
            writeLine();
        }
        function emitEnumMemberDeclaration(node) {
            emitJsDocComments(node);
            writeTextOfNode(currentText, node.name);
            var enumMemberValue = resolver.getConstantValue(node);
            if (enumMemberValue !== undefined) {
                write(" = ");
                write(enumMemberValue.toString());
            }
            write(",");
            writeLine();
        }
        function isPrivateMethodTypeParameter(node) {
            return node.parent.kind === 144 /* MethodDeclaration */ && (node.parent.flags & 16 /* Private */);
        }
        function emitTypeParameters(typeParameters) {
            function emitTypeParameter(node) {
                increaseIndent();
                emitJsDocComments(node);
                decreaseIndent();
                writeTextOfNode(currentText, node.name);
                // If there is constraint present and this is not a type parameter of the private method emit the constraint
                if (node.constraint && !isPrivateMethodTypeParameter(node)) {
                    write(" extends ");
                    if (node.parent.kind === 153 /* FunctionType */ ||
                        node.parent.kind === 154 /* ConstructorType */ ||
                        (node.parent.parent && node.parent.parent.kind === 156 /* TypeLiteral */)) {
                        ts.Debug.assert(node.parent.kind === 144 /* MethodDeclaration */ ||
                            node.parent.kind === 143 /* MethodSignature */ ||
                            node.parent.kind === 153 /* FunctionType */ ||
                            node.parent.kind === 154 /* ConstructorType */ ||
                            node.parent.kind === 148 /* CallSignature */ ||
                            node.parent.kind === 149 /* ConstructSignature */);
                        emitType(node.constraint);
                    }
                    else {
                        emitTypeWithNewGetSymbolAccessibilityDiagnostic(node.constraint, getTypeParameterConstraintVisibilityError);
                    }
                }
                function getTypeParameterConstraintVisibilityError(symbolAccesibilityResult) {
                    // Type parameter constraints are named by user so we should always be able to name it
                    var diagnosticMessage;
                    switch (node.parent.kind) {
                        case 217 /* ClassDeclaration */:
                            diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_exported_class_has_or_is_using_private_name_1;
                            break;
                        case 218 /* InterfaceDeclaration */:
                            diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_exported_interface_has_or_is_using_private_name_1;
                            break;
                        case 149 /* ConstructSignature */:
                            diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1;
                            break;
                        case 148 /* CallSignature */:
                            diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1;
                            break;
                        case 144 /* MethodDeclaration */:
                        case 143 /* MethodSignature */:
                            if (node.parent.flags & 64 /* Static */) {
                                diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1;
                            }
                            else if (node.parent.parent.kind === 217 /* ClassDeclaration */) {
                                diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1;
                            }
                            else {
                                diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1;
                            }
                            break;
                        case 216 /* FunctionDeclaration */:
                            diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_exported_function_has_or_is_using_private_name_1;
                            break;
                        default:
                            ts.Debug.fail("This is unknown parent for type parameter: " + node.parent.kind);
                    }
                    return {
                        diagnosticMessage: diagnosticMessage,
                        errorNode: node,
                        typeName: node.name
                    };
                }
            }
            if (typeParameters) {
                write("<");
                emitCommaList(typeParameters, emitTypeParameter);
                write(">");
            }
        }
        function emitHeritageClause(typeReferences, isImplementsList) {
            if (typeReferences) {
                write(isImplementsList ? " implements " : " extends ");
                emitCommaList(typeReferences, emitTypeOfTypeReference);
            }
            function emitTypeOfTypeReference(node) {
                if (ts.isSupportedExpressionWithTypeArguments(node)) {
                    emitTypeWithNewGetSymbolAccessibilityDiagnostic(node, getHeritageClauseVisibilityError);
                }
                else if (!isImplementsList && node.expression.kind === 93 /* NullKeyword */) {
                    write("null");
                }
                function getHeritageClauseVisibilityError(symbolAccesibilityResult) {
                    var diagnosticMessage;
                    // Heritage clause is written by user so it can always be named
                    if (node.parent.parent.kind === 217 /* ClassDeclaration */) {
                        // Class or Interface implemented/extended is inaccessible
                        diagnosticMessage = isImplementsList ?
                            ts.Diagnostics.Implements_clause_of_exported_class_0_has_or_is_using_private_name_1 :
                            ts.Diagnostics.Extends_clause_of_exported_class_0_has_or_is_using_private_name_1;
                    }
                    else {
                        // interface is inaccessible
                        diagnosticMessage = ts.Diagnostics.Extends_clause_of_exported_interface_0_has_or_is_using_private_name_1;
                    }
                    return {
                        diagnosticMessage: diagnosticMessage,
                        errorNode: node,
                        typeName: node.parent.parent.name
                    };
                }
            }
        }
        function writeClassDeclaration(node) {
            function emitParameterProperties(constructorDeclaration) {
                if (constructorDeclaration) {
                    ts.forEach(constructorDeclaration.parameters, function (param) {
                        if (param.flags & 56 /* AccessibilityModifier */) {
                            emitPropertyDeclaration(param);
                        }
                    });
                }
            }
            emitJsDocComments(node);
            emitModuleElementDeclarationFlags(node);
            if (node.flags & 128 /* Abstract */) {
                write("abstract ");
            }
            write("class ");
            writeTextOfNode(currentText, node.name);
            var prevEnclosingDeclaration = enclosingDeclaration;
            enclosingDeclaration = node;
            emitTypeParameters(node.typeParameters);
            var baseTypeNode = ts.getClassExtendsHeritageClauseElement(node);
            if (baseTypeNode) {
                emitHeritageClause([baseTypeNode], /*isImplementsList*/ false);
            }
            emitHeritageClause(ts.getClassImplementsHeritageClauseElements(node), /*isImplementsList*/ true);
            write(" {");
            writeLine();
            increaseIndent();
            emitParameterProperties(ts.getFirstConstructorWithBody(node));
            emitLines(node.members);
            decreaseIndent();
            write("}");
            writeLine();
            enclosingDeclaration = prevEnclosingDeclaration;
        }
        function writeInterfaceDeclaration(node) {
            emitJsDocComments(node);
            emitModuleElementDeclarationFlags(node);
            write("interface ");
            writeTextOfNode(currentText, node.name);
            var prevEnclosingDeclaration = enclosingDeclaration;
            enclosingDeclaration = node;
            emitTypeParameters(node.typeParameters);
            emitHeritageClause(ts.getInterfaceBaseTypeNodes(node), /*isImplementsList*/ false);
            write(" {");
            writeLine();
            increaseIndent();
            emitLines(node.members);
            decreaseIndent();
            write("}");
            writeLine();
            enclosingDeclaration = prevEnclosingDeclaration;
        }
        function emitPropertyDeclaration(node) {
            if (ts.hasDynamicName(node)) {
                return;
            }
            emitJsDocComments(node);
            emitClassMemberDeclarationFlags(node);
            emitVariableDeclaration(node);
            write(";");
            writeLine();
        }
        function emitVariableDeclaration(node) {
            // If we are emitting property it isn't moduleElement and hence we already know it needs to be emitted
            // so there is no check needed to see if declaration is visible
            if (node.kind !== 214 /* VariableDeclaration */ || resolver.isDeclarationVisible(node)) {
                if (ts.isBindingPattern(node.name)) {
                    emitBindingPattern(node.name);
                }
                else {
                    // If this node is a computed name, it can only be a symbol, because we've already skipped
                    // it if it's not a well known symbol. In that case, the text of the name will be exactly
                    // what we want, namely the name expression enclosed in brackets.
                    writeTextOfNode(currentText, node.name);
                    // If optional property emit ?
                    if ((node.kind === 142 /* PropertyDeclaration */ || node.kind === 141 /* PropertySignature */) && ts.hasQuestionToken(node)) {
                        write("?");
                    }
                    if ((node.kind === 142 /* PropertyDeclaration */ || node.kind === 141 /* PropertySignature */) && node.parent.kind === 156 /* TypeLiteral */) {
                        emitTypeOfVariableDeclarationFromTypeLiteral(node);
                    }
                    else if (!(node.flags & 16 /* Private */)) {
                        writeTypeOfDeclaration(node, node.type, getVariableDeclarationTypeVisibilityError);
                    }
                }
            }
            function getVariableDeclarationTypeVisibilityDiagnosticMessage(symbolAccesibilityResult) {
                if (node.kind === 214 /* VariableDeclaration */) {
                    return symbolAccesibilityResult.errorModuleName ?
                        symbolAccesibilityResult.accessibility === 2 /* CannotBeNamed */ ?
                            ts.Diagnostics.Exported_variable_0_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                            ts.Diagnostics.Exported_variable_0_has_or_is_using_name_1_from_private_module_2 :
                        ts.Diagnostics.Exported_variable_0_has_or_is_using_private_name_1;
                }
                else if (node.kind === 142 /* PropertyDeclaration */ || node.kind === 141 /* PropertySignature */) {
                    // TODO(jfreeman): Deal with computed properties in error reporting.
                    if (node.flags & 64 /* Static */) {
                        return symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === 2 /* CannotBeNamed */ ?
                                ts.Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                                ts.Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_private_name_1;
                    }
                    else if (node.parent.kind === 217 /* ClassDeclaration */) {
                        return symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === 2 /* CannotBeNamed */ ?
                                ts.Diagnostics.Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                                ts.Diagnostics.Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Public_property_0_of_exported_class_has_or_is_using_private_name_1;
                    }
                    else {
                        // Interfaces cannot have types that cannot be named
                        return symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Property_0_of_exported_interface_has_or_is_using_private_name_1;
                    }
                }
            }
            function getVariableDeclarationTypeVisibilityError(symbolAccesibilityResult) {
                var diagnosticMessage = getVariableDeclarationTypeVisibilityDiagnosticMessage(symbolAccesibilityResult);
                return diagnosticMessage !== undefined ? {
                    diagnosticMessage: diagnosticMessage,
                    errorNode: node,
                    typeName: node.name
                } : undefined;
            }
            function emitBindingPattern(bindingPattern) {
                // Only select non-omitted expression from the bindingPattern's elements.
                // We have to do this to avoid emitting trailing commas.
                // For example:
                //      original: var [, c,,] = [ 2,3,4]
                //      emitted: declare var c: number; // instead of declare var c:number, ;
                var elements = [];
                for (var _i = 0, _a = bindingPattern.elements; _i < _a.length; _i++) {
                    var element = _a[_i];
                    if (element.kind !== 190 /* OmittedExpression */) {
                        elements.push(element);
                    }
                }
                emitCommaList(elements, emitBindingElement);
            }
            function emitBindingElement(bindingElement) {
                function getBindingElementTypeVisibilityError(symbolAccesibilityResult) {
                    var diagnosticMessage = getVariableDeclarationTypeVisibilityDiagnosticMessage(symbolAccesibilityResult);
                    return diagnosticMessage !== undefined ? {
                        diagnosticMessage: diagnosticMessage,
                        errorNode: bindingElement,
                        typeName: bindingElement.name
                    } : undefined;
                }
                if (bindingElement.name) {
                    if (ts.isBindingPattern(bindingElement.name)) {
                        emitBindingPattern(bindingElement.name);
                    }
                    else {
                        writeTextOfNode(currentText, bindingElement.name);
                        writeTypeOfDeclaration(bindingElement, /*type*/ undefined, getBindingElementTypeVisibilityError);
                    }
                }
            }
        }
        function emitTypeOfVariableDeclarationFromTypeLiteral(node) {
            // if this is property of type literal,
            // or is parameter of method/call/construct/index signature of type literal
            // emit only if type is specified
            if (node.type) {
                write(": ");
                emitType(node.type);
            }
        }
        function isVariableStatementVisible(node) {
            return ts.forEach(node.declarationList.declarations, function (varDeclaration) { return resolver.isDeclarationVisible(varDeclaration); });
        }
        function writeVariableStatement(node) {
            emitJsDocComments(node);
            emitModuleElementDeclarationFlags(node);
            if (ts.isLet(node.declarationList)) {
                write("let ");
            }
            else if (ts.isConst(node.declarationList)) {
                write("const ");
            }
            else {
                write("var ");
            }
            emitCommaList(node.declarationList.declarations, emitVariableDeclaration, resolver.isDeclarationVisible);
            write(";");
            writeLine();
        }
        function emitAccessorDeclaration(node) {
            if (ts.hasDynamicName(node)) {
                return;
            }
            var accessors = ts.getAllAccessorDeclarations(node.parent.members, node);
            var accessorWithTypeAnnotation;
            if (node === accessors.firstAccessor) {
                emitJsDocComments(accessors.getAccessor);
                emitJsDocComments(accessors.setAccessor);
                emitClassMemberDeclarationFlags(node);
                writeTextOfNode(currentText, node.name);
                if (!(node.flags & 16 /* Private */)) {
                    accessorWithTypeAnnotation = node;
                    var type = getTypeAnnotationFromAccessor(node);
                    if (!type) {
                        // couldn't get type for the first accessor, try the another one
                        var anotherAccessor = node.kind === 146 /* GetAccessor */ ? accessors.setAccessor : accessors.getAccessor;
                        type = getTypeAnnotationFromAccessor(anotherAccessor);
                        if (type) {
                            accessorWithTypeAnnotation = anotherAccessor;
                        }
                    }
                    writeTypeOfDeclaration(node, type, getAccessorDeclarationTypeVisibilityError);
                }
                write(";");
                writeLine();
            }
            function getTypeAnnotationFromAccessor(accessor) {
                if (accessor) {
                    return accessor.kind === 146 /* GetAccessor */
                        ? accessor.type // Getter - return type
                        : accessor.parameters.length > 0
                            ? accessor.parameters[0].type // Setter parameter type
                            : undefined;
                }
            }
            function getAccessorDeclarationTypeVisibilityError(symbolAccesibilityResult) {
                var diagnosticMessage;
                if (accessorWithTypeAnnotation.kind === 147 /* SetAccessor */) {
                    // Setters have to have type named and cannot infer it so, the type should always be named
                    if (accessorWithTypeAnnotation.parent.flags & 64 /* Static */) {
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Parameter_0_of_public_static_property_setter_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Parameter_0_of_public_static_property_setter_from_exported_class_has_or_is_using_private_name_1;
                    }
                    else {
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Parameter_0_of_public_property_setter_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Parameter_0_of_public_property_setter_from_exported_class_has_or_is_using_private_name_1;
                    }
                    return {
                        diagnosticMessage: diagnosticMessage,
                        errorNode: accessorWithTypeAnnotation.parameters[0],
                        // TODO(jfreeman): Investigate why we are passing node.name instead of node.parameters[0].name
                        typeName: accessorWithTypeAnnotation.name
                    };
                }
                else {
                    if (accessorWithTypeAnnotation.flags & 64 /* Static */) {
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === 2 /* CannotBeNamed */ ?
                                ts.Diagnostics.Return_type_of_public_static_property_getter_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                                ts.Diagnostics.Return_type_of_public_static_property_getter_from_exported_class_has_or_is_using_name_0_from_private_module_1 :
                            ts.Diagnostics.Return_type_of_public_static_property_getter_from_exported_class_has_or_is_using_private_name_0;
                    }
                    else {
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === 2 /* CannotBeNamed */ ?
                                ts.Diagnostics.Return_type_of_public_property_getter_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                                ts.Diagnostics.Return_type_of_public_property_getter_from_exported_class_has_or_is_using_name_0_from_private_module_1 :
                            ts.Diagnostics.Return_type_of_public_property_getter_from_exported_class_has_or_is_using_private_name_0;
                    }
                    return {
                        diagnosticMessage: diagnosticMessage,
                        errorNode: accessorWithTypeAnnotation.name,
                        typeName: undefined
                    };
                }
            }
        }
        function writeFunctionDeclaration(node) {
            if (ts.hasDynamicName(node)) {
                return;
            }
            // If we are emitting Method/Constructor it isn't moduleElement and hence already determined to be emitting
            // so no need to verify if the declaration is visible
            if (!resolver.isImplementationOfOverload(node)) {
                emitJsDocComments(node);
                if (node.kind === 216 /* FunctionDeclaration */) {
                    emitModuleElementDeclarationFlags(node);
                }
                else if (node.kind === 144 /* MethodDeclaration */) {
                    emitClassMemberDeclarationFlags(node);
                }
                if (node.kind === 216 /* FunctionDeclaration */) {
                    write("function ");
                    writeTextOfNode(currentText, node.name);
                }
                else if (node.kind === 145 /* Constructor */) {
                    write("constructor");
                }
                else {
                    writeTextOfNode(currentText, node.name);
                    if (ts.hasQuestionToken(node)) {
                        write("?");
                    }
                }
                emitSignatureDeclaration(node);
            }
        }
        function emitSignatureDeclarationWithJsDocComments(node) {
            emitJsDocComments(node);
            emitSignatureDeclaration(node);
        }
        function emitSignatureDeclaration(node) {
            var prevEnclosingDeclaration = enclosingDeclaration;
            enclosingDeclaration = node;
            // Construct signature or constructor type write new Signature
            if (node.kind === 149 /* ConstructSignature */ || node.kind === 154 /* ConstructorType */) {
                write("new ");
            }
            emitTypeParameters(node.typeParameters);
            if (node.kind === 150 /* IndexSignature */) {
                write("[");
            }
            else {
                write("(");
            }
            // Parameters
            emitCommaList(node.parameters, emitParameterDeclaration);
            if (node.kind === 150 /* IndexSignature */) {
                write("]");
            }
            else {
                write(")");
            }
            // If this is not a constructor and is not private, emit the return type
            var isFunctionTypeOrConstructorType = node.kind === 153 /* FunctionType */ || node.kind === 154 /* ConstructorType */;
            if (isFunctionTypeOrConstructorType || node.parent.kind === 156 /* TypeLiteral */) {
                // Emit type literal signature return type only if specified
                if (node.type) {
                    write(isFunctionTypeOrConstructorType ? " => " : ": ");
                    emitType(node.type);
                }
            }
            else if (node.kind !== 145 /* Constructor */ && !(node.flags & 16 /* Private */)) {
                writeReturnTypeAtSignature(node, getReturnTypeVisibilityError);
            }
            enclosingDeclaration = prevEnclosingDeclaration;
            if (!isFunctionTypeOrConstructorType) {
                write(";");
                writeLine();
            }
            function getReturnTypeVisibilityError(symbolAccesibilityResult) {
                var diagnosticMessage;
                switch (node.kind) {
                    case 149 /* ConstructSignature */:
                        // Interfaces cannot have return types that cannot be named
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1 :
                            ts.Diagnostics.Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_0;
                        break;
                    case 148 /* CallSignature */:
                        // Interfaces cannot have return types that cannot be named
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Return_type_of_call_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1 :
                            ts.Diagnostics.Return_type_of_call_signature_from_exported_interface_has_or_is_using_private_name_0;
                        break;
                    case 150 /* IndexSignature */:
                        // Interfaces cannot have return types that cannot be named
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Return_type_of_index_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1 :
                            ts.Diagnostics.Return_type_of_index_signature_from_exported_interface_has_or_is_using_private_name_0;
                        break;
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                        if (node.flags & 64 /* Static */) {
                            diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                                symbolAccesibilityResult.accessibility === 2 /* CannotBeNamed */ ?
                                    ts.Diagnostics.Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                                    ts.Diagnostics.Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_private_module_1 :
                                ts.Diagnostics.Return_type_of_public_static_method_from_exported_class_has_or_is_using_private_name_0;
                        }
                        else if (node.parent.kind === 217 /* ClassDeclaration */) {
                            diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                                symbolAccesibilityResult.accessibility === 2 /* CannotBeNamed */ ?
                                    ts.Diagnostics.Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                                    ts.Diagnostics.Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_private_module_1 :
                                ts.Diagnostics.Return_type_of_public_method_from_exported_class_has_or_is_using_private_name_0;
                        }
                        else {
                            // Interfaces cannot have return types that cannot be named
                            diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                                ts.Diagnostics.Return_type_of_method_from_exported_interface_has_or_is_using_name_0_from_private_module_1 :
                                ts.Diagnostics.Return_type_of_method_from_exported_interface_has_or_is_using_private_name_0;
                        }
                        break;
                    case 216 /* FunctionDeclaration */:
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === 2 /* CannotBeNamed */ ?
                                ts.Diagnostics.Return_type_of_exported_function_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                                ts.Diagnostics.Return_type_of_exported_function_has_or_is_using_name_0_from_private_module_1 :
                            ts.Diagnostics.Return_type_of_exported_function_has_or_is_using_private_name_0;
                        break;
                    default:
                        ts.Debug.fail("This is unknown kind for signature: " + node.kind);
                }
                return {
                    diagnosticMessage: diagnosticMessage,
                    errorNode: node.name || node
                };
            }
        }
        function emitParameterDeclaration(node) {
            increaseIndent();
            emitJsDocComments(node);
            if (node.dotDotDotToken) {
                write("...");
            }
            if (ts.isBindingPattern(node.name)) {
                // For bindingPattern, we can't simply writeTextOfNode from the source file
                // because we want to omit the initializer and using writeTextOfNode will result in initializer get emitted.
                // Therefore, we will have to recursively emit each element in the bindingPattern.
                emitBindingPattern(node.name);
            }
            else {
                writeTextOfNode(currentText, node.name);
            }
            if (resolver.isOptionalParameter(node)) {
                write("?");
            }
            decreaseIndent();
            if (node.parent.kind === 153 /* FunctionType */ ||
                node.parent.kind === 154 /* ConstructorType */ ||
                node.parent.parent.kind === 156 /* TypeLiteral */) {
                emitTypeOfVariableDeclarationFromTypeLiteral(node);
            }
            else if (!(node.parent.flags & 16 /* Private */)) {
                writeTypeOfDeclaration(node, node.type, getParameterDeclarationTypeVisibilityError);
            }
            function getParameterDeclarationTypeVisibilityError(symbolAccesibilityResult) {
                var diagnosticMessage = getParameterDeclarationTypeVisibilityDiagnosticMessage(symbolAccesibilityResult);
                return diagnosticMessage !== undefined ? {
                    diagnosticMessage: diagnosticMessage,
                    errorNode: node,
                    typeName: node.name
                } : undefined;
            }
            function getParameterDeclarationTypeVisibilityDiagnosticMessage(symbolAccesibilityResult) {
                switch (node.parent.kind) {
                    case 145 /* Constructor */:
                        return symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === 2 /* CannotBeNamed */ ?
                                ts.Diagnostics.Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                                ts.Diagnostics.Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Parameter_0_of_constructor_from_exported_class_has_or_is_using_private_name_1;
                    case 149 /* ConstructSignature */:
                        // Interfaces cannot have parameter types that cannot be named
                        return symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1;
                    case 148 /* CallSignature */:
                        // Interfaces cannot have parameter types that cannot be named
                        return symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1;
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                        if (node.parent.flags & 64 /* Static */) {
                            return symbolAccesibilityResult.errorModuleName ?
                                symbolAccesibilityResult.accessibility === 2 /* CannotBeNamed */ ?
                                    ts.Diagnostics.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                                    ts.Diagnostics.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                                ts.Diagnostics.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1;
                        }
                        else if (node.parent.parent.kind === 217 /* ClassDeclaration */) {
                            return symbolAccesibilityResult.errorModuleName ?
                                symbolAccesibilityResult.accessibility === 2 /* CannotBeNamed */ ?
                                    ts.Diagnostics.Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                                    ts.Diagnostics.Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                                ts.Diagnostics.Parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1;
                        }
                        else {
                            // Interfaces cannot have parameter types that cannot be named
                            return symbolAccesibilityResult.errorModuleName ?
                                ts.Diagnostics.Parameter_0_of_method_from_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                                ts.Diagnostics.Parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1;
                        }
                    case 216 /* FunctionDeclaration */:
                        return symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === 2 /* CannotBeNamed */ ?
                                ts.Diagnostics.Parameter_0_of_exported_function_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                                ts.Diagnostics.Parameter_0_of_exported_function_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Parameter_0_of_exported_function_has_or_is_using_private_name_1;
                    default:
                        ts.Debug.fail("This is unknown parent for parameter: " + node.parent.kind);
                }
            }
            function emitBindingPattern(bindingPattern) {
                // We have to explicitly emit square bracket and bracket because these tokens are not store inside the node.
                if (bindingPattern.kind === 164 /* ObjectBindingPattern */) {
                    write("{");
                    emitCommaList(bindingPattern.elements, emitBindingElement);
                    write("}");
                }
                else if (bindingPattern.kind === 165 /* ArrayBindingPattern */) {
                    write("[");
                    var elements = bindingPattern.elements;
                    emitCommaList(elements, emitBindingElement);
                    if (elements && elements.hasTrailingComma) {
                        write(", ");
                    }
                    write("]");
                }
            }
            function emitBindingElement(bindingElement) {
                if (bindingElement.kind === 190 /* OmittedExpression */) {
                    // If bindingElement is an omittedExpression (i.e. containing elision),
                    // we will emit blank space (although this may differ from users' original code,
                    // it allows emitSeparatedList to write separator appropriately)
                    // Example:
                    //      original: function foo([, x, ,]) {}
                    //      emit    : function foo([ , x,  , ]) {}
                    write(" ");
                }
                else if (bindingElement.kind === 166 /* BindingElement */) {
                    if (bindingElement.propertyName) {
                        // bindingElement has propertyName property in the following case:
                        //      { y: [a,b,c] ...} -> bindingPattern will have a property called propertyName for "y"
                        // We have to explicitly emit the propertyName before descending into its binding elements.
                        // Example:
                        //      original: function foo({y: [a,b,c]}) {}
                        //      emit    : declare function foo({y: [a, b, c]}: { y: [any, any, any] }) void;
                        writeTextOfNode(currentText, bindingElement.propertyName);
                        write(": ");
                    }
                    if (bindingElement.name) {
                        if (ts.isBindingPattern(bindingElement.name)) {
                            // If it is a nested binding pattern, we will recursively descend into each element and emit each one separately.
                            // In the case of rest element, we will omit rest element.
                            // Example:
                            //      original: function foo([a, [[b]], c] = [1,[["string"]], 3]) {}
                            //      emit    : declare function foo([a, [[b]], c]: [number, [[string]], number]): void;
                            //      original with rest: function foo([a, ...c]) {}
                            //      emit              : declare function foo([a, ...c]): void;
                            emitBindingPattern(bindingElement.name);
                        }
                        else {
                            ts.Debug.assert(bindingElement.name.kind === 69 /* Identifier */);
                            // If the node is just an identifier, we will simply emit the text associated with the node's name
                            // Example:
                            //      original: function foo({y = 10, x}) {}
                            //      emit    : declare function foo({y, x}: {number, any}): void;
                            if (bindingElement.dotDotDotToken) {
                                write("...");
                            }
                            writeTextOfNode(currentText, bindingElement.name);
                        }
                    }
                }
            }
        }
        function emitNode(node) {
            switch (node.kind) {
                case 216 /* FunctionDeclaration */:
                case 221 /* ModuleDeclaration */:
                case 224 /* ImportEqualsDeclaration */:
                case 218 /* InterfaceDeclaration */:
                case 217 /* ClassDeclaration */:
                case 219 /* TypeAliasDeclaration */:
                case 220 /* EnumDeclaration */:
                    return emitModuleElement(node, isModuleElementVisible(node));
                case 196 /* VariableStatement */:
                    return emitModuleElement(node, isVariableStatementVisible(node));
                case 225 /* ImportDeclaration */:
                    // Import declaration without import clause is visible, otherwise it is not visible
                    return emitModuleElement(node, /*isModuleElementVisible*/ !node.importClause);
                case 231 /* ExportDeclaration */:
                    return emitExportDeclaration(node);
                case 145 /* Constructor */:
                case 144 /* MethodDeclaration */:
                case 143 /* MethodSignature */:
                    return writeFunctionDeclaration(node);
                case 149 /* ConstructSignature */:
                case 148 /* CallSignature */:
                case 150 /* IndexSignature */:
                    return emitSignatureDeclarationWithJsDocComments(node);
                case 146 /* GetAccessor */:
                case 147 /* SetAccessor */:
                    return emitAccessorDeclaration(node);
                case 142 /* PropertyDeclaration */:
                case 141 /* PropertySignature */:
                    return emitPropertyDeclaration(node);
                case 250 /* EnumMember */:
                    return emitEnumMemberDeclaration(node);
                case 230 /* ExportAssignment */:
                    return emitExportAssignment(node);
                case 251 /* SourceFile */:
                    return emitSourceFile(node);
            }
        }
        /**
         * Adds the reference to referenced file, returns true if global file reference was emitted
         * @param referencedFile
         * @param addBundledFileReference Determines if global file reference corresponding to bundled file should be emitted or not
         */
        function writeReferencePath(referencedFile, addBundledFileReference) {
            var declFileName;
            var addedBundledEmitReference = false;
            if (ts.isDeclarationFile(referencedFile)) {
                // Declaration file, use declaration file name
                declFileName = referencedFile.fileName;
            }
            else {
                // Get the declaration file path
                ts.forEachExpectedEmitFile(host, getDeclFileName, referencedFile);
            }
            if (declFileName) {
                declFileName = ts.getRelativePathToDirectoryOrUrl(ts.getDirectoryPath(ts.normalizeSlashes(declarationFilePath)), declFileName, host.getCurrentDirectory(), host.getCanonicalFileName, 
                /*isAbsolutePathAnUrl*/ false);
                referencePathsOutput += "/// <reference path=\"" + declFileName + "\" />" + newLine;
            }
            return addedBundledEmitReference;
            function getDeclFileName(emitFileNames, sourceFiles, isBundledEmit) {
                // Dont add reference path to this file if it is a bundled emit and caller asked not emit bundled file path
                if (isBundledEmit && !addBundledFileReference) {
                    return;
                }
                ts.Debug.assert(!!emitFileNames.declarationFilePath || ts.isSourceFileJavaScript(referencedFile), "Declaration file is not present only for javascript files");
                declFileName = emitFileNames.declarationFilePath || emitFileNames.jsFilePath;
                addedBundledEmitReference = isBundledEmit;
            }
        }
    }
    /* @internal */
    function writeDeclarationFile(declarationFilePath, sourceFiles, isBundledEmit, host, resolver, emitterDiagnostics) {
        var emitDeclarationResult = emitDeclarations(host, resolver, emitterDiagnostics, declarationFilePath, sourceFiles, isBundledEmit);
        var emitSkipped = emitDeclarationResult.reportedDeclarationError || host.isEmitBlocked(declarationFilePath) || host.getCompilerOptions().noEmit;
        if (!emitSkipped) {
            var declarationOutput = emitDeclarationResult.referencePathsOutput
                + getDeclarationOutput(emitDeclarationResult.synchronousDeclarationOutput, emitDeclarationResult.moduleElementDeclarationEmitInfo);
            ts.writeFile(host, emitterDiagnostics, declarationFilePath, declarationOutput, host.getCompilerOptions().emitBOM);
        }
        return emitSkipped;
        function getDeclarationOutput(synchronousDeclarationOutput, moduleElementDeclarationEmitInfo) {
            var appliedSyncOutputPos = 0;
            var declarationOutput = "";
            // apply asynchronous additions to the synchronous output
            ts.forEach(moduleElementDeclarationEmitInfo, function (aliasEmitInfo) {
                if (aliasEmitInfo.asynchronousOutput) {
                    declarationOutput += synchronousDeclarationOutput.substring(appliedSyncOutputPos, aliasEmitInfo.outputPos);
                    declarationOutput += getDeclarationOutput(aliasEmitInfo.asynchronousOutput, aliasEmitInfo.subModuleElementDeclarationEmitInfo);
                    appliedSyncOutputPos = aliasEmitInfo.outputPos;
                }
            });
            declarationOutput += synchronousDeclarationOutput.substring(appliedSyncOutputPos);
            return declarationOutput;
        }
    }
    ts.writeDeclarationFile = writeDeclarationFile;
})(ts || (ts = {}));
